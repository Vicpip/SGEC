const Joi = require('joi')

const registrarCalificacionSchema = Joi.object({
  id_actividad: Joi.number().integer().positive().required(),
  id_equipo: Joi.number().integer().positive().required(),
  nota: Joi.number().min(0).max(10).precision(2).required(),
  comentario: Joi.string().trim().max(2000).allow('', null),
})

const ajustarIndividualSchema = Joi.object({
  nota: Joi.number().min(0).max(10).precision(2).required(),
  comentario: Joi.string().trim().max(2000).allow('', null),
})

module.exports = { registrarCalificacionSchema, ajustarIndividualSchema }
