import api from './api'

export function listarSemestres() {
  return api.get('/semestres').then(({ data }) => data.semestres)
}

export function crearSemestre(payload) {
  return api.post('/semestres', payload).then(({ data }) => data.semestre)
}

export function actualizarSemestre(id, payload) {
  return api.put(`/semestres/${id}`, payload).then(({ data }) => data)
}
