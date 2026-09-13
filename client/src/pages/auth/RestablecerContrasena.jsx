// Pantalla auxiliar de Inicio de Sesión (no es una de las 19 oficiales)
// Rol: Todos (no autenticado)
// URL: /restablecer-password?token=...
// Descripción: Define una nueva contraseña a partir del token recibido por correo.

import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Lock, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react'
import * as authService from '../../services/auth.service'

const REGLA_CONTRASENA = /^(?=.*[A-Z])(?=.*[0-9]).{8,}$/

export default function RestablecerContrasena() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [nueva, setNueva] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [listo, setListo] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!token) {
      setError('El enlace de recuperación no es válido. Solicita uno nuevo.')
      return
    }
    if (!REGLA_CONTRASENA.test(nueva)) {
      setError('La contraseña debe tener al menos 8 caracteres, una mayúscula y un número')
      return
    }
    if (nueva !== confirmar) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    try {
      await authService.restablecerContrasena(token, nueva)
      setListo(true)
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo restablecer la contraseña')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-header">
          <div style={{ fontSize: 18, fontWeight: 800, color: 'white' }}>Restablecer contraseña</div>
        </div>

        {listo ? (
          <div className="login-body">
            <p style={{ fontSize: 13, color: 'var(--gray-600)', lineHeight: 1.5 }}>
              Tu contraseña se actualizó correctamente. Ya puedes iniciar sesión con ella.
            </p>
            <Link to="/login" className="login-forgot">
              <ArrowLeft className="icon-sm" style={{ marginRight: 4, verticalAlign: 'middle' }} />
              Ir a inicio de sesión
            </Link>
          </div>
        ) : (
          <form className="login-body" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="nueva">
                Nueva contraseña
              </label>
              <div className="form-control login-input-wrap">
                <Lock className="icon" />
                <input
                  id="nueva"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={nueva}
                  onChange={(e) => setNueva(e.target.value)}
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

            <div className="form-group" style={{ marginBottom: 10 }}>
              <label className="form-label" htmlFor="confirmar">
                Confirmar contraseña
              </label>
              <div className="form-control login-input-wrap">
                <Lock className="icon" />
                <input
                  id="confirmar"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                />
              </div>
            </div>

            <div
              style={{
                padding: '8px 12px',
                background: 'var(--blue-light)',
                borderRadius: 10,
                fontSize: 12,
                color: 'var(--blue)',
                marginBottom: 18,
              }}
            >
              Mínimo 8 caracteres, una mayúscula y un número.
            </div>

            <button
              type="submit"
              className="btn btn-primary w100"
              style={{ justifyContent: 'center', padding: 11 }}
              disabled={loading}
            >
              {loading ? <Loader2 className="icon spin" /> : 'Restablecer contraseña'}
            </button>

            {error && <div className="login-error">{error}</div>}

            <Link to="/login" className="login-forgot">
              <ArrowLeft className="icon-sm" style={{ marginRight: 4, verticalAlign: 'middle' }} />
              Volver a inicio de sesión
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
