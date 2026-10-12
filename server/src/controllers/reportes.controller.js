// Generador de Reportes. Pantalla 14. Exporta desempeño a PDF/Excel vía reporte.service.
//
// Punto crítico de seguridad: los query params ?semestre= y ?materia= son solo filtros de
// presentación — el WHERE de la consulta de materias SIEMPRE ancla primero a
// m.id_profesor = req.user.id_usuario (vía obtenerIdProfesorPropio). Si el Profesor A manda
// la clave de una materia del Profesor B, la condición `AND m.id_profesor = ?` hace que esa
// materia simplemente no aparezca en el resultado — nunca se filtra "después" en JS/frontend,
// y nunca se usa el id_profesor que pudiera venir en el query string.
//
// Cómo se calcula (Sesión 15):
//   - Una fila por equipo. El par Práctica/Tarea (dos filas de `equipo` enlazadas por
//     id_equipo_espejo, mismos integrantes) se presenta como UNA sola fila "Práctica / Tarea"
//     que reúne las actividades de Práctica, Tarea y En clase; Proyecto va aparte. Con el
//     filtro ?tipo= la fila se limita a ese tipo de equipo y a sus actividades.
//   - "Realizada" se mide por pares (actividad, integrante): el porcentaje del equipo es
//     pares realizados ÷ pares totales. Un par está realizado si el integrante tiene una
//     entrega con estatus distinto de 'Pendiente' o una calificación registrada (cubre las
//     actividades En clase, que se califican sin archivo). Con entrega_por_equipo = TRUE
//     basta la entrega de un integrante para marcar a todo el equipo; con FALSE cuenta cada
//     integrante por separado.
//   - El denominador solo incluye actividades activas y ya publicadas (una programada cuya
//     fecha_publicacion no ha llegado no cuenta), y solo integrantes con inscripción vigente
//     en la materia (materia_alumno.activo = TRUE).
//   - El promedio considera únicamente las calificaciones registradas: una actividad sin
//     nota no cuenta como 0.

const pool = require('../config/db')
const { generarReportePdf, generarReporteExcel } = require('../services/reporte.service')
const { condicionVisibleAlumnoSQL } = require('../services/publicacion.service')

const TIPOS_EQUIPO = ['Practica', 'Tarea', 'Proyecto']
const ETIQUETA_TIPO = { Practica: 'Práctica', Tarea: 'Tarea', Proyecto: 'Proyecto' }

const NOTA_PROMEDIO =
  'El promedio considera solo las actividades calificadas; las actividades sin calificación no cuentan como 0.'
const NOTA_REALIZADAS =
  'El porcentaje de actividades realizadas se calcula por integrante: cuenta cada entrega recibida o calificación registrada entre el total de actividades publicadas por integrante. No incluye actividades desactivadas ni programadas aún no publicadas.'

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

function porcentajes(realizados, total) {
  if (total === 0) return { pct_realizadas: 0, pct_no_realizadas: 0 }
  const pct = Math.round((realizados / total) * 100)
  return { pct_realizadas: pct, pct_no_realizadas: 100 - pct }
}

function promedioDe(suma, cantidad) {
  return cantidad > 0 ? Number((suma / cantidad).toFixed(2)) : null
}

function reporteVacio(filtros) {
  return {
    generado_en: new Date().toISOString(),
    filtros,
    equipos: [],
    resumen: {
      total_equipos: 0,
      total_integrantes: 0,
      promedio_general: null,
      pares_total: 0,
      pares_realizados: 0,
      pct_realizadas_general: 0,
      pct_no_realizadas_general: 0,
    },
    nota_promedio: NOTA_PROMEDIO,
    nota_realizadas: NOTA_REALIZADAS,
  }
}

// Agrupa las filas de `equipo` en "equipos de reporte": un par Práctica/Tarea enlazado por
// id_equipo_espejo forma un solo grupo; cualquier otra fila (Proyecto, o un equipo de
// Práctica/Tarea sin espejo) es un grupo por sí misma. El enlace solo se respeta si es
// recíproco y dentro de la misma materia.
function agruparEquipos(equipos) {
  const porId = new Map(equipos.map((eq) => [eq.id_equipo, eq]))
  const vistos = new Set()
  const grupos = []

  for (const eq of equipos) {
    if (vistos.has(eq.id_equipo)) continue
    const filas = [eq]

    const espejo = eq.id_equipo_espejo ? porId.get(eq.id_equipo_espejo) : null
    if (
      espejo &&
      !vistos.has(espejo.id_equipo) &&
      espejo.id_equipo_espejo === eq.id_equipo &&
      espejo.id_materia === eq.id_materia &&
      espejo.tipo !== eq.tipo
    ) {
      filas.push(espejo)
    }

    for (const fila of filas) vistos.add(fila.id_equipo)
    filas.sort((a, b) => TIPOS_EQUIPO.indexOf(a.tipo) - TIPOS_EQUIPO.indexOf(b.tipo))
    grupos.push(filas)
  }
  return grupos
}

// Tipo de equipo pedido en ?tipo= (null = todos los tipos).
function tipoSolicitado(req) {
  return req.query.tipo && req.query.tipo !== 'Todos' ? req.query.tipo : null
}

// Responde 400 si ?tipo= trae un valor que no es un tipo de equipo. Devuelve true si la
// petición puede continuar.
function tipoValido(req, res) {
  const tipo = tipoSolicitado(req)
  if (tipo && !TIPOS_EQUIPO.includes(tipo)) {
    res.status(400).json({ error: 'El tipo de equipo indicado no es válido' })
    return false
  }
  return true
}

// Construye el reporte de desempeño completo, siempre acotado a las materias del profesor
// autenticado. Nunca confía en id_profesor ni en ningún otro dato de identidad del query
// string — solo en req.user, que viene del JWT verificado por auth.middleware.
async function obtenerDatosReporte(req) {
  const { semestre, materia } = req.query
  const tipo = tipoSolicitado(req)

  const idProfesor = await obtenerIdProfesorPropio(req.user.id_usuario)
  const filtros = { semestre: semestre || null, materia: materia || null, tipo }

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
    `SELECT m.id_materia, m.clave, m.nombre, m.grupo, s.clave AS semestre,
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

  if (materias.length === 0) return reporteVacio(filtros)

  const idsMateria = materias.map((m) => m.id_materia)
  const materiaPorId = new Map(materias.map((m) => [m.id_materia, m]))

  const condicionesEquipo = ['eq.id_materia IN (?)', 'eq.activo = TRUE']
  const paramsEquipo = [idsMateria]
  if (tipo) {
    condicionesEquipo.push('eq.tipo = ?')
    paramsEquipo.push(tipo)
  }

  const [equipos] = await pool.query(
    `SELECT eq.id_equipo, eq.id_materia, eq.nombre, eq.tipo, eq.id_equipo_espejo
     FROM equipo eq
     WHERE ${condicionesEquipo.join(' AND ')}
     ORDER BY eq.id_materia, eq.tipo, eq.nombre, eq.id_equipo`,
    paramsEquipo
  )

  if (equipos.length === 0) return reporteVacio(filtros)

  const idsEquipo = equipos.map((e) => e.id_equipo)

  // Solo integrantes con inscripción vigente en la materia del equipo: un alumno dado de
  // baja de la materia no aparece en el reporte ni cuenta en su denominador.
  const [integrantesRows] = await pool.query(
    `SELECT ea.id_equipo, a.id_alumno, u.nombre, u.apellido_paterno, u.apellido_materno
     FROM equipo_alumno ea
     JOIN equipo eq ON eq.id_equipo = ea.id_equipo
     JOIN materia_alumno ma ON ma.id_materia = eq.id_materia AND ma.id_alumno = ea.id_alumno AND ma.activo = TRUE
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

  // Denominador: actividades activas y ya publicadas (misma condición de visibilidad que
  // usa el listado del alumno para las programadas).
  const [actividades] = await pool.query(
    `SELECT act.id_actividad, act.id_materia, act.id_equipo, act.todos_los_equipos, act.entrega_por_equipo,
            act.titulo, act.tipo, act.tipo_evaluacion, act.fecha_limite
     FROM actividad act
     WHERE act.id_materia IN (?) AND act.activo = TRUE AND ${condicionVisibleAlumnoSQL('act')}
     ORDER BY act.fecha_limite, act.id_actividad`,
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
    // Una fila de entrega 'Pendiente' significa que el alumno NO entregó: no se cuenta.
    ;[entregas] = await pool.query(
      `SELECT id_actividad, id_alumno FROM entrega WHERE id_actividad IN (?) AND estatus != 'Pendiente'`,
      [idsActividad]
    )
  }

  const notaPorActividadAlumno = new Map(calificaciones.map((c) => [`${c.id_actividad}|${c.id_alumno}`, Number(c.nota)]))
  const entregoActividadAlumno = new Set(entregas.map((e) => `${e.id_actividad}|${e.id_alumno}`))

  function actividadesDeFila(fila) {
    const tiposAct = tiposActividadParaEquipo(fila.tipo)
    return actividades.filter(
      (a) => a.id_materia === fila.id_materia && tiposAct.includes(a.tipo) && (a.todos_los_equipos || a.id_equipo === fila.id_equipo)
    )
  }

  const alumnosDistintos = new Set()
  let sumaNotasGlobal = 0
  let cantNotasGlobal = 0
  let paresTotalGlobal = 0
  let paresRealizadosGlobal = 0

  const equiposReporte = agruparEquipos(equipos).map((filas) => {
    const materiaInfo = materiaPorId.get(filas[0].id_materia)

    const integrantesGrupo = new Map()
    for (const fila of filas) {
      for (const it of integrantesPorEquipo.get(fila.id_equipo) ?? []) integrantesGrupo.set(it.id_alumno, it)
    }

    let sumaNotas = 0
    let cantNotas = 0
    let paresTotal = 0
    let paresRealizados = 0
    const detalleActividades = []

    for (const fila of filas) {
      const idsAlumnos = (integrantesPorEquipo.get(fila.id_equipo) ?? []).map((i) => i.id_alumno)

      for (const act of actividadesDeFila(fila)) {
        const alguienEntrego = idsAlumnos.some((idAlumno) => entregoActividadAlumno.has(`${act.id_actividad}|${idAlumno}`))

        let realizadosAct = 0
        let sumaAct = 0
        let cantAct = 0

        for (const idAlumno of idsAlumnos) {
          const clave = `${act.id_actividad}|${idAlumno}`
          const nota = notaPorActividadAlumno.get(clave)
          if (nota != null) {
            sumaAct += nota
            cantAct++
          }

          const entrego = act.entrega_por_equipo ? alguienEntrego : entregoActividadAlumno.has(clave)
          if (entrego || nota != null) realizadosAct++
        }

        paresTotal += idsAlumnos.length
        paresRealizados += realizadosAct
        sumaNotas += sumaAct
        cantNotas += cantAct

        detalleActividades.push({
          id_actividad: act.id_actividad,
          titulo: act.titulo,
          tipo: act.tipo,
          tipo_evaluacion: act.tipo_evaluacion,
          fecha_limite: act.fecha_limite,
          entrega_por_equipo: !!act.entrega_por_equipo,
          pares_total: idsAlumnos.length,
          pares_realizados: realizadosAct,
          promedio: promedioDe(sumaAct, cantAct),
        })
      }
    }

    detalleActividades.sort(
      (a, b) => String(a.fecha_limite).localeCompare(String(b.fecha_limite)) || a.id_actividad - b.id_actividad
    )

    for (const idAlumno of integrantesGrupo.keys()) alumnosDistintos.add(idAlumno)
    sumaNotasGlobal += sumaNotas
    cantNotasGlobal += cantNotas
    paresTotalGlobal += paresTotal
    paresRealizadosGlobal += paresRealizados

    const tipos = filas.map((f) => f.tipo)

    return {
      profesor: `${materiaInfo.profesor_nombre} ${materiaInfo.profesor_apellido_paterno}`,
      materia: materiaInfo.nombre,
      materia_clave: materiaInfo.clave,
      grupo: materiaInfo.grupo,
      semestre: materiaInfo.semestre,
      equipo_nombre: filas[0].nombre,
      ids_equipo: filas.map((f) => f.id_equipo),
      tipos,
      tipo_etiqueta: tipos.map((t) => ETIQUETA_TIPO[t]).join(' / '),
      integrantes: [...integrantesGrupo.values()].map(formatearIntegrante).join('; '),
      total_integrantes: integrantesGrupo.size,
      promedio: promedioDe(sumaNotas, cantNotas),
      actividades_total: detalleActividades.length,
      pares_total: paresTotal,
      pares_realizados: paresRealizados,
      pares_no_realizados: paresTotal - paresRealizados,
      ...porcentajes(paresRealizados, paresTotal),
      actividades: detalleActividades,
    }
  })

  const pctGeneral = porcentajes(paresRealizadosGlobal, paresTotalGlobal)

  return {
    generado_en: new Date().toISOString(),
    filtros,
    equipos: equiposReporte,
    resumen: {
      total_equipos: equiposReporte.length,
      // Alumnos distintos: quien está en un equipo de Práctica/Tarea y en uno de Proyecto
      // se cuenta una sola vez.
      total_integrantes: alumnosDistintos.size,
      promedio_general: promedioDe(sumaNotasGlobal, cantNotasGlobal),
      pares_total: paresTotalGlobal,
      pares_realizados: paresRealizadosGlobal,
      pct_realizadas_general: pctGeneral.pct_realizadas,
      pct_no_realizadas_general: pctGeneral.pct_no_realizadas,
    },
    nota_promedio: NOTA_PROMEDIO,
    nota_realizadas: NOTA_REALIZADAS,
  }
}

// GET /api/reportes?semestre=&materia=&tipo=
async function generar(req, res) {
  if (!tipoValido(req, res)) return
  const datos = await obtenerDatosReporte(req)
  res.status(200).json(datos)
}

// GET /api/reportes/pdf?semestre=&materia=&tipo=
async function exportarPdf(req, res) {
  if (!tipoValido(req, res)) return
  const datos = await obtenerDatosReporte(req)
  const buffer = await generarReportePdf(datos)
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', 'attachment; filename="reporte-sgec.pdf"')
  res.send(buffer)
}

// GET /api/reportes/excel?semestre=&materia=&tipo=
async function exportarExcel(req, res) {
  if (!tipoValido(req, res)) return
  const datos = await obtenerDatosReporte(req)
  const buffer = generarReporteExcel(datos)
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', 'attachment; filename="reporte-sgec.xlsx"')
  res.send(buffer)
}

module.exports = { generar, exportarPdf, exportarExcel }
