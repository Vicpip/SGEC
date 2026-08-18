// Pantalla 01 — Inicio de Sesión
// Rol: Todos
// URL: /login
// Descripción: Autenticación con correo institucional (@ipn.mx / @alumno.ipn.mx) y JWT, selección de rol.

import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, UserCog, GraduationCap, Loader2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import { rutaDashboardPorRol } from '../../utils/roleRoutes'

export default function LoginPage() {
  const { login, isAuthenticated, rol: rolAutenticado } = useAuth()

  const [rol, setRol] = useState('Profesor')
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (isAuthenticated) {
    return <Navigate to={rutaDashboardPorRol(rolAutenticado)} replace />
  }

  function cambiarRol(nuevoRol) {
    setRol(nuevoRol)
    setCorreo('')
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!correo || !contrasena) {
      setError('Ingresa tu correo institucional y contraseña')
      return
    }

    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', {
        correo_institucional: correo,
        contrasena,
        rol,
      })
      login(data)
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <div
              style={{
                width: 52,
                height: 52,
                background: 'white',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg viewBox="0 0 40 40" width="36" height="36">
                <rect width="40" height="40" rx="20" fill="#1F3864" />
                <text x="20" y="26" textAnchor="middle" fontFamily="Arial" fontWeight="900" fontSize="12" fill="white">
                  IPN
                </text>
              </svg>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'white', letterSpacing: '-.5px' }}>SGEC</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', lineHeight: 1.3 }}>
                Gestión de Equipos Colaborativos
                <br />
                ESCOM · IPN
              </div>
            </div>
          </div>
        </div>

        <form className="login-body" onSubmit={handleSubmit}>
          <div style={{ marginBottom: 18 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--gray-400)',
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: '.08em',
              }}
            >
              Acceder como
            </div>
            <div className="role-toggle">
              <button
                type="button"
                className={`role-btn${rol === 'Profesor' ? ' active' : ''}`}
                onClick={() => cambiarRol('Profesor')}
              >
                <UserCog className="icon-sm" />
                Profesor
              </button>
              <button
                type="button"
                className={`role-btn${rol === 'Alumno' ? ' active' : ''}`}
                onClick={() => cambiarRol('Alumno')}
              >
                <GraduationCap className="icon-sm" />
                Alumno
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="correo">
              Correo institucional
            </label>
            <div className="form-control login-input-wrap">
              <Mail className="icon" />
              <input
                id="correo"
                type="email"
                autoComplete="username"
                placeholder={rol === 'Alumno' ? 'boleta@alumno.ipn.mx' : 'usuario@ipn.mx'}
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 22 }}>
            <label className="form-label" htmlFor="contrasena">
              Contraseña
            </label>
            <div className="form-control login-input-wrap">
              <Lock className="icon" />
              <input
                id="contrasena"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
              />
              <button
                type="button"
                className="login-toggle-pw"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff className="icon" /> : <Eye className="icon" />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary w100" style={{ justifyContent: 'center', padding: 11 }} disabled={loading}>
            {loading ? <Loader2 className="icon spin" /> : 'Iniciar sesión'}
          </button>

          {error && <div className="login-error">{error}</div>}

          <a href="#" className="login-forgot">
            ¿Olvidaste tu contraseña?
          </a>
        </form>

        <div className="login-footer">
          <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>ESCOM · Escuela Superior de Cómputo &nbsp;|&nbsp; IPN 2026</span>
        </div>
      </div>
    </div>
  )
}
