// Pantalla 13 — Perfil y Configuración
// Rol: Todos
// URL: /perfil
// Descripción: Datos personales de solo lectura, edición de foto y cambio de contraseña.

import { useState } from 'react'
import { Camera, Pencil, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import * as authService from '../../services/auth.service'

const REGLA_CONTRASENA = /^(?=.*[A-Z])(?=.*[0-9]).{8,}$/

function PasswordField({ id, label, value, onChange, focused }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      <div className={`form-control login-input-wrap${focused ? ' focused' : ''}`}>
        <Lock className="icon" style={{ color: 'var(--gray-400)' }} />
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ color: 'var(--gray-800)', letterSpacing: 3 }}
        />
        <button
          type="button"
          className="login-toggle-pw"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          {visible ? <EyeOff className="icon" /> : <Eye className="icon" />}
        </button>
      </div>
    </div>
  )
}

function CambiarContrasena() {
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  function limpiar() {
    setActual('')
    setNueva('')
    setConfirmar('')
    setError('')
    setExito('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setExito('')

    if (!actual || !nueva || !confirmar) {
      setError('Completa los tres campos')
      return
    }
    if (!REGLA_CONTRASENA.test(nueva)) {
      setError('La nueva contraseña debe tener al menos 8 caracteres, una mayúscula y un número')
      return
    }
    if (nueva !== confirmar) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    try {
      await authService.cambiarContrasena(actual, nueva)
      setActual('')
      setNueva('')
      setConfirmar('')
      setExito('Contraseña actualizada correctamente')
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo actualizar la contraseña')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <div className="card-header">
        <span className="card-title">Cambiar contraseña</span>
      </div>
      <div className="card-body">
        <div className="form-row">
          <PasswordField id="pw-actual" label="Contraseña actual" value={actual} onChange={setActual} />
          <div />
        </div>
        <div className="form-row">
          <PasswordField id="pw-nueva" label="Nueva contraseña" value={nueva} onChange={setNueva} focused />
          <PasswordField id="pw-confirmar" label="Confirmar contraseña" value={confirmar} onChange={setConfirmar} />
        </div>
        <div style={{ padding: '8px 12px', background: 'var(--blue-light)', borderRadius: 10, fontSize: 12, color: 'var(--blue)', marginBottom: 16 }}>
          Mínimo 8 caracteres, una mayúscula y un número.
        </div>
        {error && <div className="login-error" style={{ marginBottom: 16 }}>{error}</div>}
        {exito && (
          <div style={{ padding: '8px 12px', background: 'var(--blue-light)', borderRadius: 10, fontSize: 12, color: 'var(--green)', marginBottom: 16 }}>
            {exito}
          </div>
        )}
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={limpiar} disabled={loading}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <Loader2 className="icon-sm spin" /> : 'Actualizar contraseña'}
          </button>
        </div>
      </div>
    </form>
  )
}

export default function Perfil() {
  return (
    <PageWrapper title="Perfil y Configuración">
      <div style={{ maxWidth: 780 }}>
        <div className="card mb20" style={{ overflow: 'hidden' }}>
          <div className="profile-header">
            <Avatar size="lg" initials="MG" />
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>Miguel Ángel García Ruiz</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.65)', marginTop: 4 }}>mgarcia@escom.ipn.mx</div>
              <div style={{ marginTop: 8 }}>
                <span className="badge" style={{ background: 'rgba(255,255,255,.2)', color: 'white' }}>
                  Profesor
                </span>
              </div>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,.15)', color: 'white', border: '1px solid rgba(255,255,255,.3)' }}>
                <Camera className="icon-sm" />
                Editar foto
              </button>
            </div>
          </div>
        </div>

        <div className="card mb20">
          <div className="card-header">
            <span className="card-title">Datos personales</span>
            <button className="btn btn-secondary btn-sm">
              <Pencil className="icon-sm" />
              Editar
            </button>
          </div>
          <div className="card-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Nombre(s)</label>
                <div className="form-control">Miguel Ángel</div>
              </div>
              <div className="form-group">
                <label className="form-label">Apellidos</label>
                <div className="form-control">García Ruiz</div>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Correo institucional</label>
                <div className="form-control" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  mgarcia@escom.ipn.mx
                  <Badge variant="gray">No editable</Badge>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">N.° de empleado</label>
                <div className="form-control">IPN-2018-04291</div>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Departamento</label>
                <div className="form-control">Ciencias de la Computación</div>
              </div>
              <div className="form-group">
                <label className="form-label">Rol</label>
                <div className="form-control" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--blue)', fontWeight: 600 }}>Profesor</span>
                  <Badge variant="blue">No editable</Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        <CambiarContrasena />
      </div>
    </PageWrapper>
  )
}
