// Pantalla 17 — Entregar Actividad
// Rol: Alumno
// URL: /alumno/actividades/:id
// Descripción: Formulario de entrega individual/por equipo y estatus de los compañeros de equipo.

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Clock,
  FileText,
  UploadCloud,
  Send,
  CheckCircle,
  User,
  Users,
  X,
  Loader2,
} from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import ArchivoLink from '../../components/ui/ArchivoLink'
import * as actividadesService from '../../services/actividades.service'
import * as entregasService from '../../services/entregas.service'

const TIPO_VARIANT = { 'En clase': 'gray', Practica: 'blue', Tarea: 'navy', Proyecto: 'orange' }
const TIPO_LABEL = { 'En clase': 'En clase', Practica: 'Práctica', Tarea: 'Tarea', Proyecto: 'Proyecto' }

function estatusIntegrante(entrega) {
  if (!entrega || entrega.estatus === 'Pendiente') return { label: 'Sin entregar', variant: 'red' }
  if (entrega.estatus === 'Calificada') return { label: 'Calificada', variant: 'green' }
  return { label: 'Entregado', variant: 'green' }
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

function diasRestantes(fechaLimite) {
  const ms = new Date(fechaLimite).getTime() - Date.now()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

export default function EntregarActividad() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [actividad, setActividad] = useState(null)
  const [roster, setRoster] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [comentario, setComentario] = useState('')
  const [archivos, setArchivos] = useState([])
  const [enviando, setEnviando] = useState(false)

  function cargar() {
    setLoading(true)
    Promise.all([actividadesService.obtenerActividad(id), entregasService.listarEntregasDeActividad(id)])
      .then(([actividadData, rosterData]) => {
        setActividad(actividadData)
        setRoster(rosterData)
        setError('')
      })
      .catch((err) => setError(err.response?.data?.error || 'No se pudo cargar la actividad'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  function handleArchivos(e) {
    const nuevos = Array.from(e.target.files ?? [])
    setArchivos((prev) => [...prev, ...nuevos])
    e.target.value = ''
  }

  function quitarArchivo(nombre) {
    setArchivos((prev) => prev.filter((f) => f.name !== nombre))
  }

  async function handleEnviar() {
    setError('')
    setEnviando(true)
    try {
      const formData = new FormData()
      formData.append('id_actividad', id)
      formData.append('comentario', comentario.trim())
      archivos.forEach((archivo) => formData.append('archivos', archivo))
      await entregasService.crearEntrega(formData)
      setComentario('')
      setArchivos([])
      cargar()
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo registrar la entrega')
    } finally {
      setEnviando(false)
    }
  }

  if (loading) {
    return (
      <PageWrapper title="Entregar Actividad">
        <div style={{ padding: 48, textAlign: 'center' }}>
          <Loader2 className="icon-xl spin" style={{ color: 'var(--blue)' }} />
        </div>
      </PageWrapper>
    )
  }

  if (!actividad || !roster) {
    return (
      <PageWrapper
        title="Entregar Actividad"
        actions={
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/alumno/actividades')}>
            <ArrowLeft className="icon-sm" />
            Volver
          </button>
        }
      >
        <div className="login-error">{error || 'Actividad no encontrada'}</div>
      </PageWrapper>
    )
  }

  const equipo = roster.equipos[0]
  const integrantes = equipo?.integrantes ?? []
  const miIntegrante = integrantes.find((it) => it.id_alumno === roster.mi_id_alumno)
  const miEntrega = miIntegrante?.entrega ?? null
  const dias = diasRestantes(actividad.fecha_limite)

  return (
    <PageWrapper title="Entregar Actividad">
      {error && (
        <div className="login-error" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div className="two-col">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div
              style={{
                background: 'linear-gradient(135deg,var(--navy),var(--blue))',
                padding: '16px 20px',
                borderRadius: 'var(--r-card) var(--r-card) 0 0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ color: 'white' }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{actividad.titulo}</div>
                <div style={{ fontSize: 11.5, opacity: 0.7, marginTop: 3 }}>
                  {actividad.materia_nombre} {equipo ? `· ${equipo.nombre}` : ''}
                </div>
              </div>
              <Badge variant={TIPO_VARIANT[actividad.tipo] ?? 'gray'} style={{ background: 'rgba(255,255,255,.2)', color: 'white' }}>
                {TIPO_LABEL[actividad.tipo] ?? actividad.tipo}
              </Badge>
            </div>
            <div className="card-body">
              <div className="flex-between mb16">
                <div>
                  <div className="text-xs mb8">Fecha límite</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{formatFecha(actividad.fecha_limite)}</div>
                </div>
                <div className="countdown">
                  <Clock className="icon-sm" />
                  {dias >= 0 ? `Faltan ${dias} día(s)` : `Venció hace ${Math.abs(dias)} día(s)`}
                </div>
              </div>

              <div className="section-lbl">Instrucciones</div>
              <div style={{ fontSize: 13, color: 'var(--gray-600)', lineHeight: 1.6 }}>
                {actividad.descripcion || 'Sin instrucciones adicionales.'}
              </div>

              {actividad.archivos.length > 0 && (
                <>
                  <div className="section-lbl mt16">Documentos del profesor</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {actividad.archivos.map((d) => (
                      <ArchivoLink
                        key={d.id_archivo_actividad}
                        tipo="actividad"
                        id={d.id_archivo_actividad}
                        nombre={d.nombre_archivo}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {equipo && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">Integrantes de tu equipo</span>
              </div>
              <div className="card-body" style={{ padding: 14 }}>
                {integrantes.map((it, i) => {
                  const est = estatusIntegrante(it.entrega)
                  const esTu = it.id_alumno === roster.mi_id_alumno
                  return (
                    <div key={it.id_alumno} className={`integrante-row${i < integrantes.length - 1 ? ' mb8' : ''}`}>
                      <div className="integrante-info">
                        <Avatar initials={iniciales(it)} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>
                            {nombreCompleto(it)} {esTu && <span style={{ color: 'var(--blue)', fontSize: 11 }}>(tú)</span>}
                          </div>
                          <div className="text-xs">{it.boleta}</div>
                        </div>
                      </div>
                      <Badge variant={est.variant}>{est.label}</Badge>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {miEntrega ? (
            <div className="card" style={{ border: '1.5px solid var(--green)' }}>
              <div className="card-header" style={{ background: '#F0FDF4' }}>
                <span className="card-title" style={{ color: 'var(--green)' }}>
                  <CheckCircle className="icon" style={{ color: 'var(--green)', marginRight: 6, verticalAlign: 'middle' }} />
                  Tu entrega
                </span>
                <Badge variant={miEntrega.estatus === 'Calificada' ? 'green' : 'yellow'}>
                  {miEntrega.estatus === 'Calificada' ? 'Calificada' : 'Entregado'}
                </Badge>
              </div>
              <div className="card-body">
                <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 13 }}>
                  <div>
                    <div className="text-xs mb8">Fecha de entrega</div>
                    <div style={{ fontWeight: 600 }}>{formatFecha(miEntrega.fecha_entrega)}</div>
                  </div>
                </div>
                {miEntrega.archivos.length > 0 ? (
                  miEntrega.archivos.map((a) => (
                    <div key={a.id_archivo_entrega} className="file-list-item">
                      <ArchivoLink tipo="entrega" id={a.id_archivo_entrega} nombre={a.nombre_archivo} />
                    </div>
                  ))
                ) : (
                  <div className="text-sm">Sin archivos adjuntos.</div>
                )}
                {miEntrega.comentario && (
                  <div style={{ marginTop: 12, fontSize: 13, color: 'var(--gray-600)' }}>
                    <div className="text-xs mb8">Tu comentario</div>
                    {miEntrega.comentario}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-header">
                <span className="card-title">Tu entrega</span>
              </div>
              <div className="card-body">
                {actividad.entrega_por_equipo ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: 'var(--blue-light)',
                      border: '1px solid var(--blue)',
                      borderRadius: 8,
                      padding: '8px 12px',
                      marginBottom: 12,
                      fontSize: 12,
                      color: 'var(--blue)',
                    }}
                  >
                    <Users className="icon-sm" />
                    Entrega por equipo — con que uno entregue, todos quedan como completados
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: 'var(--gray-100)',
                      border: '1px solid var(--gray-200)',
                      borderRadius: 8,
                      padding: '8px 12px',
                      marginBottom: 12,
                      fontSize: 12,
                      color: 'var(--gray-600)',
                    }}
                  >
                    <User className="icon-sm" />
                    Entrega individual — cada integrante sube su propio archivo
                  </div>
                )}

                <label className="dropzone" style={{ padding: 32, marginBottom: 12, cursor: 'pointer' }}>
                  <UploadCloud style={{ width: 36, height: 36, color: 'var(--blue)' }} />
                  <h3 style={{ fontSize: 14, marginTop: 10 }}>Arrastra tu archivo o haz clic</h3>
                  <p style={{ fontSize: 12, marginTop: 4 }}>.zip, .pdf, .py — máx. 20 MB</p>
                  <input type="file" multiple hidden onChange={handleArchivos} />
                </label>

                {archivos.map((a) => (
                  <div key={a.name} className="file-list-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FileText className="icon-sm" style={{ color: 'var(--blue)' }} />
                      <span>{a.name}</span>
                      <span className="text-xs">· {(a.size / 1024).toFixed(0)} KB</span>
                    </div>
                    <div className="action-btn action-del" role="button" tabIndex={0} onClick={() => quitarArchivo(a.name)}>
                      <X className="icon-sm" />
                    </div>
                  </div>
                ))}

                <div className="form-group">
                  <label className="form-label">Comentarios (opcional)</label>
                  <textarea
                    className="form-textarea"
                    style={{ minHeight: 80 }}
                    placeholder="Agrega comentarios o aclaraciones para tu profesor…"
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                  />
                </div>
                <button className="btn btn-primary w100" style={{ justifyContent: 'center', padding: 11 }} onClick={handleEnviar} disabled={enviando}>
                  {enviando ? <Loader2 className="icon-sm spin" /> : <Send className="icon-sm" />}
                  Enviar entrega
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  )
}
