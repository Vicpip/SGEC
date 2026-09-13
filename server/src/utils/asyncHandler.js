// Express 4 no captura rechazos de promesas en handlers async automáticamente;
// este wrapper los reenvía al middleware de errores de app.js.
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
}

module.exports = asyncHandler
