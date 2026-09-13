// Pantalla auxiliar de Inicio de Sesión (no es una de las 19 oficiales)
// Rol: Todos (no autenticado)
// URL: /recuperar-password
// Descripción: Solicita el envío de un enlace de recuperación de contraseña por correo.

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Loader2, ArrowLeft } from 'lucide-react'
import * as authService from '../../services/auth.service'

export default function RecuperarContrasena() {
  const [correo, setCorreo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [enviado, setEnviado] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!correo) {
      setError('Ingresa tu correo institucional')
      return
    }

    setLoading(true)
    try {
      await authService.solicitarRecuperacion(correo)
      setEnviado(true)
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo procesar la solicitud')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-header">
          <div style={{ fontSize: 18, fontWeight: 800, color: 'white' }}>Recuperar contraseña</div>
        </div>

        {enviado ? (
          <div className="login-body">
            <p style={{ fontSize: 13, color: 'var(--gray-600)', lineHeight: 1.5 }}>
              Si el correo <strong>{correo}</strong> está registrado, en unos minutos recibirás
              instrucciones para restablecer tu contraseña.
            </p>
            <Link to="/login" className="login-forgot">
              <ArrowLeft className="icon-sm" style={{ marginRight: 4, verticalAlign: 'middle' }} />
              Volver a inicio de sesión
            </Link>
          </div>
        ) : (
          <form className="login-body" onSubmit={handleSubmit}>
            <p style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 18 }}>
              Ingresa tu correo institucional y te enviaremos un enlace para restablecer tu
              contraseña.
            </p>

            <div className="form-group" style={{ marginBottom: 22 }}>
              <label className="form-label" htmlFor="correo">
                Correo institucional
              </label>
              <div className="form-control login-input-wrap">
                <Mail className="icon" />
                <input
                  id="correo"
                  type="email"
                  autoComplete="username"
                  placeholder="usuario@ipn.mx"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary w100"
              style={{ justifyContent: 'center', padding: 11 }}
              disabled={loading}
            >
              {loading ? <Loader2 className="icon spin" /> : 'Enviar enlace de recuperación'}
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
