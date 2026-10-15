// Alumnos inscritos en materias. Pantallas 07 (Lista), 08 (Importar Excel), 09 (Actividades del alumno).
//
// Regla de propiedad: un Profesor solo ve alumnos de materias donde
// materia.id_profesor = su propio id_profesor (nunca el id_usuario del JWT
// directamente) — nunca confiar en el parámetro `materia`/`:id` que mande el cliente.
//
// Altas, bajas y cambios (Sesión 14): el profesor puede editar los datos del alumno (nunca
// su correo institucional) y darlo de baja de UNA materia suya. La baja es lógica
// (materia_alumno.activo = FALSE): se conserva el historial de entregas y calificaciones, y
// reinscribirlo (alta manual o Excel) reactiva esa misma fila en lugar de duplicarla. Toda
// consulta que decide si un alumno "está inscrito" exige materia_alumno.activo = TRUE.
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
const { resolverMateriaPorClave } = require('../services/materias.service')
const { tipoEquipoParaActividad, condicionActividadDirigidaAlumnoSQL } = require('../services/destinoActividad.service')
const { correoHabilitado, enviarCorreoBienvenida } = require('../services/email.service')
const {
  RONDAS_BCRYPT,
  RESET_TOKEN_VIGENCIA_MS,
  generarTokenReset,
  generarContrasenaTemporal,
  ahoraSinMilisegundos,
} = require('../utils/credenciales')

async function obtenerIdProfesorPropio(idUsuario) {
  const [rows] = await pool.query('SELECT id_profesor FROM profesor WHERE id_usuario = ?', [idUsuario])
  return rows[0]?.id_profesor ?? null
}

// Las respuestas que llevan contraseñas temporales no deben quedar en cachés intermedios.
function sinCache(res) {
  res.set('Cache-Control', 'no-store')
}

const ETIQUETA_TIPO_EQUIPO = { Practica: 'Práctica', Tarea: 'Tarea', Proyecto: 'Proyecto' }

const SELECT_ALUMNO_PUBLICO = `
  SELECT a.id_alumno, a.boleta, a.grupo, a.carrera,
         u.nombre, u.apellido_paterno, u.apellido_materno, u.correo_institucional, u.activo
  FROM alumno a JOIN usuario u ON u.id_usuario = a.id_usuario`

// Inscribe al alumno en la materia. Si tenía una baja lógica previa, reactiva esa fila en
// lugar de insertar otra (el índice único es id_materia + id_alumno).
// Devuelve true si quedó inscrito en esta llamada y false si ya lo estaba.
async function inscribirEnMateria(conexion, idMateria, idAlumno) {
  const [rows] = await conexion.query(
    'SELECT id_materia_alumno, activo FROM materia_alumno WHERE id_materia = ? AND id_alumno = ?',
    [idMateria, idAlumno]
  )

  if (rows.length === 0) {
    await conexion.query('INSERT INTO materia_alumno (id_materia, id_alumno) VALUES (?, ?)', [idMateria, idAlumno])
    return true
  }

  if (!rows[0].activo) {
    await conexion.query(
      'UPDATE materia_alumno SET activo = TRUE, fecha_inscripcion = CURRENT_TIMESTAMP WHERE id_materia_alumno = ?',
      [rows[0].id_materia_alumno]
    )
    return true
  }

  return false
}

// ¿El alumno está inscrito (inscripción vigente) en alguna materia NO cerrada del profesor?
// Es la condición para modificar su cuenta (editar datos, restablecer acceso): una materia
// de un semestre ya cerrado no da derecho a tocarla.
async function inscritoEnMateriaAbiertaDe(idProfesor, idAlumno) {
  const [rows] = await pool.query(
    `SELECT 1 FROM materia_alumno ma
     JOIN materia m ON m.id_materia = ma.id_materia
     WHERE ma.id_alumno = ? AND ma.activo = TRUE AND m.id_profesor = ? AND m.estatus != 'Cerrada' LIMIT 1`,
    [idAlumno, idProfesor]
  )
  return rows.length > 0
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
// toca la contraseña (para eso está restablecer-acceso, con su propia verificación) ni
// ningún otro dato: la `carrera` capturada solo se guarda al crear la cuenta.
async function crear(req, res) {
  const { boleta, nombre, apellido_paterno, apellido_materno, correo, grupo, carrera, materia: claveMateria } = req.body

  const datos = {
    boleta: String(boleta ?? '').trim(),
    nombre: String(nombre ?? '').trim(),
    apellido_paterno: String(apellido_paterno ?? '').trim(),
    apellido_materno: apellido_materno ? String(apellido_materno).trim() : null,
    correo_institucional: String(correo ?? '').trim().toLowerCase(),
    grupo: String(grupo ?? '').trim(),
    carrera: carrera ? String(carrera).trim() : null,
  }

  const errores = validarAlumno(datos)
  if (errores.length > 0) {
    return res.status(400).json({ errores })
  }

  const { materia: materiaRow, error: errorMateria } = await resolverMateriaPorClave(req.user, {
    clave: claveMateria,
    idMateria: req.body.id_materia,
    semestre: req.body.semestre,
  })
  if (errorMateria) {
    return res.status(errorMateria.status).json({ error: errorMateria.mensaje })
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

    await inscribirEnMateria(conexion, materiaRow.id_materia, idAlumno)

    await conexion.commit()

    const [alumnoRows] = await pool.query(`${SELECT_ALUMNO_PUBLICO} WHERE a.id_alumno = ?`, [idAlumno])

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

  const { materia: materiaRow, error: errorMateria } = await resolverMateriaPorClave(req.user, {
    clave: materia,
    idMateria: req.query.id_materia,
    semestre: req.query.semestre,
  })
  if (errorMateria) {
    return res.status(errorMateria.status).json({ error: errorMateria.mensaje })
  }

  const [alumnos] = await pool.query(
    `SELECT
       a.id_alumno, a.boleta, a.grupo, a.carrera,
       u.nombre, u.apellido_paterno, u.apellido_materno, u.correo_institucional, u.activo,
       -- TRUE = aún no activa su cuenta: el profesor todavía puede restablecer su acceso.
       u.debe_cambiar_contrasena AS acceso_pendiente
     FROM materia_alumno ma
     JOIN alumno a ON a.id_alumno = ma.id_alumno
     JOIN usuario u ON u.id_usuario = a.id_usuario
     WHERE ma.id_materia = ? AND ma.activo = TRUE AND u.activo = TRUE
     ORDER BY u.apellido_paterno, u.apellido_materno, u.nombre`,
    [materiaRow.id_materia]
  )

  res.status(200).json({
    alumnos,
    materia: { id_materia: materiaRow.id_materia, clave: materiaRow.clave, nombre: materiaRow.nombre, grupo: materiaRow.grupo, semestre: materiaRow.semestre },
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
     WHERE ma.id_alumno = ? AND ma.activo = TRUE AND m.id_profesor = ? LIMIT 1`,
    [id, idProfesor]
  )

  if (compartido.length === 0) {
    return res.status(403).json({ error: 'No tienes permiso para ver este alumno' })
  }

  res.status(200).json({ alumno })
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
     WHERE ma.id_alumno = ? AND ma.activo = TRUE AND m.id_profesor = ? LIMIT 1`,
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
       act.id_actividad, act.id_materia, act.titulo, act.tipo, act.tipo_evaluacion, act.fecha_limite,
       ent.estatus AS estatus_entrega, ent.fecha_entrega,
       cal.nota, cal.individual
     FROM actividad act
     JOIN materia m ON m.id_materia = act.id_materia
     JOIN materia_alumno ma ON ma.id_materia = m.id_materia AND ma.id_alumno = ? AND ma.activo = TRUE
     LEFT JOIN entrega ent ON ent.id_actividad = act.id_actividad AND ent.id_alumno = ?
     LEFT JOIN calificacion cal ON cal.id_actividad = act.id_actividad AND cal.id_alumno = ?
     WHERE m.id_profesor = ? AND act.activo = TRUE
       AND ${condicionActividadDirigidaAlumnoSQL('act')}
     ORDER BY act.fecha_limite DESC`,
    [id, id, id, idProfesor, id, id]
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

  const { materia: materiaRow, error: errorMateria } = await resolverMateriaPorClave(req.user, {
    clave: claveMateria,
    idMateria: req.body.id_materia,
    semestre: req.body.semestre,
  })
  if (errorMateria) {
    return res.status(errorMateria.status).json({ error: errorMateria.mensaje })
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

      const inscritoAhora = await inscribirEnMateria(conexion, materiaRow.id_materia, idAlumno)

      await conexion.commit()

      // Contadores y credencial se registran solo tras el commit: una fila que revierte
      // no debe reportar un alumno ni una contraseña que no existen.
      if (nuevo) {
        resultado.insertados++
        credenciales.push(nuevo.credencial)
        enviarBienvenida(nuevo, fila.datos.nombre)
      }
      if (inscritoAhora) resultado.inscritos++
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
// de activación). Invalida además cualquier enlace de activación/recuperación pendiente y,
// al anotar contrasena_cambiada_en, toda sesión que el alumno tuviera abierta (ver
// auth.middleware.js).
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
    if (!(await inscritoEnMateriaAbiertaDe(idProfesor, id))) {
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
     SET contrasena_hash = ?, debe_cambiar_contrasena = TRUE, reset_token_hash = NULL, reset_token_expira = NULL,
         contrasena_cambiada_en = ?
     WHERE id_usuario = ?`,
    [hash, ahoraSinMilisegundos(), alumno.id_usuario]
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

const BUSQUEDA_MIN_CARACTERES = 3
const BUSQUEDA_MAX_RESULTADOS = 10

// GET /api/alumnos/buscar?q=
// Solo Administrador (lo exige la ruta). Busca alumnos por correo institucional o boleta
// para la pantalla "Accesos de alumnos", donde el Administrador restablece el acceso de
// quien ya activó su cuenta y olvidó su contraseña. Devuelve como máximo 10 resultados y
// únicamente id, nombre, correo, boleta, activo y acceso_pendiente — nada más de la cuenta.
// Exige al menos 3 caracteres para que no sirva como listado completo de alumnos.
async function buscar(req, res) {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''

  if (q.length < BUSQUEDA_MIN_CARACTERES) {
    return res.status(400).json({ error: `Escribe al menos ${BUSQUEDA_MIN_CARACTERES} caracteres del correo o la boleta` })
  }
  if (q.length > 150) {
    return res.status(400).json({ error: 'El texto de búsqueda es demasiado largo' })
  }

  // % y _ son comodines de LIKE: se escapan para buscarlos como texto literal.
  const patron = `%${q.replace(/[\\%_]/g, '\\$&')}%`

  const [rows] = await pool.query(
    `SELECT a.id_alumno, a.boleta, u.nombre, u.apellido_paterno, u.apellido_materno,
            u.correo_institucional, u.activo, u.debe_cambiar_contrasena
     FROM alumno a
     JOIN usuario u ON u.id_usuario = a.id_usuario
     WHERE u.rol = 'Alumno' AND (u.correo_institucional LIKE ? OR a.boleta LIKE ?)
     ORDER BY u.apellido_paterno, u.apellido_materno, u.nombre
     LIMIT ?`,
    [patron, patron, BUSQUEDA_MAX_RESULTADOS]
  )

  res.status(200).json({
    alumnos: rows.map((r) => ({
      id_alumno: r.id_alumno,
      nombre: nombreParaCredencial(r),
      correo_institucional: r.correo_institucional,
      boleta: r.boleta,
      activo: Boolean(r.activo),
      acceso_pendiente: Boolean(r.debe_cambiar_contrasena),
    })),
  })
}

// PUT /api/alumnos/:id
// Edita nombre, apellidos, boleta, grupo y carrera. El correo institucional NO se edita (es
// la identidad de la cuenta; el validador rechaza el campo). Solo el profesor que tiene al
// alumno inscrito en una materia suya no cerrada. Como el alumno es una cuenta global, el
// cambio lo ven todos sus profesores: por eso queda registrado en el log del servidor.
async function actualizar(req, res) {
  const { id } = req.params
  const { boleta, nombre, apellido_paterno, apellido_materno, grupo, carrera } = req.body
  const idProfesor = await obtenerIdProfesorPropio(req.user.id_usuario)

  const [rows] = await pool.query(
    `SELECT a.id_alumno, a.id_usuario, u.rol FROM alumno a JOIN usuario u ON u.id_usuario = a.id_usuario
     WHERE a.id_alumno = ?`,
    [id]
  )
  const alumno = rows[0]

  if (!alumno || alumno.rol !== 'Alumno') {
    return res.status(404).json({ error: 'Alumno no encontrado' })
  }

  if (!(await inscritoEnMateriaAbiertaDe(idProfesor, id))) {
    return res.status(403).json({ error: 'No tienes permiso para editar este alumno' })
  }

  const conexion = await pool.getConnection()
  try {
    await conexion.beginTransaction()
    await conexion.query('UPDATE alumno SET boleta = ?, grupo = ?, carrera = ? WHERE id_alumno = ?', [
      boleta,
      grupo,
      carrera || null,
      alumno.id_alumno,
    ])
    await conexion.query(
      'UPDATE usuario SET nombre = ?, apellido_paterno = ?, apellido_materno = ? WHERE id_usuario = ?',
      [nombre, apellido_paterno, apellido_materno || null, alumno.id_usuario]
    )
    await conexion.commit()
  } catch (err) {
    await conexion.rollback()
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ya existe otro alumno con esa boleta' })
    }
    throw err
  } finally {
    conexion.release()
  }

  console.log(
    `[alumnos] editar: usuario ${req.user.id_usuario} (${req.user.rol}) -> alumno ${alumno.id_alumno} | ${new Date().toISOString()}`
  )

  const [actualizado] = await pool.query(`${SELECT_ALUMNO_PUBLICO} WHERE a.id_alumno = ?`, [alumno.id_alumno])
  res.status(200).json({ alumno: actualizado[0] })
}

// PATCH /api/alumnos/:id/baja?materia=<clave>
// Desinscribe al alumno de UNA materia del profesor (baja lógica; la cuenta del alumno y
// sus inscripciones en otras materias no se tocan). Si pertenece a un equipo activo de esa
// materia se rechaza con 409 y la lista de equipos: el profesor debe editarlos o
// desactivarlos antes, para no dejar equipos con integrantes que ya no cursan la materia.
async function darDeBaja(req, res) {
  const { id } = req.params
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

  const [inscripcion] = await pool.query(
    'SELECT id_materia_alumno FROM materia_alumno WHERE id_materia = ? AND id_alumno = ? AND activo = TRUE',
    [materiaRow.id_materia, id]
  )

  if (inscripcion.length === 0) {
    return res.status(404).json({ error: 'El alumno no está inscrito en esta materia' })
  }

  const [equipos] = await pool.query(
    `SELECT eq.id_equipo, eq.nombre, eq.tipo
     FROM equipo_alumno ea
     JOIN equipo eq ON eq.id_equipo = ea.id_equipo
     WHERE ea.id_alumno = ? AND eq.id_materia = ? AND eq.activo = TRUE
     ORDER BY eq.tipo, eq.nombre`,
    [id, materiaRow.id_materia]
  )

  if (equipos.length > 0) {
    const lista = equipos.map((eq) => `${eq.nombre} (${ETIQUETA_TIPO_EQUIPO[eq.tipo] ?? eq.tipo})`).join(', ')
    return res.status(409).json({
      error: `El alumno pertenece a equipos activos de esta materia: ${lista}. Edita o desactiva esos equipos antes de darlo de baja`,
      equipos,
    })
  }

  await pool.query('UPDATE materia_alumno SET activo = FALSE WHERE id_materia_alumno = ?', [
    inscripcion[0].id_materia_alumno,
  ])

  res.status(200).json({ message: 'Alumno dado de baja de la materia' })
}

module.exports = {
  listar,
  buscar,
  obtener,
  crear,
  actualizar,
  darDeBaja,
  importarExcel,
  actividadesDeAlumno,
  restablecerAcceso,
}
