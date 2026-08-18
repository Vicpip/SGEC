// Generador de Reportes. Pantalla 14. Exporta desempeño a PDF/Excel vía reporte.service.

async function generar(req, res) {
  res.status(501).json({ message: 'Pendiente de implementar: generar vista previa de reporte' })
}

async function exportarPdf(req, res) {
  res.status(501).json({ message: 'Pendiente de implementar: exportar reporte a PDF' })
}

async function exportarExcel(req, res) {
  res.status(501).json({ message: 'Pendiente de implementar: exportar reporte a Excel' })
}

module.exports = { generar, exportarPdf, exportarExcel }
