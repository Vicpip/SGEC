const Joi = require('joi')

const { INTEGRANTES_TOPE } = require('../services/asignacion.service')

// Configuración de equipos de la materia (migración 008). Todos los campos son opcionales:
// en el alta, los que falten toman el valor por defecto; en la edición, los que falten
// conservan el valor actual (el Administrador usa el mismo PUT y no los manda). La
// coherencia entre campos (mínimo ≤ tamaño automático ≤ máximo, al menos un tipo) se
// comprueba en materias.controller.js, después de combinarlos con los valores vigentes.
const tamanoEquipo = Joi.number()
  .integer()
  .min(1)
  .max(INTEGRANTES_TOPE)
  .messages({
    'number.base': 'El campo {#label} debe ser un número',
    'number.integer': 'El campo {#label} debe ser un número entero',
    'number.min': 'El campo {#label} debe ser al menos 1',
    'number.max': `El campo {#label} no puede ser mayor que ${INTEGRANTES_TOPE}`,
  })

const tipoUsado = Joi.boolean().messages({ 'boolean.base': 'El campo {#label} debe ser verdadero o falso' })

const ajustesEquipos = {
  equipo_tamano_auto: tamanoEquipo,
  equipo_min: tamanoEquipo,
  equipo_max: tamanoEquipo,
  regla_repeticion: Joi.string()
    .valid('A', 'B')
    .messages({ 'any.only': 'La regla de repetición debe ser A o B', 'string.base': 'La regla de repetición debe ser A o B' }),
  usa_practica: tipoUsado,
  usa_tarea: tipoUsado,
  usa_proyecto: tipoUsado,
}

// id_profesor es opcional aquí: para un Profesor se ignora y se usa su propio
// id_profesor (ver materias.controller.js); solo un Administrador puede fijarlo
// para dar de alta o reasignar la materia a un profesor específico.
const crearMateriaSchema = Joi.object({
  clave: Joi.string().trim().max(20).required(),
  nombre: Joi.string().trim().max(150).required(),
  grupo: Joi.string().trim().max(10).required(),
  id_semestre: Joi.number().integer().positive().required(),
  id_profesor: Joi.number().integer().positive(),
  ...ajustesEquipos,
})

const actualizarMateriaSchema = Joi.object({
  clave: Joi.string().trim().max(20).required(),
  nombre: Joi.string().trim().max(150).required(),
  grupo: Joi.string().trim().max(10).required(),
  id_semestre: Joi.number().integer().positive().required(),
  estatus: Joi.string().valid('Activa', 'En curso', 'Cerrada').required(),
  id_profesor: Joi.number().integer().positive(),
  ...ajustesEquipos,
})

module.exports = { crearMateriaSchema, actualizarMateriaSchema }
