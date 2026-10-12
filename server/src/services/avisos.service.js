// Regla de visibilidad de un aviso para un Alumno, compartida por el Tablón
// (avisos.controller.js) y el Panel del Alumno (dashboard.controller.js) para que ambos
// cuenten exactamente los mismos avisos.
//
// Un alumno ve: los avisos de las materias en las que tiene inscripción vigente, más los
// avisos globales (id_materia = NULL) de los profesores que le imparten alguna materia
// ACTIVA (estatus != 'Cerrada') — nunca los globales de otros profesores.
//
// Devuelve un fragmento SQL para el WHERE; lleva DOS placeholders, ambos el id_alumno.
function condicionAvisoVisibleAlumnoSQL(alias) {
  return `(
        -- Aviso dirigido a una materia específica: el alumno debe estar inscrito en ella.
        (${alias}.id_materia IS NOT NULL AND ${alias}.id_materia IN (SELECT id_materia FROM materia_alumno WHERE id_alumno = ? AND activo = TRUE))
        OR
        -- Aviso global (id_materia = NULL): dirigido a todos los alumnos de todas las
        -- materias ACTIVAS de ese profesor — nunca a todos los alumnos del sistema.
        (${alias}.id_materia IS NULL AND ${alias}.id_profesor IN (
          SELECT DISTINCT m2.id_profesor
          FROM materia m2
          JOIN materia_alumno ma2 ON ma2.id_materia = m2.id_materia
          WHERE ma2.id_alumno = ? AND ma2.activo = TRUE AND m2.estatus != 'Cerrada'
        ))
      )`
}

module.exports = { condicionAvisoVisibleAlumnoSQL }
