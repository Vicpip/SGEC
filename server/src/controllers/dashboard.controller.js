// Resumen para el Dashboard del Profesor (Pantalla 02) y el Panel del Alumno (Pantalla 12).
//
// Profesor: agrega materias, equipos, alumnos, actividades y avisos — siempre acotado al
// profesor autenticado (materia.id_profesor / aviso.id_profesor = su propio id_profesor,
// nunca el id_usuario del JWT directamente).
//
// Alumno: sus equipos, sus actividades pendientes, sus últimas calificaciones y sus avisos
// sin leer — siempre acotado a su propio id_alumno. Reutiliza las mismas condiciones de
// visibilidad que el resto de sus pantallas: inscripción vigente (materia_alumno.activo),
// actividad activa y ya publicada (condicionVisibleAlumnoSQL) y la regla de avisos del
// Tablón (condicionAvisoVisibleAlumnoSQL), para que los contadores del panel coincidan con
// lo que ve en "Mis actividades" y en el Tablón.

const pool = require('../config/db')
const { condicionVisibleAlumnoSQL } = require('../services/publicacion.service')
const { condicionActividadDirigidaAlumnoSQL } = require('../services/destinoActividad.service')
const { condicionAvisoVisibleAlumnoSQL } = require('../services/avisos.service')
const { obtenerSemestreActivo } = require('../services/semestres.service')

const MAX_PROXIMAS = 5
const MAX_CALIFICACIONES = 5
const MAX_AVISOS = 3

async function obtenerIdProfesorPropio(idUsuario) {
  const [rows] = await pool.query('SELECT id_profesor FROM profesor WHERE id_usuario = ?', [idUsuario])
  return rows[0]?.id_profesor ?? null
}

async function obtenerIdAlumnoPropio(idUsuario) {
  const [rows] = await pool.query('SELECT id_alumno FROM alumno WHERE id_usuario = ?', [idUsuario])
  return rows[0]?.id_alumno ?? null
}

// Estatus agregado de una actividad a partir de sus filas de entrega: sin entregas
// registradas es 'Pendiente'; si todas las entregas ya fueron calificadas es
// 'Calificada'; cualquier mezcla (entregas sin calificar, o parcialmente calificadas)
// se resume como 'En revision' — mismo criterio de tres niveles que BandejaEntregas.jsx.
function estatusDeActividad(conteos) {
  if (conteos.length === 0) return 'Pendiente'
  const total = conteos.reduce((suma, c) => suma + c.total, 0)
  const calificadas = conteos.find((c) => c.estatus === 'Calificada')?.total ?? 0
  if (calificadas === total) return 'Calificada'
  return 'En revision'
}

async function obtenerParaProfesor(req, res) {
  const idProfesor = await obtenerIdProfesorPropio(req.user.id_usuario)
  const semestre = await obtenerSemestreActivo()

  const [[materiasRow]] = await pool.query(
    "SELECT COUNT(*) AS total FROM materia WHERE id_profesor = ? AND estatus != 'Cerrada'",
    [idProfesor]
  )

  const [equiposRows] = await pool.query(
    `SELECT eq.tipo, COUNT(*) AS total
     FROM equipo eq JOIN materia m ON m.id_materia = eq.id_materia
     WHERE m.id_profesor = ? AND eq.activo = TRUE
     GROUP BY eq.tipo`,
    [idProfesor]
  )
  const equiposPorTipo = { Practica: 0, Tarea: 0, Proyecto: 0 }
  for (const fila of equiposRows) equiposPorTipo[fila.tipo] = fila.total

  const [[alumnosRow]] = await pool.query(
    `SELECT COUNT(DISTINCT ma.id_alumno) AS total
     FROM materia_alumno ma
     JOIN materia m ON m.id_materia = ma.id_materia
     WHERE m.id_profesor = ? AND ma.activo = TRUE AND m.estatus != 'Cerrada'`,
    [idProfesor]
  )

  const [actividadesRows] = await pool.query(
    `SELECT act.id_actividad, act.titulo, act.tipo, act.fecha_limite,
            m.clave AS materia_clave, m.nombre AS materia_nombre
     FROM actividad act
     JOIN materia m ON m.id_materia = act.id_materia
     WHERE m.id_profesor = ? AND act.activo = TRUE
     ORDER BY act.fecha_creacion DESC
     LIMIT 3`,
    [idProfesor]
  )

  const idsActividad = actividadesRows.map((a) => a.id_actividad)
  const [conteosEstatusRows] = idsActividad.length
    ? await pool.query(
        'SELECT id_actividad, estatus, COUNT(*) AS total FROM entrega WHERE id_actividad IN (?) GROUP BY id_actividad, estatus',
        [idsActividad]
      )
    : [[]]

  const actividadesRecientes = actividadesRows.map((actividad) => ({
    id_actividad: actividad.id_actividad,
    titulo: actividad.titulo,
    tipo: actividad.tipo,
    fecha_limite: actividad.fecha_limite,
    materia_clave: actividad.materia_clave,
    materia_nombre: actividad.materia_nombre,
    estatus: estatusDeActividad(conteosEstatusRows.filter((c) => c.id_actividad === actividad.id_actividad)),
  }))

  const [avisosRecientes] = await pool.query(
    `SELECT a.id_aviso, a.titulo, a.contenido, a.fecha_publicacion, a.id_materia,
            m.clave AS materia_clave, m.nombre AS materia_nombre
     FROM aviso a
     LEFT JOIN materia m ON m.id_materia = a.id_materia
     WHERE a.id_profesor = ? AND a.activo = TRUE
     ORDER BY a.fecha_publicacion DESC
     LIMIT 3`,
    [idProfesor]
  )

  res.status(200).json({
    semestre,
    materias_activas: materiasRow.total,
    equipos: {
      practicas: equiposPorTipo.Practica,
      tareas: equiposPorTipo.Tarea,
      proyectos: equiposPorTipo.Proyecto,
      total: equiposPorTipo.Practica + equiposPorTipo.Tarea + equiposPorTipo.Proyecto,
    },
    alumnos_inscritos: alumnosRow.total,
    actividades_recientes: actividadesRecientes,
    avisos_recientes: avisosRecientes,
  })
}

async function obtenerParaAlumno(req, res) {
  const idAlumno = await obtenerIdAlumnoPropio(req.user.id_usuario)
  const semestre = await obtenerSemestreActivo()

  // Equipos activos del alumno en materias donde su inscripción sigue vigente.
  const [equipos] = await pool.query(
    `SELECT eq.id_equipo, eq.nombre, eq.tipo, eq.id_equipo_espejo,
            m.clave AS materia_clave, m.nombre AS materia_nombre, m.grupo AS materia_grupo
     FROM equipo_alumno ea
     JOIN equipo eq ON eq.id_equipo = ea.id_equipo
     JOIN materia m ON m.id_materia = eq.id_materia
     JOIN materia_alumno ma ON ma.id_materia = eq.id_materia AND ma.id_alumno = ea.id_alumno AND ma.activo = TRUE
     WHERE ea.id_alumno = ? AND eq.activo = TRUE
     ORDER BY m.nombre, eq.tipo, eq.nombre`,
    [idAlumno]
  )

  // Mismas condiciones que "Mis actividades" (actividades.controller.js, listarParaAlumno):
  // una actividad programada aún no publicada jamás entra en el resultado.
  const [actividades] = await pool.query(
    `SELECT act.id_actividad, act.titulo, act.tipo, act.tipo_evaluacion, act.fecha_limite,
            m.clave AS materia_clave, m.nombre AS materia_nombre,
            ent.estatus AS estatus_entrega, cal.nota,
            (act.fecha_limite < NOW()) AS vencida
     FROM actividad act
     JOIN materia m ON m.id_materia = act.id_materia
     JOIN materia_alumno ma ON ma.id_materia = m.id_materia AND ma.id_alumno = ? AND ma.activo = TRUE
     LEFT JOIN entrega ent ON ent.id_actividad = act.id_actividad AND ent.id_alumno = ?
     LEFT JOIN calificacion cal ON cal.id_actividad = act.id_actividad AND cal.id_alumno = ?
     WHERE act.activo = TRUE
       AND ${condicionVisibleAlumnoSQL('act')}
       AND ${condicionActividadDirigidaAlumnoSQL('act')}
     ORDER BY act.fecha_limite, act.id_actividad`,
    [idAlumno, idAlumno, idAlumno, idAlumno, idAlumno]
  )

  // Realizada = entregó (estatus distinto de 'Pendiente') o ya tiene calificación (las
  // actividades En clase se califican sin archivo). Es el mismo criterio del reporte.
  const estaRealizada = (a) => (a.estatus_entrega != null && a.estatus_entrega !== 'Pendiente') || a.nota != null
  const pendientes = actividades.filter((a) => !estaRealizada(a))

  // Primero las que aún están en plazo (la más próxima arriba); después las ya vencidas
  // (la más reciente arriba).
  const enPlazo = pendientes.filter((a) => !a.vencida)
  const vencidas = pendientes.filter((a) => a.vencida).reverse()
  const proximasActividades = [...enPlazo, ...vencidas].slice(0, MAX_PROXIMAS).map((a) => ({
    id_actividad: a.id_actividad,
    titulo: a.titulo,
    tipo: a.tipo,
    tipo_evaluacion: a.tipo_evaluacion,
    fecha_limite: a.fecha_limite,
    materia_clave: a.materia_clave,
    materia_nombre: a.materia_nombre,
    vencida: !!a.vencida,
  }))

  const [ultimasCalificaciones] = await pool.query(
    `SELECT c.id_calificacion, c.id_actividad, c.nota, c.individual, c.fecha_calificacion,
            act.titulo, act.tipo, m.nombre AS materia_nombre
     FROM calificacion c
     JOIN actividad act ON act.id_actividad = c.id_actividad
     JOIN materia m ON m.id_materia = act.id_materia
     WHERE c.id_alumno = ?
     ORDER BY c.fecha_calificacion DESC, c.id_calificacion DESC
     LIMIT ?`,
    [idAlumno, MAX_CALIFICACIONES]
  )

  const [[promedioRow]] = await pool.query('SELECT AVG(nota) AS promedio FROM calificacion WHERE id_alumno = ?', [idAlumno])

  const [avisosSinLeer] = await pool.query(
    `SELECT a.id_aviso, a.id_materia, a.titulo, a.contenido, a.fecha_publicacion,
            u.nombre AS profesor_nombre, u.apellido_paterno AS profesor_apellido_paterno,
            m.nombre AS materia_nombre
     FROM aviso a
     JOIN profesor p ON p.id_profesor = a.id_profesor
     JOIN usuario u ON u.id_usuario = p.id_usuario
     LEFT JOIN materia m ON m.id_materia = a.id_materia
     LEFT JOIN aviso_leido leido ON leido.id_aviso = a.id_aviso AND leido.id_alumno = ?
     WHERE a.activo = TRUE
       AND leido.id_aviso_leido IS NULL
       AND ${condicionAvisoVisibleAlumnoSQL('a')}
     ORDER BY a.fecha_publicacion DESC, a.id_aviso DESC`,
    [idAlumno, idAlumno, idAlumno]
  )

  res.status(200).json({
    semestre,
    resumen: {
      equipos_activos: equipos.length,
      actividades_asignadas: actividades.length,
      actividades_realizadas: actividades.length - pendientes.length,
      actividades_pendientes: pendientes.length,
      promedio_general: promedioRow.promedio != null ? Number(Number(promedioRow.promedio).toFixed(2)) : null,
      avisos_sin_leer: avisosSinLeer.length,
    },
    equipos,
    proximas_actividades: proximasActividades,
    ultimas_calificaciones: ultimasCalificaciones.map((c) => ({ ...c, individual: !!c.individual })),
    avisos_sin_leer: avisosSinLeer.slice(0, MAX_AVISOS),
  })
}

// GET /api/dashboard — el contenido depende del rol del JWT (la ruta solo admite Profesor y
// Alumno).
async function obtener(req, res) {
  if (req.user.rol === 'Alumno') {
    return obtenerParaAlumno(req, res)
  }
  return obtenerParaProfesor(req, res)
}

module.exports = { obtener }
