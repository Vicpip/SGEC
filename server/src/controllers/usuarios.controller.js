// Gestión de cuentas de usuario (base para profesor/alumno/administrador).
// Usado por Gestión de Profesores (Admin) y Perfil (todos los roles).
//
// Regla de propiedad de recursos: GET /:id solo lo puede invocar el propio usuario o un
// Administrador — nunca otro Profesor/Alumno. PUT /:id es exclusivo del Administrador (lo
// exige la ruta): nadie cambia su propio nombre por la API. Lo único que un usuario edita
// de su cuenta son sus preferencias de notificación, por PATCH /me. El campo `rol` nunca
// se acepta en una actualización (ni siquiera para un Administrador): un cambio de rol es
// una operación excepcional fuera del alcance de estos endpoints.

const bcrypt = require('bcryptjs')
const pool = require('../config/db')
const { obtenerDatosExtendidos } = require('../services/usuarios.service')
const { dominioValido, dominiosPermitidosPorRol } = require('../utils/correoInstitucional')

const RONDAS_BCRYPT = 10

function esPropioOAdministrador(req, idObjetivo) {
  return req.user.rol === 'Administrador' || req.user.id_usuario === Number(idObjetivo)
}

function usuarioPublico(usuario) {
  const { contrasena_hash, reset_token_hash, reset_token_expira, ...resto } = usuario
  return resto
}

async function listarProfesores() {
  const [rows] = await pool.query(`
    SELECT
      u.id_usuario, u.correo_institucional, u.nombre, u.apellido_paterno, u.apellido_materno,
      u.activo, p.id_profesor, p.no_empleado, p.departamento,
      COUNT(DISTINCT m.id_materia) AS total_materias,
      COUNT(DISTINCT ma.id_alumno) AS total_alumnos
    FROM usuario u
    JOIN profesor p ON p.id_usuario = u.id_usuario
    LEFT JOIN materia m ON m.id_profesor = p.id_profesor AND m.estatus != 'Cerrada'
    LEFT JOIN materia_alumno ma ON ma.id_materia = m.id_materia AND ma.activo = TRUE
    WHERE u.rol = 'Profesor'
    GROUP BY u.id_usuario, p.id_profesor
    ORDER BY u.apellido_paterno, u.nombre
  `)
  return rows
}

async function listar(req, res) {
  const { rol } = req.query

  if (rol === 'Profesor') {
    const profesores = await listarProfesores()
    return res.status(200).json({ usuarios: profesores })
  }

  const params = []
  let sql =
    'SELECT id_usuario, correo_institucional, rol, nombre, apellido_paterno, apellido_materno, activo, fecha_creacion FROM usuario'

  if (rol) {
    sql += ' WHERE rol = ?'
    params.push(rol)
  }
  sql += ' ORDER BY apellido_paterno, nombre'

  const [rows] = await pool.query(sql, params)
  res.status(200).json({ usuarios: rows })
}

async function obtener(req, res) {
  const { id } = req.params

  if (!esPropioOAdministrador(req, id)) {
    return res.status(403).json({ error: 'No tienes permiso para ver este usuario' })
  }

  const [rows] = await pool.query('SELECT * FROM usuario WHERE id_usuario = ?', [id])
  const usuario = rows[0]

  if (!usuario) {
    return res.status(404).json({ error: 'Usuario no encontrado' })
  }

  const datosExtendidos = await obtenerDatosExtendidos(usuario)
  res.status(200).json({ usuario: { ...usuarioPublico(usuario), ...datosExtendidos } })
}

async function crear(req, res) {
  const {
    correo_institucional,
    contrasena,
    rol,
    nombre,
    apellido_paterno,
    apellido_materno,
    no_empleado,
    departamento,
  } = req.body

  if (!dominioValido(correo_institucional, rol)) {
    const dominiosPermitidos = dominiosPermitidosPorRol(rol)
    return res.status(400).json({
      error: `El correo debe pertenecer a uno de estos dominios para el rol ${rol}: ${dominiosPermitidos.join(', ')}`,
    })
  }

  const hash = await bcrypt.hash(contrasena, RONDAS_BCRYPT)
  const conexion = await pool.getConnection()

  try {
    await conexion.beginTransaction()

    const [result] = await conexion.query(
      'INSERT INTO usuario (correo_institucional, contrasena_hash, rol, nombre, apellido_paterno, apellido_materno) VALUES (?, ?, ?, ?, ?, ?)',
      [correo_institucional, hash, rol, nombre, apellido_paterno, apellido_materno || null]
    )
    const idUsuario = result.insertId

    if (rol === 'Profesor') {
      await conexion.query('INSERT INTO profesor (id_usuario, no_empleado, departamento) VALUES (?, ?, ?)', [
        idUsuario,
        no_empleado,
        departamento || null,
      ])
    }

    await conexion.commit()
    res.status(201).json({
      usuario: { id_usuario: idUsuario, correo_institucional, rol, nombre, apellido_paterno, apellido_materno },
    })
  } catch (err) {
    await conexion.rollback()
    if (err.code === 'ER_DUP_ENTRY') {
      return res
        .status(409)
        .json({ error: 'Ya existe un usuario con ese correo o número de empleado' })
    }
    throw err
  } finally {
    conexion.release()
  }
}

// PUT /api/usuarios/:id — solo Administrador (Gestión de Profesores). El correo alterno y
// las notificaciones solo se tocan si vienen en la petición: son preferencias del propio
// usuario y el formulario del Administrador no las envía.
async function actualizar(req, res) {
  const { id } = req.params
  const {
    nombre,
    apellido_paterno,
    apellido_materno,
    correo_alterno,
    notificaciones_email,
    departamento,
    no_empleado,
  } = req.body

  const campos = ['nombre = ?', 'apellido_paterno = ?', 'apellido_materno = ?']
  const params = [nombre, apellido_paterno, apellido_materno || null]
  if (correo_alterno !== undefined) {
    campos.push('correo_alterno = ?')
    params.push(correo_alterno || null)
  }
  if (notificaciones_email !== undefined) {
    campos.push('notificaciones_email = ?')
    params.push(notificaciones_email)
  }

  try {
    const [result] = await pool.query(`UPDATE usuario SET ${campos.join(', ')} WHERE id_usuario = ?`, [...params, id])
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    if (departamento !== undefined || no_empleado !== undefined) {
      await pool.query(
        'UPDATE profesor SET departamento = COALESCE(?, departamento), no_empleado = COALESCE(?, no_empleado) WHERE id_usuario = ?',
        [departamento ?? null, no_empleado ?? null, id]
      )
    }

    res.status(200).json({ message: 'Usuario actualizado' })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ese número de empleado ya está en uso' })
    }
    throw err
  }
}

// PATCH /api/usuarios/me — el usuario autenticado (cualquier rol) edita sus preferencias de
// notificación: correo_alterno y notificaciones_email, y nada más. El validador es una lista
// blanca (cualquier otro campo, como nombre, rol o activo, responde 400) y la cuenta que se
// modifica es siempre la del JWT, nunca un id enviado por el cliente.
async function actualizarPropio(req, res) {
  const { correo_alterno, notificaciones_email } = req.body

  const campos = []
  const params = []
  if (correo_alterno !== undefined) {
    campos.push('correo_alterno = ?')
    params.push(correo_alterno || null)
  }
  if (notificaciones_email !== undefined) {
    campos.push('notificaciones_email = ?')
    params.push(notificaciones_email)
  }

  await pool.query(`UPDATE usuario SET ${campos.join(', ')} WHERE id_usuario = ?`, [...params, req.user.id_usuario])

  const [rows] = await pool.query('SELECT correo_alterno, notificaciones_email FROM usuario WHERE id_usuario = ?', [
    req.user.id_usuario,
  ])
  res.status(200).json({
    message: 'Preferencias actualizadas',
    usuario: {
      correo_alterno: rows[0].correo_alterno,
      notificaciones_email: Boolean(rows[0].notificaciones_email),
    },
  })
}

async function desactivar(req, res) {
  const { id } = req.params

  const [result] = await pool.query('UPDATE usuario SET activo = FALSE WHERE id_usuario = ?', [id])

  if (result.affectedRows === 0) {
    return res.status(404).json({ error: 'Usuario no encontrado' })
  }

  res.status(200).json({ message: 'Usuario desactivado' })
}

// PATCH /api/usuarios/:id/reactivar — revierte la baja lógica de un Profesor. Se limita a
// ese rol a propósito: es lo único que ofrece Gestión de Profesores, y reactivar cuentas de
// otros roles por id no tiene pantalla ni caso de uso definido.
async function reactivar(req, res) {
  const { id } = req.params

  const [rows] = await pool.query('SELECT id_usuario, rol FROM usuario WHERE id_usuario = ?', [id])
  const usuario = rows[0]

  if (!usuario) {
    return res.status(404).json({ error: 'Usuario no encontrado' })
  }

  if (usuario.rol !== 'Profesor') {
    return res.status(409).json({ error: 'Solo se pueden reactivar cuentas de profesor' })
  }

  await pool.query('UPDATE usuario SET activo = TRUE WHERE id_usuario = ?', [id])
  res.status(200).json({ message: 'Profesor reactivado' })
}

module.exports = { listar, obtener, crear, actualizar, actualizarPropio, desactivar, reactivar }
