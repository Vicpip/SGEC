const Joi = require('joi')

// crear llega como multipart/form-data (por los archivos adjuntos vía multer): Joi
// convierte los strings entrantes ("true"/"false", "3", fechas ISO) a sus tipos reales
// (ver validate.middleware.js, que reasigna req.body con el valor ya convertido).
// Tipo de actividad a evaluar (Ejercicio, Mapa mental, Cuestionario…): texto libre, no
// altera el ENUM `tipo`. Más de 60 caracteres se rechaza (400), no se trunca en silencio.
const tipoEvaluacion = Joi.string().trim().max(60).allow('', null)

const crearActividadSchema = Joi.object({
  id_materia: Joi.number().integer().positive().required(),
  id_equipo: Joi.number().integer().positive(),
  todos_los_equipos: Joi.boolean().default(false),
  entrega_por_equipo: Joi.boolean().default(false),
  titulo: Joi.string().trim().max(150).required(),
  descripcion: Joi.string().trim().allow('', null),
  tipo: Joi.string().valid('En clase', 'Practica', 'Tarea', 'Proyecto').required(),
  tipo_evaluacion: tipoEvaluacion,
  fecha_limite: Joi.date().iso().required(),
  programada: Joi.boolean().default(false),
  fecha_publicacion: Joi.date().iso().allow('', null),
})

// tipo, entrega_por_equipo y el destino (todos_los_equipos / id_equipo) son opcionales al
// editar: si no vienen se conservan los valores actuales. Por eso NO llevan default — un
// default los cambiaría sin que el cliente lo pidiera. Cambiarlos está prohibido cuando la
// actividad ya tiene entregas (ver actividades.controller.js, actualizar).
const actualizarActividadSchema = Joi.object({
  titulo: Joi.string().trim().max(150).required(),
  descripcion: Joi.string().trim().allow('', null),
  tipo_evaluacion: tipoEvaluacion,
  fecha_limite: Joi.date().iso().required(),
  programada: Joi.boolean().default(false),
  fecha_publicacion: Joi.date().iso().allow('', null),
  tipo: Joi.string().valid('En clase', 'Practica', 'Tarea', 'Proyecto'),
  entrega_por_equipo: Joi.boolean(),
  todos_los_equipos: Joi.boolean(),
  id_equipo: Joi.number().integer().positive().allow(null),
})

module.exports = { crearActividadSchema, actualizarActividadSchema }
