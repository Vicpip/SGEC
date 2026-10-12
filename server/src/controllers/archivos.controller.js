// Descarga de archivos adjuntos (Sesión 13). GET /api/archivos/:tipo/:id, donde `tipo` es
// actividad | entrega | aviso e `id` es la PK de archivo_actividad / archivo_entrega /
// archivo_aviso.
//
// Permisos (siempre resueltos desde el JWT, nunca desde parámetros del cliente):
//   actividad — Profesor dueño de la materia. Alumno solo con la misma condición que usa
//               su listado de actividades (actividades.controller.js, listarParaAlumno):
//               inscrito en la materia, actividad activa, visible según
//               condicionVisibleAlumnoSQL (programadas) y dirigida a todos los equipos o
//               a un equipo suyo.
//   entrega   — Profesor dueño de la materia. Alumno autor de la entrega; sus compañeros
//               del equipo de esa entrega solo si la actividad tiene
//               entrega_por_equipo = TRUE.
//   aviso     — Profesor autor. Alumno que puede ver ese aviso (misma regla que
//               avisos.controller.js: inscrito en la materia del aviso o, si es global,
//               inscrito en alguna materia no cerrada de ese profesor).
// El Administrador no tiene acceso a adjuntos (las rutas exigen Profesor o Alumno).
//
// Seguridad de archivos: el archivo se localiza por el nombre almacenado en la BD
// (ruta_archivo, generado por multer al subir), nunca por un nombre o ruta que mande el
// cliente; la ruta se resuelve y se comprueba que quede dentro de UPLOAD_DIR; se sirve
// con X-Content-Type-Options: nosniff y Content-Disposition: attachment salvo PDF e
// imagen. Si el registro existe pero el archivo no está en disco, la respuesta es un 404
// genérico que no revela rutas del servidor.

const fs = require('fs')
const path = require('path')
const pool = require('../config/db')
const { validateEnv } = require('../config/env')
const { condicionVisibleAlumnoSQL } = require('../services/publicacion.service')

const env = validateEnv()

// Únicos tipos que se muestran en línea; cualquier otra extensión se entrega como
// descarga binaria genérica para que el navegador jamás la interprete (HTML, SVG, JS...).
const TIPOS_EN_LINEA = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
}

const NO_ENCONTRADO = { error: 'Archivo no encontrado' }
const SIN_PERMISO = { error: 'No tienes permiso para descargar este archivo' }

async function obtenerIdProfesorPropio(idUsuario) {
  const [rows] = await pool.query('SELECT id_profesor FROM profesor WHERE id_usuario = ?', [idUsuario])
  return rows[0]?.id_profesor ?? null
}

async function obtenerIdAlumnoPropio(idUsuario) {
  const [rows] = await pool.query('SELECT id_alumno FROM alumno WHERE id_usuario = ?', [idUsuario])
  return rows[0]?.id_alumno ?? null
}

// Cada resolvedor devuelve { status: 200, archivo } o { status: 403 | 404 }.

async function resolverActividad(idArchivo, usuario) {
  const [rows] = await pool.query(
    `SELECT aa.nombre_archivo, aa.ruta_archivo, act.id_actividad, act.id_materia, m.id_profesor
     FROM archivo_actividad aa
     JOIN actividad act ON act.id_actividad = aa.id_actividad
     JOIN materia m ON m.id_materia = act.id_materia
     WHERE aa.id_archivo_actividad = ?`,
    [idArchivo]
  )
  const archivo = rows[0]
  if (!archivo) return { status: 404 }

  if (usuario.rol === 'Profesor') {
    const idProfesor = await obtenerIdProfesorPropio(usuario.id_usuario)
    return idProfesor !== null && archivo.id_profesor === idProfesor ? { status: 200, archivo } : { status: 403 }
  }

  const idAlumno = await obtenerIdAlumnoPropio(usuario.id_usuario)
  if (idAlumno === null) return { status: 403 }

  const [inscrito] = await pool.query('SELECT 1 FROM materia_alumno WHERE id_materia = ? AND id_alumno = ? AND activo = TRUE LIMIT 1', [
    archivo.id_materia,
    idAlumno,
  ])
  if (inscrito.length === 0) return { status: 403 }

  // Actividad desactivada o programada aún no publicada: 404, igual que el detalle de la
  // actividad, para no revelar que existe.
  const [visible] = await pool.query(
    `SELECT 1 FROM actividad act WHERE act.id_actividad = ? AND act.activo = TRUE AND ${condicionVisibleAlumnoSQL('act')} LIMIT 1`,
    [archivo.id_actividad]
  )
  if (visible.length === 0) return { status: 404 }

  const [dirigida] = await pool.query(
    `SELECT 1 FROM actividad act
     WHERE act.id_actividad = ?
       AND (act.todos_los_equipos = TRUE OR act.id_equipo IN (SELECT id_equipo FROM equipo_alumno WHERE id_alumno = ?))
     LIMIT 1`,
    [archivo.id_actividad, idAlumno]
  )
  return dirigida.length > 0 ? { status: 200, archivo } : { status: 403 }
}

async function resolverEntrega(idArchivo, usuario) {
  const [rows] = await pool.query(
    `SELECT ae.nombre_archivo, ae.ruta_archivo, e.id_alumno, e.id_equipo, act.entrega_por_equipo, m.id_profesor
     FROM archivo_entrega ae
     JOIN entrega e ON e.id_entrega = ae.id_entrega
     JOIN actividad act ON act.id_actividad = e.id_actividad
     JOIN materia m ON m.id_materia = act.id_materia
     WHERE ae.id_archivo_entrega = ?`,
    [idArchivo]
  )
  const archivo = rows[0]
  if (!archivo) return { status: 404 }

  if (usuario.rol === 'Profesor') {
    const idProfesor = await obtenerIdProfesorPropio(usuario.id_usuario)
    return idProfesor !== null && archivo.id_profesor === idProfesor ? { status: 200, archivo } : { status: 403 }
  }

  const idAlumno = await obtenerIdAlumnoPropio(usuario.id_usuario)
  if (idAlumno === null) return { status: 403 }
  if (archivo.id_alumno === idAlumno) return { status: 200, archivo }

  // Compañero de equipo: solo en actividades de entrega por equipo, y solo si pertenece
  // al equipo (activo) con el que se registró esa entrega.
  if (!archivo.entrega_por_equipo || !archivo.id_equipo) return { status: 403 }

  const [companero] = await pool.query(
    `SELECT 1 FROM equipo_alumno ea
     JOIN equipo eq ON eq.id_equipo = ea.id_equipo
     WHERE ea.id_equipo = ? AND ea.id_alumno = ? AND eq.activo = TRUE LIMIT 1`,
    [archivo.id_equipo, idAlumno]
  )
  return companero.length > 0 ? { status: 200, archivo } : { status: 403 }
}

async function resolverAviso(idArchivo, usuario) {
  const [rows] = await pool.query(
    `SELECT aa.nombre_archivo, aa.ruta_archivo, a.id_profesor, a.id_materia
     FROM archivo_aviso aa
     JOIN aviso a ON a.id_aviso = aa.id_aviso
     WHERE aa.id_archivo_aviso = ? AND a.activo = TRUE`,
    [idArchivo]
  )
  const archivo = rows[0]
  if (!archivo) return { status: 404 }

  if (usuario.rol === 'Profesor') {
    const idProfesor = await obtenerIdProfesorPropio(usuario.id_usuario)
    return idProfesor !== null && archivo.id_profesor === idProfesor ? { status: 200, archivo } : { status: 403 }
  }

  const idAlumno = await obtenerIdAlumnoPropio(usuario.id_usuario)
  if (idAlumno === null) return { status: 403 }

  let visible
  if (archivo.id_materia) {
    ;[visible] = await pool.query('SELECT 1 FROM materia_alumno WHERE id_materia = ? AND id_alumno = ? AND activo = TRUE LIMIT 1', [
      archivo.id_materia,
      idAlumno,
    ])
  } else {
    ;[visible] = await pool.query(
      `SELECT 1 FROM materia m
       JOIN materia_alumno ma ON ma.id_materia = m.id_materia
       WHERE m.id_profesor = ? AND ma.id_alumno = ? AND ma.activo = TRUE AND m.estatus != 'Cerrada' LIMIT 1`,
      [archivo.id_profesor, idAlumno]
    )
  }
  return visible.length > 0 ? { status: 200, archivo } : { status: 403 }
}

const RESOLVEDORES = {
  actividad: resolverActividad,
  entrega: resolverEntrega,
  aviso: resolverAviso,
}

// Ruta absoluta del archivo dentro de UPLOAD_DIR, o null si el valor almacenado
// intentara salir de esa carpeta (.., ruta absoluta, otra unidad).
function rutaDentroDeUploads(rutaAlmacenada) {
  if (typeof rutaAlmacenada !== 'string' || rutaAlmacenada === '' || rutaAlmacenada.includes('\0')) return null

  const base = path.resolve(env.uploadDir)
  const destino = path.resolve(base, rutaAlmacenada)
  const relativa = path.relative(base, destino)

  if (relativa === '' || relativa.startsWith('..') || path.isAbsolute(relativa)) return null
  return destino
}

// Content-Disposition con el nombre original (dato que subió un usuario): alternativa
// ASCII sin comillas ni caracteres de control, más filename* en UTF-8 (RFC 5987).
function contentDisposition(disposicion, nombreOriginal) {
  const nombre = String(nombreOriginal || 'archivo')
  const ascii = nombre.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_')
  const utf8 = encodeURIComponent(nombre).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
  return `${disposicion}; filename="${ascii}"; filename*=UTF-8''${utf8}`
}

// GET /api/archivos/:tipo/:id
async function descargar(req, res) {
  const { tipo, id } = req.params

  const resolver = Object.prototype.hasOwnProperty.call(RESOLVEDORES, tipo) ? RESOLVEDORES[tipo] : null
  if (!resolver || !/^[1-9]\d{0,9}$/.test(id)) {
    return res.status(404).json(NO_ENCONTRADO)
  }

  const resultado = await resolver(Number(id), req.user)
  if (resultado.status === 404) return res.status(404).json(NO_ENCONTRADO)
  if (resultado.status !== 200) return res.status(403).json(SIN_PERMISO)

  const { nombre_archivo: nombreOriginal, ruta_archivo: rutaAlmacenada } = resultado.archivo

  const rutaAbsoluta = rutaDentroDeUploads(rutaAlmacenada)
  if (!rutaAbsoluta) {
    return res.status(404).json(NO_ENCONTRADO)
  }

  let stat
  try {
    stat = await fs.promises.stat(rutaAbsoluta)
  } catch (err) {
    stat = null
  }
  if (!stat || !stat.isFile()) {
    return res.status(404).json(NO_ENCONTRADO)
  }

  const tipoEnLinea = TIPOS_EN_LINEA[path.extname(rutaAlmacenada).toLowerCase()]

  res.set({
    'Content-Type': tipoEnLinea || 'application/octet-stream',
    'Content-Length': stat.size,
    'Content-Disposition': contentDisposition(tipoEnLinea ? 'inline' : 'attachment', nombreOriginal),
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'private, no-store',
  })

  const flujo = fs.createReadStream(rutaAbsoluta)
  flujo.on('error', () => {
    // Fallo de lectura a media transferencia: no hay forma de cambiar el estatus ya
    // enviado; se corta la conexión sin exponer el error del sistema de archivos.
    if (!res.headersSent) {
      res.removeHeader('Content-Disposition')
      res.removeHeader('Content-Length')
      res.status(404).type('json').send(JSON.stringify(NO_ENCONTRADO))
    } else {
      res.destroy()
    }
  })
  flujo.pipe(res)
}

module.exports = { descargar }
