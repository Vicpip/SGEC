import api from './api'

export function listarMisCalificaciones() {
  return api.get('/calificaciones').then(({ data }) => data.calificaciones)
}

export function listarCalificacionesDeEquipo(idEquipo) {
  return api.get('/calificaciones', { params: { id_equipo: idEquipo } }).then(({ data }) => data)
}

export function registrarCalificacion(payload) {
  return api.post('/calificaciones', payload).then(({ data }) => data)
}

export function ajustarCalificacionIndividual(id, payload) {
  return api.patch(`/calificaciones/${id}/individual`, payload).then(({ data }) => data.calificacion)
}
