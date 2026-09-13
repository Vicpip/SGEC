const Joi = require('joi')

const contrasenaSegura = Joi.string()
  .min(8)
  .pattern(/^(?=.*[A-Z])(?=.*[0-9]).+$/)
  .required()
  .messages({
    'string.min': 'La contraseña debe tener al menos 8 caracteres',
    'string.pattern.base': 'La contraseña debe incluir al menos una mayúscula y un número',
  })

// Los alumnos se dan de alta por importación de Excel (ver excel.service.js),
// no por este endpoint — solo Profesor/Administrador se crean aquí.
const crearUsuarioSchema = Joi.object({
  correo_institucional: Joi.string().email({ tlds: false }).required(),
  contrasena: contrasenaSegura,
  rol: Joi.string().valid('Administrador', 'Profesor').required(),
  nombre: Joi.string().trim().max(100).required(),
  apellido_paterno: Joi.string().trim().max(100).required(),
  apellido_materno: Joi.string().trim().max(100).allow('', null),
  no_empleado: Joi.string().trim().max(20).when('rol', {
    is: 'Profesor',
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
  departamento: Joi.string().trim().max(100).allow('', null),
})

const actualizarUsuarioSchema = Joi.object({
  nombre: Joi.string().trim().max(100).required(),
  apellido_paterno: Joi.string().trim().max(100).required(),
  apellido_materno: Joi.string().trim().max(100).allow('', null),
  correo_alterno: Joi.string().email({ tlds: false }).allow('', null),
  notificaciones_email: Joi.boolean(),
  no_empleado: Joi.string().trim().max(20),
  departamento: Joi.string().trim().max(100).allow('', null),
})

module.exports = { crearUsuarioSchema, actualizarUsuarioSchema }
