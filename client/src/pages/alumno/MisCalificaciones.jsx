// Pantalla adicional — Mis Calificaciones (Alumno)
// Rol: Alumno
// URL: /alumno/calificaciones
// Nota: no forma parte de las 19 pantallas oficiales de CLAUDE.md; el ítem "Mis Calificaciones"
// del sidebar del alumno enlaza aquí en lo que se define una pantalla oficial dedicada.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, ClipboardList, CheckCircle, Clock, ChevronRight, ArrowUp, ArrowDown, Minus } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import Badge from '../../components/ui/Badge'
import StatCard from '../../components/ui/StatCard'

const TIPO_VARIANT = { Practica: 'blue', Tarea: 'navy', Proyecto: 'orange' }
const TIPO_LABEL = { Practica: 'Práctica', Tarea: 'Tarea', Proyecto: 'Proyecto' }
const ESTATUS_VARIANT = { Calificada: 'green', 'En revision': 'yellow', Pendiente: 'red' }
const ESTATUS_LABEL = { Calificada: 'Calificada', 'En revision': 'En revisión', Pendiente: 'Pendiente' }

const RESUMEN = [
  { icon: TrendingUp, iconBg: '#EBF0FA', iconColor: 'var(--blue)', value: '9.1', valueColor: 'var(--green)', label: 'Promedio general' },
  { icon: ClipboardList, iconBg: '#FFFBEB', iconColor: 'var(--yellow)', value: '8', label: 'Actividades asignadas' },
  { icon: CheckCircle, iconBg: '#F0FDF4', iconColor: 'var(--green)', value: '6', valueColor: 'var(--green)', label: 'Entregadas' },
  { icon: Clock, iconBg: '#FFF7ED', iconColor: 'var(--orange)', value: '2', valueColor: 'var(--orange)', label: 'Pendientes' },
]

const EQUIPOS = [
  {
    id: 1,
    nombre: 'Equipo Alfa',
    tipo: 'Practica',
    actividades: [
      { id: 1, titulo: 'Práctica 1 — AFD', calEquipo: 9.0, calIndividual: 9.5, estatus: 'Calificada' },
      { id: 7, titulo: 'Práctica 2 — AFND', calEquipo: 8.5, calIndividual: 8.5, estatus: 'Calificada' },
      { id: 3, titulo: 'Práctica 3 — Autómatas', calEquipo: null, calIndividual: null, estatus: 'En revision' },
      { id: 5, titulo: 'Práctica 5 — Lenguajes', calEquipo: null, calIndividual: null, estatus: 'Pendiente' },
    ],
  },
  {
    id: 2,
    nombre: 'Grupo T1',
    tipo: 'Tarea',
    actividades: [
      { id: 2, titulo: 'Tarea 1 — Lenguajes Formales', calEquipo: 8.0, calIndividual: 8.0, estatus: 'Calificada' },
      { id: 4, titulo: 'Tarea 2 — Gramáticas', calEquipo: null, calIndividual: null, estatus: 'Pendiente' },
    ],
  },
  {
    id: 3,
    nombre: 'Proyecto Sigma',
    tipo: 'Proyecto',
    actividades: [
      { id: 6, titulo: 'Proyecto Final — Etapa 1', calEquipo: 7.0, calIndividual: 7.5, estatus: 'Calificada' },
    ],
  },
]

function colorCalificacion(cal) {
  if (cal >= 8) return 'var(--green)'
  if (cal >= 6) return 'var(--yellow)'
  return 'var(--red)'
}

function promedioEquipo(actividades) {
  const vals = actividades.map((a) => a.calIndividual).filter((v) => v != null)
  if (!vals.length) return null
  return vals.reduce((sum, v) => sum + v, 0) / vals.length
}

function estatusGeneral(actividades) {
  const todasCalificadas = actividades.every((a) => a.estatus === 'Calificada')
  const ningunaCalificada = actividades.every((a) => a.estatus !== 'Calificada')
  if (todasCalificadas) return { label: 'Calificado', variant: 'green' }
  if (ningunaCalificada) return { label: 'Pendiente', variant: 'red' }
  return { label: 'En curso', variant: 'yellow' }
}

function CeldaDiferencia({ calEquipo, calIndividual }) {
  if (calEquipo == null || calIndividual == null) {
    return <span style={{ color: 'var(--gray-400)' }}>—</span>
  }
  const diff = +(calIndividual - calEquipo).toFixed(1)
  if (diff > 0) {
    return (
      <span className="diferencia-pos">
        <ArrowUp className="icon-sm" />+{diff.toFixed(1)}
      </span>
    )
  }
  if (diff < 0) {
    return (
      <span className="diferencia-neg">
        <ArrowDown className="icon-sm" />{diff.toFixed(1)}
      </span>
    )
  }
  return (
    <span className="diferencia-neu">
      <Minus className="icon-sm" />0.0
    </span>
  )
}

export default function MisCalificaciones() {
  const navigate = useNavigate()
  const [expandidos, setExpandidos] = useState(new Set(EQUIPOS.map((e) => e.id)))

  const toggle = (id) => {
    setExpandidos((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <PageWrapper title="Mis Calificaciones">
      <div className="stats-grid">
        {RESUMEN.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {EQUIPOS.map((eq) => {
        const expandido = expandidos.has(eq.id)
        const calificadas = eq.actividades.filter((a) => a.estatus === 'Calificada')
        const promedio = promedioEquipo(eq.actividades)
        const estatus = estatusGeneral(eq.actividades)

        return (
          <div key={eq.id} className="card mb16">
            <div className="accordion-header" onClick={() => toggle(eq.id)}>
              <ChevronRight className={`icon accordion-chevron${expandido ? ' expanded' : ''}`} />
              <div>
                <span style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--gray-800)' }}>{eq.nombre}</span>
                <Badge variant={TIPO_VARIANT[eq.tipo]} style={{ marginLeft: 8 }}>{TIPO_LABEL[eq.tipo]}</Badge>
              </div>
              <span style={{ fontSize: 12.5, color: 'var(--gray-600)' }}>{eq.actividades.length} actividades</span>
              <span style={{ fontSize: 12.5, color: 'var(--gray-600)' }}>{calificadas.length} calificadas</span>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: promedio != null ? colorCalificacion(promedio) : 'var(--gray-400)' }}>
                {promedio != null ? promedio.toFixed(1) : '—'}
              </span>
              <div style={{ marginLeft: 'auto' }}>
                <Badge variant={estatus.variant}>{estatus.label}</Badge>
              </div>
            </div>

            {expandido && (
              <div className="accordion-panel">
                <div className="card">
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Actividad</th><th>Cal. Equipo</th><th>Cal. Individual</th><th>Diferencia</th><th>Estatus</th>
                        </tr>
                      </thead>
                      <tbody>
                        {eq.actividades.map((a) => (
                          <tr key={a.id}>
                            <td className="td-bold">
                              <span className="link-inline" onClick={() => navigate(`/alumno/actividades/${a.id}`)}>
                                {a.titulo}
                              </span>
                            </td>
                            <td>{a.calEquipo != null ? a.calEquipo.toFixed(1) : <span style={{ color: 'var(--gray-400)' }}>—</span>}</td>
                            <td>{a.calIndividual != null ? a.calIndividual.toFixed(1) : <span style={{ color: 'var(--gray-400)' }}>—</span>}</td>
                            <td><CeldaDiferencia calEquipo={a.calEquipo} calIndividual={a.calIndividual} /></td>
                            <td><Badge variant={ESTATUS_VARIANT[a.estatus]}>{ESTATUS_LABEL[a.estatus]}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div
                    style={{
                      padding: '12px 20px',
                      background: 'var(--blue-light)',
                      borderTop: '1px solid var(--gray-200)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--gray-600)' }}>
                      Promedio {eq.nombre}
                    </span>
                    <span style={{ fontWeight: 700, color: promedio != null ? colorCalificacion(promedio) : 'var(--gray-400)' }}>
                      {promedio != null ? promedio.toFixed(1) : '—'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </PageWrapper>
  )
}
