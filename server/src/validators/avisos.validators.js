const Joi = require('joi')

// crear llega como multipart/form-data (por los archivos adjuntos vía multer): Joi
// convierte los strings entrantes a sus tipos reales (ver validate.middleware.js).
// id_materia se omite del formulario cuando el profesor elige "Todas mis materias"
// (aviso global) — nunca llega como cadena vacía.
const crearAvisoSchema = Joi.object({
  id_materia: Joi.number().integer().positive(),
  titulo: Joi.string().trim().max(150).required(),
  contenido: Joi.string().trim().required(),
})

module.exports = { crearAvisoSchema }
