import api from './api'

// Los adjuntos se piden con axios en modo blob porque el token viaja en el header
// Authorization: un <a href> directo a la API no lo enviaría y respondería 401.
// `tipo` = 'actividad' | 'entrega' | 'aviso'; `id` = PK del archivo en su tabla.
export function descargarArchivo(tipo, id) {
  return api.get(`/archivos/${tipo}/${id}`, { responseType: 'blob' }).then(({ data }) => data)
}
