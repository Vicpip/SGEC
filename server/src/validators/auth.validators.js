const Joi = require('joi')

// Regla compartida por reset-password y change-password: mínimo 8 caracteres,
// al menos una mayúscula y al menos un número (coincide con el copy de
// client/src/pages/perfil/Perfil.jsx).
const contrasenaSegura = Joi.string()
  .min(8)
  .pattern(/^(?=.*[A-Z])(?=.*[0-9]).+$/)
  .required()
  .messages({
    'string.min': 'La contraseña debe tener al menos 8 caracteres',
    'string.pattern.base': 'La contraseña debe incluir al menos una mayúscula y un número',
  })

const loginSchema = Joi.object({
  correo_institucional: Joi.string().email({ tlds: false }).required(),
  contrasena: Joi.string().required(),
  rol: Joi.string().valid('Administrador', 'Profesor', 'Alumno').required(),
})

const forgotPasswordSchema = Joi.object({
  correo_institucional: Joi.string().email({ tlds: false }).required(),
})

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  nueva_contrasena: contrasenaSegura,
})

const changePasswordSchema = Joi.object({
  contrasena_actual: Joi.string().required(),
  nueva_contrasena: contrasenaSegura,
})

module.exports = {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
}
