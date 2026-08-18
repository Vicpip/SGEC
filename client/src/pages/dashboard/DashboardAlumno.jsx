// Pantalla 12 — Panel del Alumno
// Rol: Alumno
// URL: /alumno/dashboard
// Descripción: Resumen de equipos, actividades pendientes y avisos recientes del alumno.

import { useNavigate } from 'react-router-dom'
import { Users, ClipboardList, CheckCircle, TrendingUp, Bell, Megaphone, ArrowRight, FileText } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import Badge from '../../components/ui/Badge'

const STATS = [
  { icon: Users, iconBg: '#EBF0FA', iconColor: 'var(--blue)', value: '3', label: 'Equipos activos', to: '/alumno/equipos' },
  { icon: ClipboardList, iconBg: '#FFFBEB', iconColor: 'var(--yellow)', value: '8', label: 'Actividades asignadas', to: '/alumno/actividades' },
  { icon: CheckCircle, iconBg: '#F0FDF4', iconColor: 'var(--green)', value: '6', label: 'Entregadas', to: '/alumno/actividades?estatus=entregadas' },
  { icon: TrendingUp, iconBg: '#EBF0FA', iconColor: 'var(--blue)', value: '9.1', valueColor: 'var(--green)', label: 'Promedio general', to: '/alumno/calificaciones' },
]

const AVISOS = [
  {
    titulo: 'Cambio de aula: Práctica 5',
    materia: 'Teoría de la Computación · Hace 2 h',
    texto: 'La práctica 5 se realizará en el Laboratorio 4, piso 2. Recuerden traer su laptop y el código de la práctica anterior.',
    archivo: null,
  },
  {
    titulo: 'Semana de exámenes parciales',
    materia: 'Todas las materias · Ayer',
    texto: 'Los parciales serán del 28 de abril al 2 de mayo. Consulten el calendario académico oficial.',
    archivo: 'calendario_parciales_2026.pdf',
  },
]

const EQUIPOS = [
  { nombre: 'Equipo Alfa', detalle: 'Práctica · Teoría de la Computación', variant: 'blue', texto: 'Práctica' },
  { nombre: 'Grupo T1', detalle: 'Tarea · Teoría de la Computación', variant: 'navy', texto: 'Tarea' },
  { nombre: 'Proyecto Sigma', detalle: 'Proyecto · Teoría de la Computación', variant: 'orange', texto: 'Proyecto' },
]

const ENTREGAS = [
  { titulo: 'Práctica 5 — Lenguajes', fecha: '25 Abr 2026', detalle: 'Equipo Alfa · Teoría de la Computación' },
  { titulo: 'Tarea 2 — Gramáticas', fecha: '5 May 2026', detalle: 'Grupo T1 · Teoría de la Computación' },
]

export default function DashboardAlumno() {
  const navigate = useNavigate()

  return (
    <PageWrapper
      title="Mi Panel"
      actions={
        <>
          <div className="topbar-semester">2026/1</div>
          <div className="topbar-icon" style={{ position: 'relative' }}>
            <Bell className="icon" />
            <div
              style={{
                position: 'absolute',
                top: -3,
                right: -3,
                width: 14,
                height: 14,
                background: 'var(--red)',
                borderRadius: '50%',
                fontSize: 8,
                fontWeight: 700,
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              3
            </div>
          </div>
        </>
      }
    >
      <div style={{ fontSize: 13, color: 'var(--gray-400)', marginBottom: 20 }}>
        Bienvenida, <strong style={{ color: 'var(--gray-800)' }}>Sofía Valentina Ramírez Torres</strong> ·{' '}
        <span style={{ color: 'var(--navy)' }}>Boleta: 2023630045 · Grupo 4BM1</span>
      </div>

      <div className="stats-grid mb20">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="stat-card stat-card-link"
            onClick={() => navigate(s.to)}
          >
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
            Novedades y Avisos
          </span>
          <Badge variant="unread">3 sin leer</Badge>
        </div>
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {AVISOS.map((av) => (
            <div key={av.titulo} className="notice-card unread" style={{ marginBottom: 0, padding: 14 }}>
              <div className="notice-header" style={{ marginBottom: 8 }}>
                <div className="notice-avatar">MG</div>
                <div className="notice-meta">
                  <strong>Mtro. Miguel García Ruiz</strong>
                  <span>{av.materia}</span>
                </div>
                <Badge variant="unread" style={{ fontSize: 10 }}>
                  Nuevo
                </Badge>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-800)', marginBottom: 4 }}>{av.titulo}</div>
              <div style={{ fontSize: 12.5, color: 'var(--gray-600)' }}>{av.texto}</div>
              {av.archivo && (
                <div style={{ marginTop: 8 }}>
                  <span className="file-chip">
                    <FileText className="icon-sm" />
                    {av.archivo}
                  </span>
                </div>
              )}
            </div>
          ))}
          <div style={{ textAlign: 'center', padding: 4 }}>
            <span className="btn btn-ghost btn-sm" onClick={() => navigate('/alumno/tablon')}>
              Ver todos los avisos <ArrowRight className="icon-sm" />
            </span>
          </div>
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Mis equipos activos</span>
          </div>
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {EQUIPOS.map((eq) => (
              <div
                key={eq.nombre}
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
                  <div className="text-xs">{eq.detalle}</div>
                </div>
                <Badge variant={eq.variant}>{eq.texto}</Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Próximas entregas</span>
            <Badge variant="yellow">2 pendientes</Badge>
          </div>
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ENTREGAS.map((en) => (
              <div
                key={en.titulo}
                className="clickable-row"
                onClick={() => navigate('/alumno/actividades/1')}
                style={{ padding: 12, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12 }}
              >
                <div className="flex-between mb8">
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{en.titulo}</span>
                  <Badge variant="yellow">{en.fecha}</Badge>
                </div>
                <div className="text-xs">{en.detalle}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
