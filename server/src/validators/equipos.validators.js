const Joi = require('joi')

const { INTEGRANTES_MIN, INTEGRANTES_MAX } = require('../services/asignacion.service')

// Alta y edición manual: 3 o 4 integrantes (nunca menos de 3, nunca más de 4), para que el
// profesor pueda absorber a los alumnos que sobran de la asignación automática (que siempre
// forma equipos de exactamente 3).
const integrantesSchema = Joi.array()
  .items(Joi.number().integer().positive())
  .min(INTEGRANTES_MIN)
  .max(INTEGRANTES_MAX)
  .unique()
  .required()
  .messages({
    'array.min': 'Un equipo debe tener al menos 3 integrantes',
    'array.max': 'Un equipo puede tener como máximo 4 integrantes',
    'array.unique': 'Un alumno no puede repetirse en el mismo equipo',
  })

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
