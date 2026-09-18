const Joi = require('joi')

// La validación de negocio completa (boleta de 10 dígitos, dominio @alumno.ipn.mx) vive
// en excel.service.js (validarAlumno), compartida con la importación masiva — este schema
// solo exige la forma mínima del payload antes de llegar al controlador.
const crearAlumnoSchema = Joi.object({
  boleta: Joi.string().trim().max(15).required(),
  nombre: Joi.string().trim().max(100).required(),
  apellido_paterno: Joi.string().trim().max(100).required(),
  apellido_materno: Joi.string().trim().max(100).allow('', null),
  correo: Joi.string().trim().max(150).required(),
  grupo: Joi.string().trim().max(10).required(),
  materia: Joi.string().trim().max(20).required(),
})

module.exports = { crearAlumnoSchema }
