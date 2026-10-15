const Joi = require('joi')

const { INTEGRANTES_TOPE } = require('../services/asignacion.service')

// Alta y edición manual: aquí solo se acota a un rango absoluto (1 a 10). El rango real lo
// define cada materia (materia.equipo_min y equipo_max, 3 y 4 por defecto) y lo comprueba
// equipos.controller.js, porque depende de la base de datos.
const integrantesSchema = Joi.array()
  .items(Joi.number().integer().positive())
  .min(1)
  .max(INTEGRANTES_TOPE)
  .unique()
  .required()
  .messages({
    'array.min': 'Un equipo debe tener al menos 1 integrante',
    'array.max': `Un equipo puede tener como máximo ${INTEGRANTES_TOPE} integrantes`,
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
