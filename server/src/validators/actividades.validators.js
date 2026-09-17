const Joi = require('joi')

// crear llega como multipart/form-data (por los archivos adjuntos vía multer): Joi
// convierte los strings entrantes ("true"/"false", "3", fechas ISO) a sus tipos reales
// (ver validate.middleware.js, que reasigna req.body con el valor ya convertido).
const crearActividadSchema = Joi.object({
  id_materia: Joi.number().integer().positive().required(),
  id_equipo: Joi.number().integer().positive(),
  todos_los_equipos: Joi.boolean().default(false),
  entrega_por_equipo: Joi.boolean().default(false),
  titulo: Joi.string().trim().max(150).required(),
  descripcion: Joi.string().trim().allow('', null),
  tipo: Joi.string().valid('En clase', 'Practica', 'Tarea', 'Proyecto').required(),
  fecha_limite: Joi.date().iso().required(),
  programada: Joi.boolean().default(false),
  fecha_publicacion: Joi.date().iso().allow('', null),
})

const actualizarActividadSchema = Joi.object({
  titulo: Joi.string().trim().max(150).required(),
  descripcion: Joi.string().trim().allow('', null),
  fecha_limite: Joi.date().iso().required(),
  programada: Joi.boolean().default(false),
  fecha_publicacion: Joi.date().iso().allow('', null),
  entrega_por_equipo: Joi.boolean().default(false),
})

module.exports = { crearActividadSchema, actualizarActividadSchema }
