import api from './api'

export function listarProfesores() {
  return api.get('/usuarios', { params: { rol: 'Profesor' } }).then(({ data }) => data.usuarios)
}

export function obtenerUsuario(id) {
  return api.get(`/usuarios/${id}`).then(({ data }) => data.usuario)
}

export function crearProfesor(payload) {
  return api.post('/usuarios', { ...payload, rol: 'Profesor' }).then(({ data }) => data.usuario)
}

export function actualizarUsuario(id, payload) {
  return api.put(`/usuarios/${id}`, payload).then(({ data }) => data)
}

export function desactivarUsuario(id) {
  return api.patch(`/usuarios/${id}/desactivar`).then(({ data }) => data)
}
