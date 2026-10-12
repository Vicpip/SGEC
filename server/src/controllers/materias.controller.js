// Unidades de aprendizaje por semestre y profesor. Pantalla 03 (Lista de Materias).
//
// Regla de propiedad: un Profesor solo ve/edita/cierra sus propias materias
// (materia.id_profesor = su propio id_profesor, nunca el id_usuario del JWT
// directamente). Un Administrador opera sobre cualquier materia.

const pool = require('../config/db')

const SELECT_BASE = `
  SELECT
    m.id_materia, m.clave, m.nombre, m.grupo, m.id_semestre, m.id_profesor,
    m.estatus, m.fecha_creacion,
    s.clave AS semestre,
    u.nombre AS profesor_nombre, u.apellido_paterno AS profesor_apellido_paterno,
    COUNT(DISTINCT ma.id_alumno) AS total_alumnos,
    COUNT(DISTINCT CASE WHEN e.activo = TRUE THEN e.id_equipo END) AS total_equipos
  FROM materia m
  JOIN semestre s ON s.id_semestre = m.id_semestre
  JOIN profesor p ON p.id_profesor = m.id_profesor
  JOIN usuario u ON u.id_usuario = p.id_usuario
  LEFT JOIN materia_alumno ma ON ma.id_materia = m.id_materia AND ma.activo = TRUE
  LEFT JOIN equipo e ON e.id_materia = m.id_materia
`

const GROUP_BY = 'GROUP BY m.id_materia, s.clave, u.nombre, u.apellido_paterno'

async function obtenerIdProfesorPropio(idUsuario) {
  const [rows] = await pool.query('SELECT id_profesor FROM profesor WHERE id_usuario = ?', [idUsuario])
  return rows[0]?.id_profesor ?? null
}

async function listar(req, res) {
  const { semestre } = req.query
  const condiciones = []
  const params = []

  if (req.user.rol === 'Profesor') {
    const idProfesor = await obtenerIdProfesorPropio(req.user.id_usuario)
    condiciones.push('m.id_profesor = ?')
    params.push(idProfesor)
  }

  if (semestre) {
    condiciones.push('s.clave = ?')
    params.push(semestre)
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''
  const [rows] = await pool.query(
    `${SELECT_BASE} ${where} ${GROUP_BY} ORDER BY m.fecha_creacion DESC`,
    params
  )

  res.status(200).json({ materias: rows })
}

async function obtener(req, res) {
  const { id } = req.params

  const [rows] = await pool.query(`${SELECT_BASE} WHERE m.id_materia = ? ${GROUP_BY}`, [id])
  const materia = rows[0]

  if (!materia) {
    return res.status(404).json({ error: 'Materia no encontrada' })
  }

  if (req.user.rol === 'Profesor') {
    const idProfesor = await obtenerIdProfesorPropio(req.user.id_usuario)
    if (materia.id_profesor !== idProfesor) {
      return res.status(403).json({ error: 'No tienes permiso para ver esta materia' })
    }
  }

  res.status(200).json({ materia })
}

async function crear(req, res) {
  const { clave, nombre, grupo, id_semestre, id_profesor } = req.body

  let idProfesorFinal
  if (req.user.rol === 'Administrador') {
    if (!id_profesor) {
      return res.status(400).json({ error: 'id_profesor es requerido cuando un Administrador crea la materia' })
    }
    const [profesorRows] = await pool.query('SELECT id_profesor FROM profesor WHERE id_profesor = ?', [id_profesor])
    if (profesorRows.length === 0) {
      return res.status(400).json({ error: 'El profesor indicado no existe' })
    }
    idProfesorFinal = id_profesor
  } else {
    idProfesorFinal = await obtenerIdProfesorPropio(req.user.id_usuario)
  }

  const [semestreRows] = await pool.query('SELECT id_semestre, clave, activo FROM semestre WHERE id_semestre = ?', [
    id_semestre,
  ])
  if (semestreRows.length === 0) {
    return res.status(400).json({ error: 'El semestre indicado no existe' })
  }
  if (!semestreRows[0].activo) {
    return res
      .status(422)
      .json({ error: `El semestre ${semestreRows[0].clave} está inactivo: no se pueden crear materias en él` })
  }

  const [duplicado] = await pool.query('SELECT id_materia FROM materia WHERE clave = ? AND id_semestre = ?', [
    clave,
    id_semestre,
  ])
  if (duplicado.length > 0) {
    return res.status(409).json({ error: `Ya existe una materia con la clave "${clave}" en este semestre` })
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO materia (clave, nombre, grupo, id_semestre, id_profesor) VALUES (?, ?, ?, ?, ?)',
      [clave, nombre, grupo, id_semestre, idProfesorFinal]
    )

    res.status(201).json({
      materia: {
        id_materia: result.insertId,
        clave,
        nombre,
        grupo,
        id_semestre,
        id_profesor: idProfesorFinal,
        estatus: 'Activa',
      },
    })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: `Ya existe una materia con la clave "${clave}" y grupo "${grupo}" en este semestre` })
    }
    throw err
  }
}

async function actualizar(req, res) {
  const { id } = req.params
  const { clave, nombre, grupo, id_semestre, estatus, id_profesor } = req.body

  const [materiaRows] = await pool.query(
    'SELECT id_materia, id_profesor, id_semestre FROM materia WHERE id_materia = ?',
    [id]
  )
  const materia = materiaRows[0]

  if (!materia) {
    return res.status(404).json({ error: 'Materia no encontrada' })
  }

  if (req.user.rol === 'Profesor') {
    const idProfesor = await obtenerIdProfesorPropio(req.user.id_usuario)
    if (materia.id_profesor !== idProfesor) {
      return res.status(403).json({ error: 'No tienes permiso para editar esta materia' })
    }
  }

  let idProfesorFinal = materia.id_profesor
  if (id_profesor && req.user.rol === 'Administrador') {
    const [profesorRows] = await pool.query('SELECT id_profesor FROM profesor WHERE id_profesor = ?', [id_profesor])
    if (profesorRows.length === 0) {
      return res.status(400).json({ error: 'El profesor indicado no existe' })
    }
    idProfesorFinal = id_profesor
  }

  const [semestreRows] = await pool.query('SELECT id_semestre, clave, activo FROM semestre WHERE id_semestre = ?', [
    id_semestre,
  ])
  if (semestreRows.length === 0) {
    return res.status(400).json({ error: 'El semestre indicado no existe' })
  }
  // Una materia que ya vive en un semestre hoy inactivo se puede seguir editando; lo que no
  // se permite es MOVERLA a un semestre inactivo (equivale a darla de alta en él).
  if (!semestreRows[0].activo && Number(id_semestre) !== materia.id_semestre) {
    return res
      .status(422)
      .json({ error: `El semestre ${semestreRows[0].clave} está inactivo: no se pueden mover materias a él` })
  }

  const [duplicado] = await pool.query(
    'SELECT id_materia FROM materia WHERE clave = ? AND id_semestre = ? AND id_materia != ?',
    [clave, id_semestre, id]
  )
  if (duplicado.length > 0) {
    return res.status(409).json({ error: `Ya existe una materia con la clave "${clave}" en este semestre` })
  }

  try {
    await pool.query(
      'UPDATE materia SET clave = ?, nombre = ?, grupo = ?, id_semestre = ?, estatus = ?, id_profesor = ? WHERE id_materia = ?',
      [clave, nombre, grupo, id_semestre, estatus, idProfesorFinal, id]
    )

    res.status(200).json({ message: 'Materia actualizada' })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: `Ya existe una materia con la clave "${clave}" y grupo "${grupo}" en este semestre` })
    }
    throw err
  }
}

async function desactivar(req, res) {
  const { id } = req.params

  const [materiaRows] = await pool.query('SELECT id_materia, id_profesor FROM materia WHERE id_materia = ?', [id])
  const materia = materiaRows[0]

  if (!materia) {
    return res.status(404).json({ error: 'Materia no encontrada' })
  }

  if (req.user.rol === 'Profesor') {
    const idProfesor = await obtenerIdProfesorPropio(req.user.id_usuario)
    if (materia.id_profesor !== idProfesor) {
      return res.status(403).json({ error: 'No tienes permiso para cerrar esta materia' })
    }
  }

  await pool.query("UPDATE materia SET estatus = 'Cerrada' WHERE id_materia = ?", [id])
  res.status(200).json({ message: 'Materia cerrada' })
}

module.exports = { listar, obtener, crear, actualizar, desactivar }
