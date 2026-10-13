// Verifica el JWT y, además, el estado ACTUAL de la cuenta en la base de datos. Un JWT es
// válido hasta que expira (8 h), así que la firma por sí sola no basta: sin esta consulta,
// un usuario dado de baja o alguien con un token anterior a un cambio de contraseña seguiría
// operando hasta que el token venciera.
//
// Por cada petición autenticada se lee la fila del usuario por su llave primaria y se
// responde 401 si:
//   - la cuenta ya no existe o está inactiva (usuario.activo = FALSE), o
//   - el token se emitió antes del último cambio de contraseña
//     (usuario.contrasena_cambiada_en, que actualizan change-password, reset-password y
//     "Restablecer acceso"). La comparación es por segundo, que es la precisión del `iat`.
//
// Se conserva el bloqueo de la Sesión 13: con contraseña temporal el token solo sirve para
// /api/auth/*.

const jwt = require('jsonwebtoken')
const pool = require('../config/db')
const { validateEnv } = require('../config/env')

const env = validateEnv()

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado' })
  }

  const token = authHeader.split(' ')[1]

  let payload
  try {
    payload = jwt.verify(token, env.jwt.secret)
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' })
  }

  let cuenta
  try {
    const [rows] = await pool.query('SELECT activo, contrasena_cambiada_en FROM usuario WHERE id_usuario = ?', [
      payload.id_usuario,
    ])
    cuenta = rows[0]
  } catch (err) {
    return next(err)
  }

  if (!cuenta || !cuenta.activo) {
    return res.status(401).json({ error: 'La cuenta está inactiva o ya no existe', codigo: 'CUENTA_INACTIVA' })
  }

  if (cuenta.contrasena_cambiada_en) {
    const cambiadaEn = Math.floor(new Date(cuenta.contrasena_cambiada_en).getTime() / 1000)
    if (!payload.iat || payload.iat < cambiadaEn) {
      return res.status(401).json({
        error: 'La contraseña de esta cuenta cambió: inicia sesión de nuevo',
        codigo: 'SESION_INVALIDADA',
      })
    }
  }

  req.user = payload

  // Contraseña temporal pendiente de cambio: el token solo sirve para /api/auth/*
  // (me, logout, change-password). Evita que la contraseña que conoce el profesor
  // permita operar la cuenta del alumno saltándose la pantalla de Perfil del frontend.
  if (req.user.debe_cambiar_contrasena && req.baseUrl !== '/api/auth') {
    return res.status(403).json({
      error: 'Debes cambiar tu contraseña temporal antes de continuar',
      codigo: 'CAMBIO_CONTRASENA_REQUERIDO',
    })
  }

  next()
}

module.exports = authMiddleware
