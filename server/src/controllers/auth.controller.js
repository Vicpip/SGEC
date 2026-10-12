// Controlador de autenticación.
// Login valida el dominio del correo institucional según el rol contra
// ALLOWED_EMAIL_DOMAINS (Alumno -> dominio "alumno.*"; Profesor/Administrador
// -> cualquier otro dominio permitido), compara la contraseña con bcrypt y
// firma un JWT. También expone recuperación y cambio de contraseña.
//
// Cambio obligatorio de contraseña (Sesión 13): un alumno dado de alta por su profesor
// entra con una contraseña temporal y usuario.debe_cambiar_contrasena = TRUE. El login
// devuelve el indicador y lo incluye en el JWT; mientras esté presente, auth.middleware.js
// solo deja pasar /api/auth/*. Al cambiar la contraseña (change-password o el enlace de
// reset-password) el indicador vuelve a FALSE y change-password entrega un token nuevo.

const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const pool = require('../config/db')
const { validateEnv } = require('../config/env')
const { enviarCorreoRecuperacion } = require('../services/email.service')
const { dominiosPermitidosPorRol, dominioValido } = require('../utils/correoInstitucional')
const { obtenerDatosExtendidos } = require('../services/usuarios.service')

const {
  RONDAS_BCRYPT,
  RESET_TOKEN_VIGENCIA_MS,
  generarTokenReset,
  hashTokenReset,
} = require('../utils/credenciales')

const env = validateEnv()

// El indicador solo se agrega al payload cuando está activo, para que los tokens de las
// cuentas normales no cambien de forma.
function firmarToken(usuario, debeCambiarContrasena) {
  const payload = {
    id_usuario: usuario.id_usuario,
    correo_institucional: usuario.correo_institucional,
    rol: usuario.rol,
    nombre: usuario.nombre,
    apellido_paterno: usuario.apellido_paterno,
  }
  const claims = debeCambiarContrasena ? { ...payload, debe_cambiar_contrasena: true } : payload
  const token = jwt.sign(claims, env.jwt.secret, { expiresIn: env.jwt.expiresIn })
  return { token, payload }
}

async function login(req, res) {
  const { correo_institucional, contrasena, rol } = req.body

  if (!correo_institucional || !contrasena || !rol) {
    return res.status(400).json({ error: 'Correo institucional, contraseña y rol son requeridos' })
  }

  if (!dominioValido(correo_institucional, rol)) {
    const dominiosPermitidos = dominiosPermitidosPorRol(rol)
    return res.status(400).json({
      error: `El correo debe pertenecer a uno de estos dominios para el rol ${rol}: ${dominiosPermitidos.join(', ')}`,
    })
  }

  const [rows] = await pool.query('SELECT * FROM usuario WHERE correo_institucional = ?', [
    correo_institucional,
  ])
  const usuario = rows[0]

  // El toggle de la UI solo distingue Profesor/Alumno (mismo dominio @ipn.mx para
  // Administrador y Profesor); el rol real y el destino tras login siempre vienen
  // de la BD, no del valor seleccionado en el toggle. La validación de dominio ya
  // impide que un correo cruce de grupo de dominio.
  if (!usuario) {
    return res.status(401).json({ error: 'Correo o contraseña incorrectos' })
  }

  if (!usuario.activo) {
    return res.status(403).json({ error: 'Esta cuenta se encuentra inactiva' })
  }

  const contrasenaValida = await bcrypt.compare(contrasena, usuario.contrasena_hash)
  if (!contrasenaValida) {
    return res.status(401).json({ error: 'Correo o contraseña incorrectos' })
  }

  const debeCambiarContrasena = Boolean(usuario.debe_cambiar_contrasena)
  const { token, payload } = firmarToken(usuario, debeCambiarContrasena)
  const datosExtendidos = await obtenerDatosExtendidos(usuario)

  res.status(200).json({
    token,
    usuario: { ...payload, ...datosExtendidos, debe_cambiar_contrasena: debeCambiarContrasena },
  })
}

async function me(req, res) {
  const [rows] = await pool.query('SELECT * FROM usuario WHERE id_usuario = ?', [req.user.id_usuario])
  const usuario = rows[0]

  if (!usuario || !usuario.activo) {
    return res.status(401).json({ error: 'Usuario no encontrado o inactivo' })
  }

  const datosExtendidos = await obtenerDatosExtendidos(usuario)

  res.status(200).json({
    usuario: {
      id_usuario: usuario.id_usuario,
      correo_institucional: usuario.correo_institucional,
      rol: usuario.rol,
      nombre: usuario.nombre,
      apellido_paterno: usuario.apellido_paterno,
      apellido_materno: usuario.apellido_materno,
      ...datosExtendidos,
      debe_cambiar_contrasena: Boolean(usuario.debe_cambiar_contrasena),
    },
  })
}

async function logout(req, res) {
  res.status(200).json({ message: 'Sesión cerrada' })
}

async function forgotPassword(req, res) {
  const { correo_institucional } = req.body

  const [rows] = await pool.query(
    'SELECT id_usuario, activo FROM usuario WHERE correo_institucional = ?',
    [correo_institucional]
  )
  const usuario = rows[0]

  if (usuario && usuario.activo) {
    const { tokenPlano, tokenHash } = generarTokenReset()
    const expira = new Date(Date.now() + RESET_TOKEN_VIGENCIA_MS)

    await pool.query(
      'UPDATE usuario SET reset_token_hash = ?, reset_token_expira = ? WHERE id_usuario = ?',
      [tokenHash, expira, usuario.id_usuario]
    )
    // Sin await: el envío SMTP no debe retrasar la respuesta (ni delatar por tiempo de
    // respuesta si el correo existe). enviarCorreoRecuperacion nunca rechaza.
    enviarCorreoRecuperacion(correo_institucional, tokenPlano)
  }

  // Respuesta genérica siempre, sin importar si el correo existe o la cuenta
  // está activa, para no revelar información de cuentas a un atacante.
  res.status(200).json({ message: 'Si el correo existe, se enviaron instrucciones de recuperación' })
}

async function resetPassword(req, res) {
  const { token, nueva_contrasena } = req.body
  const tokenHash = hashTokenReset(token)

  const [rows] = await pool.query(
    'SELECT id_usuario, reset_token_expira FROM usuario WHERE reset_token_hash = ?',
    [tokenHash]
  )
  const usuario = rows[0]

  if (!usuario || new Date(usuario.reset_token_expira) < new Date()) {
    return res.status(400).json({ error: 'El enlace de recuperación es inválido o expiró' })
  }

  const nuevoHash = await bcrypt.hash(nueva_contrasena, RONDAS_BCRYPT)
  await pool.query(
    `UPDATE usuario
     SET contrasena_hash = ?, reset_token_hash = NULL, reset_token_expira = NULL, debe_cambiar_contrasena = FALSE
     WHERE id_usuario = ?`,
    [nuevoHash, usuario.id_usuario]
  )

  res.status(200).json({ message: 'Contraseña actualizada correctamente' })
}

async function changePassword(req, res) {
  const { contrasena_actual, nueva_contrasena } = req.body

  const [rows] = await pool.query('SELECT * FROM usuario WHERE id_usuario = ?', [req.user.id_usuario])
  const usuario = rows[0]

  if (!usuario || !usuario.activo) {
    return res.status(401).json({ error: 'Usuario no encontrado o inactivo' })
  }

  const contrasenaValida = await bcrypt.compare(contrasena_actual, usuario.contrasena_hash)
  if (!contrasenaValida) {
    // El código distingue este 401 del de un token vencido o inválido (auth.middleware.js):
    // el frontend solo cierra la sesión en el segundo caso (ver client/src/services/api.js).
    return res.status(401).json({ error: 'La contraseña actual es incorrecta', codigo: 'CONTRASENA_ACTUAL_INCORRECTA' })
  }

  if (contrasena_actual === nueva_contrasena) {
    return res.status(400).json({ error: 'La nueva contraseña debe ser distinta de la actual' })
  }

  // También invalida cualquier enlace de activación/recuperación pendiente.
  const nuevoHash = await bcrypt.hash(nueva_contrasena, RONDAS_BCRYPT)
  await pool.query(
    `UPDATE usuario
     SET contrasena_hash = ?, debe_cambiar_contrasena = FALSE, reset_token_hash = NULL, reset_token_expira = NULL
     WHERE id_usuario = ?`,
    [nuevoHash, req.user.id_usuario]
  )

  // Token nuevo sin el indicador de cambio obligatorio: el que traía el cliente lo lleva
  // en el payload y seguiría bloqueado por auth.middleware.js hasta expirar.
  const { token } = firmarToken(usuario, false)

  res.status(200).json({ message: 'Contraseña actualizada correctamente', token, debe_cambiar_contrasena: false })
}

module.exports = { login, me, logout, forgotPassword, resetPassword, changePassword }
