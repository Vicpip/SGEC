// Pantalla 02 — Dashboard
// Rol: Profesor
// URL: /dashboard
// Descripción: Resumen de materias, equipos y actividades pendientes del profesor.

import { useEffect, useState } from 'react'
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
  Loader2,
} from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import StatCard from '../../components/ui/StatCard'
import Badge from '../../components/ui/Badge'
import { useAuth } from '../../hooks/useAuth'
import * as dashboardService from '../../services/dashboard.service'
import * as materiasService from '../../services/materias.service'

const TIPO_LABEL = { 'En clase': 'En clase', Practica: 'Práctica', Tarea: 'Tarea', Proyecto: 'Proyecto' }
const ESTATUS_LABEL = { Pendiente: 'Pendiente', 'En revision': 'En revisión', Calificada: 'Calificada' }
const ESTATUS_VARIANT = { Pendiente: 'red', 'En revision': 'yellow', Calificada: 'green' }

const ACCESOS_RAPIDOS = [
  { icon: Upload, iconBg: '#EBF0FA', iconColor: 'var(--blue)', titulo: 'Importar Alumnos', desc: 'Subir lista desde Excel', to: '/alumnos/importar' },
  { icon: Plus, iconBg: '#F0FDF4', iconColor: 'var(--green)', titulo: 'Nuevo Equipo', desc: 'Crear equipo por materia', to: '/equipos/nuevo' },
  { icon: Pencil, iconBg: '#FFFBEB', iconColor: 'var(--yellow)', titulo: 'Calificar Actividad', desc: 'Registrar calificaciones', to: '/actividades' },
  { icon: BarChart2, iconBg: '#EBF0FA', iconColor: 'var(--blue)', titulo: 'Generar Reporte', desc: 'Exportar PDF o Excel', to: '/reportes' },
  { icon: Megaphone, iconBg: '#FFF7ED', iconColor: 'var(--orange)', titulo: 'Tablón de Avisos', desc: 'Publicar avisos al grupo', to: '/tablon' },
]

function formatFecha(fecha) {
  if (!fecha) return ''
  return new Date(fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatFechaHora(fecha) {
  if (!fecha) return ''
  return new Date(fecha).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function DashboardProfesor() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [resumen, setResumen] = useState(null)
  const [materias, setMaterias] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([dashboardService.obtenerResumen(), materiasService.listarMaterias()])
      .then(([datosResumen, datosMaterias]) => {
        setResumen(datosResumen)
        setMaterias(datosMaterias)
      })
      .catch(() => {
        setResumen(null)
        setMaterias([])
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <PageWrapper title="Dashboard">
        <div style={{ padding: 48, textAlign: 'center' }}>
          <Loader2 className="icon-xl spin" style={{ color: 'var(--blue)' }} />
        </div>
      </PageWrapper>
    )
  }

  const semestreClave = resumen?.semestre?.clave ?? '—'
  const actividadesRecientes = resumen?.actividades_recientes ?? []
  const avisosRecientes = resumen?.avisos_recientes ?? []

  const stats = [
    {
      icon: Calendar,
      iconBg: '#EBF0FA',
      iconColor: 'var(--blue)',
      value: semestreClave,
      valueColor: 'var(--navy)',
      label: 'Semestre activo',
      sub: resumen?.semestre ? `Inicio: ${formatFecha(resumen.semestre.fecha_inicio)}` : 'Sin semestre activo',
    },
    {
      icon: BookOpen,
      iconBg: '#F0FDF4',
      iconColor: 'var(--green)',
      value: resumen?.materias_activas ?? 0,
      label: 'Materias activas',
    },
    {
      icon: Users,
      iconBg: '#FFFBEB',
      iconColor: 'var(--yellow)',
      value: resumen?.equipos.total ?? 0,
      label: 'Equipos formados',
      sub: resumen
        ? `${resumen.equipos.practicas} prácticas · ${resumen.equipos.tareas} tareas · ${resumen.equipos.proyectos} proyecto(s)`
        : '',
    },
    {
      icon: GraduationCap,
      iconBg: '#EBF0FA',
      iconColor: 'var(--blue)',
      value: resumen?.alumnos_inscritos ?? 0,
      label: 'Alumnos inscritos',
    },
  ]

  return (
    <PageWrapper
      title="Dashboard"
      actions={
        <>
          <div className="topbar-semester">{resumen?.semestre ? `Semestre ${semestreClave}` : 'Sin semestre activo'}</div>
          <button type="button" className="topbar-icon" aria-label="Tablón de Avisos" onClick={() => navigate('/tablon')}>
            <Bell className="icon" />
          </button>
        </>
      }
    >
      <div style={{ fontSize: 13, color: 'var(--gray-400)', marginBottom: 20 }}>
        Buenos días,{' '}
        <strong style={{ color: 'var(--gray-800)' }}>
          {user?.nombre} {user?.apellido_paterno}
        </strong>{' '}
        — Semestre <strong style={{ color: 'var(--navy)' }}>{semestreClave}</strong>
      </div>

      <div className="stats-grid">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>
        Accesos rápidos
      </div>
      <div className="quick-grid mb24">
        {ACCESOS_RAPIDOS.map((a) => (
          <div key={a.titulo} className="quick-card" onClick={() => navigate(a.to)}>
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
            <span className="card-title">Mis materias</span>
            <Badge variant="blue">{materias.length}</Badge>
          </div>
          <div className="table-wrap">
            {materias.length === 0 ? (
              <div style={{ padding: 24, fontSize: 13, color: 'var(--gray-600)' }}>Sin materias registradas.</div>
            ) : (
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
                  {materias.map((m) => (
                    <tr key={m.id_materia} style={{ cursor: 'pointer' }} onClick={() => navigate('/materias')}>
                      <td className="td-bold">{m.nombre}</td>
                      <td>{m.grupo}</td>
                      <td>{m.total_alumnos}</td>
                      <td>{m.total_equipos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Actividades recientes</span>
            <Badge variant="yellow">{actividadesRecientes.length}</Badge>
          </div>
          <div style={{ padding: '0 0 4px' }}>
            {actividadesRecientes.length === 0 ? (
              <div style={{ padding: 24, fontSize: 13, color: 'var(--gray-600)' }}>Sin actividades publicadas.</div>
            ) : (
              actividadesRecientes.map((a, i) => (
                <div
                  key={a.id_actividad}
                  className="clickable-row"
                  onClick={() => navigate(`/actividades/${a.id_actividad}`)}
                  style={{ padding: '12px 20px', borderBottom: i < actividadesRecientes.length - 1 ? '1px solid var(--gray-100)' : 'none' }}
                >
                  <div className="flex-between mb8">
                    <strong style={{ fontSize: 13, color: 'var(--gray-800)' }}>{a.titulo}</strong>
                    <Badge variant={ESTATUS_VARIANT[a.estatus] ?? 'gray'}>{ESTATUS_LABEL[a.estatus] ?? a.estatus}</Badge>
                  </div>
                  <div className="text-sm">
                    {a.materia_nombre} · {TIPO_LABEL[a.tipo] ?? a.tipo}
                  </div>
                </div>
              ))
            )}
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
        {avisosRecientes.length === 0 ? (
          <div style={{ padding: 24, fontSize: 13, color: 'var(--gray-600)' }}>Aún no has publicado avisos.</div>
        ) : (
          <div className="three-col" style={{ padding: '16px 20px' }}>
            {avisosRecientes.map((av) => (
              <div key={av.id_aviso} style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 12, padding: 14 }}>
                <div className="flex-between mb8">
                  <Badge variant={av.id_materia ? 'blue' : 'navy'}>{av.id_materia ? av.materia_nombre : 'Todas mis materias'}</Badge>
                  <span className="text-xs">{formatFechaHora(av.fecha_publicacion)}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-800)', marginBottom: 4 }}>{av.titulo}</div>
                <div className="text-xs">{av.contenido}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
