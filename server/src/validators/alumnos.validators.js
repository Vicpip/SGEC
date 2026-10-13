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
  carrera: Joi.string().trim().max(100).allow('', null),
  materia: Joi.string().trim().max(20).required(),
  // Opcionales: desambiguan la clave cuando el profesor la reutilizó en otro semestre
  // (ver services/materias.service.js).
  id_materia: Joi.number().integer().positive(),
  semestre: Joi.string().trim().max(10),
})

// El correo institucional no es editable: al no estar en el schema, Joi rechaza la
// petición (400) si el cliente lo envía, igual que cualquier otro campo desconocido.
const actualizarAlumnoSchema = Joi.object({
  boleta: Joi.string()
    .trim()
    .pattern(/^\d{10}$/)
    .required()
    .messages({ 'string.pattern.base': 'El campo "boleta" debe contener 10 dígitos numéricos' }),
  nombre: Joi.string().trim().max(100).required(),
  apellido_paterno: Joi.string().trim().max(100).required(),
  apellido_materno: Joi.string().trim().max(100).allow('', null),
  grupo: Joi.string().trim().max(10).required(),
  carrera: Joi.string().trim().max(100).allow('', null),
})

module.exports = { crearAlumnoSchema, actualizarAlumnoSchema }
