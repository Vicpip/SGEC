const pool = require('../config/db')

// Datos propios del rol (profesor/alumno) que extienden a `usuario`. Usado por
// auth.controller.js (login, /auth/me) y usuarios.controller.js (obtener).
async function obtenerDatosExtendidos(usuario) {
  if (usuario.rol === 'Profesor') {
    const [rows] = await pool.query(
      'SELECT id_profesor, no_empleado, departamento FROM profesor WHERE id_usuario = ?',
      [usuario.id_usuario]
    )
    return rows[0] || {}
  }

  if (usuario.rol === 'Alumno') {
    const [rows] = await pool.query(
      'SELECT id_alumno, boleta, grupo, carrera FROM alumno WHERE id_usuario = ?',
      [usuario.id_usuario]
    )
    return rows[0] || {}
  }

  return {}
}

module.exports = { obtenerDatosExtendidos }
