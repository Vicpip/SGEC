// Pantalla adicional — Mis Calificaciones (Alumno)
// Rol: Alumno
// URL: /alumno/calificaciones
// Nota: no forma parte de las 19 pantallas oficiales de CLAUDE.md; el ítem "Mis Calificaciones"
// del sidebar del alumno enlaza aquí en lo que se define una pantalla oficial dedicada.
// Solo muestra actividades ya calificadas (calificacion.id_alumno = el propio alumno) —
// el registro de la nota ocurre exclusivamente en BandejaEntregas.jsx (Profesor, Sesión 9).

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, ClipboardList, ChevronRight, Loader2 } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import Badge from '../../components/ui/Badge'
import StatCard from '../../components/ui/StatCard'
import EmptyState from '../../components/ui/EmptyState'
import * as calificacionesService from '../../services/calificaciones.service'

const TIPO_VARIANT = { 'En clase': 'gray', Practica: 'blue', Tarea: 'navy', Proyecto: 'orange' }
const TIPO_LABEL = { 'En clase': 'En clase', Practica: 'Práctica', Tarea: 'Tarea', Proyecto: 'Proyecto' }

function colorCalificacion(cal) {
  if (cal >= 8) return 'var(--green)'
  if (cal >= 6) return 'var(--yellow)'
  return 'var(--red)'
}

function formatFecha(fecha) {
  if (!fecha) return '—'
  return new Date(fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function MisCalificaciones() {
  const navigate = useNavigate()
  const [calificaciones, setCalificaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandidos, setExpandidos] = useState(new Set())

  useEffect(() => {
    setLoading(true)
    calificacionesService
      .listarMisCalificaciones()
      .then((data) => {
        setCalificaciones(data)
        setExpandidos(new Set(data.filter((c) => c.id_equipo != null).map((c) => c.id_equipo)))
        setError('')
      })
      .catch((err) => setError(err.response?.data?.error || 'No se pudieron cargar tus calificaciones'))
      .finally(() => setLoading(false))
  }, [])

  const equipos = useMemo(() => {
    const mapa = new Map()
    for (const c of calificaciones) {
      const key = c.id_equipo ?? 'sin-equipo'
      const grupo = mapa.get(key) ?? {
        id: key,
        nombre: c.equipo_nombre ?? 'Equipo desactivado',
        tipo: c.equipo_tipo,
        calificaciones: [],
      }
      grupo.calificaciones.push(c)
      mapa.set(key, grupo)
    }
    return Array.from(mapa.values())
  }, [calificaciones])

  const promedioGeneral = useMemo(() => {
    if (calificaciones.length === 0) return null
    return calificaciones.reduce((sum, c) => sum + Number(c.nota), 0) / calificaciones.length
  }, [calificaciones])

  const toggle = (id) => {
    setExpandidos((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (loading) {
    return (
      <PageWrapper title="Mis Calificaciones">
        <div style={{ padding: 48, textAlign: 'center' }}>
          <Loader2 className="icon-xl spin" style={{ color: 'var(--blue)' }} />
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper title="Mis Calificaciones">
      {error && (
        <div className="login-error" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div className="stats-grid">
        <StatCard
          icon={TrendingUp}
          iconBg="#EBF0FA"
          iconColor="var(--blue)"
          value={promedioGeneral != null ? promedioGeneral.toFixed(1) : '—'}
          valueColor={promedioGeneral != null ? colorCalificacion(promedioGeneral) : undefined}
          label="Promedio general"
        />
        <StatCard
          icon={ClipboardList}
          iconBg="#F0FDF4"
          iconColor="var(--green)"
          value={calificaciones.length}
          label="Actividades calificadas"
        />
      </div>

      {equipos.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={ClipboardList}
            title="Aún no tienes calificaciones"
            description="Cuando tu profesor registre una calificación, aparecerá aquí agrupada por equipo."
          />
        </div>
      ) : (
        equipos.map((eq) => {
          const expandido = expandidos.has(eq.id)
          const promedio = eq.calificaciones.reduce((sum, c) => sum + Number(c.nota), 0) / eq.calificaciones.length

          return (
            <div key={eq.id} className="card mb16">
              <div className="accordion-header" onClick={() => toggle(eq.id)}>
                <ChevronRight className={`icon accordion-chevron${expandido ? ' expanded' : ''}`} />
                <span style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--gray-800)' }}>{eq.nombre}</span>
                {eq.tipo && <Badge variant={TIPO_VARIANT[eq.tipo] ?? 'gray'}>{TIPO_LABEL[eq.tipo] ?? eq.tipo}</Badge>}
                <span style={{ fontSize: 12.5, color: 'var(--gray-600)' }}>{eq.calificaciones.length} actividades</span>
                <div style={{ marginLeft: 'auto', fontWeight: 700, color: colorCalificacion(promedio) }}>{promedio.toFixed(1)}</div>
              </div>

              {expandido && (
                <div className="accordion-panel">
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Actividad</th>
                          <th>Tipo</th>
                          <th>Nota</th>
                          <th>Origen</th>
                          <th>Fecha</th>
                        </tr>
                      </thead>
                      <tbody>
                        {eq.calificaciones.map((c) => (
                          <tr key={c.id_calificacion}>
                            <td className="td-bold">
                              <span className="link-inline" onClick={() => navigate(`/alumno/actividades/${c.id_actividad}`)}>
                                {c.titulo}
                              </span>
                            </td>
                            <td>
                              <Badge variant={TIPO_VARIANT[c.tipo] ?? 'gray'}>{TIPO_LABEL[c.tipo] ?? c.tipo}</Badge>
                            </td>
                            <td style={{ fontWeight: 700, color: colorCalificacion(Number(c.nota)) }}>{Number(c.nota).toFixed(1)}</td>
                            <td>
                              <Badge variant={c.individual ? 'orange' : 'blue'}>{c.individual ? 'Ajuste individual' : 'Grupal'}</Badge>
                            </td>
                            <td>{formatFecha(c.fecha_calificacion)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )
        })
      )}
    </PageWrapper>
  )
}
