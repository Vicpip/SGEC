// Tablón de Avisos. id_materia = NULL dirige el aviso a todos los alumnos de todas las
// materias activas del profesor. Pantallas 18 (Profesor) y 19 (Alumno).

async function listar(req, res) {
  res.status(501).json({ message: 'Pendiente de implementar: listar avisos' })
}

async function crear(req, res) {
  res.status(501).json({ message: 'Pendiente de implementar: publicar aviso' })
}

async function marcarLeido(req, res) {
  res.status(501).json({ message: 'Pendiente de implementar: marcar aviso como leído' })
}

module.exports = { listar, crear, marcarLeido }
