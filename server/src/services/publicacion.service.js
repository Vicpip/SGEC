// Scheduler de publicación programada: una actividad con programada = TRUE permanece
// invisible al alumno hasta que se alcanza fecha_publicacion.

function esVisibleParaAlumno(actividad, ahora = new Date()) {
  if (!actividad.programada) return true
  return new Date(actividad.fecha_publicacion) <= ahora
}

module.exports = { esVisibleParaAlumno }
