// El proyecto todavía no integra un proveedor SMTP real (no hay credenciales
// de correo en el alcance del Servicio Social). En desarrollo, el enlace de
// recuperación se registra en consola; sustituir esta función por una
// integración real (nodemailer, SES, etc.) cuando el correo institucional
// esté disponible.
const { validateEnv } = require('../config/env')

const env = validateEnv()

async function enviarCorreoRecuperacion(correoDestino, tokenPlano) {
  const enlace = `${env.clientUrl}/restablecer-password?token=${tokenPlano}`
  console.log(`[email.service] Recuperación de contraseña para ${correoDestino}: ${enlace}`)
}

module.exports = { enviarCorreoRecuperacion }
