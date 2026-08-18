// Controlador de autenticación.
// Login valida el dominio del correo institucional según el rol
// (Administrador/Profesor -> @ipn.mx, Alumno -> @alumno.ipn.mx),
// compara la contraseña con bcrypt y firma un JWT.

const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const pool = require('../config/db')
const { validateEnv } = require('../config/env')

const env = validateEnv()

const DOMINIOS_POR_ROL = {
  Administrador: '@ipn.mx',
  Profesor: '@ipn.mx',
  Alumno: '@alumno.ipn.mx',
}

function dominioValido(correo, rol) {
  const dominio = DOMINIOS_POR_ROL[rol]
  return Boolean(dominio) && correo.toLowerCase().endsWith(dominio)
}

async function obtenerDatosExtendidos(usuario) {
  if (usuario.rol === 'Profesor') {
    const [rows] = await pool.query(
      'SELECT id_profesor, no_empleado, departamento FROM profesor WHERE id_usuario = ?',
      [usuario.id_usuario]
    )
    return rows[0] || {}
  }

  if (usuario.rol === 'Alumno') {
    const [rows] = await pool.query(
      'SELECT id_alumno, boleta, grupo, carrera FROM alumno WHERE id_usuario = ?',
      [usuario.id_usuario]
    )
    return rows[0] || {}
  }

  return {}
}

async function login(req, res) {
  const { correo_institucional, contrasena, rol } = req.body

  if (!correo_institucional || !contrasena || !rol) {
    return res.status(400).json({ error: 'Correo institucional, contraseña y rol son requeridos' })
  }

  if (!dominioValido(correo_institucional, rol)) {
    return res.status(400).json({
      error: `El correo debe pertenecer al dominio ${DOMINIOS_POR_ROL[rol] || 'institucional'} para el rol ${rol}`,
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

  const payload = {
    id_usuario: usuario.id_usuario,
    correo_institucional: usuario.correo_institucional,
    rol: usuario.rol,
    nombre: usuario.nombre,
    apellido_paterno: usuario.apellido_paterno,
  }

  const token = jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.expiresIn })
  const datosExtendidos = await obtenerDatosExtendidos(usuario)

  res.status(200).json({
    token,
    usuario: { ...payload, ...datosExtendidos },
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
    },
  })
}

async function logout(req, res) {
  res.status(200).json({ message: 'Sesión cerrada' })
}

module.exports = { login, me, logout }
