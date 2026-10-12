// Gestión de cuentas de usuario (base para profesor/alumno/administrador).
// Usado por Gestión de Profesores (Admin) y Perfil (todos los roles).
//
// Regla de propiedad de recursos: GET/PUT /:id solo los puede invocar el propio
// usuario o un Administrador — nunca otro Profesor/Alumno. El campo `rol` nunca
// se acepta en la actualización (ni siquiera para un Administrador): un cambio
// de rol es una operación excepcional fuera del alcance de este endpoint.

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

async function actualizar(req, res) {
  const { id } = req.params

  if (!esPropioOAdministrador(req, id)) {
    return res.status(403).json({ error: 'No tienes permiso para editar este usuario' })
  }

  const {
    nombre,
    apellido_paterno,
    apellido_materno,
    correo_alterno,
    notificaciones_email,
    departamento,
    no_empleado,
  } = req.body

  if (no_empleado !== undefined && req.user.rol !== 'Administrador') {
    return res.status(403).json({ error: 'Solo un Administrador puede modificar el número de empleado' })
  }

  try {
    await pool.query(
      'UPDATE usuario SET nombre = ?, apellido_paterno = ?, apellido_materno = ?, correo_alterno = ?, notificaciones_email = ? WHERE id_usuario = ?',
      [
        nombre,
        apellido_paterno,
        apellido_materno || null,
        correo_alterno || null,
        notificaciones_email ?? true,
        id,
      ]
    )

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

module.exports = { listar, obtener, crear, actualizar, desactivar, reactivar }
