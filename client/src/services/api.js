import axios from 'axios'

// VITE_API_URL se fija al construir. Sin valor, la ruta relativa /api: funciona en producción
// (el Nginx del host reparte /api en el mismo dominio) y en desarrollo (proxy de Vite).
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sgec_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // change-password responde 401 con este código cuando la contraseña ACTUAL es
    // incorrecta: eso no significa que la sesión haya expirado, así que no debe cerrarla.
    // Cualquier otro 401 (token vencido o inválido, también en change-password) sí la cierra.
    const esContrasenaActualIncorrecta = error.response?.data?.codigo === 'CONTRASENA_ACTUAL_INCORRECTA'
    if (error.response?.status === 401 && !esContrasenaActualIncorrecta) {
      localStorage.removeItem('sgec_token')
      localStorage.removeItem('sgec_user')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
