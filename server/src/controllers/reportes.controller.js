// Generador de Reportes. Pantalla 14. Exporta desempeño a PDF/Excel vía reporte.service.
//
// Punto crítico de seguridad: los query params ?semestre= y ?materia= son solo filtros de
// presentación — el WHERE de la consulta de materias SIEMPRE ancla primero a
// m.id_profesor = req.user.id_usuario (vía obtenerIdProfesorPropio). Si el Profesor A manda
// la clave de una materia del Profesor B, la condición `AND m.id_profesor = ?` hace que esa
// materia simplemente no aparezca en el resultado — nunca se filtra "después" en JS/frontend,
// y nunca se usa el id_profesor que pudiera venir en el query string.

const pool = require('../config/db')
const { generarReportePdf, generarReporteExcel } = require('../services/reporte.service')

async function obtenerIdProfesorPropio(idUsuario) {
  const [rows] = await pool.query('SELECT id_profesor FROM profesor WHERE id_usuario = ?', [idUsuario])
  return rows[0]?.id_profesor ?? null
}

// 'Practica' y 'Tarea' comparten integrantes; 'En clase' se asigna a los mismos equipos que
// 'Tarea' (ver CLAUDE.md — reglas críticas de negocio).
function tiposActividadParaEquipo(tipoEquipo) {
  if (tipoEquipo === 'Proyecto') return ['Proyecto']
  if (tipoEquipo === 'Practica') return ['Practica']
  return ['Tarea', 'En clase']
}

function formatearIntegrante(i) {
  const inicialMaterno = i.apellido_materno ? ` ${i.apellido_materno.charAt(0)}.` : ''
  return `${i.apellido_paterno}${inicialMaterno}, ${i.nombre}`
}

function resumenVacio() {
  return {
    total_equipos: 0,
    total_integrantes: 0,
    promedio_general: null,
    pct_realizadas_general: 0,
    pct_no_realizadas_general: 0,
  }
}

// Construye el reporte de desempeño completo, siempre acotado a las materias del profesor
// autenticado. Nunca confía en id_profesor ni en ningún otro dato de identidad del query
// string — solo en req.user, que viene del JWT verificado por auth.middleware.
async function obtenerDatosReporte(req) {
  const { semestre, materia, tipo } = req.query
  const idProfesor = await obtenerIdProfesorPropio(req.user.id_usuario)

  const filtros = { semestre: semestre || null, materia: materia || null, tipo: tipo || null }

  const condicionesMateria = ['m.id_profesor = ?']
  const paramsMateria = [idProfesor]
  if (semestre) {
    condicionesMateria.push('s.clave = ?')
    paramsMateria.push(semestre)
  }
  if (materia) {
    condicionesMateria.push('m.clave = ?')
    paramsMateria.push(materia)
  }

  const [materias] = await pool.query(
    `SELECT m.id_materia, m.clave, m.nombre,
            u.nombre AS profesor_nombre, u.apellido_paterno AS profesor_apellido_paterno,
            u.apellido_materno AS profesor_apellido_materno
     FROM materia m
     JOIN semestre s ON s.id_semestre = m.id_semestre
     JOIN profesor p ON p.id_profesor = m.id_profesor
     JOIN usuario u ON u.id_usuario = p.id_usuario
     WHERE ${condicionesMateria.join(' AND ')}
     ORDER BY m.fecha_creacion DESC`,
    paramsMateria
  )

  if (materias.length === 0) {
    return { generado_en: new Date().toISOString(), filtros, equipos: [], resumen: resumenVacio() }
  }

  const idsMateria = materias.map((m) => m.id_materia)
  const materiaPorId = new Map(materias.map((m) => [m.id_materia, m]))

  const condicionesEquipo = ['eq.id_materia IN (?)', 'eq.activo = TRUE']
  const paramsEquipo = [idsMateria]
  if (tipo && tipo !== 'Todos') {
    condicionesEquipo.push('eq.tipo = ?')
    paramsEquipo.push(tipo)
  }

  const [equipos] = await pool.query(
    `SELECT eq.id_equipo, eq.id_materia, eq.nombre, eq.tipo
     FROM equipo eq
     WHERE ${condicionesEquipo.join(' AND ')}
     ORDER BY eq.id_materia, eq.tipo, eq.nombre`,
    paramsEquipo
  )

  if (equipos.length === 0) {
    return { generado_en: new Date().toISOString(), filtros, equipos: [], resumen: resumenVacio() }
  }

  const idsEquipo = equipos.map((e) => e.id_equipo)

  const [integrantesRows] = await pool.query(
    `SELECT ea.id_equipo, a.id_alumno, u.nombre, u.apellido_paterno, u.apellido_materno
     FROM equipo_alumno ea
     JOIN alumno a ON a.id_alumno = ea.id_alumno
     JOIN usuario u ON u.id_usuario = a.id_usuario
     WHERE ea.id_equipo IN (?)
     ORDER BY u.apellido_paterno, u.apellido_materno, u.nombre`,
    [idsEquipo]
  )
  const integrantesPorEquipo = new Map()
  for (const row of integrantesRows) {
    const lista = integrantesPorEquipo.get(row.id_equipo) ?? []
    lista.push(row)
    integrantesPorEquipo.set(row.id_equipo, lista)
  }

  const [actividades] = await pool.query(
    `SELECT id_actividad, id_materia, id_equipo, todos_los_equipos, tipo
     FROM actividad WHERE id_materia IN (?) AND activo = TRUE`,
    [idsMateria]
  )

  let calificaciones = []
  let entregas = []
  if (actividades.length > 0) {
    const idsActividad = actividades.map((a) => a.id_actividad)
    ;[calificaciones] = await pool.query(
      `SELECT id_actividad, id_alumno, nota FROM calificacion WHERE id_actividad IN (?)`,
      [idsActividad]
    )
    ;[entregas] = await pool.query(`SELECT id_actividad, id_alumno FROM entrega WHERE id_actividad IN (?)`, [
      idsActividad,
    ])
  }

  const notaPorActividadAlumno = new Map(calificaciones.map((c) => [`${c.id_actividad}|${c.id_alumno}`, Number(c.nota)]))
  const entregoActividadAlumno = new Set(entregas.map((e) => `${e.id_actividad}|${e.id_alumno}`))

  function actividadesAplicables(idMateria, idEquipo, tipoEquipo) {
    const tiposAct = tiposActividadParaEquipo(tipoEquipo)
    return actividades.filter(
      (a) => a.id_materia === idMateria && tiposAct.includes(a.tipo) && (a.todos_los_equipos || a.id_equipo === idEquipo)
    )
  }

  let totalIntegrantes = 0
  let sumaNotasGlobal = 0
  let cantNotasGlobal = 0
  let totalActividadesGlobal = 0
  let totalRealizadasGlobal = 0

  const equiposReporte = equipos.map((eq) => {
    const materiaInfo = materiaPorId.get(eq.id_materia)
    const integrantes = integrantesPorEquipo.get(eq.id_equipo) ?? []
    const idsAlumnos = integrantes.map((i) => i.id_alumno)
    const actividadesEquipo = actividadesAplicables(eq.id_materia, eq.id_equipo, eq.tipo)

    let sumaNotas = 0
    let cantNotas = 0
    let actividadesRealizadas = 0

    for (const act of actividadesEquipo) {
      const realizada = idsAlumnos.some((idAlumno) => entregoActividadAlumno.has(`${act.id_actividad}|${idAlumno}`))
      if (realizada) actividadesRealizadas++

      for (const idAlumno of idsAlumnos) {
        const nota = notaPorActividadAlumno.get(`${act.id_actividad}|${idAlumno}`)
        if (nota != null) {
          sumaNotas += nota
          cantNotas++
        }
      }
    }

    const totalActividades = actividadesEquipo.length
    const actividadesPendientes = totalActividades - actividadesRealizadas
    const promedio = cantNotas > 0 ? Number((sumaNotas / cantNotas).toFixed(2)) : null
    const pctRealizadas = totalActividades > 0 ? Math.round((actividadesRealizadas / totalActividades) * 100) : 0
    const pctNoRealizadas = totalActividades > 0 ? 100 - pctRealizadas : 0

    totalIntegrantes += integrantes.length
    sumaNotasGlobal += sumaNotas
    cantNotasGlobal += cantNotas
    totalActividadesGlobal += totalActividades
    totalRealizadasGlobal += actividadesRealizadas

    return {
      profesor: `${materiaInfo.profesor_nombre} ${materiaInfo.profesor_apellido_paterno}`,
      materia: materiaInfo.nombre,
      materia_clave: materiaInfo.clave,
      equipo_nombre: eq.nombre,
      tipo: eq.tipo,
      integrantes: integrantes.map(formatearIntegrante).join('; '),
      promedio,
      actividades_total: totalActividades,
      actividades_realizadas: actividadesRealizadas,
      actividades_pendientes: actividadesPendientes,
      pct_realizadas: pctRealizadas,
      pct_no_realizadas: pctNoRealizadas,
    }
  })

  const resumen = {
    total_equipos: equiposReporte.length,
    total_integrantes: totalIntegrantes,
    promedio_general: cantNotasGlobal > 0 ? Number((sumaNotasGlobal / cantNotasGlobal).toFixed(2)) : null,
    pct_realizadas_general:
      totalActividadesGlobal > 0 ? Math.round((totalRealizadasGlobal / totalActividadesGlobal) * 100) : 0,
    pct_no_realizadas_general:
      totalActividadesGlobal > 0
        ? 100 - Math.round((totalRealizadasGlobal / totalActividadesGlobal) * 100)
        : 0,
  }

  return { generado_en: new Date().toISOString(), filtros, equipos: equiposReporte, resumen }
}

// GET /api/reportes?semestre=&materia=&tipo=
async function generar(req, res) {
  const datos = await obtenerDatosReporte(req)
  res.status(200).json(datos)
}

// GET /api/reportes/pdf?semestre=&materia=&tipo=
async function exportarPdf(req, res) {
  const datos = await obtenerDatosReporte(req)
  const buffer = await generarReportePdf(datos)
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', 'attachment; filename="reporte-sgec.pdf"')
  res.send(buffer)
}

// GET /api/reportes/excel?semestre=&materia=&tipo=
async function exportarExcel(req, res) {
  const datos = await obtenerDatosReporte(req)
  const buffer = generarReporteExcel(datos)
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', 'attachment; filename="reporte-sgec.xlsx"')
  res.send(buffer)
}

module.exports = { generar, exportarPdf, exportarExcel }
