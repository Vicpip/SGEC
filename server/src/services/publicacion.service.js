// Scheduler de publicación programada: una actividad con programada = TRUE permanece
// invisible al alumno hasta que se alcanza fecha_publicacion.
//
// esVisibleParaAlumno: evalúa un registro ya obtenido de la BD (útil para el detalle de
// una sola actividad, donde no hay riesgo de fuga en un listado).
//
// condicionVisibleAlumnoSQL: fragmento SQL para usar directamente en el WHERE de cualquier
// listado dirigido a un Alumno — la actividad NUNCA debe salir del propio query hacia el
// JSON de respuesta, no basta con filtrarla después en JS/frontend.

function esVisibleParaAlumno(actividad, ahora = new Date()) {
  if (!actividad.programada) return true
  return new Date(actividad.fecha_publicacion) <= ahora
}

function condicionVisibleAlumnoSQL(alias) {
  return `(${alias}.programada = FALSE OR ${alias}.fecha_publicacion <= NOW())`
}

module.exports = { esVisibleParaAlumno, condicionVisibleAlumnoSQL }
