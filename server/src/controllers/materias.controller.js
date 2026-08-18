// Unidades de aprendizaje por semestre y profesor. Pantallas 03 (Lista de Materias).

async function listar(req, res) {
  res.status(501).json({ message: 'Pendiente de implementar: listar materias' })
}

async function obtener(req, res) {
  res.status(501).json({ message: 'Pendiente de implementar: obtener materia' })
}

async function crear(req, res) {
  res.status(501).json({ message: 'Pendiente de implementar: crear materia' })
}

async function actualizar(req, res) {
  res.status(501).json({ message: 'Pendiente de implementar: actualizar materia' })
}

async function desactivar(req, res) {
  res.status(501).json({ message: 'Pendiente de implementar: desactivar materia (borrado lógico)' })
}

module.exports = { listar, obtener, crear, actualizar, desactivar }
