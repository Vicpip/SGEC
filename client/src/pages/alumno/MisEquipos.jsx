// Pantalla adicional — Mis Equipos (Alumno)
// Rol: Alumno
// URL: /alumno/equipos
// Nota: no forma parte de las 19 pantallas oficiales de CLAUDE.md; el ítem "Mis Equipos"
// del sidebar del alumno enlaza aquí en lo que se define una pantalla oficial dedicada.

import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import ProgressBar from '../../components/ui/ProgressBar'

const TIPO_VARIANT = { Practica: 'blue', Tarea: 'navy', Proyecto: 'orange' }
const TIPO_LABEL = { Practica: 'Práctica', Tarea: 'Tarea', Proyecto: 'Proyecto' }

const EQUIPOS = [
  {
    id: 1,
    nombre: 'Equipo Alfa',
    tipo: 'Practica',
    materia: 'Teoría de la Computación',
    grupo: '4BM1',
    semestre: '2026/1',
    integrantes: [
      { iniciales: 'SR', nombre: 'Sofía Ramírez Torres', bg: '#27AE60', esTu: true },
      { iniciales: 'JL', nombre: 'Jorge López Mendoza', bg: '#2E75B6' },
      { iniciales: 'AM', nombre: 'Ana Martínez Soto', bg: '#E07B2A' },
    ],
    actividades: { completadas: 4, total: 6 },
    promedioAlumno: 9.1,
  },
  {
    id: 2,
    nombre: 'Grupo T1',
    tipo: 'Tarea',
    materia: 'Teoría de la Computación',
    grupo: '4BM1',
    semestre: '2026/1',
    integrantes: [
      { iniciales: 'SR', nombre: 'Sofía Ramírez Torres', bg: '#27AE60', esTu: true },
      { iniciales: 'PH', nombre: 'Pablo Hernández Cruz', bg: '#8E44AD' },
      { iniciales: 'LC', nombre: 'Lucía Castillo Vera', bg: '#E53E3E' },
    ],
    actividades: { completadas: 3, total: 4 },
    promedioAlumno: 8.5,
  },
  {
    id: 3,
    nombre: 'Proyecto Sigma',
    tipo: 'Proyecto',
    materia: 'Teoría de la Computación',
    grupo: '4BM1',
    semestre: '2026/1',
    integrantes: [
      { iniciales: 'SR', nombre: 'Sofía Ramírez Torres', bg: '#27AE60', esTu: true },
      { iniciales: 'DN', nombre: 'Diego Navarro Ríos', bg: '#1F3864' },
      { iniciales: 'CB', nombre: 'Carlos Becerra Díaz', bg: '#2E75B6' },
    ],
    actividades: { completadas: 2, total: 5 },
    promedioAlumno: 7.5,
  },
]

function colorPromedio(promedio) {
  if (promedio >= 8) return 'var(--green)'
  if (promedio >= 6) return 'var(--yellow)'
  return 'var(--red)'
}

export default function MisEquipos() {
  const navigate = useNavigate()
  const semestre = EQUIPOS[0]?.semestre ?? '2026/1'

  return (
    <PageWrapper title="Mis Equipos">
      <div style={{ fontSize: 13, color: 'var(--gray-400)', marginBottom: 20 }}>
        <strong style={{ color: 'var(--gray-800)' }}>{EQUIPOS.length} equipos activos</strong> — Semestre {semestre}
      </div>

      <div className="equipo-grid">
        {EQUIPOS.map((eq) => {
          const porcentaje = Math.round((eq.actividades.completadas / eq.actividades.total) * 100)
          return (
            <div key={eq.id} className="equipo-card">
              <div className="equipo-card-header">
                <div>
                  <div className="equipo-name">{eq.nombre}</div>
                  <div className="text-xs" style={{ marginTop: 4 }}>{eq.materia} · {eq.grupo}</div>
                </div>
                <Badge variant={TIPO_VARIANT[eq.tipo]}>{TIPO_LABEL[eq.tipo]}</Badge>
              </div>

              <div className="equipo-members">
                {eq.integrantes.map((m) => (
                  <div key={m.nombre} className="member-row">
                    <Avatar
                      size="xs"
                      initials={m.iniciales}
                      bg={m.bg}
                      style={m.esTu ? { border: '2px solid var(--green)' } : undefined}
                    />
                    <span>
                      {m.nombre}
                      {m.esTu && <span style={{ color: 'var(--green)', fontWeight: 600 }}> (tú)</span>}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 8 }}>
                <div className="flex-between mb8">
                  <span className="text-xs">Actividades completadas</span>
                  <span className="text-xs font-600">{eq.actividades.completadas}/{eq.actividades.total}</span>
                </div>
                <ProgressBar percent={porcentaje} />
              </div>

              <div className="flex-between">
                <span style={{ fontSize: 12.5, fontWeight: 600, color: colorPromedio(eq.promedioAlumno) }}>
                  Mi promedio: {eq.promedioAlumno.toFixed(1)}
                </span>
                <span className="btn btn-ghost btn-sm" onClick={() => navigate(`/alumno/actividades?equipo=${eq.id}`)}>
                  Ver actividades <ArrowRight className="icon-sm" />
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </PageWrapper>
  )
}
