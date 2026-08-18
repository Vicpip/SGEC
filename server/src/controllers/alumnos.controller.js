// Alumnos inscritos en materias. Pantallas 07 (Lista), 08 (Importar Excel), 09 (Actividades del alumno).

async function listar(req, res) {
  res.status(501).json({ message: 'Pendiente de implementar: listar alumnos de una materia' })
}

async function obtener(req, res) {
  res.status(501).json({ message: 'Pendiente de implementar: obtener alumno' })
}

async function importarExcel(req, res) {
  res.status(501).json({ message: 'Pendiente de implementar: importar alumnos desde .xlsx' })
}

async function actividadesDeAlumno(req, res) {
  res.status(501).json({ message: 'Pendiente de implementar: actividades y calificaciones del alumno' })
}

module.exports = { listar, obtener, importarExcel, actividadesDeAlumno }
