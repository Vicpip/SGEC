// Resolución de una materia a partir de su clave (?materia=<clave> en alumnos, equipos y
// actividades). La clave NO es única en el sistema: dos profesores pueden impartir la misma
// unidad de aprendizaje en el mismo semestre, y una clave puede reutilizarse en otro
// semestre. Por eso la búsqueda nunca se hace sobre todas las materias: siempre se acota a
// quien llama, con su identidad tomada del JWT verificado.
//
//   - Profesor: solo sus materias (materia.id_profesor = su id_profesor).
//   - Alumno: solo materias en las que tiene inscripción vigente (materia_alumno.activo).
//   - Administrador: debe indicar además `semestre` o `id_materia`.
//
// `id_materia` y `semestre` son opcionales y sirven para desambiguar. Si después de
// aplicarlos sigue habiendo más de una materia:
//   - Alumno y Administrador reciben 400 (clave ambigua).
//   - Profesor: se toma la más reciente de las suyas. Dentro de un mismo semestre ya no
//     puede ocurrir (materias.controller.js rechaza con 409 que un profesor repita clave en
//     el semestre); solo queda el caso de una clave reutilizada en otro semestre, donde la
//     materia vigente es la última creada (ver docs/LIMITACIONES.md §1).
//
// Devuelve { materia } o { error: { status, mensaje } }.

const pool = require('../config/db')

async function resolverMateriaPorClave(usuario, { clave, idMateria, semestre } = {}) {
  const claveLimpia = typeof clave === 'string' ? clave.trim() : ''
  const semestreLimpio = typeof semestre === 'string' ? semestre.trim() : ''
  const hayId = idMateria !== undefined && idMateria !== null && idMateria !== ''

  if (!claveLimpia && !hayId) {
    return { error: { status: 400, mensaje: 'El parámetro materia (clave) es requerido' } }
  }
  if (hayId && !/^\d+$/.test(String(idMateria))) {
    return { error: { status: 400, mensaje: 'El parámetro id_materia no es válido' } }
  }

  const condiciones = []
  const params = []

  if (usuario.rol === 'Profesor') {
    condiciones.push('m.id_profesor = (SELECT p.id_profesor FROM profesor p WHERE p.id_usuario = ?)')
    params.push(usuario.id_usuario)
  } else if (usuario.rol === 'Alumno') {
    condiciones.push(
      `EXISTS (SELECT 1 FROM materia_alumno ma JOIN alumno a ON a.id_alumno = ma.id_alumno
               WHERE ma.id_materia = m.id_materia AND ma.activo = TRUE AND a.id_usuario = ?)`
    )
    params.push(usuario.id_usuario)
  } else if (usuario.rol === 'Administrador') {
    if (!hayId && !semestreLimpio) {
      return {
        error: { status: 400, mensaje: 'Indica también el semestre o el id de la materia: la clave puede repetirse' },
      }
    }
  } else {
    return { error: { status: 403, mensaje: 'No tienes permiso para acceder a este recurso' } }
  }

  if (hayId) {
    condiciones.push('m.id_materia = ?')
    params.push(Number(idMateria))
  }
  if (claveLimpia) {
    condiciones.push('m.clave = ?')
    params.push(claveLimpia)
  }
  if (semestreLimpio) {
    condiciones.push('s.clave = ?')
    params.push(semestreLimpio)
  }

  const [rows] = await pool.query(
    `SELECT m.id_materia, m.clave, m.nombre, m.grupo, m.id_profesor, m.estatus, s.clave AS semestre,
            m.equipo_tamano_auto, m.equipo_min, m.equipo_max, m.regla_repeticion,
            m.usa_practica, m.usa_tarea, m.usa_proyecto
     FROM materia m
     JOIN semestre s ON s.id_semestre = m.id_semestre
     WHERE ${condiciones.join(' AND ')}
     ORDER BY m.fecha_creacion DESC, m.id_materia DESC`,
    params
  )

  if (rows.length === 0) {
    return { error: { status: 404, mensaje: 'Materia no encontrada' } }
  }
  if (rows.length > 1 && usuario.rol !== 'Profesor') {
    return {
      error: {
        status: 400,
        mensaje: 'Hay más de una materia con esa clave: indica el semestre o el id de la materia',
      },
    }
  }

  return { materia: rows[0] }
}

module.exports = { resolverMateriaPorClave }
