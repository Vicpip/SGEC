// A qué equipos va dirigida una actividad y, para un alumno, si una actividad le corresponde.
//
// 'Practica' y 'Tarea' comparten integrantes; 'En clase' se asigna a los mismos equipos que
// 'Tarea' (ver CLAUDE.md — reglas críticas de negocio). Antes esta función estaba repetida en
// los controladores de actividades, alumnos, calificaciones y entregas.

const TIPO_EQUIPO_POR_ACTIVIDAD = { Proyecto: 'Proyecto', Practica: 'Practica' }
const TIPO_EQUIPO_POR_DEFECTO = 'Tarea'

function tipoEquipoParaActividad(tipoActividad) {
  return TIPO_EQUIPO_POR_ACTIVIDAD[tipoActividad] ?? TIPO_EQUIPO_POR_DEFECTO
}

// La misma correspondencia como expresión SQL sobre la columna `tipo` de la actividad.
function tipoEquipoParaActividadSQL(alias) {
  const casos = Object.entries(TIPO_EQUIPO_POR_ACTIVIDAD)
    .map(([actividad, equipo]) => `WHEN '${actividad}' THEN '${equipo}'`)
    .join(' ')
  return `CASE ${alias}.tipo ${casos} ELSE '${TIPO_EQUIPO_POR_DEFECTO}' END`
}

// Condición SQL: la actividad `alias` está dirigida al alumno. Lleva DOS placeholders, ambos
// con el id_alumno. Solo cuentan los equipos ACTIVOS del alumno:
//   - todos_los_equipos = TRUE: el alumno tiene un equipo activo, en la materia de la
//     actividad, del tipo que le corresponde (tipoEquipoParaActividad). Un alumno sin ese
//     equipo (por ejemplo, inscrito después de formar los equipos, o en el otro bloque con la
//     regla de repetición 'A') no la ve.
//   - todos_los_equipos = FALSE: el equipo destino (id_equipo) es uno activo del alumno.
// Es la misma condición que exige entregas.controller.js para entregar.
function condicionActividadDirigidaAlumnoSQL(alias) {
  return `(
    (${alias}.todos_los_equipos = TRUE AND EXISTS (
      SELECT 1 FROM equipo_alumno ea_dest
      JOIN equipo eq_dest ON eq_dest.id_equipo = ea_dest.id_equipo
      WHERE ea_dest.id_alumno = ? AND eq_dest.id_materia = ${alias}.id_materia AND eq_dest.activo = TRUE
        AND eq_dest.tipo = ${tipoEquipoParaActividadSQL(alias)}
    ))
    OR (${alias}.todos_los_equipos = FALSE AND ${alias}.id_equipo IN (
      SELECT ea_dest2.id_equipo FROM equipo_alumno ea_dest2
      JOIN equipo eq_dest2 ON eq_dest2.id_equipo = ea_dest2.id_equipo
      WHERE ea_dest2.id_alumno = ? AND eq_dest2.activo = TRUE
    ))
  )`
}

module.exports = { tipoEquipoParaActividad, tipoEquipoParaActividadSQL, condicionActividadDirigidaAlumnoSQL }
