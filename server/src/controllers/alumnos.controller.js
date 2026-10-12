// Alumnos inscritos en materias. Pantallas 07 (Lista), 08 (Importar Excel), 09 (Actividades del alumno).
//
// Regla de propiedad: un Profesor solo ve alumnos de materias donde
// materia.id_profesor = su propio id_profesor (nunca el id_usuario del JWT
// directamente) — nunca confiar en el parámetro `materia`/`:id` que mande el cliente.
//
// Acceso de los alumnos (Sesión 13): al crear una cuenta nueva (alta manual o Excel) o al
// restablecer el acceso se genera una contraseña temporal aleatoria. Se guarda solo su
// hash bcrypt y el texto claro se devuelve UNA vez al profesor en el campo `credenciales`
// de la respuesta; nunca se registra en logs ni viaja por correo. La cuenta queda con
// debe_cambiar_contrasena = TRUE (ver auth.controller.js). Si hay correo configurado se
// envía además un enlace de activación, pero el acceso no depende de él.

const bcrypt = require('bcryptjs')
const pool = require('../config/db')
const { parsearAlumnosDesdeExcel, validarAlumno } = require('../services/excel.service')
const { correoHabilitado, enviarCorreoBienvenida } = require('../services/email.service')
const {
  RONDAS_BCRYPT,
  RESET_TOKEN_VIGENCIA_MS,
  generarTokenReset,
  generarContrasenaTemporal,
} = require('../utils/credenciales')

async function obtenerIdProfesorPropio(idUsuario) {
  const [rows] = await pool.query('SELECT id_profesor FROM profesor WHERE id_usuario = ?', [idUsuario])
  return rows[0]?.id_profesor ?? null
}

// Las respuestas que llevan contraseñas temporales no deben quedar en cachés intermedios.
function sinCache(res) {
  res.set('Cache-Control', 'no-store')
}

function nombreParaCredencial({ nombre, apellido_paterno, apellido_materno }) {
  return [apellido_paterno, apellido_materno, nombre].filter(Boolean).join(' ')
}

// Crea usuario + alumno con una contraseña temporal aleatoria (nunca una predecible,
// p. ej. la boleta) y cambio obligatorio en el primer inicio de sesión. Devuelve la
// credencial en claro para que quien llama la entregue al profesor una sola vez, y el
// token de activación (null si no hay correo configurado) para enviarlo DESPUÉS del
// commit — nunca se envía un correo por una fila que termina en rollback.
async function crearAlumnoNuevo(conexion, datos) {
  const { boleta, nombre, apellido_paterno, apellido_materno, correo_institucional, grupo, carrera } = datos

  const contrasenaTemporal = generarContrasenaTemporal()
  const hash = await bcrypt.hash(contrasenaTemporal, RONDAS_BCRYPT)

  const [resultUsuario] = await conexion.query(
    `INSERT INTO usuario
       (correo_institucional, contrasena_hash, rol, nombre, apellido_paterno, apellido_materno, debe_cambiar_contrasena)
     VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
    [correo_institucional, hash, 'Alumno', nombre, apellido_paterno, apellido_materno]
  )
  const idUsuario = resultUsuario.insertId

  const [resultAlumno] = await conexion.query(
    'INSERT INTO alumno (id_usuario, boleta, grupo, carrera) VALUES (?, ?, ?, ?)',
    [idUsuario, boleta, grupo, carrera]
  )

  let tokenActivacion = null
  if (correoHabilitado()) {
    const { tokenPlano, tokenHash } = generarTokenReset()
    const expira = new Date(Date.now() + RESET_TOKEN_VIGENCIA_MS)
    await conexion.query('UPDATE usuario SET reset_token_hash = ?, reset_token_expira = ? WHERE id_usuario = ?', [
      tokenHash,
      expira,
      idUsuario,
    ])
    tokenActivacion = tokenPlano
  }

  const idAlumno = resultAlumno.insertId
  return {
    idAlumno,
    tokenActivacion,
    credencial: {
      id_alumno: idAlumno,
      boleta,
      nombre: nombreParaCredencial(datos),
      correo_institucional,
      contrasena_temporal: contrasenaTemporal,
    },
  }
}

// Busca una cuenta de alumno ya registrada con esa boleta o ese correo. Un alumno es una
// cuenta global (puede cursar materias de varios profesores), así que el alta de uno que
// ya existe solo lo inscribe: nunca se sobrescriben su nombre, correo, grupo ni contraseña.
// Solo se considera "el mismo alumno" si coinciden boleta Y correo; si coincide uno solo,
// los datos capturados chocan con una cuenta ajena y se rechaza (409) sin revelar los
// datos de esa cuenta.
// Devuelve { idAlumno } | { conflicto: mensaje } | null (no existe).
async function buscarAlumnoExistente(conexion, { boleta, correo_institucional }) {
  const [rows] = await conexion.query(
    `SELECT a.id_alumno, a.boleta, u.correo_institucional
     FROM alumno a
     JOIN usuario u ON u.id_usuario = a.id_usuario
     WHERE a.boleta = ? OR u.correo_institucional = ?`,
    [boleta, correo_institucional]
  )

  if (rows.length === 0) return null

  const mismoCorreo = (row) => row.correo_institucional.toLowerCase() === correo_institucional
  const exacto = rows.length === 1 && rows[0].boleta === boleta && mismoCorreo(rows[0])
  if (exacto) return { idAlumno: rows[0].id_alumno }

  const boletaOcupada = rows.some((row) => row.boleta === boleta)
  return {
    conflicto: boletaOcupada
      ? 'La boleta ya está registrada con otro correo institucional'
      : 'El correo institucional ya está registrado con otra boleta',
  }
}

// Sin await a propósito: el envío no debe retrasar la respuesta ni puede tumbarla
// (enviarCorreoBienvenida nunca rechaza).
function enviarBienvenida(nuevo, nombre) {
  if (nuevo.tokenActivacion) {
    enviarCorreoBienvenida(nuevo.credencial.correo_institucional, nuevo.tokenActivacion, nombre)
  }
}

// POST /api/alumnos — alta manual de un alumno (alternativa a la importación masiva de
// Sesión 5). Reutiliza validarAlumno (excel.service.js) y crearAlumnoNuevo para aplicar
// exactamente las mismas reglas de negocio: boleta de 10 dígitos, dominio @alumno.ipn.mx,
// y alta idempotente cuando la boleta o el correo ya existen (solo se inscribe en la
// materia si aún no lo estaba, nunca se duplica el alumno). `credenciales` solo trae un
// elemento cuando la cuenta se creó en esta petición: a un alumno que ya existía NO se le
// toca la contraseña (para eso está restablecer-acceso, con su propia verificación).
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

    const existente = await buscarAlumnoExistente(conexion, datos)
    if (existente?.conflicto) {
      await conexion.rollback()
      return res.status(409).json({ error: existente.conflicto })
    }

    const nuevo = existente ? null : await crearAlumnoNuevo(conexion, datos)
    const idAlumno = nuevo ? nuevo.idAlumno : existente.idAlumno

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

    if (nuevo) enviarBienvenida(nuevo, datos.nombre)

    sinCache(res)
    res.status(201).json({ alumno: alumnoRows[0], credenciales: nuevo ? [nuevo.credencial] : [] })
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
  const credenciales = []

  for (const fila of filas) {
    if (fila.errores.length > 0) {
      resultado.errores.push({ fila: fila.numero_fila, errores: fila.errores })
      continue
    }

    const conexion = await pool.getConnection()
    try {
      await conexion.beginTransaction()

      const existente = await buscarAlumnoExistente(conexion, fila.datos)
      if (existente?.conflicto) {
        await conexion.rollback()
        resultado.errores.push({ fila: fila.numero_fila, errores: [existente.conflicto] })
        continue
      }

      const nuevo = existente ? null : await crearAlumnoNuevo(conexion, fila.datos)
      const idAlumno = nuevo ? nuevo.idAlumno : existente.idAlumno

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

      // Contadores y credencial se registran solo tras el commit: una fila que revierte
      // no debe reportar un alumno ni una contraseña que no existen.
      if (nuevo) {
        resultado.insertados++
        credenciales.push(nuevo.credencial)
        enviarBienvenida(nuevo, fila.datos.nombre)
      }
      if (yaInscrito.length === 0) resultado.inscritos++
      else resultado.ya_inscritos++
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

  sinCache(res)
  res.status(200).json({ resultado, credenciales })
}

// POST /api/alumnos/:id/restablecer-acceso
// Regenera la contraseña temporal de un alumno (perdió la anterior, o venció el enlace
// de activación). Invalida además cualquier enlace de activación/recuperación pendiente.
//
// Quién puede hacerlo:
//   - Profesor: solo si tiene al alumno inscrito en una materia suya NO cerrada (una
//     materia de un semestre pasado no da derecho a tocar la cuenta) Y el alumno todavía
//     no activó su cuenta (debe_cambiar_contrasena = TRUE). Sin esta segunda condición,
//     cualquier profesor podría tomar la cuenta de cualquier alumno con solo inscribirlo
//     en una materia propia. Si el alumno ya eligió su contraseña: 409.
//   - Administrador: cualquier alumno con cuenta activa.
// Cada restablecimiento queda en el log del servidor (quién, a qué alumno, cuándo), sin
// contraseñas ni correos.
async function restablecerAcceso(req, res) {
  const { id } = req.params
  const esAdministrador = req.user.rol === 'Administrador'

  const [rows] = await pool.query(
    `SELECT a.id_alumno, a.boleta, u.id_usuario, u.nombre, u.apellido_paterno, u.apellido_materno,
            u.correo_institucional, u.activo, u.rol, u.debe_cambiar_contrasena
     FROM alumno a
     JOIN usuario u ON u.id_usuario = a.id_usuario
     WHERE a.id_alumno = ?`,
    [id]
  )
  const alumno = rows[0]

  if (!alumno) {
    return res.status(404).json({ error: 'Alumno no encontrado' })
  }

  if (!esAdministrador) {
    const idProfesor = await obtenerIdProfesorPropio(req.user.id_usuario)
    const [compartido] = await pool.query(
      `SELECT 1 FROM materia_alumno ma
       JOIN materia m ON m.id_materia = ma.id_materia
       WHERE ma.id_alumno = ? AND m.id_profesor = ? AND m.estatus != 'Cerrada' LIMIT 1`,
      [id, idProfesor]
    )

    if (compartido.length === 0) {
      return res.status(403).json({ error: 'No tienes permiso para restablecer el acceso de este alumno' })
    }
  }

  if (alumno.rol !== 'Alumno' || !alumno.activo) {
    return res.status(409).json({ error: 'La cuenta del alumno está inactiva' })
  }

  if (!esAdministrador && !alumno.debe_cambiar_contrasena) {
    return res.status(409).json({
      error:
        'El alumno ya activó su cuenta y eligió su contraseña. Debe usar "Olvidé mi contraseña" o pedir el restablecimiento al Administrador',
      codigo: 'CUENTA_YA_ACTIVADA',
    })
  }

  const contrasenaTemporal = generarContrasenaTemporal()
  const hash = await bcrypt.hash(contrasenaTemporal, RONDAS_BCRYPT)

  await pool.query(
    `UPDATE usuario
     SET contrasena_hash = ?, debe_cambiar_contrasena = TRUE, reset_token_hash = NULL, reset_token_expira = NULL
     WHERE id_usuario = ?`,
    [hash, alumno.id_usuario]
  )

  console.log(
    `[alumnos] restablecer-acceso: usuario ${req.user.id_usuario} (${req.user.rol}) -> alumno ${alumno.id_alumno} | ${new Date().toISOString()}`
  )

  sinCache(res)
  res.status(200).json({
    credenciales: [
      {
        id_alumno: alumno.id_alumno,
        boleta: alumno.boleta,
        nombre: nombreParaCredencial(alumno),
        correo_institucional: alumno.correo_institucional,
        contrasena_temporal: contrasenaTemporal,
      },
    ],
  })
}

module.exports = { listar, obtener, crear, importarExcel, actividadesDeAlumno, restablecerAcceso }
