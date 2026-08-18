// Pantalla 16 — Bandeja de Entregas
// Rol: Profesor
// URL: /actividades/:id/entregas
// Descripción: Revisión y calificación de las entregas recibidas por equipo e integrante.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Search, Download, ChevronRight, Archive, Inbox, MessageSquare, User, Users } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'

const EQUIPOS = [
  {
    id: 'alfa',
    nombre: 'Equipo Alfa',
    integrantes: [
      {
        iniciales: 'SR',
        nombre: 'Sofía Ramírez Torres',
        boleta: '2023630045',
        fecha: '24 Abr 2026, 21:35',
        estatus: 'Entregado',
        variant: 'green',
        archivos: [
          { nombre: 'practica5_alfa_sofia.zip', tamano: '2.3 MB' },
          { nombre: 'reporte_sofia.pdf', tamano: '340 KB' },
        ],
        comentario: 'Adjunto el diagrama AFD y el código con 12 casos de prueba. Tuve un problema con la cadena vacía pero lo documenté en el reporte.',
        calificacion: '9.5',
        retroalimentacion: 'Excelente trabajo, el diagrama es correcto y el código está bien documentado.',
      },
      {
        iniciales: 'JL',
        nombre: 'Jorge López Mendoza',
        boleta: '2023630078',
        fecha: '24 Abr 2026, 22:10',
        estatus: 'Entregado',
        variant: 'green',
        bg: '#27AE60',
        archivos: [{ nombre: 'practica5_alfa_jorge.zip', tamano: '1.2 MB' }],
        comentario: 'Entrego el zip con el código completo y las pruebas unitarias.',
        calificacion: '9.0',
        retroalimentacion: 'Buen trabajo, las pruebas cubren los casos principales.',
      },
      {
        iniciales: 'AM',
        nombre: 'Ana Martínez Soto',
        boleta: '2023630112',
        fecha: '25 Abr 2026, 02:48',
        estatus: 'En revisión',
        variant: 'yellow',
        bg: '#E07B2A',
        archivos: [{ nombre: 'practica5_alfa_ana.zip', tamano: '890 KB' }],
        comentario: 'Subo lo que llevo, me faltaron 2 casos de prueba por tiempo.',
        calificacion: null,
        retroalimentacion: null,
      },
    ],
  },
  {
    id: 'beta',
    nombre: 'Equipo Beta',
    integrantes: [
      {
        iniciales: 'PH',
        nombre: 'Pablo Hernández Cruz',
        boleta: '2023630156',
        fecha: '23 Abr 2026, 18:00',
        estatus: 'Calificado',
        variant: 'green',
        bg: '#8E44AD',
        archivos: [{ nombre: 'practica5_beta_pablo.zip', tamano: '1.8 MB' }],
        comentario: 'Código completo con 15 casos de prueba incluyendo casos borde.',
        calificacion: '9.5',
        retroalimentacion: 'Código correcto y bien estructurado.',
      },
      {
        iniciales: 'LC',
        nombre: 'Lucía Castillo Vera',
        boleta: '2023630089',
        fecha: null,
        estatus: 'Pendiente',
        variant: 'red',
        bg: '#2980B9',
        archivos: [],
        comentario: null,
        calificacion: null,
        retroalimentacion: null,
      },
      {
        iniciales: 'DN',
        nombre: 'Diego Navarro Ríos',
        boleta: '2023630201',
        fecha: null,
        estatus: 'Pendiente',
        variant: 'red',
        bg: '#16A085',
        archivos: [],
        comentario: null,
        calificacion: null,
        retroalimentacion: null,
      },
    ],
  },
]

const ENTREGA_TIPO = 'individual'

function promedioEquipo(integrantes) {
  const calificadas = integrantes.map((i) => i.calificacion).filter((c) => c != null).map(Number)
  if (calificadas.length === 0) return null
  return calificadas.reduce((sum, c) => sum + c, 0) / calificadas.length
}

function colorPromedio(promedio) {
  if (promedio >= 8) return 'var(--green)'
  if (promedio >= 6) return 'var(--yellow)'
  return 'var(--red)'
}

function estatusEquipo(integrantes) {
  const todosCalificados = integrantes.every((i) => i.calificacion != null)
  const ningunoEntrego = integrantes.every((i) => !i.fecha)
  if (todosCalificados) return { label: 'Calificado', variant: 'green' }
  if (ningunoEntrego) return { label: 'Pendiente', variant: 'red' }
  return { label: 'En revisión', variant: 'yellow' }
}

export default function BandejaEntregas() {
  const navigate = useNavigate()
  const [expandidos, setExpandidos] = useState(new Set())

  const toggleEquipo = (id) => {
    setExpandidos((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <PageWrapper
      title="Bandeja de Entregas"
      actions={
        <>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/actividades/1')}>
            <ArrowLeft className="icon-sm" />
            Volver
          </button>
          <button className="btn btn-primary btn-sm">
            <Save className="icon-sm" />
            Guardar calificaciones
          </button>
        </>
      }
    >
      <div className="card mb20">
        <div style={{ padding: '16px 20px', display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div className="text-xs mb8">Actividad</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>Práctica 5 — Lenguajes Regulares</div>
          </div>
          <div style={{ borderLeft: '1px solid var(--gray-200)', paddingLeft: 24 }}>
            <div className="text-xs mb8">Tipo</div>
            <Badge variant="blue">Práctica</Badge>
          </div>
          <div style={{ borderLeft: '1px solid var(--gray-200)', paddingLeft: 24 }}>
            <div className="text-xs mb8">Publicada</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>18 Abr 2026, 09:00</div>
          </div>
          <div style={{ borderLeft: '1px solid var(--gray-200)', paddingLeft: 24 }}>
            <div className="text-xs mb8">Fecha límite</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--red)' }}>25 Abr 2026, 23:59</div>
          </div>
          <div style={{ borderLeft: '1px solid var(--gray-200)', paddingLeft: 24 }}>
            <div className="text-xs mb8">Entregas recibidas</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              <span style={{ color: 'var(--green)' }}>5</span> / 9 integrantes
            </div>
          </div>
          <div style={{ borderLeft: '1px solid var(--gray-200)', paddingLeft: 24 }}>
            <div className="text-xs mb8">Tipo de entrega</div>
            {ENTREGA_TIPO === 'equipo' ? (
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
          <input className="search-input" placeholder="Buscar por alumno o equipo…" />
        </div>
        <select className="select-input">
          <option>Todos los equipos</option>
          <option>Equipo Alfa</option>
          <option>Equipo Beta</option>
        </select>
        <select className="select-input">
          <option>Todos los estatus</option>
          <option>Entregado</option>
          <option>Pendiente</option>
          <option>Calificado</option>
        </select>
      </div>

      {EQUIPOS.map((equipo) => {
        const expandido = expandidos.has(equipo.id)
        const promedio = promedioEquipo(equipo.integrantes)
        const entregadas = equipo.integrantes.filter((i) => i.fecha).length
        const estatus = estatusEquipo(equipo.integrantes)

        return (
          <div key={equipo.id} className="card mb16">
            <div className="accordion-header" onClick={() => toggleEquipo(equipo.id)}>
              <ChevronRight className={`icon accordion-chevron${expandido ? ' expanded' : ''}`} />
              <div>
                <Badge variant="blue">{equipo.nombre}</Badge>
                <div style={{ fontSize: 11, color: 'var(--gray-400)', fontStyle: 'italic', marginTop: 2 }}>
                  {ENTREGA_TIPO === 'equipo' ? '(una entrega por equipo)' : '(entrega individual requerida)'}
                </div>
              </div>
              <span style={{ fontSize: 12.5, color: 'var(--gray-600)' }}>{equipo.integrantes.length} integrantes</span>
              <span style={{ fontSize: 12.5, color: 'var(--gray-600)' }}>{entregadas}/{equipo.integrantes.length} entregadas</span>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: promedio != null ? colorPromedio(promedio) : 'var(--gray-400)' }}>
                {promedio != null ? promedio.toFixed(2) : '—'}
              </span>
              <div style={{ marginLeft: 'auto' }}>
                <Badge variant={estatus.variant}>{estatus.label}</Badge>
              </div>
            </div>

            {expandido && (
              <div className="accordion-panel">
                {equipo.integrantes.map((it) => (
                  <div key={it.boleta} className="entrega-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar initials={it.iniciales} bg={it.bg} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-800)' }}>{it.nombre}</div>
                          <div className="text-xs">{it.boleta}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Badge variant={it.variant}>{it.estatus}</Badge>
                        <span style={{ fontSize: 12, color: it.fecha ? 'var(--gray-600)' : 'var(--gray-400)' }}>{it.fecha ?? 'Sin entregar'}</span>
                      </div>
                    </div>

                    <div className="mb16">
                      <div className="entrega-section-label">Archivos entregados</div>
                      {it.archivos.length > 0 ? (
                        <div className="tag-row" style={{ marginTop: 0 }}>
                          {it.archivos.map((archivo) => (
                            <div key={archivo.nombre} className="file-chip">
                              <Archive className="icon-sm" />
                              <span>{archivo.nombre}</span>
                              <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}>({archivo.tamano})</span>
                              <Download className="icon-sm" style={{ cursor: 'pointer' }} />
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

                    <div className="mb16">
                      <div className="entrega-section-label">Comentario del alumno</div>
                      {it.comentario ? (
                        <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: 12, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <MessageSquare className="icon-sm" style={{ color: 'var(--gray-400)', marginTop: 2, flexShrink: 0 }} />
                          <span style={{ fontSize: 13, color: 'var(--gray-600)', lineHeight: 1.55 }}>{it.comentario}</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 13, color: 'var(--gray-400)' }}>Sin comentarios</span>
                      )}
                    </div>

                    <div>
                      <div className="entrega-section-label">Calificación</div>
                      <input className="calificacion-input mb12" defaultValue={it.calificacion ?? undefined} placeholder={it.calificacion ? undefined : '—'} />
                      <textarea
                        className="feedback-textarea"
                        placeholder="Escribe comentarios o sugerencias para el alumno..."
                        defaultValue={it.retroalimentacion ?? undefined}
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                        <button className="btn btn-primary btn-sm">Guardar</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      <div className="card" style={{ padding: '12px 20px', background: 'var(--blue-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--gray-600)' }}>5 de 9 entregas recibidas · 3 calificadas · 2 pendientes</span>
        <span className="btn btn-primary">
          <Save className="icon-sm" />
          Guardar calificaciones
        </span>
      </div>
    </PageWrapper>
  )
}
