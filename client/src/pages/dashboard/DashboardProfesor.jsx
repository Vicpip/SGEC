// Pantalla 02 — Dashboard
// Rol: Profesor
// URL: /dashboard
// Descripción: Resumen de materias, equipos y actividades pendientes del profesor.

import { useNavigate } from 'react-router-dom'
import {
  Calendar,
  BookOpen,
  Users,
  GraduationCap,
  Upload,
  Plus,
  Pencil,
  BarChart2,
  Megaphone,
  ArrowRight,
  Bell,
} from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import StatCard from '../../components/ui/StatCard'
import Badge from '../../components/ui/Badge'

const STATS = [
  { icon: Calendar, iconBg: '#EBF0FA', iconColor: 'var(--blue)', value: '2026/1', valueColor: 'var(--navy)', label: 'Semestre activo', sub: 'Inicio: 20 ene 2026' },
  { icon: BookOpen, iconBg: '#F0FDF4', iconColor: 'var(--green)', value: '4', label: 'Materias activas', sub: '+1 vs semestre anterior' },
  { icon: Users, iconBg: '#FFFBEB', iconColor: 'var(--yellow)', value: '23', label: 'Equipos formados', sub: '8 prácticas · 10 tareas · 5 proyecto' },
  { icon: GraduationCap, iconBg: '#EBF0FA', iconColor: 'var(--blue)', value: '118', label: 'Alumnos inscritos', sub: 'Promedio 29.5 por materia' },
]

const MATERIAS = [
  { clave: 'TC-401', nombre: 'Teoría de la Computación', grupo: '4BM1', alumnos: 32, equipos: 8 },
  { clave: 'SO-301', nombre: 'Sistemas Operativos', grupo: '3BM2', alumnos: 28, equipos: 7 },
  { clave: 'RC-501', nombre: 'Redes de Computadoras', grupo: '5BM3', alumnos: 30, equipos: 5 },
  { clave: 'CM-601', nombre: 'Compiladores', grupo: '6BM1', alumnos: 28, equipos: 3 },
]

const ACTIVIDADES_RECIENTES = [
  { titulo: 'Práctica 3 — Autómatas', estatus: 'Pendiente', variant: 'yellow', detalle: 'Teoría de la Computación · 8 equipos' },
  { titulo: 'Tarea 2 — Procesos', estatus: 'Calificada', variant: 'green', detalle: 'Sistemas Operativos · 7 equipos' },
  { titulo: 'Proyecto Final — Etapa 1', estatus: 'En revisión', variant: 'blue', detalle: 'Redes de Computadoras · 5 equipos' },
]

const AVISOS_RECIENTES = [
  { badge: 'Teoría de la Computación', variant: 'blue', hace: 'Hace 2 h', titulo: 'Cambio de aula: Práctica 5', texto: 'La práctica 5 se realizará en el Lab 4, piso 2. Recuerden traer su laptop.' },
  { badge: 'Todas las materias', variant: 'navy', hace: 'Ayer', titulo: 'Semana de exámenes parciales', texto: 'Los parciales serán del 28 de abril al 2 de mayo. Consulten el calendario.' },
  { badge: 'Sistemas Operativos', variant: 'orange', hace: 'Hace 3 días', titulo: 'Material de apoyo disponible', texto: 'Subí las diapositivas del tema de Planificación de Procesos.' },
]

const ACCESOS_RAPIDOS = [
  { icon: Upload, iconBg: '#EBF0FA', iconColor: 'var(--blue)', titulo: 'Importar Alumnos', desc: 'Subir lista desde Excel', to: '/alumnos/importar' },
  { icon: Plus, iconBg: '#F0FDF4', iconColor: 'var(--green)', titulo: 'Nuevo Equipo', desc: 'Crear equipo por materia', to: '/equipos/nuevo' },
  { icon: Pencil, iconBg: '#FFFBEB', iconColor: 'var(--yellow)', titulo: 'Calificar Actividad', desc: 'Registrar calificaciones', to: null },
  { icon: BarChart2, iconBg: '#EBF0FA', iconColor: 'var(--blue)', titulo: 'Generar Reporte', desc: 'Exportar PDF o Excel', to: '/reportes' },
  { icon: Megaphone, iconBg: '#FFF7ED', iconColor: 'var(--orange)', titulo: 'Tablón de Avisos', desc: 'Publicar avisos al grupo', to: '/tablon' },
]

export default function DashboardProfesor() {
  const navigate = useNavigate()

  return (
    <PageWrapper
      title="Dashboard"
      actions={
        <>
          <div className="topbar-semester">Semestre 2026/1</div>
          <div className="topbar-icon">
            <Bell className="icon" />
          </div>
        </>
      }
    >
      <div style={{ fontSize: 13, color: 'var(--gray-400)', marginBottom: 20 }}>
        Buenos días, <strong style={{ color: 'var(--gray-800)' }}>Mtro. Miguel García Ruiz</strong> — Semestre{' '}
        <strong style={{ color: 'var(--navy)' }}>2026/1</strong>
      </div>

      <div className="stats-grid">
        {STATS.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>
        Accesos rápidos
      </div>
      <div className="quick-grid mb24">
        {ACCESOS_RAPIDOS.map((a) => (
          <div key={a.titulo} className="quick-card" onClick={a.to ? () => navigate(a.to) : undefined}>
            <div className="quick-icon" style={{ background: a.iconBg }}>
              <a.icon className="icon-lg" style={{ color: a.iconColor }} />
            </div>
            <div className="quick-title">{a.titulo}</div>
            <div className="quick-desc">{a.desc}</div>
          </div>
        ))}
      </div>

      <div className="two-col mb20">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Materias — 2026/1</span>
            <Badge variant="blue">4 activas</Badge>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Materia</th>
                  <th>Grupo</th>
                  <th>Alumnos</th>
                  <th>Equipos</th>
                </tr>
              </thead>
              <tbody>
                {MATERIAS.map((m) => (
                  <tr key={m.clave} style={{ cursor: 'pointer' }} onClick={() => navigate('/materias')}>
                    <td className="td-bold">{m.nombre}</td>
                    <td>{m.grupo}</td>
                    <td>{m.alumnos}</td>
                    <td>{m.equipos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Actividades recientes</span>
            <Badge variant="yellow">3 pendientes</Badge>
          </div>
          <div style={{ padding: '0 0 4px' }}>
            {ACTIVIDADES_RECIENTES.map((a, i) => (
              <div
                key={a.titulo}
                className="clickable-row"
                onClick={() => navigate('/actividades/1')}
                style={{ padding: '12px 20px', borderBottom: i < ACTIVIDADES_RECIENTES.length - 1 ? '1px solid var(--gray-100)' : 'none' }}
              >
                <div className="flex-between mb8">
                  <strong style={{ fontSize: 13, color: 'var(--gray-800)' }}>{a.titulo}</strong>
                  <Badge variant={a.variant}>{a.estatus}</Badge>
                </div>
                <div className="text-sm">{a.detalle}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Tablón de Avisos recientes</span>
          <span className="btn btn-ghost btn-sm" onClick={() => navigate('/tablon')}>
            Ver todos <ArrowRight className="icon-sm" />
          </span>
        </div>
        <div className="three-col" style={{ padding: '16px 20px' }}>
          {AVISOS_RECIENTES.map((av) => (
            <div key={av.titulo} style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 12, padding: 14 }}>
              <div className="flex-between mb8">
                <Badge variant={av.variant}>{av.badge}</Badge>
                <span className="text-xs">{av.hace}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-800)', marginBottom: 4 }}>{av.titulo}</div>
              <div className="text-xs">{av.texto}</div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  )
}
