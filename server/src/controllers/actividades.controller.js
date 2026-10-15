// Actividades (En clase/Practica/Tarea/Proyecto) publicadas por el profesor. Pantallas 10, 15.
//
// Regla de propiedad: un Profesor solo ve/crea/edita/desactiva actividades de materias donde
// materia.id_profesor = su propio id_profesor (nunca el id_usuario del JWT directamente).
// Un Alumno solo ve actividades de materias en las que está inscrito y dirigidas a él (todos
// los equipos del tipo si tiene un equipo activo de ese tipo, o su propio equipo específico
// activo; condicionActividadDirigidaAlumnoSQL en destinoActividad.service.js) — y NUNCA una actividad programada
// (programada = TRUE) antes de su fecha_publicacion. Ese filtro va en el WHERE del query
// (ver condicionVisibleAlumnoSQL en publicacion.service.js), nunca solo en el frontend.

const fs = require('fs')
const pool = require('../config/db')
const { esVisibleParaAlumno, condicionVisibleAlumnoSQL } = require('../services/publicacion.service')
const { resolverMateriaPorClave } = require('../services/materias.service')
const { tipoEquipoParaActividad, condicionActividadDirigidaAlumnoSQL } = require('../services/destinoActividad.service')

async function obtenerIdProfesorPropio(idUsuario) {
  const [rows] = await pool.query('SELECT id_profesor FROM profesor WHERE id_usuario = ?', [idUsuario])
  return rows[0]?.id_profesor ?? null
}

async function obtenerIdAlumnoPropio(idUsuario) {
  const [rows] = await pool.query('SELECT id_alumno FROM alumno WHERE id_usuario = ?', [idUsuario])
  return rows[0]?.id_alumno ?? null
}

// Valida a qué equipo(s) se dirige la actividad. Devuelve null si el destino es válido o
// { status, error } con la respuesta que corresponde.
async function validarDestino(idMateria, tipo, todosLosEquipos, idEquipo) {
  const tipoEquipo = tipoEquipoParaActividad(tipo)

  if (todosLosEquipos) {
    const [equiposRows] = await pool.query('SELECT 1 FROM equipo WHERE id_materia = ? AND tipo = ? AND activo = TRUE LIMIT 1', [
      idMateria,
      tipoEquipo,
    ])
    if (equiposRows.length === 0) {
      return { status: 422, error: `La materia no tiene equipos de tipo ${tipoEquipo} para dirigir esta actividad` }
    }
    return null
  }

  if (!idEquipo) {
    return { status: 400, error: 'id_equipo es requerido cuando todos_los_equipos es false' }
  }

  const [equipoRows] = await pool.query(
    'SELECT id_equipo FROM equipo WHERE id_equipo = ? AND id_materia = ? AND tipo = ? AND activo = TRUE',
    [idEquipo, idMateria, tipoEquipo]
  )
  if (equipoRows.length === 0) {
    return { status: 400, error: 'El equipo indicado no existe en esta materia o no corresponde al tipo de la actividad' }
  }
  return null
}

// Una actividad "ya tiene entregas" cuando algún alumno subió algo (entrega con estatus
// distinto de 'Pendiente': la fila 'Pendiente' o su ausencia significan que no entregó) o
// cuando ya hay calificaciones registradas (cubre las actividades En clase, que se
// califican sin archivo). A partir de ahí su tipo, modalidad de entrega y destino quedan fijos.
async function tieneEntregasOCalificaciones(idActividad) {
  const [rows] = await pool.query(
    `SELECT
       EXISTS (SELECT 1 FROM entrega WHERE id_actividad = ? AND estatus != 'Pendiente') AS con_entregas,
       EXISTS (SELECT 1 FROM calificacion WHERE id_actividad = ?) AS con_calificaciones`,
    [idActividad, idActividad]
  )
  return Boolean(rows[0].con_entregas || rows[0].con_calificaciones)
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
         act.titulo, act.descripcion, act.tipo, act.tipo_evaluacion, act.fecha_limite, act.programada,
         act.fecha_publicacion,
         m.clave AS materia_clave, m.nombre AS materia_nombre, m.grupo AS materia_grupo,
         eq.nombre AS equipo_nombre
  FROM actividad act
  JOIN materia m ON m.id_materia = act.id_materia
  JOIN materia_alumno ma ON ma.id_materia = m.id_materia AND ma.id_alumno = ? AND ma.activo = TRUE
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
    condicionActividadDirigidaAlumnoSQL('act'),
  ]
  const paramsCondiciones = [idAlumno, idAlumno]

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

  const { materia: materiaRow, error: errorMateria } = await resolverMateriaPorClave(req.user, {
    clave: materia,
    idMateria: req.query.id_materia,
    semestre: req.query.semestre,
  })
  if (errorMateria) {
    return res.status(errorMateria.status).json({ error: errorMateria.mensaje })
  }

  const [actividades] = await pool.query(
    `SELECT act.id_actividad, act.id_materia, act.id_equipo, act.todos_los_equipos, act.entrega_por_equipo,
            act.titulo, act.descripcion, act.tipo, act.tipo_evaluacion, act.fecha_limite, act.programada,
            act.fecha_publicacion, act.activo,
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
    materia: { id_materia: materiaRow.id_materia, clave: materiaRow.clave, nombre: materiaRow.nombre, grupo: materiaRow.grupo, semestre: materiaRow.semestre },
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
            act.titulo, act.descripcion, act.tipo, act.tipo_evaluacion, act.fecha_limite, act.programada,
            act.fecha_publicacion, act.activo,
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

  // Solo para el profesor: indica al formulario de edición si tipo, modalidad de entrega y
  // destino ya quedaron fijos (el servidor lo vuelve a validar al guardar).
  let extraProfesor = {}

  if (req.user.rol === 'Profesor') {
    const idProfesor = await obtenerIdProfesorPropio(req.user.id_usuario)
    if (actividad.id_profesor !== idProfesor) {
      return res.status(403).json({ error: 'No tienes permiso para ver esta actividad' })
    }
    extraProfesor = { tiene_entregas: await tieneEntregasOCalificaciones(id) }
  } else {
    const idAlumno = await obtenerIdAlumnoPropio(req.user.id_usuario)

    const [inscrito] = await pool.query('SELECT 1 FROM materia_alumno WHERE id_materia = ? AND id_alumno = ? AND activo = TRUE LIMIT 1', [
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

    // Dirigida a él: con todos_los_equipos, solo si tiene un equipo activo del tipo que le
    // toca; si no, el equipo destino debe ser uno activo suyo. 403 en ambos casos.
    const [dirigida] = await pool.query(
      `SELECT 1 FROM actividad act WHERE act.id_actividad = ? AND ${condicionActividadDirigidaAlumnoSQL('act')} LIMIT 1`,
      [id, idAlumno, idAlumno]
    )
    if (dirigida.length === 0) {
      return res.status(403).json({ error: 'No tienes permiso para ver esta actividad' })
    }
  }

  const [archivos] = await pool.query(
    'SELECT id_archivo_actividad, nombre_archivo FROM archivo_actividad WHERE id_actividad = ? ORDER BY fecha_subida',
    [id]
  )

  res.status(200).json({ actividad: { ...actividad, ...extraProfesor, archivos } })
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
    tipo_evaluacion,
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

  const destinoInvalido = await validarDestino(id_materia, tipo, todos_los_equipos, id_equipo)
  if (destinoInvalido) {
    limpiarArchivosSubidos()
    return res.status(destinoInvalido.status).json({ error: destinoInvalido.error })
  }

  if (programada && !fecha_publicacion) {
    limpiarArchivosSubidos()
    return res.status(400).json({ error: 'fecha_publicacion es requerida cuando programada es true' })
  }

  const idEquipoFinal = todos_los_equipos ? null : id_equipo
  const fechaPublicacionFinal = programada ? fecha_publicacion : null
  const tipoEvaluacionFinal = tipo_evaluacion || null

  const conexion = await pool.getConnection()
  try {
    await conexion.beginTransaction()
    const [result] = await conexion.query(
      `INSERT INTO actividad
         (id_materia, id_equipo, todos_los_equipos, entrega_por_equipo, titulo, descripcion, tipo, tipo_evaluacion,
          fecha_limite, programada, fecha_publicacion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id_materia,
        idEquipoFinal,
        !!todos_los_equipos,
        !!entrega_por_equipo,
        titulo,
        descripcion || null,
        tipo,
        tipoEvaluacionFinal,
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
        tipo_evaluacion: tipoEvaluacionFinal,
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

// PUT /api/actividades/:id
// Título, descripción, tipo de evaluación, fecha límite y publicación programada se pueden
// editar siempre. El tipo, la modalidad de entrega (entrega_por_equipo) y el destino
// (todos_los_equipos / id_equipo) son opcionales: si no vienen se conservan; si vienen con un
// valor distinto y la actividad ya tiene entregas o calificaciones, se responde 409 — las
// entregas quedaron ligadas a un equipo y a una modalidad, y cambiarlos las dejaría huérfanas.
// Los archivos adjuntos no se editan por este endpoint.
async function actualizar(req, res) {
  const { id } = req.params
  const { titulo, descripcion, tipo_evaluacion, fecha_limite, programada, fecha_publicacion } = req.body

  const [actividadRows] = await pool.query(
    `SELECT act.id_actividad, act.id_materia, act.id_equipo, act.todos_los_equipos, act.entrega_por_equipo,
            act.tipo, act.activo, m.id_profesor
     FROM actividad act JOIN materia m ON m.id_materia = act.id_materia WHERE act.id_actividad = ?`,
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

  if (!actividad.activo) {
    return res.status(409).json({ error: 'La actividad está desactivada y no puede editarse' })
  }

  if (programada && !fecha_publicacion) {
    return res.status(400).json({ error: 'fecha_publicacion es requerida cuando programada es true' })
  }

  const tipoFinal = req.body.tipo ?? actividad.tipo
  const entregaPorEquipoFinal = req.body.entrega_por_equipo ?? Boolean(actividad.entrega_por_equipo)
  const todosFinal = req.body.todos_los_equipos ?? Boolean(actividad.todos_los_equipos)
  // Al pasar a "todos los equipos" el equipo específico deja de aplicar.
  const idEquipoFinal = todosFinal ? null : (req.body.id_equipo ?? actividad.id_equipo)

  const cambiaEstructura =
    tipoFinal !== actividad.tipo ||
    entregaPorEquipoFinal !== Boolean(actividad.entrega_por_equipo) ||
    todosFinal !== Boolean(actividad.todos_los_equipos) ||
    (idEquipoFinal ?? null) !== (actividad.id_equipo ?? null)

  if (cambiaEstructura) {
    if (await tieneEntregasOCalificaciones(id)) {
      return res.status(409).json({
        error:
          'La actividad ya tiene entregas o calificaciones: no se puede cambiar su tipo, la modalidad de entrega ni el equipo al que va dirigida',
        codigo: 'ACTIVIDAD_CON_ENTREGAS',
      })
    }

    const destinoInvalido = await validarDestino(actividad.id_materia, tipoFinal, todosFinal, idEquipoFinal)
    if (destinoInvalido) {
      return res.status(destinoInvalido.status).json({ error: destinoInvalido.error })
    }
  }

  await pool.query(
    `UPDATE actividad
     SET titulo = ?, descripcion = ?, tipo_evaluacion = ?, fecha_limite = ?, programada = ?, fecha_publicacion = ?,
         tipo = ?, entrega_por_equipo = ?, todos_los_equipos = ?, id_equipo = ?
     WHERE id_actividad = ?`,
    [
      titulo,
      descripcion || null,
      tipo_evaluacion || null,
      fecha_limite,
      !!programada,
      programada ? fecha_publicacion : null,
      tipoFinal,
      entregaPorEquipoFinal,
      todosFinal,
      idEquipoFinal,
      id,
    ]
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
