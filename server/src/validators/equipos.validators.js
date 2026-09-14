const Joi = require('joi')

const integrantesSchema = Joi.array().items(Joi.number().integer().positive()).length(3).unique().required()

const crearEquipoSchema = Joi.object({
  id_materia: Joi.number().integer().positive().required(),
  nombre: Joi.string().trim().max(100).required(),
  tipo: Joi.string().valid('Practica', 'Tarea', 'Proyecto').required(),
  integrantes: integrantesSchema,
})

const actualizarEquipoSchema = Joi.object({
  nombre: Joi.string().trim().max(100).required(),
  integrantes: integrantesSchema,
})

const generarEquiposSchema = Joi.object({
  id_materia: Joi.number().integer().positive().required(),
  tipo: Joi.string().valid('Practica', 'Tarea', 'Proyecto').required(),
})

module.exports = { crearEquipoSchema, actualizarEquipoSchema, generarEquiposSchema }
