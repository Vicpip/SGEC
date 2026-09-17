// Actividades (En clase/Practica/Tarea/Proyecto) publicadas por el profesor. Pantallas 10, 15.
//
// Regla de propiedad: un Profesor solo ve/crea/edita/desactiva actividades de materias donde
// materia.id_profesor = su propio id_profesor (nunca el id_usuario del JWT directamente).
// Un Alumno solo ve actividades de materias en las que está inscrito y dirigidas a él (todos
// los equipos del tipo, o su propio equipo específico) — y NUNCA una actividad programada
// (programada = TRUE) antes de su fecha_publicacion. Ese filtro va en el WHERE del query
// (ver condicionVisibleAlumnoSQL en publicacion.service.js), nunca solo en el frontend.

const fs = require('fs')
const pool = require('../config/db')
const { esVisibleParaAlumno, condicionVisibleAlumnoSQL } = require('../services/publicacion.service')

async function obtenerIdProfesorPropio(idUsuario) {
  const [rows] = await pool.query('SELECT id_profesor FROM profesor WHERE id_usuario = ?', [idUsuario])
  return rows[0]?.id_profesor ?? null
}

async function obtenerIdAlumnoPropio(idUsuario) {
  const [rows] = await pool.query('SELECT id_alumno FROM alumno WHERE id_usuario = ?', [idUsuario])
  return rows[0]?.id_alumno ?? null
}

// 'Practica' y 'Tarea' comparten integrantes; 'En clase' se asigna a los mismos equipos
// que 'Tarea' (ver CLAUDE.md — reglas críticas de negocio).
function tipoEquipoParaActividad(tipoActividad) {
  if (tipoActividad === 'Proyecto') return 'Proyecto'
  if (tipoActividad === 'Practica') return 'Practica'
  return 'Tarea'
}

async function archivosDeActividades(idsActividad) {
  if (idsActividad.length === 0) return new Map()

  const [rows] = await pool.query(
    'SELECT id_actividad, id_archivo_actividad, nombre_archivo FROM archivo_actividad WHERE id_actividad IN (?) ORDER BY fecha_subida',
    [idsActividad]
  )

  const mapa = new Map()
  for (const row of rows) {
    const lista = mapa.get(row.id_actividad) ?? []
    lista.push({ id_archivo_actividad: row.id_archivo_actividad, nombre_archivo: row.nombre_archivo })
    mapa.set(row.id_actividad, lista)
  }
  return mapa
}

const SELECT_ALUMNO = `
  SELECT act.id_actividad, act.id_materia, act.id_equipo, act.todos_los_equipos, act.entrega_por_equipo,
         act.titulo, act.descripcion, act.tipo, act.fecha_limite, act.programada, act.fecha_publicacion,
         m.clave AS materia_clave, m.nombre AS materia_nombre, m.grupo AS materia_grupo,
         eq.nombre AS equipo_nombre
  FROM actividad act
  JOIN materia m ON m.id_materia = act.id_materia
  JOIN materia_alumno ma ON ma.id_materia = m.id_materia AND ma.id_alumno = ?
  LEFT JOIN equipo eq ON eq.id_equipo = act.id_equipo
`

async function listarParaAlumno(req, res) {
  const { materia } = req.query
  const idAlumno = await obtenerIdAlumnoPropio(req.user.id_usuario)

  const condiciones = [
    'act.activo = TRUE',
    // Punto crítico: una actividad programada con fecha_publicacion futura jamás debe
    // entrar en el resultset de un Alumno — filtrado aquí, en el WHERE, no después.
    condicionVisibleAlumnoSQL('act'),
    '(act.todos_los_equipos = TRUE OR act.id_equipo IN (SELECT id_equipo FROM equipo_alumno WHERE id_alumno = ?))',
  ]
  const paramsCondiciones = [idAlumno]

  if (materia) {
    condiciones.push('m.clave = ?')
    paramsCondiciones.push(materia)
  }

  const [actividades] = await pool.query(
    `${SELECT_ALUMNO} WHERE ${condiciones.join(' AND ')} ORDER BY act.fecha_limite DESC`,
    [idAlumno, ...paramsCondiciones]
  )

  const archivosPorActividad = await archivosDeActividades(actividades.map((a) => a.id_actividad))
  const actividadesConArchivos = actividades.map((a) => ({
    ...a,
    archivos: archivosPorActividad.get(a.id_actividad) ?? [],
  }))

  res.status(200).json({ actividades: actividadesConArchivos })
}

async function listarParaProfesor(req, res) {
  const { materia } = req.query
  if (!materia) {
    return res.status(400).json({ error: 'El parámetro materia (clave) es requerido' })
  }

  const idProfesor = await obtenerIdProfesorPropio(req.user.id_usuario)
  const [materiaRows] = await pool.query(
    'SELECT id_materia, nombre, grupo FROM materia WHERE clave = ? AND id_profesor = ? ORDER BY fecha_creacion DESC LIMIT 1',
    [materia, idProfesor]
  )
  const materiaRow = materiaRows[0]

  if (!materiaRow) {
    return res.status(404).json({ error: 'Materia no encontrada' })
  }

  const [actividades] = await pool.query(
    `SELECT act.id_actividad, act.id_materia, act.id_equipo, act.todos_los_equipos, act.entrega_por_equipo,
            act.titulo, act.descripcion, act.tipo, act.fecha_limite, act.programada, act.fecha_publicacion, act.activo,
            eq.nombre AS equipo_nombre
     FROM actividad act
     LEFT JOIN equipo eq ON eq.id_equipo = act.id_equipo
     WHERE act.id_materia = ? AND act.activo = TRUE
     ORDER BY act.fecha_creacion DESC`,
    [materiaRow.id_materia]
  )

  const archivosPorActividad = await archivosDeActividades(actividades.map((a) => a.id_actividad))
  const actividadesConArchivos = actividades.map((a) => ({
    ...a,
    archivos: archivosPorActividad.get(a.id_actividad) ?? [],
  }))

  res.status(200).json({
    actividades: actividadesConArchivos,
    materia: { id_materia: materiaRow.id_materia, clave: materia, nombre: materiaRow.nombre, grupo: materiaRow.grupo },
  })
}

async function listar(req, res) {
  if (req.user.rol === 'Alumno') {
    return listarParaAlumno(req, res)
  }
  return listarParaProfesor(req, res)
}

async function obtener(req, res) {
  const { id } = req.params

  const [rows] = await pool.query(
    `SELECT act.id_actividad, act.id_materia, act.id_equipo, act.todos_los_equipos, act.entrega_por_equipo,
            act.titulo, act.descripcion, act.tipo, act.fecha_limite, act.programada, act.fecha_publicacion, act.activo,
            m.id_profesor, m.clave AS materia_clave, m.nombre AS materia_nombre, m.grupo AS materia_grupo,
            eq.nombre AS equipo_nombre
     FROM actividad act
     JOIN materia m ON m.id_materia = act.id_materia
     LEFT JOIN equipo eq ON eq.id_equipo = act.id_equipo
     WHERE act.id_actividad = ?`,
    [id]
  )
  const actividad = rows[0]

  if (!actividad) {
    return res.status(404).json({ error: 'Actividad no encontrada' })
  }

  if (req.user.rol === 'Profesor') {
    const idProfesor = await obtenerIdProfesorPropio(req.user.id_usuario)
    if (actividad.id_profesor !== idProfesor) {
      return res.status(403).json({ error: 'No tienes permiso para ver esta actividad' })
    }
  } else {
    const idAlumno = await obtenerIdAlumnoPropio(req.user.id_usuario)

    const [inscrito] = await pool.query('SELECT 1 FROM materia_alumno WHERE id_materia = ? AND id_alumno = ? LIMIT 1', [
      actividad.id_materia,
      idAlumno,
    ])
    if (inscrito.length === 0) {
      return res.status(403).json({ error: 'No tienes permiso para ver esta actividad' })
    }

    // Misma regla crítica que en el listado: una actividad programada aún no publicada
    // no debe revelarse ni siquiera por acceso directo a su id.
    if (!esVisibleParaAlumno(actividad)) {
      return res.status(404).json({ error: 'Actividad no encontrada' })
    }

    if (!actividad.todos_los_equipos) {
      const [pertenece] = await pool.query('SELECT 1 FROM equipo_alumno WHERE id_equipo = ? AND id_alumno = ? LIMIT 1', [
        actividad.id_equipo,
        idAlumno,
      ])
      if (pertenece.length === 0) {
        return res.status(403).json({ error: 'No tienes permiso para ver esta actividad' })
      }
    }
  }

  const [archivos] = await pool.query(
    'SELECT id_archivo_actividad, nombre_archivo FROM archivo_actividad WHERE id_actividad = ? ORDER BY fecha_subida',
    [id]
  )

  res.status(200).json({ actividad: { ...actividad, archivos } })
}

async function crear(req, res) {
  const {
    id_materia,
    id_equipo,
    todos_los_equipos,
    entrega_por_equipo,
    titulo,
    descripcion,
    tipo,
    fecha_limite,
    programada,
    fecha_publicacion,
  } = req.body
  const archivosSubidos = req.files ?? []

  const limpiarArchivosSubidos = () => {
    for (const archivo of archivosSubidos) {
      fs.unlink(archivo.path, () => {})
    }
  }

  const idProfesor = await obtenerIdProfesorPropio(req.user.id_usuario)
  const [materiaRows] = await pool.query('SELECT id_materia FROM materia WHERE id_materia = ? AND id_profesor = ?', [
    id_materia,
    idProfesor,
  ])
  if (materiaRows.length === 0) {
    limpiarArchivosSubidos()
    return res.status(404).json({ error: 'Materia no encontrada' })
  }

  const tipoEquipo = tipoEquipoParaActividad(tipo)

  if (todos_los_equipos) {
    const [equiposRows] = await pool.query('SELECT 1 FROM equipo WHERE id_materia = ? AND tipo = ? AND activo = TRUE LIMIT 1', [
      id_materia,
      tipoEquipo,
    ])
    if (equiposRows.length === 0) {
      limpiarArchivosSubidos()
      return res
        .status(422)
        .json({ error: `La materia no tiene equipos de tipo ${tipoEquipo} para dirigir esta actividad` })
    }
  } else {
    if (!id_equipo) {
      limpiarArchivosSubidos()
      return res.status(400).json({ error: 'id_equipo es requerido cuando todos_los_equipos es false' })
    }
    const [equipoRows] = await pool.query(
      'SELECT id_equipo FROM equipo WHERE id_equipo = ? AND id_materia = ? AND tipo = ? AND activo = TRUE',
      [id_equipo, id_materia, tipoEquipo]
    )
    if (equipoRows.length === 0) {
      limpiarArchivosSubidos()
      return res
        .status(400)
        .json({ error: 'El equipo indicado no existe en esta materia o no corresponde al tipo de la actividad' })
    }
  }

  if (programada && !fecha_publicacion) {
    limpiarArchivosSubidos()
    return res.status(400).json({ error: 'fecha_publicacion es requerida cuando programada es true' })
  }

  const idEquipoFinal = todos_los_equipos ? null : id_equipo
  const fechaPublicacionFinal = programada ? fecha_publicacion : null

  const conexion = await pool.getConnection()
  try {
    await conexion.beginTransaction()
    const [result] = await conexion.query(
      `INSERT INTO actividad
         (id_materia, id_equipo, todos_los_equipos, entrega_por_equipo, titulo, descripcion, tipo, fecha_limite, programada, fecha_publicacion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id_materia,
        idEquipoFinal,
        !!todos_los_equipos,
        !!entrega_por_equipo,
        titulo,
        descripcion || null,
        tipo,
        fecha_limite,
        !!programada,
        fechaPublicacionFinal,
      ]
    )
    const idActividad = result.insertId

    for (const archivo of archivosSubidos) {
      await conexion.query('INSERT INTO archivo_actividad (id_actividad, nombre_archivo, ruta_archivo) VALUES (?, ?, ?)', [
        idActividad,
        archivo.originalname,
        archivo.filename,
      ])
    }

    await conexion.commit()
    res.status(201).json({
      actividad: {
        id_actividad: idActividad,
        id_materia,
        id_equipo: idEquipoFinal,
        todos_los_equipos: !!todos_los_equipos,
        entrega_por_equipo: !!entrega_por_equipo,
        titulo,
        descripcion: descripcion || null,
        tipo,
        fecha_limite,
        programada: !!programada,
        fecha_publicacion: fechaPublicacionFinal,
      },
    })
  } catch (err) {
    await conexion.rollback()
    limpiarArchivosSubidos()
    throw err
  } finally {
    conexion.release()
  }
}

async function actualizar(req, res) {
  const { id } = req.params
  const { titulo, descripcion, fecha_limite, programada, fecha_publicacion, entrega_por_equipo } = req.body

  const [actividadRows] = await pool.query(
    `SELECT act.id_actividad, m.id_profesor FROM actividad act JOIN materia m ON m.id_materia = act.id_materia WHERE act.id_actividad = ?`,
    [id]
  )
  const actividad = actividadRows[0]

  if (!actividad) {
    return res.status(404).json({ error: 'Actividad no encontrada' })
  }

  const idProfesor = await obtenerIdProfesorPropio(req.user.id_usuario)
  if (actividad.id_profesor !== idProfesor) {
    return res.status(403).json({ error: 'No tienes permiso para editar esta actividad' })
  }

  if (programada && !fecha_publicacion) {
    return res.status(400).json({ error: 'fecha_publicacion es requerida cuando programada es true' })
  }

  await pool.query(
    `UPDATE actividad
     SET titulo = ?, descripcion = ?, fecha_limite = ?, programada = ?, fecha_publicacion = ?, entrega_por_equipo = ?
     WHERE id_actividad = ?`,
    [titulo, descripcion || null, fecha_limite, !!programada, programada ? fecha_publicacion : null, !!entrega_por_equipo, id]
  )

  res.status(200).json({ message: 'Actividad actualizada' })
}

async function desactivar(req, res) {
  const { id } = req.params

  const [actividadRows] = await pool.query(
    `SELECT act.id_actividad, m.id_profesor FROM actividad act JOIN materia m ON m.id_materia = act.id_materia WHERE act.id_actividad = ?`,
    [id]
  )
  const actividad = actividadRows[0]

  if (!actividad) {
    return res.status(404).json({ error: 'Actividad no encontrada' })
  }

  const idProfesor = await obtenerIdProfesorPropio(req.user.id_usuario)
  if (actividad.id_profesor !== idProfesor) {
    return res.status(403).json({ error: 'No tienes permiso para desactivar esta actividad' })
  }

  await pool.query('UPDATE actividad SET activo = FALSE WHERE id_actividad = ?', [id])
  res.status(200).json({ message: 'Actividad desactivada' })
}

module.exports = { listar, obtener, crear, actualizar, desactivar }
