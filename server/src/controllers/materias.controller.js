// Unidades de aprendizaje por semestre y profesor. Pantalla 03 (Lista de Materias).
//
// Regla de propiedad: un Profesor solo ve/edita/cierra sus propias materias
// (materia.id_profesor = su propio id_profesor, nunca el id_usuario del JWT
// directamente). Un Administrador opera sobre cualquier materia.

const pool = require('../config/db')
const { TAMANO_EQUIPO_AUTOMATICO, INTEGRANTES_MIN, INTEGRANTES_MAX, INTEGRANTES_TOPE } = require('../services/asignacion.service')

// Configuración de equipos de la materia (migración 008) y sus valores por defecto, que
// reproducen el comportamiento original. En E1 solo el tamaño cambia el comportamiento;
// regla_repeticion y usa_* se guardan y se exponen, todavía sin efecto.
const AJUSTES_POR_DEFECTO = {
  equipo_tamano_auto: TAMANO_EQUIPO_AUTOMATICO,
  equipo_min: INTEGRANTES_MIN,
  equipo_max: INTEGRANTES_MAX,
  regla_repeticion: 'B',
  usa_practica: true,
  usa_tarea: true,
  usa_proyecto: true,
}
const CAMPOS_AJUSTES = Object.keys(AJUSTES_POR_DEFECTO)

const MENSAJE_AJUSTES_CON_EQUIPOS = 'Desactiva los equipos de esta materia antes de cambiar su configuración'

// Toma de `body` los campos de configuración que vengan y completa el resto con `base`.
function combinarAjustes(base, body) {
  const ajustes = {}
  for (const campo of CAMPOS_AJUSTES) {
    ajustes[campo] = body[campo] !== undefined ? body[campo] : base[campo]
  }
  ajustes.usa_practica = Boolean(ajustes.usa_practica)
  ajustes.usa_tarea = Boolean(ajustes.usa_tarea)
  ajustes.usa_proyecto = Boolean(ajustes.usa_proyecto)
  return ajustes
}

// Devuelve el mensaje de error si la configuración combinada no es coherente; null si sí.
function validarAjustesEquipos(ajustes) {
  const { equipo_min: min, equipo_tamano_auto: tamano, equipo_max: max } = ajustes
  if (!(min >= 1 && min <= tamano && tamano <= max && max <= INTEGRANTES_TOPE)) {
    return `La configuración de equipos no es válida: debe cumplirse 1 ≤ mínimo ≤ tamaño automático ≤ máximo ≤ ${INTEGRANTES_TOPE}`
  }
  if (!ajustes.usa_practica && !ajustes.usa_tarea && !ajustes.usa_proyecto) {
    return 'La materia debe usar al menos un tipo de equipo'
  }
  return null
}

// Con equipos activos solo se permite ampliar el máximo de integrantes: cambiar el tamaño
// automático, el mínimo o la regla, o bajar el máximo, dejaría equipos ya formados bajo
// reglas distintas de las que se validaron al crearlos. Los tipos (usa_*) se guardan sin
// restricción mientras no tengan efecto.
function cambiaAjusteRestringido(actual, nuevos) {
  return (
    Number(nuevos.equipo_tamano_auto) !== Number(actual.equipo_tamano_auto) ||
    Number(nuevos.equipo_min) !== Number(actual.equipo_min) ||
    Number(nuevos.equipo_max) < Number(actual.equipo_max) ||
    nuevos.regla_repeticion !== actual.regla_repeticion
  )
}

async function tieneEquiposActivos(idMateria) {
  const [rows] = await pool.query('SELECT 1 FROM equipo WHERE id_materia = ? AND activo = TRUE LIMIT 1', [idMateria])
  return rows.length > 0
}

const SELECT_BASE = `
  SELECT
    m.id_materia, m.clave, m.nombre, m.grupo, m.id_semestre, m.id_profesor,
    m.estatus, m.fecha_creacion,
    m.equipo_tamano_auto, m.equipo_min, m.equipo_max, m.regla_repeticion,
    m.usa_practica, m.usa_tarea, m.usa_proyecto,
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

const MENSAJE_CLAVE_REPETIDA =
  'Ya tienes una materia con esa clave en este semestre; usa una clave distinta para el otro grupo (por ejemplo, agregando el grupo al final)'

// Un mismo profesor no puede tener dos materias con la misma clave en el mismo semestre
// (aunque el grupo sea distinto, y sin importar su estatus): las pantallas de alumnos,
// equipos y actividades identifican la materia por su clave y solo alcanzarían una de las
// dos (ver services/materias.service.js). Profesores distintos sí pueden repetir clave.
async function profesorYaTieneClave(idProfesor, clave, idSemestre, idMateriaExcluida = null) {
  const params = [idProfesor, clave, idSemestre]
  let sql = 'SELECT id_materia FROM materia WHERE id_profesor = ? AND clave = ? AND id_semestre = ?'
  if (idMateriaExcluida) {
    sql += ' AND id_materia != ?'
    params.push(idMateriaExcluida)
  }
  const [rows] = await pool.query(`${sql} LIMIT 1`, params)
  return rows.length > 0
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

  const ajustes = combinarAjustes(AJUSTES_POR_DEFECTO, req.body)
  const errorAjustes = validarAjustesEquipos(ajustes)
  if (errorAjustes) {
    return res.status(400).json({ error: errorAjustes })
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

  if (await profesorYaTieneClave(idProfesorFinal, clave, id_semestre)) {
    return res.status(409).json({ error: MENSAJE_CLAVE_REPETIDA })
  }

  // Índice único uk_materia_clave_grupo_semestre: tampoco se repite la combinación
  // clave + grupo + semestre entre profesores distintos.
  const [duplicado] = await pool.query(
    'SELECT id_materia FROM materia WHERE clave = ? AND grupo = ? AND id_semestre = ?',
    [clave, grupo, id_semestre]
  )
  if (duplicado.length > 0) {
    return res
      .status(409)
      .json({ error: `Ya existe una materia con la clave "${clave}" y grupo "${grupo}" en este semestre` })
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO materia (clave, nombre, grupo, id_semestre, id_profesor, ${CAMPOS_AJUSTES.join(', ')})
       VALUES (?, ?, ?, ?, ?, ${CAMPOS_AJUSTES.map(() => '?').join(', ')})`,
      [clave, nombre, grupo, id_semestre, idProfesorFinal, ...CAMPOS_AJUSTES.map((c) => ajustes[c])]
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
        ...ajustes,
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
    `SELECT id_materia, id_profesor, id_semestre, ${CAMPOS_AJUSTES.join(', ')} FROM materia WHERE id_materia = ?`,
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

  // Los campos de configuración que no vengan conservan su valor actual.
  const ajustes = combinarAjustes(materia, req.body)
  const errorAjustes = validarAjustesEquipos(ajustes)
  if (errorAjustes) {
    return res.status(400).json({ error: errorAjustes })
  }
  if (cambiaAjusteRestringido(materia, ajustes) && (await tieneEquiposActivos(materia.id_materia))) {
    return res.status(409).json({ error: MENSAJE_AJUSTES_CON_EQUIPOS })
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

  if (await profesorYaTieneClave(idProfesorFinal, clave, id_semestre, materia.id_materia)) {
    return res.status(409).json({ error: MENSAJE_CLAVE_REPETIDA })
  }

  const [duplicado] = await pool.query(
    'SELECT id_materia FROM materia WHERE clave = ? AND grupo = ? AND id_semestre = ? AND id_materia != ?',
    [clave, grupo, id_semestre, id]
  )
  if (duplicado.length > 0) {
    return res
      .status(409)
      .json({ error: `Ya existe una materia con la clave "${clave}" y grupo "${grupo}" en este semestre` })
  }

  try {
    await pool.query(
      `UPDATE materia SET clave = ?, nombre = ?, grupo = ?, id_semestre = ?, estatus = ?, id_profesor = ?,
              ${CAMPOS_AJUSTES.map((c) => `${c} = ?`).join(', ')}
       WHERE id_materia = ?`,
      [clave, nombre, grupo, id_semestre, estatus, idProfesorFinal, ...CAMPOS_AJUSTES.map((c) => ajustes[c]), id]
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
