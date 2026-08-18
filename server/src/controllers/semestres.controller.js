// Gestión de períodos académicos (ej. 2026/1). Administrador crea/activa semestres.

async function listar(req, res) {
  res.status(501).json({ message: 'Pendiente de implementar: listar semestres' })
}

async function crear(req, res) {
  res.status(501).json({ message: 'Pendiente de implementar: crear semestre' })
}

async function actualizar(req, res) {
  res.status(501).json({ message: 'Pendiente de implementar: actualizar semestre' })
}

module.exports = { listar, crear, actualizar }
