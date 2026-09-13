const Joi = require('joi')

const crearSemestreSchema = Joi.object({
  clave: Joi.string().trim().max(10).required(),
  fecha_inicio: Joi.date().iso().required(),
  fecha_fin: Joi.date().iso().min(Joi.ref('fecha_inicio')).required().messages({
    'date.min': 'La fecha de fin debe ser posterior a la fecha de inicio',
  }),
})

const actualizarSemestreSchema = Joi.object({
  clave: Joi.string().trim().max(10).required(),
  fecha_inicio: Joi.date().iso().required(),
  fecha_fin: Joi.date().iso().min(Joi.ref('fecha_inicio')).required().messages({
    'date.min': 'La fecha de fin debe ser posterior a la fecha de inicio',
  }),
  activo: Joi.boolean().required(),
})

module.exports = { crearSemestreSchema, actualizarSemestreSchema }
