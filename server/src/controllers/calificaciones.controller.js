// Calificaciones por alumno/actividad. Pantallas 06, 09, 10, 16 (lectura/registro).
//
// Regla de propiedad: un Profesor solo registra/ajusta/lee calificaciones de actividades de
// materias donde materia.id_profesor = su propio id_profesor. Un Alumno solo lee sus propias
// calificaciones (calificacion.id_alumno = su propio id_alumno).
//
// Punto crítico (Sesión 9): BandejaEntregas.jsx es la única pantalla con formularios de
// calificación — DetalleEquipo.jsx y DetalleActividad.jsx consumen este mismo módulo solo
// en modo lectura (GET), nunca disparan registrar/ajustarIndividual.
//
// Las calificaciones son grupales por defecto (individual = FALSE): registrar() inserta o
// actualiza una fila por integrante del equipo con la misma nota. ajustarIndividual() toca
// una única fila y la marca individual = TRUE, sin afectar a sus compañeros.

const pool = require('../config/db')
const { tipoEquipoParaActividad } = require('../services/destinoActividad.service')

async function obtenerIdProfesorPropio(idUsuario) {
  const [rows] = await pool.query('SELECT id_profesor FROM profesor WHERE id_usuario = ?', [idUsuario])
  return rows[0]?.id_profesor ?? null
}

async function obtenerIdAlumnoPropio(idUsuario) {
  const [rows] = await pool.query('SELECT id_alumno FROM alumno WHERE id_usuario = ?', [idUsuario])
  return rows[0]?.id_alumno ?? null
}

function tiposActividadParaEquipo(tipoEquipo) {
  if (tipoEquipo === 'Proyecto') return ['Proyecto']
  if (tipoEquipo === 'Practica') return ['Practica']
  return ['Tarea', 'En clase']
}

async function obtenerActividadConMateria(idActividad) {
  const [rows] = await pool.query(
    `SELECT act.id_actividad, act.id_materia, act.id_equipo, act.todos_los_equipos, act.tipo, act.activo,
            m.id_profesor
     FROM actividad act
     JOIN materia m ON m.id_materia = act.id_materia
     WHERE act.id_actividad = ?`,
    [idActividad]
  )
  return rows[0] ?? null
}

// POST /api/calificaciones
// Registra (o re-registra) la nota grupal: una fila de calificacion por integrante del
// equipo, todas con individual = FALSE. Si algún integrante ya tenía una nota ajustada
// individualmente, registrar una nueva nota grupal la sobrescribe (vuelve a individual =
// FALSE) — es una recalificación completa del equipo, no un parche.
async function registrar(req, res) {
  const { id_actividad, id_equipo, nota, comentario } = req.body

  const actividad = await obtenerActividadConMateria(id_actividad)
  if (!actividad || !actividad.activo) {
    return res.status(404).json({ error: 'Actividad no encontrada' })
  }

  const idProfesor = await obtenerIdProfesorPropio(req.user.id_usuario)
  if (actividad.id_profesor !== idProfesor) {
    return res.status(403).json({ error: 'No tienes permiso para calificar esta actividad' })
  }

  const [equipoRows] = await pool.query('SELECT id_equipo, id_materia, tipo, activo FROM equipo WHERE id_equipo = ?', [
    id_equipo,
  ])
  const equipo = equipoRows[0]
  if (!equipo || equipo.id_materia !== actividad.id_materia) {
    return res.status(404).json({ error: 'Equipo no encontrado en esta materia' })
  }

  const tipoEquipoEsperado = tipoEquipoParaActividad(actividad.tipo)
  const esObjetivoValido = actividad.todos_los_equipos
    ? equipo.tipo === tipoEquipoEsperado && equipo.activo
    : equipo.id_equipo === actividad.id_equipo

  if (!esObjetivoValido) {
    return res.status(422).json({ error: 'El equipo indicado no está entre los equipos objetivo de esta actividad' })
  }

  // Solo integrantes con inscripción vigente en la materia (materia_alumno.activo = TRUE):
  // no se registra una nota nueva a un alumno dado de baja de la materia.
  const [integrantes] = await pool.query(
    `SELECT ea.id_alumno
     FROM equipo_alumno ea
     JOIN materia_alumno ma ON ma.id_materia = ? AND ma.id_alumno = ea.id_alumno AND ma.activo = TRUE
     WHERE ea.id_equipo = ?`,
    [actividad.id_materia, id_equipo]
  )
  if (integrantes.length === 0) {
    return res.status(422).json({ error: 'El equipo no tiene integrantes inscritos en la materia' })
  }
  const idsAlumnos = integrantes.map((i) => i.id_alumno)

  const conexion = await pool.getConnection()
  try {
    await conexion.beginTransaction()

    for (const idAlumno of idsAlumnos) {
      await conexion.query(
        `INSERT INTO calificacion (id_actividad, id_alumno, nota, individual, comentario)
         VALUES (?, ?, ?, FALSE, ?)
         ON DUPLICATE KEY UPDATE nota = VALUES(nota), individual = FALSE, comentario = VALUES(comentario),
                                  fecha_calificacion = CURRENT_TIMESTAMP`,
        [id_actividad, idAlumno, nota, comentario || null]
      )
    }

    // Solo actualiza entregas que ya existen (una fila de calificación no crea la entrega
    // que no se hizo — un alumno sin entrega sigue siendo 'Pendiente' aunque se le califique).
    await conexion.query(`UPDATE entrega SET estatus = 'Calificada' WHERE id_actividad = ? AND id_alumno IN (?)`, [
      id_actividad,
      idsAlumnos,
    ])

    await conexion.commit()
  } catch (err) {
    await conexion.rollback()
    throw err
  } finally {
    conexion.release()
  }

  res.status(201).json({
    calificaciones: idsAlumnos.map((idAlumno) => ({
      id_actividad: Number(id_actividad),
      id_alumno: idAlumno,
      nota,
      individual: false,
      comentario: comentario || null,
    })),
  })
}

// PATCH /api/calificaciones/:id/individual
// Ajusta la nota de un único alumno y lo marca individual = TRUE. No toca ninguna otra fila
// de calificacion del equipo.
async function ajustarIndividual(req, res) {
  const { id } = req.params
  const { nota, comentario } = req.body

  const [rows] = await pool.query(
    `SELECT c.id_calificacion, c.id_actividad, c.id_alumno, act.id_materia, m.id_profesor
     FROM calificacion c
     JOIN actividad act ON act.id_actividad = c.id_actividad
     JOIN materia m ON m.id_materia = act.id_materia
     WHERE c.id_calificacion = ?`,
    [id]
  )
  const calificacion = rows[0]
  if (!calificacion) {
    return res.status(404).json({ error: 'Calificación no encontrada' })
  }

  const idProfesor = await obtenerIdProfesorPropio(req.user.id_usuario)
  if (calificacion.id_profesor !== idProfesor) {
    return res.status(403).json({ error: 'No tienes permiso para ajustar esta calificación' })
  }

  await pool.query(
    `UPDATE calificacion SET nota = ?, individual = TRUE, comentario = ?, fecha_calificacion = CURRENT_TIMESTAMP
     WHERE id_calificacion = ?`,
    [nota, comentario || null, id]
  )

  res.status(200).json({
    calificacion: {
      id_calificacion: Number(id),
      id_actividad: calificacion.id_actividad,
      id_alumno: calificacion.id_alumno,
      nota,
      individual: true,
      comentario: comentario || null,
    },
  })
}

// GET /api/calificaciones
// Alumno: todas sus propias calificaciones, agrupables en el cliente por equipo/materia.
// Profesor: requiere ?id_equipo= — calificaciones del equipo a través de todas las
// actividades que lo tienen como objetivo (para el panel de solo lectura de DetalleEquipo).
async function listar(req, res) {
  if (req.user.rol === 'Alumno') {
    return listarParaAlumno(req, res)
  }
  return listarParaProfesorPorEquipo(req, res)
}

async function listarParaAlumno(req, res) {
  const idAlumno = await obtenerIdAlumnoPropio(req.user.id_usuario)

  const [calificaciones] = await pool.query(
    `SELECT c.id_calificacion, c.id_actividad, c.nota, c.individual, c.comentario, c.fecha_calificacion,
            act.titulo, act.tipo AS actividad_tipo, act.fecha_limite, act.todos_los_equipos,
            act.id_equipo AS actividad_id_equipo, act.id_materia,
            m.nombre AS materia_nombre, m.clave AS materia_clave
     FROM calificacion c
     JOIN actividad act ON act.id_actividad = c.id_actividad
     JOIN materia m ON m.id_materia = act.id_materia
     WHERE c.id_alumno = ?
     ORDER BY act.fecha_limite DESC`,
    [idAlumno]
  )

  const [misEquipos] = await pool.query(
    `SELECT eq.id_equipo, eq.id_materia, eq.tipo, eq.nombre
     FROM equipo_alumno ea
     JOIN equipo eq ON eq.id_equipo = ea.id_equipo
     WHERE ea.id_alumno = ? AND eq.activo = TRUE`,
    [idAlumno]
  )
  const equipoPorId = new Map(misEquipos.map((eq) => [eq.id_equipo, eq]))
  const equipoPorMateriaTipo = new Map(misEquipos.map((eq) => [`${eq.id_materia}|${eq.tipo}`, eq]))

  const calificacionesConEquipo = calificaciones.map((c) => {
    const equipo = c.todos_los_equipos
      ? equipoPorMateriaTipo.get(`${c.id_materia}|${tipoEquipoParaActividad(c.actividad_tipo)}`)
      : equipoPorId.get(c.actividad_id_equipo)

    return {
      id_calificacion: c.id_calificacion,
      id_actividad: c.id_actividad,
      titulo: c.titulo,
      tipo: c.actividad_tipo,
      fecha_limite: c.fecha_limite,
      materia_nombre: c.materia_nombre,
      materia_clave: c.materia_clave,
      nota: c.nota,
      individual: !!c.individual,
      comentario: c.comentario,
      fecha_calificacion: c.fecha_calificacion,
      id_equipo: equipo?.id_equipo ?? null,
      equipo_nombre: equipo?.nombre ?? null,
      equipo_tipo: equipo?.tipo ?? null,
    }
  })

  res.status(200).json({ calificaciones: calificacionesConEquipo })
}

async function listarParaProfesorPorEquipo(req, res) {
  const { id_equipo } = req.query
  if (!id_equipo) {
    return res.status(400).json({ error: 'El parámetro id_equipo es requerido' })
  }

  const [equipoRows] = await pool.query(
    `SELECT eq.id_equipo, eq.id_materia, eq.nombre, eq.tipo, m.id_profesor
     FROM equipo eq JOIN materia m ON m.id_materia = eq.id_materia
     WHERE eq.id_equipo = ?`,
    [id_equipo]
  )
  const equipo = equipoRows[0]
  if (!equipo) {
    return res.status(404).json({ error: 'Equipo no encontrado' })
  }

  const idProfesor = await obtenerIdProfesorPropio(req.user.id_usuario)
  if (equipo.id_profesor !== idProfesor) {
    return res.status(403).json({ error: 'No tienes permiso para ver las calificaciones de este equipo' })
  }

  const [integrantes] = await pool.query(
    `SELECT a.id_alumno, a.boleta, u.nombre, u.apellido_paterno, u.apellido_materno
     FROM equipo_alumno ea
     JOIN alumno a ON a.id_alumno = ea.id_alumno
     JOIN usuario u ON u.id_usuario = a.id_usuario
     WHERE ea.id_equipo = ?
     ORDER BY u.apellido_paterno, u.apellido_materno, u.nombre`,
    [id_equipo]
  )
  const idsAlumnos = integrantes.map((i) => i.id_alumno)

  const [actividades] = await pool.query(
    `SELECT id_actividad, titulo, tipo, fecha_limite
     FROM actividad
     WHERE id_materia = ? AND activo = TRUE AND tipo IN (?)
       AND (todos_los_equipos = TRUE OR id_equipo = ?)
     ORDER BY fecha_limite DESC`,
    [equipo.id_materia, tiposActividadParaEquipo(equipo.tipo), id_equipo]
  )

  let calificaciones = []
  if (actividades.length > 0 && idsAlumnos.length > 0) {
    ;[calificaciones] = await pool.query(
      `SELECT id_calificacion, id_actividad, id_alumno, nota, individual, comentario
       FROM calificacion WHERE id_actividad IN (?) AND id_alumno IN (?)`,
      [actividades.map((a) => a.id_actividad), idsAlumnos]
    )
  }
  const calificacionesPorActividad = new Map()
  for (const c of calificaciones) {
    const lista = calificacionesPorActividad.get(c.id_actividad) ?? []
    lista.push(c)
    calificacionesPorActividad.set(c.id_actividad, lista)
  }

  res.status(200).json({
    equipo: { id_equipo: equipo.id_equipo, nombre: equipo.nombre, tipo: equipo.tipo },
    integrantes,
    actividades: actividades.map((a) => ({
      ...a,
      calificaciones: calificacionesPorActividad.get(a.id_actividad) ?? [],
    })),
  })
}

module.exports = { registrar, ajustarIndividual, listar }
