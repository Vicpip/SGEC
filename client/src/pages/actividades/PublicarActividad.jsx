// Pantalla 15 — Publicar Actividad
// Rol: Profesor
// URL: /actividades/nueva
// Descripción: Formulario de publicación de una nueva actividad dirigida a uno o varios equipos.

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Info, Calendar, Clock, UploadCloud, FileText, X, Send, Users, User, Loader2 } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import * as materiasService from '../../services/materias.service'
import * as equiposService from '../../services/equipos.service'
import * as actividadesService from '../../services/actividades.service'

const TIPOS = ['En clase', 'Practica', 'Tarea', 'Proyecto']
const TIPO_LABEL = { 'En clase': 'En clase', Practica: 'Práctica', Tarea: 'Tarea', Proyecto: 'Proyecto' }

// 'Practica' y 'Tarea' comparten integrantes; 'En clase' se asigna a los mismos equipos
// que 'Tarea' (ver CLAUDE.md — reglas críticas de negocio).
function tipoEquipoParaActividad(tipo) {
  if (tipo === 'Proyecto') return 'Proyecto'
  if (tipo === 'Practica') return 'Practica'
  return 'Tarea'
}

export default function PublicarActividad() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const claveMateria = searchParams.get('materia') ?? ''

  const [materias, setMaterias] = useState([])
  const [equipos, setEquipos] = useState([])

  const [titulo, setTitulo] = useState('')
  const [tipo, setTipo] = useState('Practica')
  const [descripcion, setDescripcion] = useState('')
  const [fechaLimite, setFechaLimite] = useState('')
  const [horaLimite, setHoraLimite] = useState('23:59')
  const [programar, setProgramar] = useState(false)
  const [fechaPublicacion, setFechaPublicacion] = useState('')
  const [horaPublicacion, setHoraPublicacion] = useState('00:00')
  const [todosEquipos, setTodosEquipos] = useState(true)
  const [equipoSeleccionado, setEquipoSeleccionado] = useState('')
  const [entregaTipo, setEntregaTipo] = useState('individual')
  const [archivos, setArchivos] = useState([])

  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    materiasService
      .listarMaterias()
      .then((data) => {
        setMaterias(data)
        if (!claveMateria && data[0]) {
          setSearchParams({ materia: data[0].clave }, { replace: true })
        }
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!claveMateria) return
    equiposService
      .listarEquipos(claveMateria)
      .then((data) => setEquipos(data.equipos))
      .catch(() => setEquipos([]))
  }, [claveMateria])

  const materiaActual = materias.find((m) => m.clave === claveMateria)

  const equiposDelTipo = useMemo(() => {
    const tipoEquipo = tipoEquipoParaActividad(tipo)
    return equipos.filter((eq) => eq.tipo === tipoEquipo)
  }, [equipos, tipo])

  useEffect(() => {
    setEquipoSeleccionado('')
  }, [tipo, claveMateria])

  function handleTipo(t) {
    setTipo(t)
  }

  function handleArchivos(e) {
    const nuevos = Array.from(e.target.files ?? [])
    setArchivos((prev) => [...prev, ...nuevos])
    e.target.value = ''
  }

  function quitarArchivo(nombre) {
    setArchivos((prev) => prev.filter((f) => f.name !== nombre))
  }

  async function handleSubmit() {
    setError('')

    if (!materiaActual) {
      setError('Selecciona una materia')
      return
    }
    if (!titulo.trim()) {
      setError('El título de la actividad es requerido')
      return
    }
    if (!fechaLimite) {
      setError('La fecha límite de entrega es requerida')
      return
    }
    if (!todosEquipos && !equipoSeleccionado) {
      setError('Selecciona el equipo destinatario o marca "Todos los equipos"')
      return
    }
    if (programar && !fechaPublicacion) {
      setError('La fecha de publicación es requerida cuando programas la actividad')
      return
    }

    const formData = new FormData()
    formData.append('id_materia', materiaActual.id_materia)
    formData.append('titulo', titulo.trim())
    formData.append('descripcion', descripcion.trim())
    formData.append('tipo', tipo)
    formData.append('fecha_limite', `${fechaLimite}T${horaLimite}:00`)
    formData.append('todos_los_equipos', todosEquipos)
    if (!todosEquipos) {
      formData.append('id_equipo', equipoSeleccionado)
    }
    formData.append('entrega_por_equipo', entregaTipo === 'equipo')
    formData.append('programada', programar)
    if (programar) {
      formData.append('fecha_publicacion', `${fechaPublicacion}T${horaPublicacion}:00`)
    }
    archivos.forEach((archivo) => formData.append('archivos', archivo))

    setGuardando(true)
    try {
      await actividadesService.crearActividad(formData)
      navigate(`/actividades?materia=${claveMateria}`)
    } catch (err) {
      const detalle = err.response?.data?.errores?.[0]
      setError(detalle || err.response?.data?.error || 'No se pudo publicar la actividad')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <PageWrapper
      title="Publicar Nueva Actividad"
      actions={
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/actividades')}>
          <ArrowLeft className="icon-sm" />
          Cancelar
        </button>
      }
    >
      <div className="two-col">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Datos de la actividad</span>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label" htmlFor="titulo">
                  Título de la actividad
                </label>
                <input
                  id="titulo"
                  className="form-control"
                  placeholder="Práctica 5 — Lenguajes Regulares y Expresiones"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tipo de actividad</label>
                <div className="type-pill-grid">
                  {TIPOS.map((t) => (
                    <div
                      key={t}
                      className={`type-pill${tipo === t ? ' active' : ''}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleTipo(t)}
                    >
                      {TIPO_LABEL[t]}
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 8, padding: '8px 10px', background: '#F0FDF4', borderRadius: 8, fontSize: 11.5, color: 'var(--green)' }}>
                  <Info className="icon-sm" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                  "En clase" y "Tarea" comparten los mismos equipos asignados.
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="descripcion">
                  Instrucciones
                </label>
                <textarea
                  id="descripcion"
                  className="form-textarea"
                  placeholder="Describe la actividad, criterios de entrega, etc."
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="fecha-limite">
                    Fecha límite de entrega
                  </label>
                  <div className="form-control" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Calendar className="icon-sm" style={{ color: 'var(--gray-400)' }} />
                    <input
                      id="fecha-limite"
                      type="date"
                      style={{ border: 'none', outline: 'none', fontSize: 13, width: '100%' }}
                      value={fechaLimite}
                      onChange={(e) => setFechaLimite(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="hora-limite">
                    Hora límite
                  </label>
                  <div className="form-control" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Clock className="icon-sm" style={{ color: 'var(--gray-400)' }} />
                    <input
                      id="hora-limite"
                      type="time"
                      style={{ border: 'none', outline: 'none', fontSize: 13, width: '100%' }}
                      value={horaLimite}
                      onChange={(e) => setHoraLimite(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div style={{ padding: 14, background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 12, marginBottom: 0 }}>
                <div className="flex-between mb12">
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-800)' }}>Programar para después</div>
                    <div className="text-xs">La actividad se publicará automáticamente en la fecha indicada</div>
                  </div>
                  <div
                    className={`toggle${programar ? '' : ' off'}`}
                    role="switch"
                    aria-checked={programar}
                    tabIndex={0}
                    onClick={() => setProgramar((v) => !v)}
                  />
                </div>
                <div className="form-row" style={{ opacity: programar ? 1 : 0.4 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="fecha-publicacion">
                      Fecha de publicación
                    </label>
                    <div className="form-control" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Calendar className="icon-sm" style={{ color: 'var(--gray-400)' }} />
                      <input
                        id="fecha-publicacion"
                        type="date"
                        disabled={!programar}
                        style={{ border: 'none', outline: 'none', fontSize: 13, width: '100%' }}
                        value={fechaPublicacion}
                        onChange={(e) => setFechaPublicacion(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="hora-publicacion">
                      Hora de publicación
                    </label>
                    <div className="form-control" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Clock className="icon-sm" style={{ color: 'var(--gray-400)' }} />
                      <input
                        id="hora-publicacion"
                        type="time"
                        disabled={!programar}
                        style={{ border: 'none', outline: 'none', fontSize: 13, width: '100%' }}
                        value={horaPublicacion}
                        onChange={(e) => setHoraPublicacion(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0, marginTop: 18 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Users className="icon-sm" />
                  Tipo de entrega
                </label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setEntregaTipo('individual')}
                    className={`entrega-tipo-option${entregaTipo === 'individual' ? ' active' : ''}`}
                  >
                    <User className="icon-sm" style={{ color: entregaTipo === 'individual' ? 'var(--blue)' : 'var(--gray-400)' }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>Individual</div>
                      <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>Cada integrante debe entregar por separado</div>
                    </div>
                  </div>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setEntregaTipo('equipo')}
                    className={`entrega-tipo-option${entregaTipo === 'equipo' ? ' active' : ''}`}
                  >
                    <Users className="icon-sm" style={{ color: entregaTipo === 'equipo' ? 'var(--blue)' : 'var(--gray-400)' }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>Por equipo</div>
                      <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>Con una entrega se marca completo para todos</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Destinatarios</span>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label" htmlFor="materia">
                  Materia
                </label>
                <select
                  id="materia"
                  className="form-control"
                  value={claveMateria}
                  onChange={(e) => setSearchParams({ materia: e.target.value })}
                >
                  {materias.map((m) => (
                    <option key={m.id_materia} value={m.clave}>
                      {m.clave} — {m.nombre} · {m.grupo}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Equipos destinatarios</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setTodosEquipos(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 12px',
                      border: todosEquipos ? '1.5px solid var(--blue)' : '1px solid var(--gray-200)',
                      borderRadius: 8,
                      background: todosEquipos ? 'var(--blue-light)' : 'white',
                    }}
                  >
                    <input type="checkbox" checked={todosEquipos} readOnly style={{ accentColor: 'var(--blue)' }} />
                    <span style={{ fontSize: 13, color: todosEquipos ? 'var(--navy)' : 'var(--gray-600)', fontWeight: todosEquipos ? 500 : 400 }}>
                      Todos los equipos de {TIPO_LABEL[tipoEquipoParaActividad(tipo)]} ({equiposDelTipo.length})
                    </span>
                  </div>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setTodosEquipos(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 12px',
                      border: !todosEquipos ? '1.5px solid var(--blue)' : '1px solid var(--gray-200)',
                      borderRadius: 8,
                      background: !todosEquipos ? 'var(--blue-light)' : 'white',
                    }}
                  >
                    <input type="checkbox" checked={!todosEquipos} readOnly style={{ accentColor: 'var(--blue)' }} />
                    <span style={{ fontSize: 13, color: 'var(--gray-600)' }}>Un equipo específico</span>
                  </div>
                  {!todosEquipos && (
                    <select
                      className="form-control"
                      value={equipoSeleccionado}
                      onChange={(e) => setEquipoSeleccionado(e.target.value)}
                    >
                      <option value="">Selecciona un equipo…</option>
                      {equiposDelTipo.map((eq) => (
                        <option key={eq.id_equipo} value={eq.id_equipo}>
                          {eq.nombre}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">Documentos de referencia</span>
              <span className="text-xs">Opcional</span>
            </div>
            <div className="card-body">
              <label className="dropzone" style={{ padding: 24, marginBottom: 12, cursor: 'pointer' }}>
                <UploadCloud style={{ width: 32, height: 32, color: 'var(--blue)' }} />
                <h3 style={{ fontSize: 13, marginTop: 8 }}>Arrastra archivos aquí o haz clic</h3>
                <p style={{ fontSize: 12 }}>.pdf, .doc(x), .ppt(x), .zip, .png, .jpg</p>
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
            </div>
          </div>

          {error && (
            <div className="login-error">{error}</div>
          )}

          <div className="form-actions">
            <button className="btn btn-primary" onClick={handleSubmit} disabled={guardando}>
              {guardando ? <Loader2 className="icon-sm spin" /> : <Send className="icon-sm" />}
              {programar ? 'Programar publicación' : 'Publicar ahora'}
            </button>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
