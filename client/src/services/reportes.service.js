import api from './api'

export function obtenerReporte(params = {}) {
  return api.get('/reportes', { params }).then(({ data }) => data)
}

export function exportarReportePdf(params = {}) {
  return api.get('/reportes/pdf', { params, responseType: 'blob' }).then(({ data }) => data)
}

export function exportarReporteExcel(params = {}) {
  return api.get('/reportes/excel', { params, responseType: 'blob' }).then(({ data }) => data)
}

export function descargarBlob(blob, nombreArchivo) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nombreArchivo
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}
