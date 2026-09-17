// Pantalla 18 — Tablón de Avisos
// Rol: Profesor
// URL: /tablon
// Descripción: Publicación de avisos dirigidos a una materia o a todas las materias ACTIVAS
// del profesor (selector "Todas mis materias" → id_materia = NULL en el backend).

import { useEffect, useState } from 'react'
import { Plus, Paperclip, FileText, X, Megaphone, Loader2 } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import { useAuth } from '../../hooks/useAuth'
import * as materiasService from '../../services/materias.service'
import * as avisosService from '../../services/avisos.service'

function iniciales(persona) {
  return `${persona?.nombre?.[0] ?? ''}${persona?.apellido_paterno?.[0] ?? ''}`.toUpperCase()
}

function formatFecha(fecha) {
  if (!fecha) return ''
  return new Date(fecha).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function TablonProfesor() {
  const { user } = useAuth()

  const [materias, setMaterias] = useState([])
  const [avisos, setAvisos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [titulo, setTitulo] = useState('')
  const [contenido, setContenido] = useState('')
  const [idMateria, setIdMateria] = useState('todas')
  const [archivos, setArchivos] = useState([])
  const [publicando, setPublicando] = useState(false)

  function cargarAvisos() {
    setLoading(true)
    return avisosService
      .listarAvisos()
      .then((data) => {
        setAvisos(data)
        setError('')
      })
      .catch((err) => setError(err.response?.data?.error || 'No se pudieron cargar los avisos'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    materiasService
      .listarMaterias()
      .then((data) => setMaterias(data.filter((m) => m.estatus !== 'Cerrada')))
      .catch(() => setMaterias([]))
    cargarAvisos()
  }, [])

  function handleArchivos(e) {
    const nuevos = Array.from(e.target.files ?? [])
    setArchivos((prev) => [...prev, ...nuevos])
    e.target.value = ''
  }

  function quitarArchivo(nombre) {
    setArchivos((prev) => prev.filter((f) => f.name !== nombre))
  }

  async function handlePublicar() {
    setError('')

    if (!titulo.trim()) {
      setError('El título del aviso es requerido')
      return
    }
    if (!contenido.trim()) {
      setError('El mensaje del aviso es requerido')
      return
    }

    const formData = new FormData()
    formData.append('titulo', titulo.trim())
    formData.append('contenido', contenido.trim())
    if (idMateria !== 'todas') {
      formData.append('id_materia', idMateria)
    }
    archivos.forEach((archivo) => formData.append('archivos', archivo))

    setPublicando(true)
    try {
      await avisosService.crearAviso(formData)
      setTitulo('')
      setContenido('')
      setIdMateria('todas')
      setArchivos([])
      await cargarAvisos()
    } catch (err) {
      const detalle = err.response?.data?.errores?.[0]
      setError(detalle || err.response?.data?.error || 'No se pudo publicar el aviso')
    } finally {
      setPublicando(false)
    }
  }

  return (
    <PageWrapper title="Tablón de Avisos" actions={<div className="topbar-semester">2026/1</div>}>
      <div className="two-col">
        <div className="card" style={{ height: 'fit-content' }}>
          <div className="card-header">
            <span className="card-title">
              <Plus className="icon" style={{ verticalAlign: 'middle', marginRight: 6, color: 'var(--blue)' }} />
              Nuevo aviso
            </span>
          </div>
          <div className="card-body">
            {error && (
              <div className="login-error" style={{ marginBottom: 12 }}>
                {error}
              </div>
            )}
            <div className="form-group">
              <label className="form-label" htmlFor="titulo-aviso">
                Título del aviso
              </label>
              <input
                id="titulo-aviso"
                className="form-control"
                placeholder="Recordatorio: Examen parcial semana 14"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="contenido-aviso">
                Mensaje
              </label>
              <textarea
                id="contenido-aviso"
                className="form-textarea"
                placeholder="Escribe el contenido del aviso…"
                value={contenido}
                onChange={(e) => setContenido(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="dirigido-a">
                Dirigido a
              </label>
              <select id="dirigido-a" className="form-control" value={idMateria} onChange={(e) => setIdMateria(e.target.value)}>
                <option value="todas">Todas mis materias</option>
                {materias.map((m) => (
                  <option key={m.id_materia} value={m.id_materia}>
                    {m.clave} — {m.nombre} · {m.grupo}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Adjuntar documentos</label>
              <label className="dropzone" style={{ padding: 20, marginBottom: 8, cursor: 'pointer' }}>
                <Paperclip style={{ width: 28, height: 28, color: 'var(--blue)' }} />
                <p style={{ marginTop: 8, fontSize: 12 }}>Arrastra archivos o haz clic</p>
                <input type="file" multiple hidden onChange={handleArchivos} />
              </label>
              {archivos.map((a) => (
                <div key={a.name} className="file-list-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText className="icon-sm" style={{ color: 'var(--blue)' }} />
                    <span>{a.name}</span>
                  </div>
                  <div className="action-btn action-del" role="button" tabIndex={0} onClick={() => quitarArchivo(a.name)}>
                    <X className="icon-sm" />
                  </div>
                </div>
              ))}
            </div>
            <button className="btn btn-primary w100" style={{ justifyContent: 'center' }} onClick={handlePublicar} disabled={publicando}>
              {publicando ? <Loader2 className="icon-sm spin" /> : <Megaphone className="icon-sm" />}
              Publicar aviso
            </button>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 14 }}>
            Avisos publicados ({avisos.length})
          </div>
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <Loader2 className="icon-xl spin" style={{ color: 'var(--blue)' }} />
            </div>
          ) : avisos.length === 0 ? (
            <div className="card">
              <div style={{ padding: '32px 24px', textAlign: 'center', fontSize: 13, color: 'var(--gray-600)' }}>Aún no has publicado avisos</div>
            </div>
          ) : (
            avisos.map((av) => (
              <div key={av.id_aviso} className="notice-card">
                <div className="notice-header">
                  <div className="notice-avatar">{iniciales(user)}</div>
                  <div className="notice-meta">
                    <strong>{av.titulo}</strong>
                    <span>
                      {av.id_materia ? `${av.materia_clave} — ${av.materia_nombre}` : 'Todas mis materias'} · {formatFecha(av.fecha_publicacion)}
                    </span>
                  </div>
                </div>
                <div className="notice-body">{av.contenido}</div>
                {av.archivos.length > 0 && (
                  <div className="tag-row" style={{ marginBottom: 10 }}>
                    {av.archivos.map((archivo) => (
                      <span key={archivo.id_archivo_aviso} className="file-chip">
                        <FileText className="icon-sm" />
                        {archivo.nombre_archivo}
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className={`badge badge-${av.id_materia ? 'blue' : 'navy'}`}>
                    {av.id_materia ? av.materia_clave : 'Todas mis materias'}
                  </span>
                  <span className="text-xs">{av.total_notificados} alumnos notificados</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </PageWrapper>
  )
}
