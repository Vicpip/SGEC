// Generación de reportes de desempeño exportables a PDF (pdfkit) y Excel (xlsx / SheetJS).
//
// Funciones puras: reciben `datosReporte` ya construido y validado por el controlador
// (reportes.controller.js es quien consulta la BD y ancla los resultados al profesor
// autenticado) y solo se encargan del formato de salida.
//
// `datosReporte.equipos[]` siempre trae los 6 campos requeridos por el README/CLAUDE.md:
// profesor, materia (unidad de aprendizaje), equipo_nombre, integrantes, promedio,
// pct_realizadas / pct_no_realizadas.

const PDFDocument = require('pdfkit')
const XLSX = require('xlsx')

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

    doc.fontSize(10)
    for (const eq of datosReporte.equipos) {
      doc.fontSize(12).text(`${eq.equipo_nombre}  ·  ${eq.tipo}`, { underline: true })
      doc.fontSize(9)
      doc.text(`Profesor: ${eq.profesor}`)
      doc.text(`Unidad de aprendizaje: ${eq.materia}`)
      doc.text(`Integrantes: ${eq.integrantes}`)
      doc.text(`Promedio obtenido: ${eq.promedio ?? 'Sin calificaciones'}`)
      doc.text(
        `Actividades realizadas: ${eq.pct_realizadas}% (${eq.actividades_realizadas}/${eq.actividades_total})  ·  No realizadas: ${eq.pct_no_realizadas}%`
      )
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

    doc.end()
  })
}

function generarReporteExcel(datosReporte) {
  const filas = datosReporte.equipos.map((eq) => ({
    Profesor: eq.profesor,
    'Unidad de aprendizaje': eq.materia,
    'Nombre del equipo': eq.equipo_nombre,
    Tipo: eq.tipo,
    Integrantes: eq.integrantes,
    'Promedio obtenido': eq.promedio ?? '',
    '% Actividades realizadas': eq.pct_realizadas,
    '% Actividades no realizadas': eq.pct_no_realizadas,
  }))

  const libro = XLSX.utils.book_new()
  const hoja = XLSX.utils.json_to_sheet(filas)
  XLSX.utils.book_append_sheet(libro, hoja, 'Reporte')

  return XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' })
}

module.exports = { generarReportePdf, generarReporteExcel }
