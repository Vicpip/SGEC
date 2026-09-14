import api from './api'

export function listarEquipos(materiaClave) {
  const params = materiaClave ? { materia: materiaClave } : {}
  return api.get('/equipos', { params }).then(({ data }) => data)
}

export function obtenerEquipo(id) {
  return api.get(`/equipos/${id}`).then(({ data }) => data.equipo)
}

export function crearEquipo(payload) {
  return api.post('/equipos', payload).then(({ data }) => data.equipo)
}

export function generarEquipos(payload) {
  return api.post('/equipos/generar', payload).then(({ data }) => data)
}

export function actualizarEquipo(id, payload) {
  return api.put(`/equipos/${id}`, payload).then(({ data }) => data)
}

export function desactivarEquipo(id) {
  return api.patch(`/equipos/${id}/desactivar`).then(({ data }) => data)
}
