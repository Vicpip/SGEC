import api from './api'

export function login(payload) {
  return api.post('/auth/login', payload).then(({ data }) => data)
}

export function solicitarRecuperacion(correo_institucional) {
  return api.post('/auth/forgot-password', { correo_institucional }).then(({ data }) => data)
}

export function restablecerContrasena(token, nueva_contrasena) {
  return api.post('/auth/reset-password', { token, nueva_contrasena }).then(({ data }) => data)
}

export function cambiarContrasena(contrasena_actual, nueva_contrasena) {
  return api
    .patch('/auth/change-password', { contrasena_actual, nueva_contrasena })
    .then(({ data }) => data)
}
