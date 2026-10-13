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

// ── PDF ──────────────────────────────────────────────────────────────────────
// Hoja carta horizontal con dos tablas: una fila por equipo y el detalle por actividad.
// Reglas de maquetación:
//   - Ninguna fila se parte entre páginas: antes de dibujarla se mide su alto y, si no cabe,
//     se abre una página nueva.
//   - Cada página nueva repite el encabezado de la tabla que continúa.
//   - Todo el texto se dibuja con posición y ancho explícitos (nunca con el flujo automático
//     de pdfkit), así una celda larga crece hacia abajo en vez de encimarse con la vecina.
const PAGINA = { size: 'letter', layout: 'landscape', margin: 36 }
const COLOR = { navy: '#1F3864', suave: '#EBF0FA', borde: '#C9D3E6', texto: '#1A202C', gris: '#5F6B7A' }
const RELLENO_CELDA = 4
const ALTO_PIE = 18
const ALTO_TITULO_TABLA = 16
const ZONA_HORARIA = 'America/Mexico_City'

const COLUMNAS_EQUIPOS = [
  { titulo: 'Profesor', ancho: 88, valor: (eq) => eq.profesor },
  { titulo: 'Unidad de aprendizaje', ancho: 112, valor: (eq) => `${eq.materia}\nGrupo ${eq.grupo} · ${eq.semestre}` },
  { titulo: 'Nombre del equipo', ancho: 70, valor: (eq) => eq.equipo_nombre },
  { titulo: 'Tipo', ancho: 58, valor: (eq) => eq.tipo_etiqueta },
  { titulo: 'Integrantes', ancho: 174, valor: (eq) => (eq.integrantes ? eq.integrantes.split('; ').join('\n') : 'Sin integrantes') },
  { titulo: 'Promedio obtenido', ancho: 52, centro: true, valor: (eq) => eq.promedio ?? 'Sin calificar' },
  { titulo: '% realizadas', ancho: 52, centro: true, valor: (eq) => (eq.actividades_total ? `${eq.pct_realizadas}%` : 'Sin actividades') },
  { titulo: '% no realizadas', ancho: 52, centro: true, valor: (eq) => (eq.actividades_total ? `${eq.pct_no_realizadas}%` : 'Sin actividades') },
  { titulo: 'Actividades', ancho: 62, centro: true, valor: (eq) => eq.actividades_total },
]

const COLUMNAS_ACTIVIDADES = [
  { titulo: 'Unidad de aprendizaje', ancho: 130, valor: (f) => `${f.eq.materia}\nGrupo ${f.eq.grupo} · ${f.eq.semestre}` },
  { titulo: 'Nombre del equipo', ancho: 90, valor: (f) => f.eq.equipo_nombre },
  { titulo: 'Actividad', ancho: 220, valor: (f) => f.act.titulo },
  { titulo: 'Tipo de actividad', ancho: 70, valor: (f) => TIPO_ACTIVIDAD_LABEL[f.act.tipo] ?? f.act.tipo },
  { titulo: 'Tipo de evaluación', ancho: 100, valor: (f) => f.act.tipo_evaluacion || '—' },
  { titulo: 'Realizadas', ancho: 55, centro: true, valor: (f) => `${f.act.pares_realizados} de ${f.act.pares_total}` },
  { titulo: 'Promedio', ancho: 55, centro: true, valor: (f) => f.act.promedio ?? 'Sin calificar' },
]

function limiteInferior(doc) {
  return doc.page.height - doc.page.margins.bottom - ALTO_PIE
}

function altoDeFila(doc, columnas, textos) {
  let alto = 0
  columnas.forEach((col, i) => {
    alto = Math.max(alto, doc.heightOfString(textos[i], { width: col.ancho - 2 * RELLENO_CELDA }))
  })
  return alto + 2 * RELLENO_CELDA
}

function dibujarFila(doc, columnas, textos, y, alto, { fondo, colorTexto, negrita }) {
  let x = doc.page.margins.left
  doc.font(negrita ? 'Helvetica-Bold' : 'Helvetica')
  columnas.forEach((col, i) => {
    if (fondo) doc.rect(x, y, col.ancho, alto).fill(fondo)
    doc.rect(x, y, col.ancho, alto).lineWidth(0.5).stroke(COLOR.borde)
    doc.fillColor(colorTexto).text(textos[i], x + RELLENO_CELDA, y + RELLENO_CELDA, {
      width: col.ancho - 2 * RELLENO_CELDA,
      align: col.centro ? 'center' : 'left',
    })
    x += col.ancho
  })
  doc.font('Helvetica')
}

// Dibuja `filas` como tabla a partir de la posición actual. Devuelve cuántas filas dibujó.
function dibujarTabla(doc, titulo, columnas, filas) {
  const TAMANO = 8
  const titulos = columnas.map((c) => c.titulo)

  function encabezado(continuacion) {
    const yTitulo = doc.y
    doc.fontSize(11).font('Helvetica-Bold').fillColor(COLOR.navy)
    doc.text(continuacion ? `${titulo} (continuación)` : titulo, doc.page.margins.left, yTitulo, { lineBreak: false })
    const y = yTitulo + ALTO_TITULO_TABLA
    doc.fontSize(TAMANO).font('Helvetica-Bold')
    const alto = altoDeFila(doc, columnas, titulos)
    dibujarFila(doc, columnas, titulos, y, alto, { fondo: COLOR.navy, colorTexto: '#FFFFFF', negrita: true })
    doc.y = y + alto
  }

  // El título, el encabezado y al menos una fila deben caber juntos en la página actual.
  doc.fontSize(TAMANO).font('Helvetica')
  const primerAlto = filas.length ? altoDeFila(doc, columnas, columnas.map((c) => String(c.valor(filas[0])))) : 0
  doc.font('Helvetica-Bold')
  const altoEncabezado = altoDeFila(doc, columnas, titulos)
  doc.font('Helvetica')
  if (doc.y + ALTO_TITULO_TABLA + altoEncabezado + primerAlto > limiteInferior(doc)) {
    doc.addPage()
  }
  encabezado(false)

  filas.forEach((fila, indice) => {
    doc.fontSize(TAMANO).font('Helvetica')
    const textos = columnas.map((c) => String(c.valor(fila)))
    const alto = altoDeFila(doc, columnas, textos)
    if (doc.y + alto > limiteInferior(doc)) {
      doc.addPage()
      encabezado(true)
      doc.fontSize(TAMANO).font('Helvetica')
    }
    const y = doc.y
    dibujarFila(doc, columnas, textos, y, alto, { fondo: indice % 2 === 1 ? COLOR.suave : null, colorTexto: COLOR.texto })
    doc.y = y + alto
  })

  doc.x = doc.page.margins.left
  doc.moveDown(1.2)
}

function textoDeFiltros(filtros = {}) {
  const partes = [
    `Semestre: ${filtros.semestre || 'Todos'}`,
    `Unidad de aprendizaje: ${filtros.materia || 'Todas'}`,
    `Tipo de equipo: ${filtros.tipo ? (TIPO_ACTIVIDAD_LABEL[filtros.tipo] ?? filtros.tipo) : 'Todos'}`,
  ]
  return partes.join('   ·   ')
}

function generarReportePdf(datosReporte) {
  return new Promise((resolve, reject) => {
    // bufferPages: las páginas se conservan hasta el final para poder numerarlas ("Página X de Y").
    const doc = new PDFDocument({ ...PAGINA, bufferPages: true })
    const chunks = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const anchoUtil = doc.page.width - doc.page.margins.left - doc.page.margins.right
    const generado = new Date(datosReporte.generado_en).toLocaleString('es-MX', { timeZone: ZONA_HORARIA })

    doc.fontSize(16).font('Helvetica-Bold').fillColor(COLOR.navy)
    doc.text('SGEC — Reporte de desempeño', doc.page.margins.left, doc.y, { width: anchoUtil, align: 'center' })
    doc.moveDown(0.3)
    doc.fontSize(9).font('Helvetica').fillColor(COLOR.gris)
    doc.text(`Generado el ${generado}`, { width: anchoUtil, align: 'center' })
    doc.text(textoDeFiltros(datosReporte.filtros), { width: anchoUtil, align: 'center' })
    doc.moveDown(1)

    if (datosReporte.equipos.length === 0) {
      doc.fontSize(11).fillColor(COLOR.texto).text('No se encontraron equipos para los filtros indicados.', { width: anchoUtil })
    } else {
      dibujarTabla(doc, 'Desempeño por equipo', COLUMNAS_EQUIPOS, datosReporte.equipos)

      const detalle = datosReporte.equipos.flatMap((eq) => eq.actividades.map((act) => ({ eq, act })))
      if (detalle.length > 0) {
        dibujarTabla(doc, 'Detalle por actividad', COLUMNAS_ACTIVIDADES, detalle)
      }

      // El resumen y las notas van juntos: si no caben, pasan completos a otra página.
      const r = datosReporte.resumen
      const lineasResumen = [
        `Equipos: ${r.total_equipos}`,
        `Integrantes (alumnos distintos): ${r.total_integrantes}`,
        `Promedio general: ${r.promedio_general ?? 'Sin calificaciones'}`,
        `Actividades realizadas: ${r.pct_realizadas_general}% (${r.pares_realizados} de ${r.pares_total} por integrante)`,
        `Actividades no realizadas: ${r.pct_no_realizadas_general}%`,
      ]
      const notas = `Nota: ${datosReporte.nota_promedio} ${datosReporte.nota_realizadas}`
      doc.fontSize(8)
      const altoBloque = 18 + lineasResumen.length * 12 + 8 + doc.heightOfString(notas, { width: anchoUtil })
      if (doc.y + altoBloque > limiteInferior(doc)) doc.addPage()

      doc.fontSize(11).font('Helvetica-Bold').fillColor(COLOR.navy)
      doc.text('Resumen general', doc.page.margins.left, doc.y, { width: anchoUtil })
      doc.moveDown(0.3)
      doc.fontSize(9).font('Helvetica').fillColor(COLOR.texto)
      for (const linea of lineasResumen) doc.text(linea, { width: anchoUtil })
      doc.moveDown(0.6)
      doc.fontSize(8).fillColor(COLOR.gris).text(notas, { width: anchoUtil })
    }

    // Pie de cada página. Se escribe por debajo del margen inferior, así que se anula ese
    // margen mientras tanto: de lo contrario pdfkit abriría una página nueva por cada pie.
    const rango = doc.bufferedPageRange()
    for (let i = 0; i < rango.count; i++) {
      doc.switchToPage(rango.start + i)
      const margenInferior = doc.page.margins.bottom
      doc.page.margins.bottom = 0
      doc.fontSize(8).font('Helvetica').fillColor(COLOR.gris)
      const y = doc.page.height - margenInferior - 8
      doc.text('SGEC — Reporte de desempeño', doc.page.margins.left, y, { width: anchoUtil / 2, lineBreak: false })
      doc.text(`Página ${i + 1} de ${rango.count}`, doc.page.margins.left + anchoUtil / 2, y, {
        width: anchoUtil / 2,
        align: 'right',
        lineBreak: false,
      })
      doc.page.margins.bottom = margenInferior
    }

    doc.end()
  })
}

// ── Excel ────────────────────────────────────────────────────────────────────
// Anchos de columna (en caracteres): sin ellos Excel abre el libro con todas las columnas
// angostas y los integrantes y los títulos quedan cortados a la vista.
const ENCABEZADOS_EXCEL_REPORTE = [
  'Profesor',
  'Semestre',
  'Unidad de aprendizaje',
  'Grupo',
  'Nombre del equipo',
  'Tipo',
  'Integrantes',
  'Promedio obtenido',
  '% Actividades realizadas',
  '% Actividades no realizadas',
  'Actividades',
]
const ANCHOS_EXCEL_REPORTE = [26, 10, 30, 8, 22, 16, 70, 18, 24, 26, 12]
const ENCABEZADOS_EXCEL_ACTIVIDADES = [
  'Semestre',
  'Unidad de aprendizaje',
  'Grupo',
  'Nombre del equipo',
  'Actividad',
  'Tipo de actividad',
  'Tipo de evaluación',
  'Entregas realizadas',
  'Integrantes',
  'Promedio',
]
const ANCHOS_EXCEL_ACTIVIDADES = [10, 30, 8, 22, 45, 18, 22, 20, 12, 10]

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

  // json_to_sheet con una lista vacía produce una hoja sin encabezados: se fijan siempre.
  const hoja = XLSX.utils.json_to_sheet(filas, { header: ENCABEZADOS_EXCEL_REPORTE })
  XLSX.utils.sheet_add_aoa(hoja, [[], [`Nota: ${datosReporte.nota_promedio}`], [datosReporte.nota_realizadas]], { origin: -1 })
  hoja['!cols'] = ANCHOS_EXCEL_REPORTE.map((wch) => ({ wch }))
  XLSX.utils.book_append_sheet(libro, hoja, 'Reporte')

  const hojaDetalle = XLSX.utils.json_to_sheet(detalle, { header: ENCABEZADOS_EXCEL_ACTIVIDADES })
  hojaDetalle['!cols'] = ANCHOS_EXCEL_ACTIVIDADES.map((wch) => ({ wch }))
  XLSX.utils.book_append_sheet(libro, hojaDetalle, 'Actividades')

  return XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' })
}

module.exports = { generarReportePdf, generarReporteExcel }
