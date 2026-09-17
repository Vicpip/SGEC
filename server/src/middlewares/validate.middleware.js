function validateBody(schema) {
  return function (req, res, next) {
    const { error, value } = schema.validate(req.body, { abortEarly: false })

    if (error) {
      return res.status(400).json({
        message: 'Datos inválidos',
        errores: error.details.map((d) => d.message),
      })
    }

    // Reasigna el body con los valores convertidos por Joi (p. ej. multipart/form-data
    // manda todo como string: "true"/"false", "3"): sin esto los controladores reciben
    // los strings originales sin castear, aunque la validación haya pasado.
    req.body = value
    next()
  }
}

module.exports = { validateBody }
