// Equipos colaborativos (3 integrantes, sin repetición por tipo). Pantallas 04, 05, 06.
//
// Regla de propiedad: un Profesor solo ve/crea/edita/desactiva equipos de materias donde
// materia.id_profesor = su propio id_profesor (nunca el id_usuario del JWT directamente).
// Un Alumno solo ve los equipos donde es integrante (equipo_alumno.id_alumno = su propio
// id_alumno).

const pool = require('../config/db')
const { asignarEquiposAleatorio, tiposEspejo } = require('../services/asignacion.service')

async function obtenerIdProfesorPropio(idUsuario) {
  const [rows] = await pool.query('SELECT id_profesor FROM profesor WHERE id_usuario = ?', [idUsuario])
  return rows[0]?.id_profesor ?? null
}

async function obtenerIdAlumnoPropio(idUsuario) {
  const [rows] = await pool.query('SELECT id_alumno FROM alumno WHERE id_usuario = ?', [idUsuario])
  return rows[0]?.id_alumno ?? null
}

async function integrantesDeEquipos(idsEquipo) {
  if (idsEquipo.length === 0) return new Map()

  const [rows] = await pool.query(
    `SELECT ea.id_equipo, a.id_alumno, a.boleta, u.nombre, u.apellido_paterno, u.apellido_materno
     FROM equipo_alumno ea
     JOIN alumno a ON a.id_alumno = ea.id_alumno
     JOIN usuario u ON u.id_usuario = a.id_usuario
     WHERE ea.id_equipo IN (?)
     ORDER BY u.apellido_paterno, u.apellido_materno, u.nombre`,
    [idsEquipo]
  )

  const mapa = new Map()
  for (const row of rows) {
    const lista = mapa.get(row.id_equipo) ?? []
    lista.push({
      id_alumno: row.id_alumno,
      boleta: row.boleta,
      nombre: row.nombre,
      apellido_paterno: row.apellido_paterno,
      apellido_materno: row.apellido_materno,
    })
    mapa.set(row.id_equipo, lista)
  }
  return mapa
}

// Alumnos que ya tienen un equipo ACTIVO de alguno de los tipos "espejo" del tipo dado
// (Practica y Tarea comparten integrantes, ver asignacion.service.js) dentro de la materia
// indicada. Al editar, `excluirEquipo` ignora tanto el propio equipo como su "espejo"
// (Practica/Tarea con el mismo nombre comparten integrantes, ver asignacion.service.js) —
// de lo contrario guardar un equipo sin cambios chocaría con su propio equipo espejo.
async function idsAlumnosConEquipoDeTipo(idMateria, tipo, excluirEquipo) {
  const tipos = tiposEspejo(tipo)
  const params = [idMateria, tipos]
  let sql = `SELECT DISTINCT ea.id_alumno
             FROM equipo_alumno ea
             JOIN equipo eq ON eq.id_equipo = ea.id_equipo
             WHERE eq.id_materia = ? AND eq.tipo IN (?) AND eq.activo = TRUE`
  if (excluirEquipo) {
    sql += ' AND eq.id_equipo != ? AND eq.nombre != ?'
    params.push(excluirEquipo.id_equipo, excluirEquipo.nombre)
  }
  const [rows] = await pool.query(sql, params)
  return new Set(rows.map((r) => r.id_alumno))
}

async function listar(req, res) {
  if (req.user.rol === 'Alumno') {
    const idAlumno = await obtenerIdAlumnoPropio(req.user.id_usuario)

    const [equipos] = await pool.query(
      `SELECT eq.id_equipo, eq.id_materia, eq.nombre, eq.tipo, eq.activo, eq.fecha_creacion,
              m.clave AS materia_clave, m.nombre AS materia_nombre, m.grupo AS materia_grupo
       FROM equipo_alumno ea
       JOIN equipo eq ON eq.id_equipo = ea.id_equipo
       JOIN materia m ON m.id_materia = eq.id_materia
       WHERE ea.id_alumno = ? AND eq.activo = TRUE
       ORDER BY eq.fecha_creacion DESC`,
      [idAlumno]
    )

    const integrantesPorEquipo = await integrantesDeEquipos(equipos.map((e) => e.id_equipo))
    const equiposConIntegrantes = equipos.map((eq) => ({
      ...eq,
      integrantes: integrantesPorEquipo.get(eq.id_equipo) ?? [],
    }))

    return res.status(200).json({ equipos: equiposConIntegrantes })
  }

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

  const [equipos] = await pool.query(
    `SELECT id_equipo, id_materia, nombre, tipo, activo, fecha_creacion
     FROM equipo WHERE id_materia = ? AND activo = TRUE ORDER BY tipo, nombre`,
    [materiaRow.id_materia]
  )

  const integrantesPorEquipo = await integrantesDeEquipos(equipos.map((e) => e.id_equipo))
  const equiposConIntegrantes = equipos.map((eq) => ({
    ...eq,
    integrantes: integrantesPorEquipo.get(eq.id_equipo) ?? [],
  }))

  res.status(200).json({
    equipos: equiposConIntegrantes,
    materia: { id_materia: materiaRow.id_materia, clave: materia, nombre: materiaRow.nombre, grupo: materiaRow.grupo },
  })
}

async function obtener(req, res) {
  const { id } = req.params

  const [rows] = await pool.query(
    `SELECT eq.id_equipo, eq.id_materia, eq.nombre, eq.tipo, eq.activo, eq.fecha_creacion,
            m.id_profesor, m.clave AS materia_clave, m.nombre AS materia_nombre, m.grupo AS materia_grupo
     FROM equipo eq JOIN materia m ON m.id_materia = eq.id_materia
     WHERE eq.id_equipo = ?`,
    [id]
  )
  const equipo = rows[0]

  if (!equipo) {
    return res.status(404).json({ error: 'Equipo no encontrado' })
  }

  if (req.user.rol === 'Profesor') {
    const idProfesor = await obtenerIdProfesorPropio(req.user.id_usuario)
    if (equipo.id_profesor !== idProfesor) {
      return res.status(403).json({ error: 'No tienes permiso para ver este equipo' })
    }
  } else {
    const idAlumno = await obtenerIdAlumnoPropio(req.user.id_usuario)
    const [pertenece] = await pool.query('SELECT 1 FROM equipo_alumno WHERE id_equipo = ? AND id_alumno = ? LIMIT 1', [
      id,
      idAlumno,
    ])
    if (pertenece.length === 0) {
      return res.status(403).json({ error: 'No tienes permiso para ver este equipo' })
    }
  }

  const integrantesPorEquipo = await integrantesDeEquipos([Number(id)])
  res.status(200).json({ equipo: { ...equipo, integrantes: integrantesPorEquipo.get(Number(id)) ?? [] } })
}

async function crear(req, res) {
  const { id_materia, nombre, tipo, integrantes } = req.body

  const idProfesor = await obtenerIdProfesorPropio(req.user.id_usuario)
  const [materiaRows] = await pool.query('SELECT id_materia FROM materia WHERE id_materia = ? AND id_profesor = ?', [
    id_materia,
    idProfesor,
  ])
  if (materiaRows.length === 0) {
    return res.status(404).json({ error: 'Materia no encontrada' })
  }

  const [inscritos] = await pool.query('SELECT id_alumno FROM materia_alumno WHERE id_materia = ? AND id_alumno IN (?)', [
    id_materia,
    integrantes,
  ])
  if (inscritos.length !== integrantes.length) {
    return res.status(400).json({ error: 'Todos los integrantes deben estar inscritos en la materia' })
  }

  const idsConEquipo = await idsAlumnosConEquipoDeTipo(id_materia, tipo)
  const conflicto = integrantes.find((id) => idsConEquipo.has(id))
  if (conflicto) {
    return res.status(409).json({ error: `El alumno con id ${conflicto} ya tiene un equipo de tipo ${tipo} en esta materia` })
  }

  const conexion = await pool.getConnection()
  try {
    await conexion.beginTransaction()
    const [result] = await conexion.query('INSERT INTO equipo (id_materia, nombre, tipo) VALUES (?, ?, ?)', [
      id_materia,
      nombre,
      tipo,
    ])
    const idEquipo = result.insertId
    for (const idAlumno of integrantes) {
      await conexion.query('INSERT INTO equipo_alumno (id_equipo, id_alumno) VALUES (?, ?)', [idEquipo, idAlumno])
    }
    await conexion.commit()
    res.status(201).json({ equipo: { id_equipo: idEquipo, id_materia, nombre, tipo, integrantes } })
  } catch (err) {
    await conexion.rollback()
    throw err
  } finally {
    conexion.release()
  }
}

async function actualizar(req, res) {
  const { id } = req.params
  const { nombre, integrantes } = req.body

  const [equipoRows] = await pool.query(
    `SELECT eq.id_equipo, eq.id_materia, eq.nombre, eq.tipo, m.id_profesor
     FROM equipo eq JOIN materia m ON m.id_materia = eq.id_materia
     WHERE eq.id_equipo = ?`,
    [id]
  )
  const equipo = equipoRows[0]

  if (!equipo) {
    return res.status(404).json({ error: 'Equipo no encontrado' })
  }

  const idProfesor = await obtenerIdProfesorPropio(req.user.id_usuario)
  if (equipo.id_profesor !== idProfesor) {
    return res.status(403).json({ error: 'No tienes permiso para editar este equipo' })
  }

  const [inscritos] = await pool.query('SELECT id_alumno FROM materia_alumno WHERE id_materia = ? AND id_alumno IN (?)', [
    equipo.id_materia,
    integrantes,
  ])
  if (inscritos.length !== integrantes.length) {
    return res.status(400).json({ error: 'Todos los integrantes deben estar inscritos en la materia' })
  }

  const idsConEquipo = await idsAlumnosConEquipoDeTipo(equipo.id_materia, equipo.tipo, {
    id_equipo: equipo.id_equipo,
    nombre: equipo.nombre,
  })
  const conflicto = integrantes.find((idAlumno) => idsConEquipo.has(idAlumno))
  if (conflicto) {
    return res
      .status(409)
      .json({ error: `El alumno con id ${conflicto} ya tiene otro equipo de tipo ${equipo.tipo} en esta materia` })
  }

  const conexion = await pool.getConnection()
  try {
    await conexion.beginTransaction()
    await conexion.query('UPDATE equipo SET nombre = ? WHERE id_equipo = ?', [nombre, id])
    await conexion.query('DELETE FROM equipo_alumno WHERE id_equipo = ?', [id])
    for (const idAlumno of integrantes) {
      await conexion.query('INSERT INTO equipo_alumno (id_equipo, id_alumno) VALUES (?, ?)', [id, idAlumno])
    }
    await conexion.commit()
    res.status(200).json({ message: 'Equipo actualizado' })
  } catch (err) {
    await conexion.rollback()
    throw err
  } finally {
    conexion.release()
  }
}

async function desactivar(req, res) {
  const { id } = req.params

  const [equipoRows] = await pool.query(
    'SELECT eq.id_equipo, m.id_profesor FROM equipo eq JOIN materia m ON m.id_materia = eq.id_materia WHERE eq.id_equipo = ?',
    [id]
  )
  const equipo = equipoRows[0]

  if (!equipo) {
    return res.status(404).json({ error: 'Equipo no encontrado' })
  }

  const idProfesor = await obtenerIdProfesorPropio(req.user.id_usuario)
  if (equipo.id_profesor !== idProfesor) {
    return res.status(403).json({ error: 'No tienes permiso para desactivar este equipo' })
  }

  await pool.query('UPDATE equipo SET activo = FALSE WHERE id_equipo = ?', [id])
  res.status(200).json({ message: 'Equipo desactivado' })
}

// Asignación aleatoria masiva: forma equipos de 3 con los alumnos inscritos en la materia
// que todavía no tienen equipo del tipo indicado (Practica/Tarea comparten integrantes,
// ver asignacion.service.js). Si sobran 1 o 2 alumnos tras agrupar de 3 en 3, quedan sin
// asignar y se reportan en la respuesta — el profesor los asigna manualmente después.
async function generar(req, res) {
  const { id_materia, tipo } = req.body

  const idProfesor = await obtenerIdProfesorPropio(req.user.id_usuario)
  const [materiaRows] = await pool.query('SELECT id_materia FROM materia WHERE id_materia = ? AND id_profesor = ?', [
    id_materia,
    idProfesor,
  ])
  if (materiaRows.length === 0) {
    return res.status(404).json({ error: 'Materia no encontrada' })
  }

  const [inscritosRows] = await pool.query('SELECT id_alumno FROM materia_alumno WHERE id_materia = ?', [id_materia])
  const idsInscritos = inscritosRows.map((r) => r.id_alumno)

  const idsConEquipo = await idsAlumnosConEquipoDeTipo(id_materia, tipo)
  const disponibles = idsInscritos.filter((id) => !idsConEquipo.has(id))

  if (disponibles.length < 3) {
    let mensaje
    if (idsInscritos.length === 0) {
      mensaje = 'No hay alumnos inscritos en esta materia'
    } else if (disponibles.length === 0) {
      mensaje = `No hay alumnos disponibles: todos los alumnos inscritos ya tienen equipo de tipo ${tipo} en esta materia`
    } else {
      mensaje = `Solo hay ${disponibles.length} alumno(s) sin equipo de tipo ${tipo} en esta materia; se necesitan al menos 3 para formar un equipo`
    }
    return res.status(422).json({ error: mensaje, alumnos_disponibles: disponibles.length })
  }

  const { grupos, sobrantes } = asignarEquiposAleatorio(disponibles)
  const tipos = tiposEspejo(tipo)
  const prefijo = tipo === 'Proyecto' ? 'Proyecto' : 'Equipo'

  const [nombresExistentesRows] = await pool.query(
    'SELECT DISTINCT nombre FROM equipo WHERE id_materia = ? AND tipo IN (?) AND activo = TRUE',
    [id_materia, tipos]
  )
  const nombresExistentes = new Set(nombresExistentesRows.map((r) => r.nombre))

  function siguienteNombre(contador) {
    let n = contador
    let candidato = `${prefijo} ${n}`
    while (nombresExistentes.has(candidato)) {
      n++
      candidato = `${prefijo} ${n}`
    }
    nombresExistentes.add(candidato)
    return candidato
  }

  const conexion = await pool.getConnection()
  const equiposCreados = []
  try {
    await conexion.beginTransaction()
    let contador = 1
    for (const grupo of grupos) {
      const nombreEquipo = siguienteNombre(contador)
      contador++
      for (const t of tipos) {
        const [result] = await conexion.query('INSERT INTO equipo (id_materia, nombre, tipo) VALUES (?, ?, ?)', [
          id_materia,
          nombreEquipo,
          t,
        ])
        const idEquipo = result.insertId
        for (const idAlumno of grupo) {
          await conexion.query('INSERT INTO equipo_alumno (id_equipo, id_alumno) VALUES (?, ?)', [idEquipo, idAlumno])
        }
        equiposCreados.push({ id_equipo: idEquipo, nombre: nombreEquipo, tipo: t, integrantes: grupo })
      }
    }
    await conexion.commit()
  } catch (err) {
    await conexion.rollback()
    throw err
  } finally {
    conexion.release()
  }

  res.status(201).json({
    equipos: equiposCreados,
    equipos_creados: grupos.length,
    alumnos_sin_asignar: sobrantes.length,
    ids_alumnos_sin_asignar: sobrantes,
  })
}

module.exports = { listar, obtener, crear, actualizar, desactivar, generar }
