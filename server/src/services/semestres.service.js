const pool = require('../config/db')

// Semestre "activo" del sistema: el que tiene activo = TRUE; si hay varios, el de fecha de
// inicio más reciente. Es el que muestran el topbar (vía /auth/login y /auth/me) y los
// paneles de Profesor y Alumno. Devuelve null si no hay ninguno activo.
async function obtenerSemestreActivo() {
  const [rows] = await pool.query(
    'SELECT id_semestre, clave, fecha_inicio, fecha_fin FROM semestre WHERE activo = TRUE ORDER BY fecha_inicio DESC, id_semestre DESC LIMIT 1'
  )
  return rows[0] ?? null
}

module.exports = { obtenerSemestreActivo }
