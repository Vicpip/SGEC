// Tablón de Avisos. Pantallas 18 (Profesor) y 19 (Alumno).
//
// Regla de propiedad: un Profesor solo ve/publica avisos como propios (aviso.id_profesor =
// su propio id_profesor). Un Alumno solo ve avisos de materias en las que está inscrito, más
// los avisos globales (id_materia = NULL) de los profesores que le imparten alguna materia
// ACTIVA (estatus != 'Cerrada') en ese momento — nunca avisos globales de otros profesores,
// ni de profesores cuya única materia compartida con el alumno ya está cerrada. Este filtro
// se evalúa dinámicamente en el WHERE de listarParaAlumno, no al momento de publicar: si el
// alumno se da de baja o la materia se cierra después, el aviso deja de serle visible.

const fs = require('fs')
const pool = require('../config/db')

async function obtenerIdProfesorPropio(idUsuario) {
  const [rows] = await pool.query('SELECT id_profesor FROM profesor WHERE id_usuario = ?', [idUsuario])
  return rows[0]?.id_profesor ?? null
}

async function obtenerIdAlumnoPropio(idUsuario) {
  const [rows] = await pool.query('SELECT id_alumno FROM alumno WHERE id_usuario = ?', [idUsuario])
  return rows[0]?.id_alumno ?? null
}

async function archivosDeAvisos(idsAviso) {
  if (idsAviso.length === 0) return new Map()

  const [rows] = await pool.query(
    'SELECT id_aviso, id_archivo_aviso, nombre_archivo FROM archivo_aviso WHERE id_aviso IN (?) ORDER BY fecha_subida',
    [idsAviso]
  )

  const mapa = new Map()
  for (const row of rows) {
    const lista = mapa.get(row.id_aviso) ?? []
    lista.push({ id_archivo_aviso: row.id_archivo_aviso, nombre_archivo: row.nombre_archivo })
    mapa.set(row.id_aviso, lista)
  }
  return mapa
}

async function listarParaProfesor(req, res) {
  const { materia } = req.query
  const idProfesor = await obtenerIdProfesorPropio(req.user.id_usuario)

  const condiciones = ['a.id_profesor = ?', 'a.activo = TRUE']
  const params = [idProfesor]

  if (materia) {
    condiciones.push('m.clave = ?')
    params.push(materia)
  }

  const [avisos] = await pool.query(
    `SELECT a.id_aviso, a.id_materia, a.titulo, a.contenido, a.fecha_publicacion,
            m.clave AS materia_clave, m.nombre AS materia_nombre, m.grupo AS materia_grupo
     FROM aviso a
     LEFT JOIN materia m ON m.id_materia = a.id_materia
     WHERE ${condiciones.join(' AND ')}
     ORDER BY a.fecha_publicacion DESC`,
    params
  )

  // total_notificados es informativo para la UI: para un aviso específico son los inscritos
  // en esa materia; para uno global, los alumnos distintos inscritos en alguna materia ACTIVA
  // de este profesor (mismo criterio de visibilidad que usa el Alumno al leerlo).
  const avisosConTotales = await Promise.all(
    avisos.map(async (aviso) => {
      if (aviso.id_materia) {
        const [rows] = await pool.query('SELECT COUNT(*) AS total FROM materia_alumno WHERE id_materia = ? AND activo = TRUE', [
          aviso.id_materia,
        ])
        return { ...aviso, total_notificados: rows[0].total }
      }
      const [rows] = await pool.query(
        `SELECT COUNT(DISTINCT ma.id_alumno) AS total
         FROM materia_alumno ma
         JOIN materia m ON m.id_materia = ma.id_materia
         WHERE m.id_profesor = ? AND ma.activo = TRUE AND m.estatus != 'Cerrada'`,
        [idProfesor]
      )
      return { ...aviso, total_notificados: rows[0].total }
    })
  )

  const archivosPorAviso = await archivosDeAvisos(avisos.map((a) => a.id_aviso))
  res.status(200).json({
    avisos: avisosConTotales.map((a) => ({ ...a, archivos: archivosPorAviso.get(a.id_aviso) ?? [] })),
  })
}

async function listarParaAlumno(req, res) {
  const { materia } = req.query
  const idAlumno = await obtenerIdAlumnoPropio(req.user.id_usuario)

  let sql = `
    SELECT a.id_aviso, a.id_materia, a.titulo, a.contenido, a.fecha_publicacion,
           u.nombre AS profesor_nombre, u.apellido_paterno AS profesor_apellido_paterno,
           m.clave AS materia_clave, m.nombre AS materia_nombre, m.grupo AS materia_grupo,
           (leido.id_aviso_leido IS NOT NULL) AS leido
    FROM aviso a
    JOIN profesor p ON p.id_profesor = a.id_profesor
    JOIN usuario u ON u.id_usuario = p.id_usuario
    LEFT JOIN materia m ON m.id_materia = a.id_materia
    LEFT JOIN aviso_leido leido ON leido.id_aviso = a.id_aviso AND leido.id_alumno = ?
    WHERE a.activo = TRUE
      AND (
        -- Aviso dirigido a una materia específica: el alumno debe estar inscrito en ella.
        (a.id_materia IS NOT NULL AND a.id_materia IN (SELECT id_materia FROM materia_alumno WHERE id_alumno = ? AND activo = TRUE))
        OR
        -- Aviso global (id_materia = NULL): dirigido a todos los alumnos de todas las
        -- materias ACTIVAS de ese profesor — nunca a todos los alumnos del sistema.
        (a.id_materia IS NULL AND a.id_profesor IN (
          SELECT DISTINCT m2.id_profesor
          FROM materia m2
          JOIN materia_alumno ma2 ON ma2.id_materia = m2.id_materia
          WHERE ma2.id_alumno = ? AND ma2.activo = TRUE AND m2.estatus != 'Cerrada'
        ))
      )
  `
  const params = [idAlumno, idAlumno, idAlumno]

  if (materia) {
    // El filtro de materia en la UI del alumno no debe ocultar los avisos globales.
    sql += ' AND (m.clave = ? OR a.id_materia IS NULL)'
    params.push(materia)
  }

  sql += ' ORDER BY a.fecha_publicacion DESC'

  const [avisos] = await pool.query(sql, params)

  const archivosPorAviso = await archivosDeAvisos(avisos.map((a) => a.id_aviso))
  res.status(200).json({
    avisos: avisos.map((a) => ({ ...a, leido: !!a.leido, archivos: archivosPorAviso.get(a.id_aviso) ?? [] })),
  })
}

async function listar(req, res) {
  if (req.user.rol === 'Alumno') {
    return listarParaAlumno(req, res)
  }
  return listarParaProfesor(req, res)
}

async function crear(req, res) {
  const { id_materia, titulo, contenido } = req.body
  const archivosSubidos = req.files ?? []

  const limpiarArchivosSubidos = () => {
    for (const archivo of archivosSubidos) fs.unlink(archivo.path, () => {})
  }

  const idProfesor = await obtenerIdProfesorPropio(req.user.id_usuario)

  let idMateriaFinal = null
  if (id_materia) {
    const [materiaRows] = await pool.query(
      "SELECT id_materia FROM materia WHERE id_materia = ? AND id_profesor = ? AND estatus != 'Cerrada'",
      [id_materia, idProfesor]
    )
    if (materiaRows.length === 0) {
      limpiarArchivosSubidos()
      return res.status(404).json({ error: 'Materia no encontrada' })
    }
    idMateriaFinal = id_materia
  }

  const conexion = await pool.getConnection()
  try {
    await conexion.beginTransaction()
    const [result] = await conexion.query(
      'INSERT INTO aviso (id_profesor, id_materia, titulo, contenido) VALUES (?, ?, ?, ?)',
      [idProfesor, idMateriaFinal, titulo, contenido]
    )
    const idAviso = result.insertId

    for (const archivo of archivosSubidos) {
      await conexion.query('INSERT INTO archivo_aviso (id_aviso, nombre_archivo, ruta_archivo) VALUES (?, ?, ?)', [
        idAviso,
        archivo.originalname,
        archivo.filename,
      ])
    }

    await conexion.commit()
    res.status(201).json({
      aviso: {
        id_aviso: idAviso,
        id_profesor: idProfesor,
        id_materia: idMateriaFinal,
        titulo,
        contenido,
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

async function marcarLeido(req, res) {
  const { id } = req.params
  const idAlumno = await obtenerIdAlumnoPropio(req.user.id_usuario)

  const [avisoRows] = await pool.query('SELECT id_aviso, id_profesor, id_materia FROM aviso WHERE id_aviso = ? AND activo = TRUE', [
    id,
  ])
  const aviso = avisoRows[0]
  if (!aviso) {
    return res.status(404).json({ error: 'Aviso no encontrado' })
  }

  // Misma regla de visibilidad que el listado: un alumno no puede marcar como leído un
  // aviso que no le corresponde (materia distinta, o global de un profesor sin materia
  // activa compartida con él).
  let visible = false
  if (aviso.id_materia) {
    const [rows] = await pool.query('SELECT 1 FROM materia_alumno WHERE id_materia = ? AND id_alumno = ? AND activo = TRUE', [
      aviso.id_materia,
      idAlumno,
    ])
    visible = rows.length > 0
  } else {
    const [rows] = await pool.query(
      `SELECT 1 FROM materia m
       JOIN materia_alumno ma ON ma.id_materia = m.id_materia
       WHERE m.id_profesor = ? AND ma.id_alumno = ? AND ma.activo = TRUE AND m.estatus != 'Cerrada' LIMIT 1`,
      [aviso.id_profesor, idAlumno]
    )
    visible = rows.length > 0
  }
  if (!visible) {
    return res.status(403).json({ error: 'No tienes permiso para marcar este aviso' })
  }

  await pool.query(
    'INSERT INTO aviso_leido (id_aviso, id_alumno) VALUES (?, ?) ON DUPLICATE KEY UPDATE fecha_lectura = fecha_lectura',
    [id, idAlumno]
  )

  res.status(200).json({ message: 'Aviso marcado como leído' })
}

module.exports = { listar, crear, marcarLeido }
