// Pantalla 04 — Lista de Equipos
// Rol: Profesor
// URL: /equipos?materia=:clave
// Descripción: Muestra todos los equipos de una materia. Filtra por tipo.

import { useNavigate } from 'react-router-dom'
import { Search, Plus, ArrowRight } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import ProgressBar from '../../components/ui/ProgressBar'

const EQUIPOS = [
  {
    id: 1,
    nombre: 'Equipo Alfa',
    materia: 'Teoría de la Computación',
    tipo: 'Práctica',
    tipoVariant: 'blue',
    miembros: [
      { iniciales: 'SR', nombre: 'Sofía Ramírez Torres' },
      { iniciales: 'JL', nombre: 'Jorge López Mendoza', bg: '#27AE60' },
      { iniciales: 'AM', nombre: 'Ana Martínez Soto', bg: '#E07B2A' },
    ],
    completadas: 4,
    total: 6,
    porcentaje: 67,
    promedio: 8.7,
    promedioVariant: 'green',
  },
  {
    id: 2,
    nombre: 'Equipo Beta',
    materia: 'Teoría de la Computación',
    tipo: 'Práctica',
    tipoVariant: 'blue',
    miembros: [
      { iniciales: 'PH', nombre: 'Pablo Hernández Cruz', bg: '#8E44AD' },
      { iniciales: 'LC', nombre: 'Lucía Castillo Vera', bg: '#2980B9' },
      { iniciales: 'DN', nombre: 'Diego Navarro Ríos', bg: '#16A085' },
    ],
    completadas: 5,
    total: 6,
    porcentaje: 83,
    promedio: 9.1,
    promedioVariant: 'green',
  },
  {
    id: 3,
    nombre: 'Equipo Gamma',
    materia: 'Teoría de la Computación',
    tipo: 'Tarea',
    tipoVariant: 'navy',
    miembros: [
      { iniciales: 'VF', nombre: 'Valeria Flores G.', bg: '#C0392B' },
      { iniciales: 'RM', nombre: 'Ricardo Morales J.', bg: '#D35400' },
      { iniciales: 'KP', nombre: 'Karen Pérez S.', bg: '#1ABC9C' },
    ],
    completadas: 2,
    total: 4,
    porcentaje: 50,
    progressColor: 'var(--yellow)',
    promedio: 7.5,
    promedioVariant: 'yellow',
  },
  {
    id: 4,
    nombre: 'Equipo Delta',
    materia: 'Teoría de la Computación',
    tipo: 'Tarea',
    tipoVariant: 'navy',
    miembros: [
      { iniciales: 'ES', nombre: 'Eduardo Salinas R.' },
      { iniciales: 'MO', nombre: 'Mariana Ortiz B.', bg: '#E74C3C' },
      { iniciales: 'FA', nombre: 'Fernanda Aguilar T.', bg: '#2ECC71' },
    ],
    completadas: 3,
    total: 4,
    porcentaje: 75,
    promedio: 8.3,
    promedioVariant: 'green',
  },
  {
    id: 5,
    nombre: 'Proyecto Sigma',
    materia: 'Teoría de la Computación',
    tipo: 'Proyecto',
    tipoVariant: 'orange',
    miembros: [
      { iniciales: 'SR', nombre: 'Sofía Ramírez Torres' },
      { iniciales: 'PH', nombre: 'Pablo Hernández Cruz', bg: '#8E44AD' },
      { iniciales: 'VF', nombre: 'Valeria Flores G.', bg: '#C0392B' },
    ],
    completadas: 1,
    total: 3,
    porcentaje: 33,
    progressColor: 'var(--orange)',
    promedio: 7.0,
    promedioVariant: 'orange',
  },
]

export default function ListaEquipos() {
  const navigate = useNavigate()

  return (
    <PageWrapper
      title={
        <>
          Equipos — Teoría de la Computación <span style={{ fontWeight: 400, color: 'var(--gray-400)' }}>· 4BM1</span>
        </>
      }
      actions={
        <>
          <div className="topbar-semester">2026/1</div>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/equipos/nuevo')}>
            <Plus className="icon-sm" />
            Nuevo equipo
          </button>
        </>
      }
    >
      <div className="toolbar">
        <div className="search-wrap">
          <Search className="icon-sm" />
          <input className="search-input" placeholder="Buscar equipo o alumno…" />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <span className="btn btn-primary btn-sm">Todos (8)</span>
          <span className="btn btn-secondary btn-sm">Prácticas (3)</span>
          <span className="btn btn-secondary btn-sm">Tareas (3)</span>
          <span className="btn btn-secondary btn-sm">Proyecto (2)</span>
        </div>
      </div>

      <div className="equipo-grid">
        {EQUIPOS.map((eq) => (
          <div key={eq.id} className="equipo-card">
            <div className="equipo-card-header">
              <div>
                <div className="equipo-name">{eq.nombre}</div>
                <div className="text-xs" style={{ marginTop: 4 }}>{eq.materia}</div>
              </div>
              <Badge variant={eq.tipoVariant}>{eq.tipo}</Badge>
            </div>
            <div className="equipo-members">
              {eq.miembros.map((m) => (
                <div key={m.iniciales + m.nombre} className="member-row">
                  <Avatar size="xs" initials={m.iniciales} bg={m.bg} />
                  {m.nombre}
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 8 }}>
              <div className="flex-between mb8">
                <span className="text-xs">Completadas</span>
                <span className="text-xs font-600">{eq.completadas}/{eq.total}</span>
              </div>
              <ProgressBar percent={eq.porcentaje} color={eq.progressColor} />
            </div>
            <div className="flex-between">
              <Badge variant={eq.promedioVariant}>Prom: {eq.promedio.toFixed(1)}</Badge>
              <span className="btn btn-ghost btn-sm" onClick={() => navigate('/equipos/1')}>
                Ver detalle <ArrowRight className="icon-sm" />
              </span>
            </div>
          </div>
        ))}
        <div
          className="equipo-card"
          style={{
            background: 'var(--gray-50)',
            borderStyle: 'dashed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 180,
            flexDirection: 'column',
            gap: 8,
            cursor: 'pointer',
          }}
          onClick={() => navigate('/equipos/nuevo')}
        >
          <Plus style={{ width: 28, height: 28, color: 'var(--gray-200)' }} />
          <div style={{ fontSize: 13, color: 'var(--gray-400)' }}>Nuevo equipo</div>
        </div>
      </div>
    </PageWrapper>
  )
}
