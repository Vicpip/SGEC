import api from './api'

export function listarMaterias(params = {}) {
  return api.get('/materias', { params }).then(({ data }) => data.materias)
}

export function obtenerMateria(id) {
  return api.get(`/materias/${id}`).then(({ data }) => data.materia)
}

export function crearMateria(payload) {
  return api.post('/materias', payload).then(({ data }) => data.materia)
}

export function actualizarMateria(id, payload) {
  return api.put(`/materias/${id}`, payload).then(({ data }) => data)
}

export function desactivarMateria(id) {
  return api.patch(`/materias/${id}/desactivar`).then(({ data }) => data)
}
