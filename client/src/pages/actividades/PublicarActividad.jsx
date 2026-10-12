// Pantalla 15 — Publicar Actividad
// Rol: Profesor
// URL: /actividades/nueva (alta) y /actividades/:id/editar (edición)
// Descripción: Formulario de publicación de una nueva actividad dirigida a uno o varios
// equipos. El mismo formulario edita una actividad existente (Sesión 14): en ese modo la
// materia queda fija, los documentos adjuntos son de solo lectura y, si la actividad ya
// tiene entregas o calificaciones, tampoco se pueden cambiar su tipo, la modalidad de
// entrega ni el equipo destinatario (el servidor lo vuelve a validar y responde 409).

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Info, Calendar, Clock, UploadCloud, FileText, X, Send, Save, Users, User, Loader2, Lock } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import ArchivoLink from '../../components/ui/ArchivoLink'
import * as materiasService from '../../services/materias.service'
import * as equiposService from '../../services/equipos.service'
import * as actividadesService from '../../services/actividades.service'

const TIPOS = ['En clase', 'Practica', 'Tarea', 'Proyecto']
const TIPO_LABEL = { 'En clase': 'En clase', Practica: 'Práctica', Tarea: 'Tarea', Proyecto: 'Proyecto' }

// Sugerencias para el tipo de actividad a evaluar; el campo es de texto libre (máx. 60).
const SUGERENCIAS_EVALUACION = ['Ejercicio', 'Mapa mental', 'Cuestionario', 'Reporte', 'Exposición', 'Otro']
const MAX_TIPO_EVALUACION = 60

// 'Practica' y 'Tarea' comparten integrantes; 'En clase' se asigna a los mismos equipos
// que 'Tarea' (ver CLAUDE.md — reglas críticas de negocio).
function tipoEquipoParaActividad(tipo) {
  if (tipo === 'Proyecto') return 'Proyecto'
  if (tipo === 'Practica') return 'Practica'
  return 'Tarea'
}

export default function PublicarActividad() {
  const navigate = useNavigate()
  const { id } = useParams()
  const esEdicion = Boolean(id)
  const [searchParams, setSearchParams] = useSearchParams()

  // En edición la materia es la de la actividad y no se puede cambiar.
  const [original, setOriginal] = useState(null)
  const [cargando, setCargando] = useState(esEdicion)
  const claveMateria = esEdicion ? original?.materia_clave ?? '' : searchParams.get('materia') ?? ''
  // Con entregas o calificaciones, tipo, modalidad de entrega y destino quedan fijos.
  const estructuraBloqueada = esEdicion && Boolean(original?.tiene_entregas)

  const [materias, setMaterias] = useState([])
  const [equipos, setEquipos] = useState([])

  const [titulo, setTitulo] = useState('')
  const [tipo, setTipo] = useState('Practica')
  const [tipoEvaluacion, setTipoEvaluacion] = useState('')
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
    if (esEdicion) return
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

  // Modo edición: carga la actividad y llena el formulario. Las fechas llegan del servidor
  // como "AAAA-MM-DD HH:MM:SS" (hora local del servidor) y se parten sin pasar por Date
  // para no desplazarlas por zona horaria.
  useEffect(() => {
    if (!esEdicion) return
    setCargando(true)
    actividadesService
      .obtenerActividad(id)
      .then((act) => {
        setOriginal(act)
        setTitulo(act.titulo)
        setTipo(act.tipo)
        setTipoEvaluacion(act.tipo_evaluacion ?? '')
        setDescripcion(act.descripcion ?? '')
        setFechaLimite(String(act.fecha_limite).slice(0, 10))
        setHoraLimite(String(act.fecha_limite).slice(11, 16))
        setProgramar(Boolean(act.programada))
        if (act.fecha_publicacion) {
          setFechaPublicacion(String(act.fecha_publicacion).slice(0, 10))
          setHoraPublicacion(String(act.fecha_publicacion).slice(11, 16))
        }
        setTodosEquipos(Boolean(act.todos_los_equipos))
        setEquipoSeleccionado(act.id_equipo ? String(act.id_equipo) : '')
        setEntregaTipo(act.entrega_por_equipo ? 'equipo' : 'individual')
        setError('')
      })
      .catch((err) => setError(err.response?.data?.error || 'No se pudo cargar la actividad'))
      .finally(() => setCargando(false))
  }, [esEdicion, id])

  useEffect(() => {
    if (!claveMateria) return
    equiposService
      .listarEquipos(claveMateria)
      .then((data) => setEquipos(data.equipos))
      .catch(() => setEquipos([]))
  }, [claveMateria])

  const materiaActual = esEdicion
    ? original && { id_materia: original.id_materia, clave: original.materia_clave }
    : materias.find((m) => m.clave === claveMateria)

  const equiposDelTipo = useMemo(() => {
    const tipoEquipo = tipoEquipoParaActividad(tipo)
    return equipos.filter((eq) => eq.tipo === tipoEquipo)
  }, [equipos, tipo])

  // El equipo específico elegido deja de ser válido al cambiar de tipo o de materia.
  function handleTipo(t) {
    if (estructuraBloqueada || t === tipo) return
    setTipo(t)
    setEquipoSeleccionado('')
  }

  function handleMateria(clave) {
    setSearchParams({ materia: clave })
    setEquipoSeleccionado('')
  }

  function handleTodosEquipos(valor) {
    if (!estructuraBloqueada) setTodosEquipos(valor)
  }

  function handleEntregaTipo(valor) {
    if (!estructuraBloqueada) setEntregaTipo(valor)
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
    if (tipoEvaluacion.trim().length > MAX_TIPO_EVALUACION) {
      setError(`El tipo de evaluación admite máximo ${MAX_TIPO_EVALUACION} caracteres`)
      return
    }

    if (esEdicion) {
      const payload = {
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        tipo_evaluacion: tipoEvaluacion.trim(),
        fecha_limite: `${fechaLimite}T${horaLimite}:00`,
        programada: programar,
      }
      if (programar) {
        payload.fecha_publicacion = `${fechaPublicacion}T${horaPublicacion}:00`
      }
      // Si la estructura está bloqueada no se envía: el servidor conserva los valores actuales.
      if (!estructuraBloqueada) {
        payload.tipo = tipo
        payload.entrega_por_equipo = entregaTipo === 'equipo'
        payload.todos_los_equipos = todosEquipos
        if (!todosEquipos) payload.id_equipo = Number(equipoSeleccionado)
      }

      setGuardando(true)
      try {
        await actividadesService.actualizarActividad(id, payload)
        navigate(`/actividades/${id}`)
      } catch (err) {
        const detalle = err.response?.data?.errores?.[0]
        setError(detalle || err.response?.data?.error || 'No se pudo guardar la actividad')
      } finally {
        setGuardando(false)
      }
      return
    }

    const formData = new FormData()
    formData.append('id_materia', materiaActual.id_materia)
    formData.append('titulo', titulo.trim())
    formData.append('descripcion', descripcion.trim())
    formData.append('tipo', tipo)
    formData.append('tipo_evaluacion', tipoEvaluacion.trim())
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

  const volver = () => navigate(esEdicion ? `/actividades/${id}` : '/actividades')
  const botonCancelar = (
    <button className="btn btn-secondary btn-sm" onClick={volver}>
      <ArrowLeft className="icon-sm" />
      Cancelar
    </button>
  )

  if (cargando) {
    return (
      <PageWrapper title="Editar Actividad" actions={botonCancelar}>
        <div style={{ padding: 48, textAlign: 'center' }}>
          <Loader2 className="icon-xl spin" style={{ color: 'var(--blue)' }} />
        </div>
      </PageWrapper>
    )
  }

  if (esEdicion && !original) {
    return (
      <PageWrapper title="Editar Actividad" actions={botonCancelar}>
        <div className="login-error">{error || 'Actividad no encontrada'}</div>
      </PageWrapper>
    )
  }

  const estiloBloqueado = estructuraBloqueada ? { opacity: 0.55, cursor: 'not-allowed' } : undefined

  return (
    <PageWrapper title={esEdicion ? 'Editar Actividad' : 'Publicar Nueva Actividad'} actions={botonCancelar}>
      {estructuraBloqueada && (
        <div className="credenciales-aviso" style={{ marginBottom: 16 }}>
          <Lock className="icon-sm" />
          <div>
            <strong>Esta actividad ya tiene entregas o calificaciones.</strong> Puedes cambiar el título, las
            instrucciones, el tipo de evaluación y las fechas, pero no el tipo de actividad, el tipo de entrega ni el
            equipo destinatario.
          </div>
        </div>
      )}
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
                      aria-disabled={estructuraBloqueada}
                      style={tipo === t ? undefined : estiloBloqueado}
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
                <label className="form-label" htmlFor="tipo-evaluacion">
                  Tipo de evaluación <span style={{ fontWeight: 400, color: 'var(--gray-400)' }}>(opcional)</span>
                </label>
                <input
                  id="tipo-evaluacion"
                  className="form-control"
                  list="sugerencias-tipo-evaluacion"
                  maxLength={MAX_TIPO_EVALUACION}
                  placeholder="Ejercicio, Mapa mental, Cuestionario…"
                  value={tipoEvaluacion}
                  onChange={(e) => setTipoEvaluacion(e.target.value)}
                />
                <datalist id="sugerencias-tipo-evaluacion">
                  {SUGERENCIAS_EVALUACION.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
                <div className="text-xs" style={{ marginTop: 6 }}>
                  Qué se va a evaluar. Elige una sugerencia o escribe la tuya (máx. {MAX_TIPO_EVALUACION} caracteres).
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
                    onClick={() => handleEntregaTipo('individual')}
                    aria-disabled={estructuraBloqueada}
                    style={entregaTipo === 'individual' ? undefined : estiloBloqueado}
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
                    onClick={() => handleEntregaTipo('equipo')}
                    aria-disabled={estructuraBloqueada}
                    style={entregaTipo === 'equipo' ? undefined : estiloBloqueado}
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
                {esEdicion ? (
                  <input
                    id="materia"
                    className="form-control"
                    disabled
                    value={`${original.materia_clave} — ${original.materia_nombre} · ${original.materia_grupo}`}
                  />
                ) : (
                  <select
                    id="materia"
                    className="form-control"
                    value={claveMateria}
                    onChange={(e) => handleMateria(e.target.value)}
                  >
                    {materias.map((m) => (
                      <option key={m.id_materia} value={m.clave}>
                        {m.clave} — {m.nombre} · {m.grupo}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Equipos destinatarios</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => handleTodosEquipos(true)}
                    aria-disabled={estructuraBloqueada}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 12px',
                      border: todosEquipos ? '1.5px solid var(--blue)' : '1px solid var(--gray-200)',
                      borderRadius: 8,
                      background: todosEquipos ? 'var(--blue-light)' : 'white',
                      ...(todosEquipos ? {} : estiloBloqueado),
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
                    onClick={() => handleTodosEquipos(false)}
                    aria-disabled={estructuraBloqueada}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 12px',
                      border: !todosEquipos ? '1.5px solid var(--blue)' : '1px solid var(--gray-200)',
                      borderRadius: 8,
                      background: !todosEquipos ? 'var(--blue-light)' : 'white',
                      ...(!todosEquipos ? {} : estiloBloqueado),
                    }}
                  >
                    <input type="checkbox" checked={!todosEquipos} readOnly style={{ accentColor: 'var(--blue)' }} />
                    <span style={{ fontSize: 13, color: 'var(--gray-600)' }}>Un equipo específico</span>
                  </div>
                  {!todosEquipos && (
                    <select
                      className="form-control"
                      value={equipoSeleccionado}
                      disabled={estructuraBloqueada}
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
              {!esEdicion && <span className="text-xs">Opcional</span>}
            </div>
            <div className="card-body">
              {esEdicion ? (
                <>
                  {original.archivos.length === 0 ? (
                    <div className="text-sm">Sin documentos adjuntos.</div>
                  ) : (
                    original.archivos.map((doc) => (
                      <ArchivoLink
                        key={doc.id_archivo_actividad}
                        tipo="actividad"
                        id={doc.id_archivo_actividad}
                        nombre={doc.nombre_archivo}
                      />
                    ))
                  )}
                  <div className="text-xs" style={{ marginTop: 10 }}>
                    Los documentos adjuntos no se pueden agregar ni quitar al editar la actividad.
                  </div>
                </>
              ) : (
                <label className="dropzone" style={{ padding: 24, marginBottom: 12, cursor: 'pointer' }}>
                  <UploadCloud style={{ width: 32, height: 32, color: 'var(--blue)' }} />
                  <h3 style={{ fontSize: 13, marginTop: 8 }}>Arrastra archivos aquí o haz clic</h3>
                  <p style={{ fontSize: 12 }}>.pdf, .doc(x), .ppt(x), .zip, .png, .jpg</p>
                  <input type="file" multiple hidden onChange={handleArchivos} />
                </label>
              )}
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
              {guardando ? (
                <Loader2 className="icon-sm spin" />
              ) : esEdicion ? (
                <Save className="icon-sm" />
              ) : (
                <Send className="icon-sm" />
              )}
              {esEdicion ? 'Guardar cambios' : programar ? 'Programar publicación' : 'Publicar ahora'}
            </button>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
