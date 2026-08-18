import { createContext, useContext, useEffect, useState } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('sgec_token'))
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('sgec_user')
    return raw ? JSON.parse(raw) : null
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedToken = localStorage.getItem('sgec_token')

    if (!storedToken) {
      setLoading(false)
      return
    }

    api
      .get('/auth/me')
      .then(({ data }) => {
        setUser(data.usuario)
        localStorage.setItem('sgec_user', JSON.stringify(data.usuario))
      })
      .catch(() => {
        setToken(null)
        setUser(null)
        localStorage.removeItem('sgec_token')
        localStorage.removeItem('sgec_user')
      })
      .finally(() => setLoading(false))
  }, [])

  function login({ token: nuevoToken, usuario }) {
    setToken(nuevoToken)
    setUser(usuario)
    localStorage.setItem('sgec_token', nuevoToken)
    localStorage.setItem('sgec_user', JSON.stringify(usuario))
  }

  function logout() {
    setToken(null)
    setUser(null)
    localStorage.removeItem('sgec_token')
    localStorage.removeItem('sgec_user')
    window.location.href = '/login'
  }

  const value = {
    user,
    token,
    login,
    logout,
    isAuthenticated: Boolean(token),
    loading,
    rol: user?.rol ?? null,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider')
  }
  return context
}
