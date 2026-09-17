import api from './api'

export function listarAvisos(materiaClave) {
  const params = materiaClave ? { materia: materiaClave } : {}
  return api.get('/avisos', { params }).then(({ data }) => data.avisos)
}

export function crearAviso(formData) {
  return api.post('/avisos', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(({ data }) => data.aviso)
}

export function marcarAvisoLeido(id) {
  return api.patch(`/avisos/${id}/leido`).then(({ data }) => data)
}
