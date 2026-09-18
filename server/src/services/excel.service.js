// Parseo y validación de listas de alumnos importadas desde archivos .xlsx (SheetJS).
// Valida errores fila por fila antes de insertar en la base de datos; nunca aborta
// el archivo completo por una fila inválida (ver alumnos.controller.js).
//
// Columnas esperadas en la hoja (encabezados insensibles a mayúsculas/acentos):
// boleta, nombre, apellido_paterno, apellido_materno (opcional), correo_institucional,
// grupo, carrera (opcional).

const XLSX = require('xlsx')
const { dominioValido } = require('../utils/correoInstitucional')

function normalizarEncabezado(encabezado) {
  return String(encabezado ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '_')
}

// Reglas de negocio compartidas por la importación masiva (parsearAlumnosDesdeExcel,
// fila por fila) y el alta manual de un alumno (alumnos.controller.js, crear): boleta
// de 10 dígitos, campos requeridos, correo del dominio institucional del Alumno.
function validarAlumno({ boleta, nombre, apellido_paterno, grupo, correo_institucional }) {
  const errores = []

  if (!boleta) {
    errores.push('El campo "boleta" es requerido')
  } else if (!/^\d{10}$/.test(boleta)) {
    errores.push('El campo "boleta" debe contener 10 dígitos numéricos')
  }

  if (!nombre) errores.push('El campo "nombre" es requerido')
  if (!apellido_paterno) errores.push('El campo "apellido_paterno" es requerido')
  if (!grupo) errores.push('El campo "grupo" es requerido')

  if (!correo_institucional) {
    errores.push('El campo "correo_institucional" es requerido')
  } else if (!dominioValido(correo_institucional, 'Alumno')) {
    errores.push('El campo "correo_institucional" debe pertenecer al dominio @alumno.ipn.mx')
  }

  return errores
}

function parsearAlumnosDesdeExcel(buffer) {
  const libro = XLSX.read(buffer, { type: 'buffer' })
  const hoja = libro.Sheets[libro.SheetNames[0]]

  if (!hoja) {
    throw new Error('El archivo no contiene hojas de cálculo')
  }

  const filasCrudas = XLSX.utils.sheet_to_json(hoja, { defval: '', raw: false })

  return filasCrudas.map((filaCruda, indice) => {
    const fila = {}
    for (const [clave, valor] of Object.entries(filaCruda)) {
      fila[normalizarEncabezado(clave)] = typeof valor === 'string' ? valor.trim() : valor
    }

    const boleta = String(fila.boleta ?? '').trim()
    const nombre = String(fila.nombre ?? '').trim()
    const apellidoPaterno = String(fila.apellido_paterno ?? '').trim()
    const apellidoMaterno = String(fila.apellido_materno ?? '').trim()
    const correo = String(fila.correo_institucional ?? '').trim().toLowerCase()
    const grupo = String(fila.grupo ?? '').trim()
    const carrera = String(fila.carrera ?? '').trim()

    const datos = {
      boleta,
      nombre,
      apellido_paterno: apellidoPaterno,
      apellido_materno: apellidoMaterno || null,
      correo_institucional: correo,
      grupo,
      carrera: carrera || null,
    }

    return {
      numero_fila: indice + 2, // fila 1 = encabezados
      datos,
      errores: validarAlumno(datos),
    }
  })
}

module.exports = { parsearAlumnosDesdeExcel, validarAlumno }
