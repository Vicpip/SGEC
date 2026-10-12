// Generación de reportes de desempeño exportables a PDF (pdfkit) y Excel (xlsx / SheetJS).
//
// Funciones puras: reciben `datosReporte` ya construido y validado por el controlador
// (reportes.controller.js es quien consulta la BD, ancla los resultados al profesor
// autenticado y hace todos los cálculos) y solo se encargan del formato de salida.
//
// `datosReporte.equipos[]` siempre trae los 6 campos requeridos por el README/CLAUDE.md:
// profesor, materia (unidad de aprendizaje), equipo_nombre, integrantes, promedio,
// pct_realizadas / pct_no_realizadas — más semestre, grupo, tipo_etiqueta (p. ej.
// "Práctica / Tarea") y el detalle de actividades con su tipo de evaluación.

const PDFDocument = require('pdfkit')
const XLSX = require('xlsx')

const TIPO_ACTIVIDAD_LABEL = { 'En clase': 'En clase', Practica: 'Práctica', Tarea: 'Tarea', Proyecto: 'Proyecto' }

function etiquetaActividad(act) {
  const tipo = TIPO_ACTIVIDAD_LABEL[act.tipo] ?? act.tipo
  return act.tipo_evaluacion ? `${tipo} · ${act.tipo_evaluacion}` : tipo
}

function generarReportePdf(datosReporte) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'letter' })
    const chunks = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    doc.fontSize(16).text('SGEC — Reporte de desempeño', { align: 'center' })
    doc.moveDown(0.5)
    doc
      .fontSize(9)
      .fillColor('#666')
      .text(`Generado el ${new Date(datosReporte.generado_en).toLocaleString('es-MX')}`, { align: 'center' })
    doc.fillColor('#000')
    doc.moveDown(1)

    if (datosReporte.equipos.length === 0) {
      doc.fontSize(11).text('No se encontraron equipos para los filtros indicados.')
      doc.end()
      return
    }

    for (const eq of datosReporte.equipos) {
      doc.fontSize(12).fillColor('#000').text(`${eq.equipo_nombre}  ·  ${eq.tipo_etiqueta}`, { underline: true })
      doc.fontSize(9)
      doc.text(`Profesor: ${eq.profesor}`)
      doc.text(`Unidad de aprendizaje: ${eq.materia}  ·  Grupo: ${eq.grupo}  ·  Semestre: ${eq.semestre}`)
      doc.text(`Integrantes: ${eq.integrantes || 'Sin integrantes'}`)
      doc.text(`Promedio obtenido: ${eq.promedio ?? 'Sin calificaciones'}`)
      doc.text(
        `Actividades realizadas: ${eq.pct_realizadas}% (${eq.pares_realizados} de ${eq.pares_total} por integrante, en ${eq.actividades_total} actividad(es))  ·  No realizadas: ${eq.pct_no_realizadas}%`
      )

      if (eq.actividades.length > 0) {
        doc.moveDown(0.3)
        doc.fillColor('#444')
        for (const act of eq.actividades) {
          doc.text(
            `- ${act.titulo} [${etiquetaActividad(act)}]: ${act.pares_realizados}/${act.pares_total} realizadas  ·  promedio ${act.promedio ?? 'sin calificar'}`,
            { indent: 10 }
          )
        }
        doc.fillColor('#000')
      }
      doc.moveDown(0.8)
    }

    doc.moveDown(0.5)
    doc.fontSize(11).text('Resumen general', { underline: true })
    doc.fontSize(9)
    doc.text(`Equipos: ${datosReporte.resumen.total_equipos}`)
    doc.text(`Integrantes: ${datosReporte.resumen.total_integrantes}`)
    doc.text(`Promedio general: ${datosReporte.resumen.promedio_general ?? 'Sin calificaciones'}`)
    doc.text(`% actividades realizadas: ${datosReporte.resumen.pct_realizadas_general}%`)
    doc.text(`% actividades no realizadas: ${datosReporte.resumen.pct_no_realizadas_general}%`)

    doc.moveDown(1)
    doc.fontSize(8).fillColor('#666')
    doc.text(`Nota: ${datosReporte.nota_promedio}`)
    doc.text(datosReporte.nota_realizadas)

    doc.end()
  })
}

function generarReporteExcel(datosReporte) {
  const filas = datosReporte.equipos.map((eq) => ({
    Profesor: eq.profesor,
    Semestre: eq.semestre,
    'Unidad de aprendizaje': eq.materia,
    Grupo: eq.grupo,
    'Nombre del equipo': eq.equipo_nombre,
    Tipo: eq.tipo_etiqueta,
    Integrantes: eq.integrantes,
    'Promedio obtenido': eq.promedio ?? '',
    '% Actividades realizadas': eq.pct_realizadas,
    '% Actividades no realizadas': eq.pct_no_realizadas,
    Actividades: eq.actividades_total,
  }))

  const detalle = datosReporte.equipos.flatMap((eq) =>
    eq.actividades.map((act) => ({
      Semestre: eq.semestre,
      'Unidad de aprendizaje': eq.materia,
      Grupo: eq.grupo,
      'Nombre del equipo': eq.equipo_nombre,
      Actividad: act.titulo,
      'Tipo de actividad': TIPO_ACTIVIDAD_LABEL[act.tipo] ?? act.tipo,
      'Tipo de evaluación': act.tipo_evaluacion ?? '',
      'Entregas realizadas': act.pares_realizados,
      Integrantes: act.pares_total,
      Promedio: act.promedio ?? '',
    }))
  )

  const libro = XLSX.utils.book_new()

  const hoja = XLSX.utils.json_to_sheet(filas)
  XLSX.utils.sheet_add_aoa(hoja, [[], [`Nota: ${datosReporte.nota_promedio}`], [datosReporte.nota_realizadas]], { origin: -1 })
  XLSX.utils.book_append_sheet(libro, hoja, 'Reporte')

  const hojaDetalle = XLSX.utils.json_to_sheet(detalle)
  XLSX.utils.book_append_sheet(libro, hojaDetalle, 'Actividades')

  return XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' })
}

module.exports = { generarReportePdf, generarReporteExcel }
