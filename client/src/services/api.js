import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
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
    // change-password responde 401 cuando la contraseña ACTUAL es incorrecta: eso no
    // significa que la sesión haya expirado, así que no debe cerrar la sesión.
    const esCambioContrasena = error.config?.url === '/auth/change-password'
    if (error.response?.status === 401 && !esCambioContrasena) {
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
