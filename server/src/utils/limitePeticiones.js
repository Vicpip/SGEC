// Respuesta común de los limitadores de peticiones (express-rate-limit). Además de responder
// 429, deja en el log la IP que el limitador está contando — una sola vez por ventana, la
// primera petición rechazada — para poder comprobar en producción que es la IP real del
// cliente y no la del proxy (ver TRUST_PROXY en config/env.js).
function alExcederLimite(etiqueta) {
  return function (req, res, next, options) {
    if (req.rateLimit && req.rateLimit.used === req.rateLimit.limit + 1) {
      console.warn(`[rate-limit] ${etiqueta}: límite alcanzado para la IP ${req.ip}`)
    }
    res.status(options.statusCode).json(options.message)
  }
}

module.exports = { alExcederLimite }
