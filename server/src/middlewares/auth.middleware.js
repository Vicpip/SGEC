const jwt = require('jsonwebtoken')
const { validateEnv } = require('../config/env')

const env = validateEnv()

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const payload = jwt.verify(token, env.jwt.secret)
    req.user = payload
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' })
  }

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
