import api from './api'

export function obtenerResumen() {
  return api.get('/dashboard').then(({ data }) => data)
}
