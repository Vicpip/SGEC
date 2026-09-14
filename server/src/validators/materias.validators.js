const Joi = require('joi')

// id_profesor es opcional aquí: para un Profesor se ignora y se usa su propio
// id_profesor (ver materias.controller.js); solo un Administrador puede fijarlo
// para dar de alta o reasignar la materia a un profesor específico.
const crearMateriaSchema = Joi.object({
  clave: Joi.string().trim().max(20).required(),
  nombre: Joi.string().trim().max(150).required(),
  grupo: Joi.string().trim().max(10).required(),
  id_semestre: Joi.number().integer().positive().required(),
  id_profesor: Joi.number().integer().positive(),
})

const actualizarMateriaSchema = Joi.object({
  clave: Joi.string().trim().max(20).required(),
  nombre: Joi.string().trim().max(150).required(),
  grupo: Joi.string().trim().max(10).required(),
  id_semestre: Joi.number().integer().positive().required(),
  estatus: Joi.string().valid('Activa', 'En curso', 'Cerrada').required(),
  id_profesor: Joi.number().integer().positive(),
})

module.exports = { crearMateriaSchema, actualizarMateriaSchema }
