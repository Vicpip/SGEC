import api from './api'

export function listarEntregasDeActividad(idActividad) {
  return api.get(`/entregas/actividad/${idActividad}`).then(({ data }) => data)
}

export function obtenerEntrega(id) {
  return api.get(`/entregas/${id}`).then(({ data }) => data.entrega)
}

export function crearEntrega(formData) {
  return api.post('/entregas', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(({ data }) => data)
}
