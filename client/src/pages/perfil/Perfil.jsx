// Pantalla 13 — Perfil y Configuración
// Rol: Todos
// URL: /perfil
// Descripción: Datos personales de solo lectura, preferencias de notificación editables
// (correo alterno y avisos por correo) y cambio de contraseña.

import { useEffect, useState } from 'react'
import { Pencil, Lock, Eye, EyeOff, Loader2, AlertTriangle, Check } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import { useAuth } from '../../hooks/useAuth'
import * as authService from '../../services/auth.service'
import * as usuariosService from '../../services/usuarios.service'

const REGLA_CONTRASENA = /^(?=.*[A-Z])(?=.*[0-9]).{8,}$/

const ROL_LABEL = { Administrador: 'Administrador', Profesor: 'Profesor', Alumno: 'Alumno' }

const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function iniciales(persona) {
  const a = persona?.nombre?.[0] ?? ''
  const b = persona?.apellido_paterno?.[0] ?? ''
  return `${a}${b}`.toUpperCase()
}

function nombreCompleto(persona) {
  if (!persona) return ''
  return `${persona.nombre} ${persona.apellido_paterno} ${persona.apellido_materno ?? ''}`.trim()
}

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
  const { debeCambiarContrasena, contrasenaCambiada } = useAuth()
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
      const data = await authService.cambiarContrasena(actual, nueva)
      // El servidor devuelve un token nuevo: el anterior lleva la marca de cambio
      // obligatorio y la API lo seguiría rechazando.
      contrasenaCambiada(data.token)
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
          <PasswordField
            id="pw-actual"
            label={debeCambiarContrasena ? 'Contraseña temporal' : 'Contraseña actual'}
            value={actual}
            onChange={setActual}
          />
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
  const { user, debeCambiarContrasena } = useAuth()
  const [perfil, setPerfil] = useState(user)
  const [loading, setLoading] = useState(true)

  // Edición de las preferencias de notificación (lo único editable de "Datos personales").
  const [editando, setEditando] = useState(false)
  const [correoAlterno, setCorreoAlterno] = useState('')
  const [notificaciones, setNotificaciones] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [errorDatos, setErrorDatos] = useState('')
  const [exitoDatos, setExitoDatos] = useState('')

  function iniciarEdicion() {
    setCorreoAlterno(perfil?.correo_alterno ?? '')
    setNotificaciones(perfil?.notificaciones_email == null ? true : Boolean(perfil.notificaciones_email))
    setErrorDatos('')
    setExitoDatos('')
    setEditando(true)
  }

  async function guardarDatos() {
    const correo = correoAlterno.trim()
    if (correo && !FORMATO_CORREO.test(correo)) {
      setErrorDatos('El correo alterno no tiene un formato válido')
      return
    }

    setGuardando(true)
    setErrorDatos('')
    try {
      // El endpoint exige nombre y apellidos: se reenvían tal cual, sin cambios.
      await usuariosService.actualizarUsuario(user.id_usuario, {
        nombre: perfil.nombre,
        apellido_paterno: perfil.apellido_paterno,
        apellido_materno: perfil.apellido_materno ?? '',
        correo_alterno: correo,
        notificaciones_email: notificaciones,
      })
      setPerfil((prev) => ({ ...prev, correo_alterno: correo || null, notificaciones_email: notificaciones }))
      setEditando(false)
      setExitoDatos('Preferencias de notificación actualizadas')
    } catch (err) {
      const detalle = err.response?.data?.errores?.[0]
      setErrorDatos(detalle || err.response?.data?.error || 'No se pudieron guardar los cambios')
    } finally {
      setGuardando(false)
    }
  }

  useEffect(() => {
    if (!user?.id_usuario) return
    // Con la contraseña temporal la API solo atiende /api/auth/*: se muestra lo que ya
    // trae la sesión y los datos completos se cargan al terminar el cambio.
    if (debeCambiarContrasena) {
      setPerfil(user)
      setLoading(false)
      return
    }
    setLoading(true)
    usuariosService
      .obtenerUsuario(user.id_usuario)
      .then((data) => setPerfil({ ...user, ...data }))
      .catch(() => setPerfil(user))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id_usuario, debeCambiarContrasena])

  if (loading && !perfil) {
    return (
      <PageWrapper title="Perfil y Configuración">
        <div style={{ padding: 48, textAlign: 'center' }}>
          <Loader2 className="icon-xl spin" style={{ color: 'var(--blue)' }} />
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper title="Perfil y Configuración">
      <div style={{ maxWidth: 780 }}>
        {debeCambiarContrasena && (
          <div className="credenciales-aviso" style={{ marginBottom: 20 }}>
            <AlertTriangle className="icon-sm" />
            <div>
              <strong>Debes cambiar tu contraseña temporal para continuar.</strong> Escribe en "Contraseña temporal" la
              que te entregó tu profesor y elige una nueva en el formulario de abajo. Hasta entonces no podrás usar el
              resto del sistema.
            </div>
          </div>
        )}
        <div className="card mb20" style={{ overflow: 'hidden' }}>
          <div className="profile-header">
            <Avatar size="lg" initials={iniciales(perfil)} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>{nombreCompleto(perfil)}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.65)', marginTop: 4 }}>{perfil?.correo_institucional}</div>
              <div style={{ marginTop: 8 }}>
                <span className="badge" style={{ background: 'rgba(255,255,255,.2)', color: 'white' }}>
                  {ROL_LABEL[perfil?.rol] ?? perfil?.rol}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="card mb20">
          <div className="card-header">
            <span className="card-title">Datos personales</span>
            {/* Con la contraseña temporal la API solo atiende /api/auth/*: no se ofrece editar. */}
            {!editando && !debeCambiarContrasena && !loading && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={iniciarEdicion}>
                <Pencil className="icon-sm" />
                Editar
              </button>
            )}
          </div>
          <div className="card-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Nombre(s)</label>
                <div className="form-control">{perfil?.nombre}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Apellidos</label>
                <div className="form-control">{`${perfil?.apellido_paterno ?? ''} ${perfil?.apellido_materno ?? ''}`.trim()}</div>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Correo institucional</label>
                <div className="form-control" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {perfil?.correo_institucional}
                  <Badge variant="gray">No editable</Badge>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Rol</label>
                <div className="form-control" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--blue)', fontWeight: 600 }}>{ROL_LABEL[perfil?.rol] ?? perfil?.rol}</span>
                  <Badge variant="blue">No editable</Badge>
                </div>
              </div>
            </div>
            {perfil?.rol === 'Profesor' && (
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">N.° de empleado</label>
                  <div className="form-control">{perfil?.no_empleado ?? '—'}</div>
                </div>
                <div className="form-group">
                  <label className="form-label">Departamento</label>
                  <div className="form-control">{perfil?.departamento ?? '—'}</div>
                </div>
              </div>
            )}
            {perfil?.rol === 'Alumno' && (
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Boleta</label>
                  <div className="form-control">{perfil?.boleta ?? '—'}</div>
                </div>
                <div className="form-group">
                  <label className="form-label">Grupo</label>
                  <div className="form-control">{perfil?.grupo ?? '—'}</div>
                </div>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="correo-alterno">
                  Correo alterno
                </label>
                {editando ? (
                  <input
                    id="correo-alterno"
                    type="email"
                    className="form-control"
                    placeholder="Opcional: otro correo para recibir avisos"
                    maxLength={150}
                    value={correoAlterno}
                    onChange={(e) => setCorreoAlterno(e.target.value)}
                  />
                ) : (
                  <div className="form-control">{perfil?.correo_alterno || '—'}</div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="notificaciones-email">
                  Notificaciones por correo
                </label>
                {editando ? (
                  <label className="form-control" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      id="notificaciones-email"
                      type="checkbox"
                      checked={notificaciones}
                      onChange={(e) => setNotificaciones(e.target.checked)}
                    />
                    Recibir notificaciones por correo
                  </label>
                ) : (
                  <div className="form-control">
                    {perfil?.notificaciones_email == null || perfil.notificaciones_email ? 'Activadas' : 'Desactivadas'}
                  </div>
                )}
              </div>
            </div>

            {errorDatos && (
              <div className="login-error" style={{ marginBottom: 16 }}>
                {errorDatos}
              </div>
            )}
            {exitoDatos && !editando && (
              <div style={{ padding: '8px 12px', background: 'var(--blue-light)', borderRadius: 10, fontSize: 12, color: 'var(--green)' }}>
                {exitoDatos}
              </div>
            )}
            {editando && (
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setEditando(false)} disabled={guardando}>
                  Cancelar
                </button>
                <button type="button" className="btn btn-primary" onClick={guardarDatos} disabled={guardando}>
                  {guardando ? <Loader2 className="icon-sm spin" /> : <Check className="icon-sm" />}
                  Guardar
                </button>
              </div>
            )}
          </div>
        </div>

        <CambiarContrasena />
      </div>
    </PageWrapper>
  )
}
