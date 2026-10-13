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

// Solo Administrador (Gestión de Profesores).
export function actualizarUsuario(id, payload) {
  return api.put(`/usuarios/${id}`, payload).then(({ data }) => data)
}

// El usuario autenticado edita sus preferencias de notificación: el servidor solo acepta
// correo_alterno y notificaciones_email. Devuelve los valores guardados.
export function actualizarMiPerfil(payload) {
  return api.patch('/usuarios/me', payload).then(({ data }) => data.usuario)
}

export function desactivarUsuario(id) {
  return api.patch(`/usuarios/${id}/desactivar`).then(({ data }) => data)
}

// Revierte la baja lógica de un profesor (solo Administrador).
export function reactivarProfesor(id) {
  return api.patch(`/usuarios/${id}/reactivar`).then(({ data }) => data)
}
