// Correo saliente por SMTP (nodemailer). Es OPCIONAL: sin SMTP_HOST no se envía nada y
// ningún flujo se rompe — el acceso de los alumnos no depende del correo (ver la
// contraseña temporal en alumnos.controller.js).
//
// Reglas de este archivo:
//   - Nunca se registra en consola el cuerpo del mensaje, enlaces, tokens ni contraseñas.
//     En EMAIL_DRY_RUN=true solo se registran destinatario y asunto, y no se envía nada.
//   - Un fallo de envío nunca se propaga a quien llama: enviar() resuelve siempre (true si
//     el mensaje se entregó al servidor SMTP, false en cualquier otro caso).
//   - La contraseña temporal jamás viaja por correo: el correo de bienvenida solo lleva el
//     enlace de activación (el mismo mecanismo de token que "olvidé mi contraseña").
const nodemailer = require('nodemailer')
const { validateEnv } = require('../config/env')

const env = validateEnv()

let transporte = null

function correoHabilitado() {
  return env.emailDryRun || Boolean(env.smtp.host)
}

function obtenerTransporte() {
  if (!transporte) {
    transporte = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
      pool: true,
      maxConnections: 2,
    })
  }
  return transporte
}

function escaparHtml(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function enlaceRestablecer(tokenPlano) {
  return `${env.clientUrl}/restablecer-password?token=${encodeURIComponent(tokenPlano)}`
}

async function enviar({ para, asunto, texto, html }) {
  if (env.emailDryRun) {
    console.log(`[email.service] DRY RUN — para: ${para} | asunto: ${asunto}`)
    return false
  }

  if (!env.smtp.host) {
    return false
  }

  try {
    await obtenerTransporte().sendMail({ from: env.smtp.from, to: para, subject: asunto, text: texto, html })
    return true
  } catch (err) {
    // Solo el código del error: el mensaje completo de nodemailer puede incluir la
    // respuesta del servidor SMTP y no aporta nada al registro.
    console.error(`[email.service] No se pudo enviar el correo (${err.code || err.name || 'error'})`)
    return false
  }
}

function enviarCorreoRecuperacion(correoDestino, tokenPlano) {
  const enlace = enlaceRestablecer(tokenPlano)
  return enviar({
    para: correoDestino,
    asunto: 'SGEC — Restablece tu contraseña',
    texto:
      'Recibimos una solicitud para restablecer tu contraseña del SGEC.\n\n' +
      `Abre este enlace para elegir una nueva (vigente 24 horas):\n${enlace}\n\n` +
      'Si no fuiste tú, ignora este mensaje: tu contraseña no cambia.',
    html:
      '<p>Recibimos una solicitud para restablecer tu contraseña del SGEC.</p>' +
      `<p><a href="${escaparHtml(enlace)}">Elegir una nueva contraseña</a> (enlace vigente 24 horas).</p>` +
      '<p>Si no fuiste tú, ignora este mensaje: tu contraseña no cambia.</p>',
  })
}

function enviarCorreoBienvenida(correoDestino, tokenPlano, nombre) {
  const enlace = enlaceRestablecer(tokenPlano)
  return enviar({
    para: correoDestino,
    asunto: 'SGEC — Activa tu cuenta',
    texto:
      `Hola ${nombre}:\n\n` +
      'Tu profesor te dio de alta en el Sistema de Gestión de Equipos Colaborativos (SGEC) de ESCOM.\n\n' +
      `Abre este enlace para elegir tu contraseña (vigente 24 horas):\n${enlace}\n\n` +
      'Si el enlace ya venció, pide a tu profesor tu contraseña temporal.',
    html:
      `<p>Hola ${escaparHtml(nombre)}:</p>` +
      '<p>Tu profesor te dio de alta en el Sistema de Gestión de Equipos Colaborativos (SGEC) de ESCOM.</p>' +
      `<p><a href="${escaparHtml(enlace)}">Elegir mi contraseña</a> (enlace vigente 24 horas).</p>` +
      '<p>Si el enlace ya venció, pide a tu profesor tu contraseña temporal.</p>',
  })
}

module.exports = { correoHabilitado, enviarCorreoRecuperacion, enviarCorreoBienvenida }
