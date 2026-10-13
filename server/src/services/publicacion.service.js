// Scheduler de publicación programada: una actividad con programada = TRUE permanece
// invisible al alumno hasta que se alcanza fecha_publicacion.
//
// esVisibleParaAlumno: evalúa un registro ya obtenido de la BD (útil para el detalle de
// una sola actividad, donde no hay riesgo de fuga en un listado).
//
// condicionVisibleAlumnoSQL: fragmento SQL para usar directamente en el WHERE de cualquier
// listado dirigido a un Alumno — la actividad NUNCA debe salir del propio query hacia el
// JSON de respuesta, no basta con filtrarla después en JS/frontend.

// Zona horaria: fecha_publicacion es un DATETIME con la hora de pared de México. Las dos
// funciones deben leerla igual:
//   - esVisibleParaAlumno: `new Date('YYYY-MM-DD HH:MM:SS')` interpreta el texto en la zona
//     local de Node, que config/zonaHoraria.js fija en America/Mexico_City.
//   - condicionVisibleAlumnoSQL: NOW() usa la zona de la sesión MySQL, que config/db.js fija
//     en -06:00 en cada conexión.
// Con cualquiera de los dos en UTC, una actividad programada se publicaría 6 horas antes.
function esVisibleParaAlumno(actividad, ahora = new Date()) {
  if (!actividad.programada) return true
  return new Date(actividad.fecha_publicacion) <= ahora
}

function condicionVisibleAlumnoSQL(alias) {
  return `(${alias}.programada = FALSE OR ${alias}.fecha_publicacion <= NOW())`
}

module.exports = { esVisibleParaAlumno, condicionVisibleAlumnoSQL }
