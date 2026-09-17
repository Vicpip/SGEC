const Joi = require('joi')

// crear llega como multipart/form-data (por los archivos adjuntos vía multer): Joi
// convierte los strings entrantes ("3") a sus tipos reales (ver validate.middleware.js).
const crearEntregaSchema = Joi.object({
  id_actividad: Joi.number().integer().positive().required(),
  comentario: Joi.string().trim().max(2000).allow('', null),
})

module.exports = { crearEntregaSchema }
