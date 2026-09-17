// Pantalla 16 — Bandeja de Entregas
// Rol: Profesor
// URL: /actividades/:id/entregas
// Descripción: Revisión de las entregas recibidas por equipo e integrante. El registro de
// calificaciones (Sesión 9) es la única pieza que falta: esta pantalla ya muestra el estatus,
// los archivos y el comentario reales de cada entrega.

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Search, Archive, Inbox, MessageSquare, User, Users, ChevronRight, Loader2 } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import * as entregasService from '../../services/entregas.service'

const TIPO_LABEL = { 'En clase': 'En clase', Practica: 'Práctica', Tarea: 'Tarea', Proyecto: 'Proyecto' }

function estatusIntegrante(entrega) {
  if (!entrega || entrega.estatus === 'Pendiente') return { label: 'Pendiente', variant: 'red' }
  if (entrega.estatus === 'Calificada') return { label: 'Calificada', variant: 'green' }
  return { label: 'En revisión', variant: 'yellow' }
}

function iniciales(persona) {
  return `${persona.nombre?.[0] ?? ''}${persona.apellido_paterno?.[0] ?? ''}`.toUpperCase()
}

function nombreCompleto(persona) {
  return `${persona.nombre} ${persona.apellido_paterno} ${persona.apellido_materno ?? ''}`.trim()
}

function formatFecha(fecha) {
  if (!fecha) return null
  return new Date(fecha).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function estatusEquipo(integrantes) {
  const total = integrantes.length
  const entregados = integrantes.filter((it) => it.entrega && it.entrega.estatus !== 'Pendiente').length
  const calificados = integrantes.filter((it) => it.entrega?.estatus === 'Calificada').length
  if (calificados === total) return { label: 'Calificado', variant: 'green' }
  if (entregados === 0) return { label: 'Pendiente', variant: 'red' }
  return { label: 'En revisión', variant: 'yellow' }
}

export default function BandejaEntregas() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [datos, setDatos] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandidos, setExpandidos] = useState(new Set())
  const [busqueda, setBusqueda] = useState('')
  const [filtroEquipo, setFiltroEquipo] = useState('')
  const [filtroEstatus, setFiltroEstatus] = useState('')

  useEffect(() => {
    setLoading(true)
    entregasService
      .listarEntregasDeActividad(id)
      .then((data) => {
        setDatos(data)
        setError('')
      })
      .catch((err) => setError(err.response?.data?.error || 'No se pudieron cargar las entregas'))
      .finally(() => setLoading(false))
  }, [id])

  const toggleEquipo = (idEquipo) => {
    setExpandidos((prev) => {
      const next = new Set(prev)
      if (next.has(idEquipo)) next.delete(idEquipo)
      else next.add(idEquipo)
      return next
    })
  }

  const equiposFiltrados = useMemo(() => {
    if (!datos) return []
    const q = busqueda.trim().toLowerCase()
    return datos.equipos
      .filter((eq) => !filtroEquipo || String(eq.id_equipo) === filtroEquipo)
      .map((eq) => ({
        ...eq,
        integrantes: eq.integrantes.filter((it) => {
          if (q && !nombreCompleto(it).toLowerCase().includes(q) && !it.boleta.includes(q)) return false
          if (filtroEstatus) {
            const { label } = estatusIntegrante(it.entrega)
            if (label !== filtroEstatus) return false
          }
          return true
        }),
      }))
      .filter((eq) => eq.integrantes.length > 0)
  }, [datos, busqueda, filtroEquipo, filtroEstatus])

  if (loading) {
    return (
      <PageWrapper title="Bandeja de Entregas">
        <div style={{ padding: 48, textAlign: 'center' }}>
          <Loader2 className="icon-xl spin" style={{ color: 'var(--blue)' }} />
        </div>
      </PageWrapper>
    )
  }

  if (!datos) {
    return (
      <PageWrapper
        title="Bandeja de Entregas"
        actions={
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/actividades/${id}`)}>
            <ArrowLeft className="icon-sm" />
            Volver
          </button>
        }
      >
        <div className="login-error">{error || 'Actividad no encontrada'}</div>
      </PageWrapper>
    )
  }

  const { actividad, equipos } = datos
  const totalIntegrantes = equipos.reduce((sum, eq) => sum + eq.integrantes.length, 0)
  const totalEntregados = equipos.reduce(
    (sum, eq) => sum + eq.integrantes.filter((it) => it.entrega && it.entrega.estatus !== 'Pendiente').length,
    0
  )
  const totalCalificados = equipos.reduce(
    (sum, eq) => sum + eq.integrantes.filter((it) => it.entrega?.estatus === 'Calificada').length,
    0
  )

  return (
    <PageWrapper
      title="Bandeja de Entregas"
      actions={
        <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/actividades/${actividad.id_actividad}`)}>
          <ArrowLeft className="icon-sm" />
          Volver
        </button>
      }
    >
      {error && (
        <div className="login-error" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div className="card mb20">
        <div style={{ padding: '16px 20px', display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div className="text-xs mb8">Actividad</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{actividad.titulo}</div>
          </div>
          <div style={{ borderLeft: '1px solid var(--gray-200)', paddingLeft: 24 }}>
            <div className="text-xs mb8">Tipo</div>
            <Badge variant="blue">{TIPO_LABEL[actividad.tipo] ?? actividad.tipo}</Badge>
          </div>
          <div style={{ borderLeft: '1px solid var(--gray-200)', paddingLeft: 24 }}>
            <div className="text-xs mb8">Fecha límite</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--red)' }}>{formatFecha(actividad.fecha_limite)}</div>
          </div>
          <div style={{ borderLeft: '1px solid var(--gray-200)', paddingLeft: 24 }}>
            <div className="text-xs mb8">Entregas recibidas</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              <span style={{ color: 'var(--green)' }}>{totalEntregados}</span> / {totalIntegrantes} integrantes
            </div>
          </div>
          <div style={{ borderLeft: '1px solid var(--gray-200)', paddingLeft: 24 }}>
            <div className="text-xs mb8">Tipo de entrega</div>
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
        </div>
      </div>

      <div className="toolbar">
        <div className="search-wrap">
          <Search className="icon-sm" />
          <input
            className="search-input"
            placeholder="Buscar por alumno o boleta…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <select className="select-input" value={filtroEquipo} onChange={(e) => setFiltroEquipo(e.target.value)}>
          <option value="">Todos los equipos</option>
          {equipos.map((eq) => (
            <option key={eq.id_equipo} value={eq.id_equipo}>
              {eq.nombre}
            </option>
          ))}
        </select>
        <select className="select-input" value={filtroEstatus} onChange={(e) => setFiltroEstatus(e.target.value)}>
          <option value="">Todos los estatus</option>
          <option value="Pendiente">Pendiente</option>
          <option value="En revisión">En revisión</option>
          <option value="Calificada">Calificada</option>
        </select>
      </div>

      {equiposFiltrados.length === 0 ? (
        <div className="card">
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <Inbox className="icon-xl" style={{ color: 'var(--gray-200)', marginBottom: 12 }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-600)' }}>Sin resultados para este filtro</div>
          </div>
        </div>
      ) : (
        equiposFiltrados.map((equipo) => {
          const expandido = expandidos.has(equipo.id_equipo)
          const estatus = estatusEquipo(equipo.integrantes)
          const entregadas = equipo.integrantes.filter((it) => it.entrega && it.entrega.estatus !== 'Pendiente').length

          return (
            <div key={equipo.id_equipo} className="card mb16">
              <div className="accordion-header" onClick={() => toggleEquipo(equipo.id_equipo)}>
                <ChevronRight className={`icon accordion-chevron${expandido ? ' expanded' : ''}`} />
                <Badge variant="blue">{equipo.nombre}</Badge>
                <span style={{ fontSize: 12.5, color: 'var(--gray-600)' }}>{equipo.integrantes.length} integrantes</span>
                <span style={{ fontSize: 12.5, color: 'var(--gray-600)' }}>
                  {entregadas}/{equipo.integrantes.length} entregadas
                </span>
                <div style={{ marginLeft: 'auto' }}>
                  <Badge variant={estatus.variant}>{estatus.label}</Badge>
                </div>
              </div>

              {expandido && (
                <div className="accordion-panel">
                  {equipo.integrantes.map((it) => {
                    const est = estatusIntegrante(it.entrega)
                    return (
                      <div key={it.id_alumno} className="entrega-card">
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 10,
                            marginBottom: 16,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Avatar initials={iniciales(it)} />
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-800)' }}>{nombreCompleto(it)}</div>
                              <div className="text-xs">{it.boleta}</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Badge variant={est.variant}>{est.label}</Badge>
                            <span style={{ fontSize: 12, color: it.entrega ? 'var(--gray-600)' : 'var(--gray-400)' }}>
                              {formatFecha(it.entrega?.fecha_entrega) ?? 'Sin entregar'}
                            </span>
                          </div>
                        </div>

                        <div className="mb16">
                          <div className="entrega-section-label">Archivos entregados</div>
                          {it.entrega?.archivos.length > 0 ? (
                            <div className="tag-row" style={{ marginTop: 0 }}>
                              {it.entrega.archivos.map((archivo) => (
                                <div key={archivo.id_archivo_entrega} className="file-chip">
                                  <Archive className="icon-sm" />
                                  <span>{archivo.nombre_archivo}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--gray-400)', fontSize: 12.5 }}>
                              <Inbox className="icon-sm" />
                              Sin archivos entregados
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="entrega-section-label">Comentario del alumno</div>
                          {it.entrega?.comentario ? (
                            <div
                              style={{
                                background: 'var(--gray-50)',
                                borderRadius: 8,
                                padding: 12,
                                display: 'flex',
                                gap: 8,
                                alignItems: 'flex-start',
                              }}
                            >
                              <MessageSquare className="icon-sm" style={{ color: 'var(--gray-400)', marginTop: 2, flexShrink: 0 }} />
                              <span style={{ fontSize: 13, color: 'var(--gray-600)', lineHeight: 1.55 }}>{it.entrega.comentario}</span>
                            </div>
                          ) : (
                            <span style={{ fontSize: 13, color: 'var(--gray-400)' }}>Sin comentarios</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })
      )}

      <div
        className="card"
        style={{ padding: '12px 20px', background: 'var(--blue-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <span style={{ fontSize: 12, color: 'var(--gray-600)' }}>
          {totalEntregados} de {totalIntegrantes} entregas recibidas · {totalCalificados} calificadas · {totalIntegrantes - totalEntregados} pendientes
        </span>
        <span style={{ fontSize: 12, color: 'var(--gray-600)', fontStyle: 'italic' }}>El registro de calificaciones estará disponible en la Sesión 9</span>
      </div>
    </PageWrapper>
  )
}
