// Calificaciones por alumno/actividad. Grupales por defecto; individual = TRUE permite ajuste por alumno.

async function registrar(req, res) {
  res.status(501).json({ message: 'Pendiente de implementar: registrar calificación grupal' })
}

async function ajustarIndividual(req, res) {
  res.status(501).json({ message: 'Pendiente de implementar: ajustar calificación individual' })
}

module.exports = { registrar, ajustarIndividual }
