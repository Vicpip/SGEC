// Entregas de alumnos por actividad. Pantallas 16 (Bandeja de Entregas), 17 (Entregar Actividad).

async function listarPorActividad(req, res) {
  res.status(501).json({ message: 'Pendiente de implementar: listar entregas de una actividad' })
}

async function obtener(req, res) {
  res.status(501).json({ message: 'Pendiente de implementar: detalle de entrega' })
}

async function crear(req, res) {
  res.status(501).json({ message: 'Pendiente de implementar: registrar entrega del alumno' })
}

module.exports = { listarPorActividad, obtener, crear }
