// Tareas/prácticas/proyectos publicados por el profesor. Pantallas 10, 15.
// Si programada = TRUE, invisible al alumno hasta fecha_publicacion (ver publicacion.service).

async function listar(req, res) {
  res.status(501).json({ message: 'Pendiente de implementar: listar actividades' })
}

async function obtener(req, res) {
  res.status(501).json({ message: 'Pendiente de implementar: detalle de actividad' })
}

async function crear(req, res) {
  res.status(501).json({ message: 'Pendiente de implementar: publicar actividad' })
}

async function actualizar(req, res) {
  res.status(501).json({ message: 'Pendiente de implementar: actualizar actividad' })
}

async function desactivar(req, res) {
  res.status(501).json({ message: 'Pendiente de implementar: desactivar actividad (borrado lógico)' })
}

module.exports = { listar, obtener, crear, actualizar, desactivar }
