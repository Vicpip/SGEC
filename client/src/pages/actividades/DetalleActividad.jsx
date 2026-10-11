// Pantalla 10 — Detalle de Actividad
// Rol: Profesor
// URL: /actividades/:id
// Descripción: Información completa de la actividad publicada, sus archivos adjuntos y las
// calificaciones por equipo e integrante. Esta vista es SOLO LECTURA — el registro y ajuste
// de calificaciones ocurre únicamente en BandejaEntregas.jsx (Sesión 9, fuente canónica).

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Inbox, Loader2, ClipboardList, Users, User, Clock } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import ArchivoLink from '../../components/ui/ArchivoLink'
import * as actividadesService from '../../services/actividades.service'
import * as entregasService from '../../services/entregas.service'

function nombreCompleto(persona) {
  return `${persona.nombre} ${persona.apellido_paterno} ${persona.apellido_materno ?? ''}`.trim()
}

const TIPO_VARIANT = { 'En clase': 'gray', Practica: 'blue', Tarea: 'navy', Proyecto: 'orange' }
const TIPO_LABEL = { 'En clase': 'En clase', Practica: 'Práctica', Tarea: 'Tarea', Proyecto: 'Proyecto' }

function formatFecha(fecha) {
  return new Date(fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function DetalleActividad() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [actividad, setActividad] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [equiposCalificaciones, setEquiposCalificaciones] = useState([])

  useEffect(() => {
    setLoading(true)
    actividadesService
      .obtenerActividad(id)
      .then((data) => {
        setActividad(data)
        setError('')
      })
      .catch((err) => setError(err.response?.data?.error || 'No se pudo cargar la actividad'))
      .finally(() => setLoading(false))

    entregasService
      .listarEntregasDeActividad(id)
      .then((data) => setEquiposCalificaciones(data.equipos))
      .catch(() => setEquiposCalificaciones([]))
  }, [id])

  if (loading) {
    return (
      <PageWrapper title="Actividad">
        <div style={{ padding: 48, textAlign: 'center' }}>
          <Loader2 className="icon-xl spin" style={{ color: 'var(--blue)' }} />
        </div>
      </PageWrapper>
    )
  }

  if (!actividad) {
    return (
      <PageWrapper
        title="Actividad"
        actions={
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/actividades')}>
            <ArrowLeft className="icon-sm" />
            Volver
          </button>
        }
      >
        <div className="login-error">{error || 'Actividad no encontrada'}</div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper
      title={actividad.titulo}
      actions={
        <>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/actividades?materia=${actividad.materia_clave}`)}>
            <ArrowLeft className="icon-sm" />
            Volver
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/actividades/${actividad.id_actividad}/entregas`)}>
            <Inbox className="icon-sm" />
            Ver entregas
          </button>
        </>
      }
    >
      <div className="card mb20">
        <div style={{ padding: '16px 20px', display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <div className="text-xs mb8">Materia</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>
              {actividad.materia_nombre} · {actividad.materia_grupo}
            </div>
          </div>
          <div style={{ borderLeft: '1px solid var(--gray-200)', paddingLeft: 24 }}>
            <div className="text-xs mb8">Tipo</div>
            <Badge variant={TIPO_VARIANT[actividad.tipo] ?? 'gray'}>{TIPO_LABEL[actividad.tipo] ?? actividad.tipo}</Badge>
          </div>
          <div style={{ borderLeft: '1px solid var(--gray-200)', paddingLeft: 24 }}>
            <div className="text-xs mb8">Fecha límite</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{formatFecha(actividad.fecha_limite)}</div>
          </div>
          <div style={{ borderLeft: '1px solid var(--gray-200)', paddingLeft: 24 }}>
            <div className="text-xs mb8">Dirigida a</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {actividad.todos_los_equipos ? `Todos los equipos de ${TIPO_LABEL[actividad.tipo] ?? actividad.tipo}` : actividad.equipo_nombre ?? '—'}
            </div>
          </div>
          <div style={{ borderLeft: '1px solid var(--gray-200)', paddingLeft: 24 }}>
            <div className="text-xs mb8">Entrega</div>
            {actividad.entrega_por_equipo ? (
              <Badge variant="blue">
                <Users className="icon-sm" style={{ marginRight: 4 }} />
                Por equipo
              </Badge>
            ) : (
              <Badge variant="gray">
                <User className="icon-sm" style={{ marginRight: 4 }} />
                Individual
              </Badge>
            )}
          </div>
          {!!actividad.programada && (
            <div style={{ borderLeft: '1px solid var(--gray-200)', paddingLeft: 24 }}>
              <div className="text-xs mb8">Publicación programada</div>
              <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock className="icon-sm" style={{ color: 'var(--gray-400)' }} />
                {formatFecha(actividad.fecha_publicacion)}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card mb20">
        <div className="card-header">
          <span className="card-title">Información de la actividad</span>
        </div>
        <div className="card-body">
          <div className="section-lbl" style={{ paddingTop: 0 }}>
            Instrucciones
          </div>
          <div
            style={{
              background: 'var(--gray-50)',
              borderRadius: 10,
              padding: 14,
              fontSize: 13,
              color: 'var(--gray-600)',
              lineHeight: 1.6,
            }}
          >
            {actividad.descripcion || 'Sin instrucciones adicionales.'}
          </div>

          <div className="section-lbl">Documentos de referencia</div>
          {actividad.archivos.length === 0 ? (
            <div className="text-sm">Sin documentos adjuntos.</div>
          ) : (
            <div>
              {actividad.archivos.map((doc) => (
                <ArchivoLink
                  key={doc.id_archivo_actividad}
                  tipo="actividad"
                  id={doc.id_archivo_actividad}
                  nombre={doc.nombre_archivo}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Calificaciones por equipo e integrante</span>
        </div>
        {equiposCalificaciones.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Sin equipos objetivo"
            description="Esta actividad todavía no tiene equipos ni integrantes asociados."
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Equipo</th>
                  <th>Integrante</th>
                  <th>Boleta</th>
                  <th>Nota</th>
                  <th>Tipo</th>
                </tr>
              </thead>
              <tbody>
                {equiposCalificaciones.flatMap((eq) =>
                  eq.integrantes.map((it) => (
                    <tr key={`${eq.id_equipo}-${it.id_alumno}`}>
                      <td className="td-bold">{eq.nombre}</td>
                      <td>{nombreCompleto(it)}</td>
                      <td>{it.boleta}</td>
                      <td>
                        {it.calificacion ? (
                          <span style={{ fontWeight: 700, color: 'var(--navy)' }}>{Number(it.calificacion.nota).toFixed(1)}</span>
                        ) : (
                          <span style={{ color: 'var(--gray-400)' }}>—</span>
                        )}
                      </td>
                      <td>
                        {it.calificacion ? (
                          <Badge variant={it.calificacion.individual ? 'orange' : 'blue'}>
                            {it.calificacion.individual ? 'Ajuste individual' : 'Grupal'}
                          </Badge>
                        ) : (
                          <Badge variant="red">Sin calificar</Badge>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
