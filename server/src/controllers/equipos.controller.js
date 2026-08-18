// Equipos colaborativos (3 integrantes, sin repetición por tipo). Pantallas 04, 05, 06.

async function listar(req, res) {
  res.status(501).json({ message: 'Pendiente de implementar: listar equipos de una materia' })
}

async function obtener(req, res) {
  res.status(501).json({ message: 'Pendiente de implementar: detalle de equipo' })
}

async function crear(req, res) {
  res.status(501).json({ message: 'Pendiente de implementar: crear equipo (manual o aleatorio)' })
}

async function actualizar(req, res) {
  res.status(501).json({ message: 'Pendiente de implementar: actualizar integrantes del equipo' })
}

async function desactivar(req, res) {
  res.status(501).json({ message: 'Pendiente de implementar: desactivar equipo (borrado lógico)' })
}

module.exports = { listar, obtener, crear, actualizar, desactivar }
