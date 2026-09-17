import api from './api'

export function listarActividades(materiaClave) {
  const params = materiaClave ? { materia: materiaClave } : {}
  return api.get('/actividades', { params }).then(({ data }) => data)
}

export function obtenerActividad(id) {
  return api.get(`/actividades/${id}`).then(({ data }) => data.actividad)
}

export function crearActividad(formData) {
  return api.post('/actividades', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(({ data }) => data.actividad)
}

export function actualizarActividad(id, payload) {
  return api.put(`/actividades/${id}`, payload).then(({ data }) => data)
}

export function desactivarActividad(id) {
  return api.patch(`/actividades/${id}/desactivar`).then(({ data }) => data)
}
