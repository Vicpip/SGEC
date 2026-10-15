// Entregas de alumnos por actividad. Pantallas 16 (Bandeja de Entregas), 17 (Entregar Actividad).
//
// Regla de propiedad: un Profesor solo ve entregas de actividades de materias donde
// materia.id_profesor = su propio id_profesor. Un Alumno solo ve/crea su propia entrega
// (entrega.id_alumno = su propio id_alumno) y, en el roster de su equipo, de cada compañero
// recibe únicamente el estatus de la entrega: nunca su nota, los comentarios del profesor,
// su comentario, la fecha ni sus archivos (ver integranteParaAlumno).
//
// Nota sobre entregas tardías: una entrega enviada después de actividad.fecha_limite se
// acepta sin bloquear — fecha_entrega queda registrada normalmente y es responsabilidad del
// cliente comparar fecha_entrega contra fecha_limite para mostrar la marca de "tardía".
//
// Zona horaria: fecha_limite es un DATETIME con la hora de pared de México y fecha_entrega
// un TIMESTAMP que MySQL muestra en la zona de la sesión. Las dos se leen en la misma zona
// porque config/db.js fija la sesión en -06:00 y config/zonaHoraria.js el proceso de Node
// en America/Mexico_City; `new Date(actividad.fecha_limite)` depende de esto último.
//
// El enum de entrega.estatus (server/db/schema.sql) es Pendiente/En revision/Calificada —
// no existe un valor 'Entregado' en la base de datos: una entrega recién creada, aún sin
// calificar, se guarda como 'En revision' (la ausencia de fila es la que representa
// 'Pendiente'); al registrar la calificación (Sesión 9) el estatus pasa a 'Calificada'.

const fs = require('fs')
const pool = require('../config/db')
const { esVisibleParaAlumno } = require('../services/publicacion.service')
const { tipoEquipoParaActividad } = require('../services/destinoActividad.service')

async function obtenerIdProfesorPropio(idUsuario) {
  const [rows] = await pool.query('SELECT id_profesor FROM profesor WHERE id_usuario = ?', [idUsuario])
  return rows[0]?.id_profesor ?? null
}

async function obtenerIdAlumnoPropio(idUsuario) {
  const [rows] = await pool.query('SELECT id_alumno FROM alumno WHERE id_usuario = ?', [idUsuario])
  return rows[0]?.id_alumno ?? null
}

async function obtenerActividadConMateria(idActividad) {
  const [rows] = await pool.query(
    `SELECT act.id_actividad, act.id_materia, act.id_equipo, act.todos_los_equipos, act.entrega_por_equipo,
            act.titulo, act.tipo, act.tipo_evaluacion, act.fecha_limite, act.programada, act.fecha_publicacion,
            act.activo,
            m.id_profesor
     FROM actividad act
     JOIN materia m ON m.id_materia = act.id_materia
     WHERE act.id_actividad = ?`,
    [idActividad]
  )
  return rows[0] ?? null
}

async function archivosDeEntregas(idsEntrega) {
  if (idsEntrega.length === 0) return new Map()

  const [rows] = await pool.query(
    'SELECT id_entrega, id_archivo_entrega, nombre_archivo FROM archivo_entrega WHERE id_entrega IN (?) ORDER BY fecha_subida',
    [idsEntrega]
  )

  const mapa = new Map()
  for (const row of rows) {
    const lista = mapa.get(row.id_entrega) ?? []
    lista.push({ id_archivo_entrega: row.id_archivo_entrega, nombre_archivo: row.nombre_archivo })
    mapa.set(row.id_entrega, lista)
  }
  return mapa
}

// Equipo(s) al que va dirigida la actividad, junto a sus integrantes. Para un Alumno se
// acota siempre a su propio equipo (nunca se expone el roster completo de otros equipos);
// para un Profesor se listan todos los equipos objetivo (todos los del tipo, o el único
// equipo específico).
async function equiposObjetivoDeActividad(actividad, soloIdEquipo) {
  const tipoEquipo = tipoEquipoParaActividad(actividad.tipo)

  let equipos
  if (soloIdEquipo) {
    const [rows] = await pool.query('SELECT id_equipo, nombre FROM equipo WHERE id_equipo = ?', [soloIdEquipo])
    equipos = rows
  } else if (actividad.todos_los_equipos) {
    const [rows] = await pool.query(
      'SELECT id_equipo, nombre FROM equipo WHERE id_materia = ? AND tipo = ? AND activo = TRUE ORDER BY nombre',
      [actividad.id_materia, tipoEquipo]
    )
    equipos = rows
  } else {
    const [rows] = await pool.query('SELECT id_equipo, nombre FROM equipo WHERE id_equipo = ?', [actividad.id_equipo])
    equipos = rows
  }

  const idsEquipo = equipos.map((e) => e.id_equipo)
  const integrantes = idsEquipo.length
    ? (
        await pool.query(
          `SELECT ea.id_equipo, a.id_alumno, a.boleta, u.nombre, u.apellido_paterno, u.apellido_materno
           FROM equipo_alumno ea
           JOIN alumno a ON a.id_alumno = ea.id_alumno
           JOIN usuario u ON u.id_usuario = a.id_usuario
           WHERE ea.id_equipo IN (?)
           ORDER BY u.apellido_paterno, u.apellido_materno, u.nombre`,
          [idsEquipo]
        )
      )[0]
    : []

  return { equipos, integrantes }
}

// Equipo ACTIVO del alumno al que va dirigida la actividad, o null. Un equipo desactivado ya
// no cuenta: el alumno deja de ver la actividad y no puede entregarla (sus calificaciones
// previas se conservan).
async function idEquipoDelAlumnoParaActividad(actividad, idAlumno) {
  if (!actividad.todos_los_equipos) {
    const [pertenece] = await pool.query(
      `SELECT 1 FROM equipo_alumno ea JOIN equipo eq ON eq.id_equipo = ea.id_equipo
       WHERE ea.id_equipo = ? AND ea.id_alumno = ? AND eq.activo = TRUE LIMIT 1`,
      [actividad.id_equipo, idAlumno]
    )
    return pertenece.length > 0 ? actividad.id_equipo : null
  }

  const tipoEquipo = tipoEquipoParaActividad(actividad.tipo)
  const [rows] = await pool.query(
    `SELECT eq.id_equipo
     FROM equipo_alumno ea
     JOIN equipo eq ON eq.id_equipo = ea.id_equipo
     WHERE ea.id_alumno = ? AND eq.id_materia = ? AND eq.tipo = ? AND eq.activo = TRUE
     LIMIT 1`,
    [idAlumno, actividad.id_materia, tipoEquipo]
  )
  return rows[0]?.id_equipo ?? null
}

// GET /api/entregas/actividad/:idActividad
// Profesor: roster completo de todos los equipos objetivo de la actividad.
// Alumno: roster de su propio equipo únicamente.
async function listarPorActividad(req, res) {
  const { idActividad } = req.params

  const actividad = await obtenerActividadConMateria(idActividad)
  if (!actividad) {
    return res.status(404).json({ error: 'Actividad no encontrada' })
  }

  let miIdAlumno = null
  let soloIdEquipo = null

  if (req.user.rol === 'Profesor') {
    const idProfesor = await obtenerIdProfesorPropio(req.user.id_usuario)
    if (actividad.id_profesor !== idProfesor) {
      return res.status(403).json({ error: 'No tienes permiso para ver las entregas de esta actividad' })
    }
  } else {
    miIdAlumno = await obtenerIdAlumnoPropio(req.user.id_usuario)

    const [inscrito] = await pool.query('SELECT 1 FROM materia_alumno WHERE id_materia = ? AND id_alumno = ? AND activo = TRUE LIMIT 1', [
      actividad.id_materia,
      miIdAlumno,
    ])
    if (inscrito.length === 0 || !esVisibleParaAlumno(actividad)) {
      return res.status(404).json({ error: 'Actividad no encontrada' })
    }

    soloIdEquipo = await idEquipoDelAlumnoParaActividad(actividad, miIdAlumno)
    if (!soloIdEquipo) {
      return res.status(403).json({ error: 'No perteneces a un equipo asignado a esta actividad' })
    }
  }

  const { equipos, integrantes } = await equiposObjetivoDeActividad(actividad, soloIdEquipo)

  const [entregasRows] = await pool.query(
    'SELECT id_entrega, id_alumno, comentario, estatus, fecha_entrega FROM entrega WHERE id_actividad = ?',
    [idActividad]
  )
  const entregaPorAlumno = new Map(entregasRows.map((e) => [e.id_alumno, e]))
  const archivosPorEntrega = await archivosDeEntregas(entregasRows.map((e) => e.id_entrega))

  // Se incluye aquí (y no solo en /api/calificaciones) porque BandejaEntregas.jsx —fuente
  // canónica del registro de notas, Sesión 9— y DetalleActividad.jsx (solo lectura) leen
  // el roster de integrantes y su calificación desde esta misma respuesta.
  const [calificacionesRows] = await pool.query(
    'SELECT id_calificacion, id_alumno, nota, individual, comentario FROM calificacion WHERE id_actividad = ?',
    [idActividad]
  )
  const calificacionPorAlumno = new Map(calificacionesRows.map((c) => [c.id_alumno, c]))

  const equiposConIntegrantes = equipos.map((eq) => ({
    id_equipo: eq.id_equipo,
    nombre: eq.nombre,
    integrantes: integrantes
      .filter((it) => it.id_equipo === eq.id_equipo)
      .map((it) => {
        const entrega = entregaPorAlumno.get(it.id_alumno)
        const calificacion = calificacionPorAlumno.get(it.id_alumno)

        // Privacidad: un Alumno solo recibe completa su propia fila. De sus compañeros de
        // equipo, únicamente el estatus de la entrega.
        if (miIdAlumno !== null && it.id_alumno !== miIdAlumno) {
          return {
            id_alumno: it.id_alumno,
            boleta: it.boleta,
            nombre: it.nombre,
            apellido_paterno: it.apellido_paterno,
            apellido_materno: it.apellido_materno,
            entrega: entrega ? { estatus: entrega.estatus } : null,
            calificacion: null,
          }
        }

        return {
          id_alumno: it.id_alumno,
          boleta: it.boleta,
          nombre: it.nombre,
          apellido_paterno: it.apellido_paterno,
          apellido_materno: it.apellido_materno,
          entrega: entrega
            ? {
                id_entrega: entrega.id_entrega,
                comentario: entrega.comentario,
                estatus: entrega.estatus,
                fecha_entrega: entrega.fecha_entrega,
                archivos: archivosPorEntrega.get(entrega.id_entrega) ?? [],
              }
            : null,
          calificacion: calificacion
            ? {
                id_calificacion: calificacion.id_calificacion,
                nota: calificacion.nota,
                individual: !!calificacion.individual,
                comentario: calificacion.comentario,
              }
            : null,
        }
      }),
  }))

  res.status(200).json({
    actividad: {
      id_actividad: actividad.id_actividad,
      titulo: actividad.titulo,
      tipo: actividad.tipo,
      tipo_evaluacion: actividad.tipo_evaluacion,
      fecha_limite: actividad.fecha_limite,
      entrega_por_equipo: !!actividad.entrega_por_equipo,
    },
    equipos: equiposConIntegrantes,
    mi_id_alumno: miIdAlumno,
  })
}

// GET /api/entregas/:id
async function obtener(req, res) {
  const { id } = req.params

  const [rows] = await pool.query(
    `SELECT e.id_entrega, e.id_actividad, e.id_alumno, e.id_equipo, e.comentario, e.estatus, e.fecha_entrega,
            act.titulo AS actividad_titulo, act.fecha_limite, m.id_profesor
     FROM entrega e
     JOIN actividad act ON act.id_actividad = e.id_actividad
     JOIN materia m ON m.id_materia = act.id_materia
     WHERE e.id_entrega = ?`,
    [id]
  )
  const entrega = rows[0]

  if (!entrega) {
    return res.status(404).json({ error: 'Entrega no encontrada' })
  }

  if (req.user.rol === 'Profesor') {
    const idProfesor = await obtenerIdProfesorPropio(req.user.id_usuario)
    if (entrega.id_profesor !== idProfesor) {
      return res.status(403).json({ error: 'No tienes permiso para ver esta entrega' })
    }
  } else {
    const idAlumno = await obtenerIdAlumnoPropio(req.user.id_usuario)
    if (entrega.id_alumno !== idAlumno) {
      return res.status(403).json({ error: 'No tienes permiso para ver esta entrega' })
    }
  }

  const [archivos] = await pool.query(
    'SELECT id_archivo_entrega, nombre_archivo FROM archivo_entrega WHERE id_entrega = ? ORDER BY fecha_subida',
    [id]
  )

  res.status(200).json({ entrega: { ...entrega, archivos } })
}

// POST /api/entregas
//
// Punto crítico (Sesión 8): cuando entrega_por_equipo = TRUE, la fila de entrega del
// alumno que sube el archivo Y el marcado del resto de sus compañeros de equipo se
// ejecutan dentro de una única transacción MySQL (BEGIN/COMMIT/ROLLBACK vía la misma
// conexión). Si cualquier INSERT falla a la mitad —incluido el de un compañero—, toda la
// operación revierte: la entrega tampoco queda registrada para quien subió el archivo.
// Los compañeros que ya tenían su propia fila de entrega (por ejemplo, entregaron antes
// de que se activara entrega_por_equipo, o ya fueron calificados) no se tocan: solo se
// inserta una fila nueva para quienes aún no tienen ninguna.
async function crear(req, res) {
  const { id_actividad, comentario } = req.body
  const archivosSubidos = req.files ?? []

  const limpiarArchivosSubidos = () => {
    for (const archivo of archivosSubidos) {
      fs.unlink(archivo.path, () => {})
    }
  }

  const idAlumno = await obtenerIdAlumnoPropio(req.user.id_usuario)

  const actividad = await obtenerActividadConMateria(id_actividad)
  if (!actividad || !actividad.activo) {
    limpiarArchivosSubidos()
    return res.status(404).json({ error: 'Actividad no encontrada' })
  }

  const [inscrito] = await pool.query('SELECT 1 FROM materia_alumno WHERE id_materia = ? AND id_alumno = ? AND activo = TRUE LIMIT 1', [
    actividad.id_materia,
    idAlumno,
  ])
  if (inscrito.length === 0 || !esVisibleParaAlumno(actividad)) {
    limpiarArchivosSubidos()
    return res.status(404).json({ error: 'Actividad no encontrada' })
  }

  const idEquipo = await idEquipoDelAlumnoParaActividad(actividad, idAlumno)
  if (!idEquipo) {
    limpiarArchivosSubidos()
    return res.status(403).json({ error: 'No perteneces a un equipo asignado a esta actividad' })
  }

  const [existente] = await pool.query('SELECT 1 FROM entrega WHERE id_actividad = ? AND id_alumno = ? LIMIT 1', [
    id_actividad,
    idAlumno,
  ])
  if (existente.length > 0) {
    limpiarArchivosSubidos()
    return res.status(409).json({ error: 'Ya registraste una entrega para esta actividad' })
  }

  // Entrega tardía: no se bloquea (ver nota de negocio al inicio del archivo); solo se
  // informa en la respuesta para que el cliente pueda mostrar la marca correspondiente.
  const esTardia = new Date() > new Date(actividad.fecha_limite)

  const conexion = await pool.getConnection()
  const companerosMarcados = []
  try {
    await conexion.beginTransaction()

    const [result] = await conexion.query(
      `INSERT INTO entrega (id_actividad, id_alumno, id_equipo, comentario, estatus) VALUES (?, ?, ?, ?, 'En revision')`,
      [id_actividad, idAlumno, idEquipo, comentario || null]
    )
    const idEntrega = result.insertId

    for (const archivo of archivosSubidos) {
      await conexion.query('INSERT INTO archivo_entrega (id_entrega, nombre_archivo, ruta_archivo) VALUES (?, ?, ?)', [
        idEntrega,
        archivo.originalname,
        archivo.filename,
      ])
    }

    if (actividad.entrega_por_equipo) {
      const [companeros] = await conexion.query('SELECT id_alumno FROM equipo_alumno WHERE id_equipo = ? AND id_alumno != ?', [
        idEquipo,
        idAlumno,
      ])

      for (const companero of companeros) {
        const [yaTiene] = await conexion.query('SELECT 1 FROM entrega WHERE id_actividad = ? AND id_alumno = ? LIMIT 1', [
          id_actividad,
          companero.id_alumno,
        ])
        if (yaTiene.length > 0) continue

        await conexion.query(
          `INSERT INTO entrega (id_actividad, id_alumno, id_equipo, comentario, estatus) VALUES (?, ?, ?, NULL, 'En revision')`,
          [id_actividad, companero.id_alumno, idEquipo]
        )
        companerosMarcados.push(companero.id_alumno)
      }
    }

    await conexion.commit()

    res.status(201).json({
      entrega: {
        id_entrega: idEntrega,
        id_actividad,
        id_alumno: idAlumno,
        id_equipo: idEquipo,
        comentario: comentario || null,
        estatus: 'En revision',
        tardia: esTardia,
      },
      companeros_marcados: companerosMarcados,
    })
  } catch (err) {
    await conexion.rollback()
    limpiarArchivosSubidos()
    throw err
  } finally {
    conexion.release()
  }
}

module.exports = { listarPorActividad, obtener, crear }
