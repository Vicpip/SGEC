// Alumnos inscritos en materias. Pantallas 07 (Lista), 08 (Importar Excel), 09 (Actividades del alumno).
//
// Regla de propiedad: un Profesor solo ve alumnos de materias donde
// materia.id_profesor = su propio id_profesor (nunca el id_usuario del JWT
// directamente) — nunca confiar en el parámetro `materia`/`:id` que mande el cliente.

const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const pool = require('../config/db')
const { parsearAlumnosDesdeExcel, validarAlumno } = require('../services/excel.service')
const { enviarCorreoRecuperacion } = require('../services/email.service')

const RONDAS_BCRYPT = 10
const RESET_TOKEN_VIGENCIA_MS = 60 * 60 * 1000 // 1 hora, igual que auth.controller.js

async function obtenerIdProfesorPropio(idUsuario) {
  const [rows] = await pool.query('SELECT id_profesor FROM profesor WHERE id_usuario = ?', [idUsuario])
  return rows[0]?.id_profesor ?? null
}

function generarTokenReset() {
  const tokenPlano = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(tokenPlano).digest('hex')
  return { tokenPlano, tokenHash }
}

// Un alumno recién importado no tiene contraseña conocida por nadie: se le
// asigna un hash aleatorio (nunca comunicado) y de inmediato se dispara el
// mismo flujo de recuperación de contraseña que forgotPassword, para que el
// propio alumno la establezca por correo — nunca una contraseña por defecto
// predecible (p. ej. la boleta).
async function crearAlumnoNuevo(conexion, datos) {
  const { boleta, nombre, apellido_paterno, apellido_materno, correo_institucional, grupo, carrera } = datos

  const contrasenaAleatoria = crypto.randomBytes(24).toString('hex')
  const hash = await bcrypt.hash(contrasenaAleatoria, RONDAS_BCRYPT)

  const [resultUsuario] = await conexion.query(
    'INSERT INTO usuario (correo_institucional, contrasena_hash, rol, nombre, apellido_paterno, apellido_materno) VALUES (?, ?, ?, ?, ?, ?)',
    [correo_institucional, hash, 'Alumno', nombre, apellido_paterno, apellido_materno]
  )
  const idUsuario = resultUsuario.insertId

  const [resultAlumno] = await conexion.query(
    'INSERT INTO alumno (id_usuario, boleta, grupo, carrera) VALUES (?, ?, ?, ?)',
    [idUsuario, boleta, grupo, carrera]
  )

  const { tokenPlano, tokenHash } = generarTokenReset()
  const expira = new Date(Date.now() + RESET_TOKEN_VIGENCIA_MS)
  await conexion.query('UPDATE usuario SET reset_token_hash = ?, reset_token_expira = ? WHERE id_usuario = ?', [
    tokenHash,
    expira,
    idUsuario,
  ])
  await enviarCorreoRecuperacion(correo_institucional, tokenPlano)

  return resultAlumno.insertId
}

// POST /api/alumnos — alta manual de un alumno (alternativa a la importación masiva de
// Sesión 5). Reutiliza validarAlumno (excel.service.js) y crearAlumnoNuevo para aplicar
// exactamente las mismas reglas de negocio: boleta de 10 dígitos, dominio @alumno.ipn.mx,
// y alta idempotente cuando la boleta o el correo ya existen (solo se inscribe en la
// materia si aún no lo estaba, nunca se duplica el alumno).
async function crear(req, res) {
  const { boleta, nombre, apellido_paterno, apellido_materno, correo, grupo, materia: claveMateria } = req.body

  const datos = {
    boleta: String(boleta ?? '').trim(),
    nombre: String(nombre ?? '').trim(),
    apellido_paterno: String(apellido_paterno ?? '').trim(),
    apellido_materno: apellido_materno ? String(apellido_materno).trim() : null,
    correo_institucional: String(correo ?? '').trim().toLowerCase(),
    grupo: String(grupo ?? '').trim(),
    carrera: null,
  }

  const errores = validarAlumno(datos)
  if (errores.length > 0) {
    return res.status(400).json({ errores })
  }

  const idProfesor = await obtenerIdProfesorPropio(req.user.id_usuario)
  const [materiaRows] = await pool.query(
    'SELECT id_materia FROM materia WHERE clave = ? AND id_profesor = ? ORDER BY fecha_creacion DESC LIMIT 1',
    [claveMateria, idProfesor]
  )
  const materiaRow = materiaRows[0]

  if (!materiaRow) {
    return res.status(404).json({ error: 'Materia no encontrada' })
  }

  const conexion = await pool.getConnection()
  try {
    await conexion.beginTransaction()

    const [existente] = await conexion.query(
      `SELECT a.id_alumno FROM alumno a
       JOIN usuario u ON u.id_usuario = a.id_usuario
       WHERE a.boleta = ? OR u.correo_institucional = ?`,
      [datos.boleta, datos.correo_institucional]
    )

    const idAlumno = existente.length > 0 ? existente[0].id_alumno : await crearAlumnoNuevo(conexion, datos)

    const [yaInscrito] = await conexion.query(
      'SELECT id_materia_alumno FROM materia_alumno WHERE id_materia = ? AND id_alumno = ?',
      [materiaRow.id_materia, idAlumno]
    )

    if (yaInscrito.length === 0) {
      await conexion.query('INSERT INTO materia_alumno (id_materia, id_alumno) VALUES (?, ?)', [
        materiaRow.id_materia,
        idAlumno,
      ])
    }

    await conexion.commit()

    const [alumnoRows] = await pool.query(
      `SELECT a.id_alumno, a.boleta, a.grupo, a.carrera,
              u.nombre, u.apellido_paterno, u.apellido_materno, u.correo_institucional, u.activo
       FROM alumno a JOIN usuario u ON u.id_usuario = a.id_usuario WHERE a.id_alumno = ?`,
      [idAlumno]
    )

    res.status(201).json({ alumno: alumnoRows[0] })
  } catch (err) {
    await conexion.rollback()
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'La boleta o el correo ya están registrados con datos distintos' })
    }
    throw err
  } finally {
    conexion.release()
  }
}

async function listar(req, res) {
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

  const [alumnos] = await pool.query(
    `SELECT
       a.id_alumno, a.boleta, a.grupo, a.carrera,
       u.nombre, u.apellido_paterno, u.apellido_materno, u.correo_institucional, u.activo
     FROM materia_alumno ma
     JOIN alumno a ON a.id_alumno = ma.id_alumno
     JOIN usuario u ON u.id_usuario = a.id_usuario
     WHERE ma.id_materia = ? AND u.activo = TRUE
     ORDER BY u.apellido_paterno, u.apellido_materno, u.nombre`,
    [materiaRow.id_materia]
  )

  res.status(200).json({
    alumnos,
    materia: { id_materia: materiaRow.id_materia, clave: materia, nombre: materiaRow.nombre, grupo: materiaRow.grupo },
  })
}

async function obtener(req, res) {
  const { id } = req.params
  const idProfesor = await obtenerIdProfesorPropio(req.user.id_usuario)

  const [rows] = await pool.query(
    `SELECT a.id_alumno, a.boleta, a.grupo, a.carrera,
            u.id_usuario, u.nombre, u.apellido_paterno, u.apellido_materno, u.correo_institucional, u.activo
     FROM alumno a
     JOIN usuario u ON u.id_usuario = a.id_usuario
     WHERE a.id_alumno = ?`,
    [id]
  )
  const alumno = rows[0]

  if (!alumno) {
    return res.status(404).json({ error: 'Alumno no encontrado' })
  }

  const [compartido] = await pool.query(
    `SELECT 1 FROM materia_alumno ma
     JOIN materia m ON m.id_materia = ma.id_materia
     WHERE ma.id_alumno = ? AND m.id_profesor = ? LIMIT 1`,
    [id, idProfesor]
  )

  if (compartido.length === 0) {
    return res.status(403).json({ error: 'No tienes permiso para ver este alumno' })
  }

  res.status(200).json({ alumno })
}

// Determina, por regla de negocio, qué tipo de equipo corresponde a cada tipo
// de actividad: 'Practica' y 'Tarea' comparten integrantes; 'En clase' se
// asigna a los mismos equipos que 'Tarea' (ver CLAUDE.md — reglas críticas).
function tipoEquipoParaActividad(tipoActividad) {
  if (tipoActividad === 'Proyecto') return 'Proyecto'
  if (tipoActividad === 'Practica') return 'Practica'
  return 'Tarea'
}

async function actividadesDeAlumno(req, res) {
  const { id } = req.params
  const idProfesor = await obtenerIdProfesorPropio(req.user.id_usuario)

  const [alumnoRows] = await pool.query(
    `SELECT a.id_alumno, a.boleta, a.grupo, u.nombre, u.apellido_paterno, u.apellido_materno
     FROM alumno a JOIN usuario u ON u.id_usuario = a.id_usuario
     WHERE a.id_alumno = ?`,
    [id]
  )
  const alumno = alumnoRows[0]

  if (!alumno) {
    return res.status(404).json({ error: 'Alumno no encontrado' })
  }

  const [compartido] = await pool.query(
    `SELECT 1 FROM materia_alumno ma
     JOIN materia m ON m.id_materia = ma.id_materia
     WHERE ma.id_alumno = ? AND m.id_profesor = ? LIMIT 1`,
    [id, idProfesor]
  )

  if (compartido.length === 0) {
    return res.status(403).json({ error: 'No tienes permiso para ver este alumno' })
  }

  const [equipos] = await pool.query(
    `SELECT eq.id_equipo, eq.id_materia, eq.tipo, eq.nombre
     FROM equipo_alumno ea
     JOIN equipo eq ON eq.id_equipo = ea.id_equipo
     JOIN materia m ON m.id_materia = eq.id_materia
     WHERE ea.id_alumno = ? AND m.id_profesor = ? AND eq.activo = TRUE`,
    [id, idProfesor]
  )

  const [actividades] = await pool.query(
    `SELECT
       act.id_actividad, act.id_materia, act.titulo, act.tipo, act.fecha_limite,
       ent.estatus AS estatus_entrega, ent.fecha_entrega,
       cal.nota, cal.individual
     FROM actividad act
     JOIN materia m ON m.id_materia = act.id_materia
     JOIN materia_alumno ma ON ma.id_materia = m.id_materia AND ma.id_alumno = ?
     LEFT JOIN entrega ent ON ent.id_actividad = act.id_actividad AND ent.id_alumno = ?
     LEFT JOIN calificacion cal ON cal.id_actividad = act.id_actividad AND cal.id_alumno = ?
     WHERE m.id_profesor = ? AND act.activo = TRUE
     ORDER BY act.fecha_limite DESC`,
    [id, id, id, idProfesor]
  )

  const actividadesConEquipo = actividades.map((act) => {
    const tipoEquipo = tipoEquipoParaActividad(act.tipo)
    const equipo = equipos.find((eq) => eq.id_materia === act.id_materia && eq.tipo === tipoEquipo)
    return { ...act, id_equipo: equipo?.id_equipo ?? null, equipo_nombre: equipo?.nombre ?? null }
  })

  res.status(200).json({ alumno, actividades: actividadesConEquipo })
}

async function importarExcel(req, res) {
  const claveMateria = req.body.materia

  if (!req.file) {
    return res.status(400).json({ error: 'Debes adjuntar un archivo .xlsx o .xls' })
  }
  if (!claveMateria) {
    return res.status(400).json({ error: 'El campo materia (clave) es requerido' })
  }

  const idProfesor = await obtenerIdProfesorPropio(req.user.id_usuario)
  const [materiaRows] = await pool.query(
    'SELECT id_materia FROM materia WHERE clave = ? AND id_profesor = ? ORDER BY fecha_creacion DESC LIMIT 1',
    [claveMateria, idProfesor]
  )
  const materiaRow = materiaRows[0]

  if (!materiaRow) {
    return res.status(404).json({ error: 'Materia no encontrada' })
  }

  let filas
  try {
    filas = parsearAlumnosDesdeExcel(req.file.buffer)
  } catch (err) {
    return res.status(400).json({ error: `No se pudo leer el archivo: ${err.message}` })
  }

  const resultado = { total: filas.length, insertados: 0, inscritos: 0, ya_inscritos: 0, errores: [] }

  for (const fila of filas) {
    if (fila.errores.length > 0) {
      resultado.errores.push({ fila: fila.numero_fila, errores: fila.errores })
      continue
    }

    const conexion = await pool.getConnection()
    try {
      await conexion.beginTransaction()

      const [existente] = await conexion.query(
        `SELECT a.id_alumno FROM alumno a
         JOIN usuario u ON u.id_usuario = a.id_usuario
         WHERE a.boleta = ? OR u.correo_institucional = ?`,
        [fila.datos.boleta, fila.datos.correo_institucional]
      )

      let idAlumno
      if (existente.length > 0) {
        idAlumno = existente[0].id_alumno
      } else {
        idAlumno = await crearAlumnoNuevo(conexion, fila.datos)
        resultado.insertados++
      }

      const [yaInscrito] = await conexion.query(
        'SELECT id_materia_alumno FROM materia_alumno WHERE id_materia = ? AND id_alumno = ?',
        [materiaRow.id_materia, idAlumno]
      )

      if (yaInscrito.length === 0) {
        await conexion.query('INSERT INTO materia_alumno (id_materia, id_alumno) VALUES (?, ?)', [
          materiaRow.id_materia,
          idAlumno,
        ])
        resultado.inscritos++
      } else {
        resultado.ya_inscritos++
      }

      await conexion.commit()
    } catch (err) {
      await conexion.rollback()
      const mensaje =
        err.code === 'ER_DUP_ENTRY'
          ? 'La boleta o el correo ya están registrados con datos distintos'
          : 'Error al procesar la fila'
      resultado.errores.push({ fila: fila.numero_fila, errores: [mensaje] })
    } finally {
      conexion.release()
    }
  }

  res.status(200).json({ resultado })
}

module.exports = { listar, obtener, crear, importarExcel, actividadesDeAlumno }
