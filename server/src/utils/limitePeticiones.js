const jwt = require('jsonwebtoken')
const { rateLimit, ipKeyGenerator } = require('express-rate-limit')

// Limitadores de peticiones (express-rate-limit) del servidor.
//
// Contexto: detrás del Nginx del host (TRUST_PROXY) req.ip es la IP pública real del cliente,
// pero en ESCOM muchos alumnos salen a internet por la MISMA IP. Por eso ningún límite debe
// poder bloquear a todo un grupo por culpa de una sola persona:
//   - login: cuenta solo intentos FALLIDOS, por IP + correo (5 por 15 min) y, como tope de
//     fuerza bruta contra muchos correos, por IP sola (50 fallos por 15 min).
//   - forgot-password: su respuesta es siempre la misma 200 genérica (no revela si el correo
//     existe), así que no hay "fallo" que contar; cuenta toda solicitud, por IP + correo
//     (3 por 15 min) y por IP sola (30 por 15 min).
//   - general (/api): por usuario autenticado cuando el token es válido; por IP cuando no.
//     600 peticiones por 15 min por clave.

const QUINCE_MINUTOS = 15 * 60 * 1000

const LIMITE_LOGIN_POR_CORREO = 5
const LIMITE_LOGIN_POR_IP = 50
const LIMITE_FORGOT_POR_CORREO = 3
const LIMITE_FORGOT_POR_IP = 30
const LIMITE_GENERAL = 600

// Respuesta común de los limitadores. Además de responder 429, deja en el log la clave que el
// limitador está contando — una sola vez por ventana, la primera petición rechazada — para
// comprobar en producción que es la IP real del cliente y no la del proxy. El correo no se
// registra completo: solo su dominio.
function alExcederLimite(etiqueta) {
  return function (req, res, next, options) {
    if (req.rateLimit && req.rateLimit.used === req.rateLimit.limit + 1) {
      const correo = correoNormalizado(req)
      const detalle = correo ? ` (correo @${correo.split('@')[1] || '?'})` : ''
      console.warn(`[rate-limit] ${etiqueta}: límite alcanzado para la IP ${req.ip}${detalle}`)
    }
    res.status(options.statusCode).json(options.message)
  }
}

function correoNormalizado(req) {
  const correo = req.body && req.body.correo_institucional
  return typeof correo === 'string' ? correo.trim().toLowerCase() : ''
}

// ipKeyGenerator agrupa las IPv6 por subred (/56), como hace express-rate-limit por defecto.
function claveIp(req) {
  return ipKeyGenerator(req.ip)
}

function claveIpCorreo(req) {
  return `${claveIp(req)}|${correoNormalizado(req)}`
}

function crearLimitador({ limit, etiqueta, mensaje, keyGenerator, soloFallidos = false }) {
  return rateLimit({
    windowMs: QUINCE_MINUTOS,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    // Cuenta solo respuestas con estatus >= 400 (credenciales incorrectas, cuenta inactiva,
    // dominio no permitido…). Un inicio de sesión correcto no consume el límite.
    skipSuccessfulRequests: soloFallidos,
    keyGenerator,
    message: { error: mensaje },
    handler: alExcederLimite(etiqueta),
  })
}

const MENSAJE_LOGIN = 'Demasiados intentos de inicio de sesión. Intenta de nuevo más tarde.'
const MENSAJE_FORGOT = 'Demasiadas solicitudes. Intenta de nuevo más tarde.'

// Orden: primero el de IP + correo (el que normalmente se alcanza), después el de IP sola.
function limitadoresLogin() {
  return [
    crearLimitador({
      limit: LIMITE_LOGIN_POR_CORREO,
      etiqueta: 'login',
      mensaje: MENSAJE_LOGIN,
      keyGenerator: claveIpCorreo,
      soloFallidos: true,
    }),
    crearLimitador({
      limit: LIMITE_LOGIN_POR_IP,
      etiqueta: 'login-ip',
      mensaje: MENSAJE_LOGIN,
      keyGenerator: claveIp,
      soloFallidos: true,
    }),
  ]
}

function limitadoresForgotPassword() {
  return [
    crearLimitador({
      limit: LIMITE_FORGOT_POR_CORREO,
      etiqueta: 'forgot-password',
      mensaje: MENSAJE_FORGOT,
      keyGenerator: claveIpCorreo,
    }),
    crearLimitador({
      limit: LIMITE_FORGOT_POR_IP,
      etiqueta: 'forgot-password-ip',
      mensaje: MENSAJE_FORGOT,
      keyGenerator: claveIp,
    }),
  ]
}

// Límite general: la clave es el usuario del token si su firma es válida (no se consulta la
// base: para contar peticiones basta con saber de quién es el token; auth.middleware sigue
// decidiendo si la cuenta puede entrar). Sin token válido, la IP.
function limitadorGeneral(jwtSecret) {
  return crearLimitador({
    limit: LIMITE_GENERAL,
    etiqueta: 'api',
    mensaje: 'Demasiadas peticiones. Intenta de nuevo más tarde.',
    keyGenerator: (req) => {
      const header = req.headers.authorization
      if (header && header.startsWith('Bearer ')) {
        try {
          const payload = jwt.verify(header.slice(7), jwtSecret)
          if (payload && payload.id_usuario) return `usuario:${payload.id_usuario}`
        } catch {
          // Token inválido o vencido: cuenta por IP.
        }
      }
      return `ip:${claveIp(req)}`
    },
  })
}

module.exports = {
  alExcederLimite,
  limitadoresLogin,
  limitadoresForgotPassword,
  limitadorGeneral,
  LIMITE_GENERAL,
}
