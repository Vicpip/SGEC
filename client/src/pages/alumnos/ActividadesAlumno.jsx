// Pantalla 09 — Ver Actividades del Alumno
// Rol: Profesor
// URL: /alumnos/:id/actividades
// Descripción: Historial de actividades y calificaciones de un alumno específico.

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2, ClipboardList } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import EmptyState from '../../components/ui/EmptyState'
import * as alumnosService from '../../services/alumnos.service'

const VARIANT_TIPO = { 'En clase': 'gray', Practica: 'blue', Tarea: 'navy', Proyecto: 'orange' }
const VARIANT_ESTATUS = { Calificada: 'green', 'En revision': 'yellow', Pendiente: 'red' }

function iniciales(alumno) {
  const a = alumno?.nombre?.[0] ?? ''
  const b = alumno?.apellido_paterno?.[0] ?? ''
  return `${a}${b}`.toUpperCase()
}

export default function ActividadesAlumno() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [alumno, setAlumno] = useState(null)
  const [actividades, setActividades] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    alumnosService
      .obtenerActividadesAlumno(id)
      .then((data) => {
        setAlumno(data.alumno)
        setActividades(data.actividades)
        setError('')
      })
      .catch((err) => setError(err.response?.data?.error || 'No se pudo cargar la información del alumno'))
      .finally(() => setLoading(false))
  }, [id])

  const { promedio, entregadas } = useMemo(() => {
    const calificadas = actividades.filter((a) => a.nota !== null)
    const promedio = calificadas.length
      ? calificadas.reduce((acc, a) => acc + Number(a.nota), 0) / calificadas.length
      : null
    const entregadas = actividades.filter((a) => a.estatus_entrega !== null).length
    return { promedio, entregadas }
  }, [actividades])

  return (
    <PageWrapper
      title="Actividades del Alumno"
      actions={
        <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="icon-sm" />
          Volver
        </button>
      }
    >
      {loading ? (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <Loader2 className="icon-xl spin" style={{ color: 'var(--blue)' }} />
        </div>
      ) : error ? (
        <div style={{ padding: 24, color: 'var(--red)', fontSize: 13 }}>{error}</div>
      ) : (
        <>
          <div className="card mb20" style={{ overflow: 'hidden' }}>
            <div
              style={{
                background: 'linear-gradient(135deg,var(--navy) 0%,var(--blue) 100%)',
                padding: '18px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                flexWrap: 'wrap',
              }}
            >
              <Avatar size="lg" initials={iniciales(alumno)} style={{ width: 56, height: 56, fontSize: 20 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: 'white' }}>
                  {alumno.nombre} {alumno.apellido_paterno} {alumno.apellido_materno ?? ''}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.65)' }}>
                  Boleta: {alumno.boleta} · Grupo {alumno.grupo}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 20, textAlign: 'center', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'white' }}>
                    {promedio !== null ? promedio.toFixed(1) : '—'}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)' }}>Promedio</div>
                </div>
                <div style={{ borderLeft: '1px solid rgba(255,255,255,.2)', paddingLeft: 20 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'white' }}>
                    {entregadas}/{actividades.length}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)' }}>Entregadas</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">Historial de actividades</span>
            </div>
            <div className="table-wrap">
              {actividades.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="Sin actividades registradas"
                  description="Este alumno todavía no tiene actividades publicadas en tus materias."
                />
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Actividad</th>
                      <th>Tipo</th>
                      <th>Equipo</th>
                      <th>Calificación</th>
                      <th>Estatus</th>
                      <th>Fecha entrega</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actividades.map((a) => (
                      <tr key={a.id_actividad}>
                        <td className="td-bold">{a.titulo}</td>
                        <td>
                          <Badge variant={VARIANT_TIPO[a.tipo] ?? 'gray'}>{a.tipo}</Badge>
                        </td>
                        <td>{a.equipo_nombre ?? '—'}</td>
                        <td className={a.nota !== null ? 'td-bold' : ''}>
                          {a.nota !== null ? Number(a.nota).toFixed(1) : '—'}
                          {a.individual ? (
                            <span className="text-xs" style={{ color: 'var(--gray-400)', marginLeft: 4 }}>
                              (individual)
                            </span>
                          ) : null}
                        </td>
                        <td>
                          <Badge variant={VARIANT_ESTATUS[a.estatus_entrega] ?? 'gray'}>
                            {a.estatus_entrega ?? 'Sin entregar'}
                          </Badge>
                        </td>
                        <td className="text-sm">
                          {a.fecha_entrega ? new Date(a.fecha_entrega).toLocaleDateString('es-MX') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </PageWrapper>
  )
}
