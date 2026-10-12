// Pantalla 12 — Panel del Alumno
// Rol: Alumno
// URL: /alumno/dashboard
// Descripción: Resumen real del alumno (GET /api/dashboard): equipos, próximas actividades
// pendientes, últimas calificaciones y avisos sin leer.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, ClipboardList, CheckCircle, TrendingUp, Bell, Megaphone, ArrowRight, Loader2 } from 'lucide-react'
import PageWrapper, { SemestreActivo } from '../../components/layout/PageWrapper'
import Badge from '../../components/ui/Badge'
import { useAuth } from '../../hooks/useAuth'
import * as dashboardService from '../../services/dashboard.service'

const TIPO_VARIANT = { 'En clase': 'gray', Practica: 'blue', Tarea: 'navy', Proyecto: 'orange' }
const TIPO_LABEL = { 'En clase': 'En clase', Practica: 'Práctica', Tarea: 'Tarea', Proyecto: 'Proyecto' }

function formatFecha(fecha) {
  if (!fecha) return ''
  return new Date(fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatFechaHora(fecha) {
  if (!fecha) return ''
  return new Date(fecha).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function iniciales(nombre, apellido) {
  return `${nombre?.[0] ?? ''}${apellido?.[0] ?? ''}`.toUpperCase()
}

function colorNota(nota) {
  if (nota >= 8) return 'var(--green)'
  if (nota >= 6) return 'var(--yellow)'
  return 'var(--red)'
}

function Vacio({ children }) {
  return <div style={{ padding: '10px 4px', fontSize: 13, color: 'var(--gray-600)' }}>{children}</div>
}

export default function DashboardAlumno() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [panel, setPanel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    dashboardService
      .obtenerResumen()
      .then((data) => {
        setPanel(data)
        setError('')
      })
      .catch((err) => setError(err.response?.data?.error || 'No se pudo cargar tu panel'))
      .finally(() => setLoading(false))
  }, [])

  const resumen = panel?.resumen
  const sinLeer = resumen?.avisos_sin_leer ?? 0

  const acciones = (
    <>
      <SemestreActivo />
      <button
        type="button"
        className="topbar-icon"
        style={{ position: 'relative' }}
        aria-label={sinLeer > 0 ? `Tablón de Avisos: ${sinLeer} sin leer` : 'Tablón de Avisos'}
        onClick={() => navigate('/alumno/tablon')}
      >
        <Bell className="icon" />
        {sinLeer > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -3,
              right: -3,
              minWidth: 14,
              height: 14,
              padding: '0 3px',
              background: 'var(--red)',
              borderRadius: 7,
              fontSize: 8,
              fontWeight: 700,
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {sinLeer > 99 ? '99+' : sinLeer}
          </span>
        )}
      </button>
    </>
  )

  if (loading) {
    return (
      <PageWrapper title="Mi Panel">
        <div style={{ padding: 48, textAlign: 'center' }}>
          <Loader2 className="icon-xl spin" style={{ color: 'var(--blue)' }} />
        </div>
      </PageWrapper>
    )
  }

  if (!panel) {
    return (
      <PageWrapper title="Mi Panel">
        <div className="login-error">{error || 'No se pudo cargar tu panel'}</div>
      </PageWrapper>
    )
  }

  const stats = [
    { icon: Users, iconBg: '#EBF0FA', iconColor: 'var(--blue)', value: resumen.equipos_activos, label: 'Equipos activos', to: '/alumno/equipos' },
    {
      icon: ClipboardList,
      iconBg: '#FFFBEB',
      iconColor: 'var(--yellow)',
      value: resumen.actividades_asignadas,
      label: 'Actividades asignadas',
      to: '/alumno/actividades',
    },
    {
      icon: CheckCircle,
      iconBg: '#F0FDF4',
      iconColor: 'var(--green)',
      value: resumen.actividades_realizadas,
      label: 'Realizadas',
      to: '/alumno/actividades',
    },
    {
      icon: TrendingUp,
      iconBg: '#EBF0FA',
      iconColor: 'var(--blue)',
      value: resumen.promedio_general != null ? resumen.promedio_general.toFixed(1) : '—',
      valueColor: resumen.promedio_general != null ? colorNota(resumen.promedio_general) : undefined,
      label: 'Promedio general',
      to: '/alumno/calificaciones',
    },
  ]

  const nombreCompleto = [user?.nombre, user?.apellido_paterno, user?.apellido_materno].filter(Boolean).join(' ')

  return (
    <PageWrapper title="Mi Panel" actions={acciones}>
      <div style={{ fontSize: 13, color: 'var(--gray-400)', marginBottom: 20 }}>
        Hola, <strong style={{ color: 'var(--gray-800)' }}>{nombreCompleto}</strong>
        {user?.boleta && (
          <>
            {' '}
            ·{' '}
            <span style={{ color: 'var(--navy)' }}>
              Boleta: {user.boleta}
              {user.grupo ? ` · Grupo ${user.grupo}` : ''}
            </span>
          </>
        )}
      </div>

      <div className="stats-grid mb20">
        {stats.map((s) => (
          <div key={s.label} className="stat-card stat-card-link" onClick={() => navigate(s.to)}>
            <div className="stat-icon" style={{ background: s.iconBg }}>
              <s.icon className="icon-lg" style={{ color: s.iconColor }} />
            </div>
            <div className="stat-value" style={s.valueColor ? { color: s.valueColor } : undefined}>
              {s.value}
            </div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card mb20" style={{ border: '1.5px solid var(--blue)' }}>
        <div className="card-header" style={{ background: 'var(--blue-light)' }}>
          <span className="card-title" style={{ color: 'var(--navy)' }}>
            <Megaphone className="icon" style={{ color: 'var(--blue)', marginRight: 6, verticalAlign: 'middle' }} />
            Avisos sin leer
          </span>
          {sinLeer > 0 ? <Badge variant="unread">{sinLeer} sin leer</Badge> : <Badge variant="green">Al día</Badge>}
        </div>
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {panel.avisos_sin_leer.length === 0 ? (
            <Vacio>No tienes avisos pendientes de leer.</Vacio>
          ) : (
            panel.avisos_sin_leer.map((av) => (
              <div
                key={av.id_aviso}
                className="notice-card unread clickable-row"
                style={{ marginBottom: 0, padding: 14 }}
                onClick={() => navigate('/alumno/tablon')}
              >
                <div className="notice-header" style={{ marginBottom: 8 }}>
                  <div className="notice-avatar">{iniciales(av.profesor_nombre, av.profesor_apellido_paterno)}</div>
                  <div className="notice-meta">
                    <strong>
                      {av.profesor_nombre} {av.profesor_apellido_paterno}
                    </strong>
                    <span>
                      {av.id_materia ? av.materia_nombre : 'Todas sus materias'} · {formatFechaHora(av.fecha_publicacion)}
                    </span>
                  </div>
                  <Badge variant="unread" style={{ fontSize: 10 }}>
                    Nuevo
                  </Badge>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-800)', marginBottom: 4 }}>{av.titulo}</div>
                <div style={{ fontSize: 12.5, color: 'var(--gray-600)' }}>{av.contenido}</div>
              </div>
            ))
          )}
          <div style={{ textAlign: 'center', padding: 4 }}>
            <span className="btn btn-ghost btn-sm" onClick={() => navigate('/alumno/tablon')}>
              Ver todos los avisos <ArrowRight className="icon-sm" />
            </span>
          </div>
        </div>
      </div>

      <div className="two-col mb20">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Próximas actividades</span>
            <Badge variant={resumen.actividades_pendientes > 0 ? 'yellow' : 'green'}>
              {resumen.actividades_pendientes} pendiente{resumen.actividades_pendientes === 1 ? '' : 's'}
            </Badge>
          </div>
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {panel.proximas_actividades.length === 0 ? (
              <Vacio>No tienes actividades pendientes.</Vacio>
            ) : (
              panel.proximas_actividades.map((act) => (
                <div
                  key={act.id_actividad}
                  className="clickable-row"
                  onClick={() => navigate(`/alumno/actividades/${act.id_actividad}`)}
                  style={{
                    padding: 12,
                    background: act.vencida ? '#FEF2F2' : '#FFFBEB',
                    border: `1px solid ${act.vencida ? '#FECACA' : '#FDE68A'}`,
                    borderRadius: 12,
                  }}
                >
                  <div className="flex-between mb8">
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{act.titulo}</span>
                    <Badge variant={act.vencida ? 'red' : 'yellow'}>
                      {act.vencida ? 'Venció el ' : ''}
                      {formatFecha(act.fecha_limite)}
                    </Badge>
                  </div>
                  <div className="text-xs">
                    {TIPO_LABEL[act.tipo] ?? act.tipo}
                    {act.tipo_evaluacion ? ` · ${act.tipo_evaluacion}` : ''} · {act.materia_nombre}
                  </div>
                </div>
              ))
            )}
            {resumen.actividades_pendientes > panel.proximas_actividades.length && (
              <div style={{ textAlign: 'center', padding: 4 }}>
                <span className="btn btn-ghost btn-sm" onClick={() => navigate('/alumno/actividades')}>
                  Ver todas mis actividades <ArrowRight className="icon-sm" />
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Últimas calificaciones</span>
            <span className="btn btn-ghost btn-sm" onClick={() => navigate('/alumno/calificaciones')}>
              Ver todas <ArrowRight className="icon-sm" />
            </span>
          </div>
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {panel.ultimas_calificaciones.length === 0 ? (
              <Vacio>Aún no tienes calificaciones registradas.</Vacio>
            ) : (
              panel.ultimas_calificaciones.map((cal) => (
                <div
                  key={cal.id_calificacion}
                  className="clickable-row"
                  onClick={() => navigate('/alumno/calificaciones')}
                  style={{
                    padding: 12,
                    border: '1px solid var(--gray-200)',
                    borderRadius: 12,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{cal.titulo}</div>
                    <div className="text-xs">
                      {TIPO_LABEL[cal.tipo] ?? cal.tipo} · {cal.materia_nombre}
                      {cal.individual ? ' · Ajuste individual' : ''}
                    </div>
                  </div>
                  <span style={{ fontSize: 16, fontWeight: 700, color: colorNota(Number(cal.nota)) }}>
                    {Number(cal.nota).toFixed(1)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Mis equipos activos</span>
          <span className="btn btn-ghost btn-sm" onClick={() => navigate('/alumno/equipos')}>
            Ver detalle <ArrowRight className="icon-sm" />
          </span>
        </div>
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {panel.equipos.length === 0 ? (
            <Vacio>Todavía no perteneces a ningún equipo.</Vacio>
          ) : (
            panel.equipos.map((eq) => (
              <div
                key={eq.id_equipo}
                className="clickable-row"
                onClick={() => navigate('/alumno/equipos')}
                style={{
                  padding: 12,
                  border: '1px solid var(--gray-200)',
                  borderRadius: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{eq.nombre}</div>
                  <div className="text-xs">
                    {eq.materia_nombre} · {eq.materia_grupo}
                  </div>
                </div>
                <Badge variant={TIPO_VARIANT[eq.tipo]}>{TIPO_LABEL[eq.tipo]}</Badge>
              </div>
            ))
          )}
        </div>
      </div>
    </PageWrapper>
  )
}
