// Gestión de períodos académicos (ej. 2026/1). Administrador crea/activa semestres.
// Toda materia requiere un id_semestre existente (FK NOT NULL en schema.sql).

const pool = require('../config/db')

async function listar(req, res) {
  const [rows] = await pool.query(
    'SELECT id_semestre, clave, fecha_inicio, fecha_fin, activo FROM semestre ORDER BY fecha_inicio DESC'
  )
  res.status(200).json({ semestres: rows })
}

async function crear(req, res) {
  const { clave, fecha_inicio, fecha_fin } = req.body

  try {
    const [result] = await pool.query(
      'INSERT INTO semestre (clave, fecha_inicio, fecha_fin) VALUES (?, ?, ?)',
      [clave, fecha_inicio, fecha_fin]
    )

    res.status(201).json({
      semestre: { id_semestre: result.insertId, clave, fecha_inicio, fecha_fin, activo: true },
    })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: `Ya existe un semestre con la clave "${clave}"` })
    }
    throw err
  }
}

async function actualizar(req, res) {
  const { id } = req.params
  const { clave, fecha_inicio, fecha_fin, activo } = req.body

  try {
    const [result] = await pool.query(
      'UPDATE semestre SET clave = ?, fecha_inicio = ?, fecha_fin = ?, activo = ? WHERE id_semestre = ?',
      [clave, fecha_inicio, fecha_fin, activo, id]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Semestre no encontrado' })
    }

    res.status(200).json({ message: 'Semestre actualizado' })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: `Ya existe un semestre con la clave "${clave}"` })
    }
    throw err
  }
}

module.exports = { listar, crear, actualizar }
