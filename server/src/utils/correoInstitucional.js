// Reglas de dominio de correo institucional compartidas por auth.controller.js
// (login) y usuarios.controller.js (alta de Profesor/Administrador): Alumno usa
// el dominio que contiene "alumno."; Profesor/Administrador usan cualquier otro
// dominio permitido por ALLOWED_EMAIL_DOMAINS.
const { validateEnv } = require('../config/env')

const env = validateEnv()

function dominiosPermitidosPorRol(rol) {
  const dominios = env.allowedEmailDomains
  return rol === 'Alumno'
    ? dominios.filter((d) => d.startsWith('alumno.'))
    : dominios.filter((d) => !d.startsWith('alumno.'))
}

function dominioValido(correo, rol) {
  const dominiosPermitidos = dominiosPermitidosPorRol(rol)
  const correoLower = correo.toLowerCase()
  return dominiosPermitidos.some((dominio) => correoLower.endsWith(`@${dominio}`))
}

module.exports = { dominiosPermitidosPorRol, dominioValido }
