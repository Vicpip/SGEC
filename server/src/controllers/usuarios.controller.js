// Gestión de cuentas de usuario (base para profesor/alumno/administrador).
// Usado por Gestión de Profesores (Admin) y Perfil (todos los roles).

async function listar(req, res) {
  res.status(501).json({ message: 'Pendiente de implementar: listar usuarios' })
}

async function obtener(req, res) {
  res.status(501).json({ message: 'Pendiente de implementar: obtener usuario' })
}

async function crear(req, res) {
  res.status(501).json({ message: 'Pendiente de implementar: crear usuario' })
}

async function actualizar(req, res) {
  res.status(501).json({ message: 'Pendiente de implementar: actualizar usuario' })
}

async function desactivar(req, res) {
  res.status(501).json({ message: 'Pendiente de implementar: desactivar usuario (borrado lógico)' })
}

module.exports = { listar, obtener, crear, actualizar, desactivar }
