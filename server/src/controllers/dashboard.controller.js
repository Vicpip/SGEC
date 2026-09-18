// Resumen para el Dashboard del Profesor (Pantalla 02). Agrega materias, equipos,
// alumnos, actividades y avisos — siempre acotado al profesor autenticado
// (materia.id_profesor / aviso.id_profesor = su propio id_profesor, nunca el
// id_usuario del JWT directamente).

const pool = require('../config/db')

async function obtenerIdProfesorPropio(idUsuario) {
  const [rows] = await pool.query('SELECT id_profesor FROM profesor WHERE id_usuario = ?', [idUsuario])
  return rows[0]?.id_profesor ?? null
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

async function obtener(req, res) {
  const idProfesor = await obtenerIdProfesorPropio(req.user.id_usuario)

  const [semestreRows] = await pool.query(
    'SELECT id_semestre, clave, fecha_inicio FROM semestre WHERE activo = TRUE ORDER BY fecha_inicio DESC LIMIT 1'
  )
  const semestre = semestreRows[0] ?? null

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
     WHERE m.id_profesor = ? AND m.estatus != 'Cerrada'`,
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

module.exports = { obtener }
