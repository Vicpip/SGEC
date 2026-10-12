// Equipos colaborativos (sin repetición por tipo). Pantallas 04, 05, 06.
//
// Tamaño: la asignación automática forma equipos de exactamente 3; el alta y la edición
// manual admiten 3 o 4 integrantes (lo valida equipos.validators.js).
//
// Espejo Práctica/Tarea: un equipo de Práctica o de Tarea existe como dos filas de `equipo`
// (una por tipo, mismos integrantes) enlazadas por equipo.id_equipo_espejo. Toda escritura
// (crear, editar nombre/integrantes, desactivar) opera sobre ambas filas en una sola
// transacción; nunca se emparejan por nombre. Un equipo de Proyecto no tiene espejo.
//
// Regla de propiedad: un Profesor solo ve/crea/edita/desactiva equipos de materias donde
// materia.id_profesor = su propio id_profesor (nunca el id_usuario del JWT directamente).
// Un Alumno solo ve los equipos donde es integrante (equipo_alumno.id_alumno = su propio
// id_alumno).

const pool = require('../config/db')
const { asignarEquiposAleatorio, tiposEspejo, tipoEspejoDe } = require('../services/asignacion.service')

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
// indicada. Al editar, `idsExcluidos` trae el propio equipo y su espejo (por id, nunca por
// nombre) — de lo contrario guardar un equipo sin cambios chocaría con su propio espejo.
async function idsAlumnosConEquipoDeTipo(idMateria, tipo, idsExcluidos = []) {
  const tipos = tiposEspejo(tipo)
  const params = [idMateria, tipos]
  let sql = `SELECT DISTINCT ea.id_alumno
             FROM equipo_alumno ea
             JOIN equipo eq ON eq.id_equipo = ea.id_equipo
             WHERE eq.id_materia = ? AND eq.tipo IN (?) AND eq.activo = TRUE`
  if (idsExcluidos.length > 0) {
    sql += ' AND eq.id_equipo NOT IN (?)'
    params.push(idsExcluidos)
  }
  const [rows] = await pool.query(sql, params)
  return new Set(rows.map((r) => r.id_alumno))
}

// Equipo (con el id_profesor dueño de su materia) y los ids de las filas sobre las que debe
// operar una escritura: el propio equipo y, si lo tiene, su espejo. El espejo solo se toma
// en cuenta si pertenece a la misma materia (defensa ante un enlace corrupto).
async function obtenerEquipoParaEscritura(id) {
  const [rows] = await pool.query(
    `SELECT eq.id_equipo, eq.id_materia, eq.nombre, eq.tipo, eq.id_equipo_espejo, eq.activo, m.id_profesor
     FROM equipo eq JOIN materia m ON m.id_materia = eq.id_materia
     WHERE eq.id_equipo = ?`,
    [id]
  )
  const equipo = rows[0]
  if (!equipo) return null

  const ids = [equipo.id_equipo]
  if (equipo.id_equipo_espejo) {
    const [espejoRows] = await pool.query('SELECT id_equipo FROM equipo WHERE id_equipo = ? AND id_materia = ?', [
      equipo.id_equipo_espejo,
      equipo.id_materia,
    ])
    if (espejoRows.length > 0) ids.push(espejoRows[0].id_equipo)
  }
  return { equipo, ids }
}

async function nombresDeAlumnos(idsAlumno) {
  if (idsAlumno.length === 0) return []
  const [rows] = await pool.query(
    `SELECT a.id_alumno, u.nombre, u.apellido_paterno, u.apellido_materno
     FROM alumno a JOIN usuario u ON u.id_usuario = a.id_usuario
     WHERE a.id_alumno IN (?)
     ORDER BY u.apellido_paterno, u.apellido_materno, u.nombre`,
    [idsAlumno]
  )
  return rows.map((r) => ({
    id_alumno: r.id_alumno,
    nombre: [r.nombre, r.apellido_paterno, r.apellido_materno].filter(Boolean).join(' '),
  }))
}

async function listar(req, res) {
  if (req.user.rol === 'Alumno') {
    const idAlumno = await obtenerIdAlumnoPropio(req.user.id_usuario)

    const [equipos] = await pool.query(
      `SELECT eq.id_equipo, eq.id_materia, eq.nombre, eq.tipo, eq.id_equipo_espejo, eq.activo, eq.fecha_creacion,
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
    `SELECT id_equipo, id_materia, nombre, tipo, id_equipo_espejo, activo, fecha_creacion
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
    `SELECT eq.id_equipo, eq.id_materia, eq.nombre, eq.tipo, eq.id_equipo_espejo, eq.activo, eq.fecha_creacion,
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

// POST /api/equipos — alta manual. Un equipo de Práctica o de Tarea crea las DOS filas
// (la del tipo pedido y su espejo), con los mismos integrantes y enlazadas entre sí; sin la
// fila espejo el equipo se quedaría sin actividades de Tarea/En clase o de Práctica.
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

  const [inscritos] = await pool.query('SELECT id_alumno FROM materia_alumno WHERE id_materia = ? AND activo = TRUE AND id_alumno IN (?)', [
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

  const tipoEspejo = tipoEspejoDe(tipo)

  const conexion = await pool.getConnection()
  try {
    await conexion.beginTransaction()
    const [result] = await conexion.query('INSERT INTO equipo (id_materia, nombre, tipo) VALUES (?, ?, ?)', [
      id_materia,
      nombre,
      tipo,
    ])
    const idEquipo = result.insertId

    let idEspejo = null
    if (tipoEspejo) {
      const [resultEspejo] = await conexion.query(
        'INSERT INTO equipo (id_materia, nombre, tipo, id_equipo_espejo) VALUES (?, ?, ?, ?)',
        [id_materia, nombre, tipoEspejo, idEquipo]
      )
      idEspejo = resultEspejo.insertId
      await conexion.query('UPDATE equipo SET id_equipo_espejo = ? WHERE id_equipo = ?', [idEspejo, idEquipo])
    }

    for (const idFila of [idEquipo, idEspejo].filter(Boolean)) {
      for (const idAlumno of integrantes) {
        await conexion.query('INSERT INTO equipo_alumno (id_equipo, id_alumno) VALUES (?, ?)', [idFila, idAlumno])
      }
    }

    await conexion.commit()
    res.status(201).json({
      equipo: { id_equipo: idEquipo, id_materia, nombre, tipo, id_equipo_espejo: idEspejo, integrantes },
      equipo_espejo: idEspejo ? { id_equipo: idEspejo, tipo: tipoEspejo } : null,
    })
  } catch (err) {
    await conexion.rollback()
    throw err
  } finally {
    conexion.release()
  }
}

// PUT /api/equipos/:id — nombre e integrantes. Si el equipo tiene espejo, ambas filas quedan
// con el mismo nombre y los mismos integrantes en una sola transacción.
async function actualizar(req, res) {
  const { id } = req.params
  const { nombre, integrantes } = req.body

  const encontrado = await obtenerEquipoParaEscritura(id)
  if (!encontrado) {
    return res.status(404).json({ error: 'Equipo no encontrado' })
  }
  const { equipo, ids } = encontrado

  const idProfesor = await obtenerIdProfesorPropio(req.user.id_usuario)
  if (equipo.id_profesor !== idProfesor) {
    return res.status(403).json({ error: 'No tienes permiso para editar este equipo' })
  }

  const [inscritos] = await pool.query('SELECT id_alumno FROM materia_alumno WHERE id_materia = ? AND activo = TRUE AND id_alumno IN (?)', [
    equipo.id_materia,
    integrantes,
  ])
  if (inscritos.length !== integrantes.length) {
    return res.status(400).json({ error: 'Todos los integrantes deben estar inscritos en la materia' })
  }

  const idsConEquipo = await idsAlumnosConEquipoDeTipo(equipo.id_materia, equipo.tipo, ids)
  const conflicto = integrantes.find((idAlumno) => idsConEquipo.has(idAlumno))
  if (conflicto) {
    return res
      .status(409)
      .json({ error: `El alumno con id ${conflicto} ya tiene otro equipo de tipo ${equipo.tipo} en esta materia` })
  }

  const conexion = await pool.getConnection()
  try {
    await conexion.beginTransaction()
    await conexion.query('UPDATE equipo SET nombre = ? WHERE id_equipo IN (?)', [nombre, ids])
    await conexion.query('DELETE FROM equipo_alumno WHERE id_equipo IN (?)', [ids])
    for (const idFila of ids) {
      for (const idAlumno of integrantes) {
        await conexion.query('INSERT INTO equipo_alumno (id_equipo, id_alumno) VALUES (?, ?)', [idFila, idAlumno])
      }
    }
    await conexion.commit()
    res.status(200).json({ message: 'Equipo actualizado', equipos_actualizados: ids })
  } catch (err) {
    await conexion.rollback()
    throw err
  } finally {
    conexion.release()
  }
}

// PATCH /api/equipos/:id/desactivar — borrado lógico. Si el equipo tiene espejo se
// desactivan ambas filas en la misma transacción.
async function desactivar(req, res) {
  const { id } = req.params

  const encontrado = await obtenerEquipoParaEscritura(id)
  if (!encontrado) {
    return res.status(404).json({ error: 'Equipo no encontrado' })
  }
  const { equipo, ids } = encontrado

  const idProfesor = await obtenerIdProfesorPropio(req.user.id_usuario)
  if (equipo.id_profesor !== idProfesor) {
    return res.status(403).json({ error: 'No tienes permiso para desactivar este equipo' })
  }

  const conexion = await pool.getConnection()
  try {
    await conexion.beginTransaction()
    await conexion.query('UPDATE equipo SET activo = FALSE WHERE id_equipo IN (?)', [ids])
    await conexion.commit()
  } catch (err) {
    await conexion.rollback()
    throw err
  } finally {
    conexion.release()
  }

  res.status(200).json({ message: 'Equipo desactivado', equipos_desactivados: ids })
}

// Asignación aleatoria masiva: forma equipos de 3 con los alumnos inscritos en la materia
// que todavía no tienen equipo del tipo indicado (Practica/Tarea comparten integrantes y se
// crean como par enlazado por id_equipo_espejo, ver asignacion.service.js). Si sobran 1 o 2
// alumnos tras agrupar de 3 en 3, quedan sin asignar y se reportan en `sin_asignar` — el
// profesor los agrega a mano a un equipo existente (el alta/edición manual admite 4).
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

  const [inscritosRows] = await pool.query('SELECT id_alumno FROM materia_alumno WHERE id_materia = ? AND activo = TRUE', [id_materia])
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
    return res.status(422).json({
      error: mensaje,
      alumnos_disponibles: disponibles.length,
      sin_asignar: await nombresDeAlumnos(disponibles),
    })
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

      const filas = []
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
        filas.push({ id_equipo: idEquipo, nombre: nombreEquipo, tipo: t, id_equipo_espejo: null, integrantes: grupo })
      }

      // Práctica y Tarea: las dos filas recién creadas se enlazan entre sí.
      if (filas.length === 2) {
        await conexion.query('UPDATE equipo SET id_equipo_espejo = ? WHERE id_equipo = ?', [filas[1].id_equipo, filas[0].id_equipo])
        await conexion.query('UPDATE equipo SET id_equipo_espejo = ? WHERE id_equipo = ?', [filas[0].id_equipo, filas[1].id_equipo])
        filas[0].id_equipo_espejo = filas[1].id_equipo
        filas[1].id_equipo_espejo = filas[0].id_equipo
      }
      equiposCreados.push(...filas)
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
    sin_asignar: await nombresDeAlumnos(sobrantes),
  })
}

module.exports = { listar, obtener, crear, actualizar, desactivar, generar }
