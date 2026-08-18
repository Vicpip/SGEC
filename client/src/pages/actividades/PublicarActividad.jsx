// Pantalla 15 — Publicar Actividad
// Rol: Profesor
// URL: /actividades/nueva
// Descripción: Formulario de publicación de una nueva actividad dirigida a uno o varios equipos.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Info, Calendar, Clock, UploadCloud, FileText, Archive, X, Send, Users, User } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'

const TIPOS = ['En clase', 'Tarea', 'Práctica', 'Proyecto']

const EQUIPOS = ['Equipo Alfa', 'Equipo Beta', 'Equipo Gamma']

const ARCHIVOS = [
  { icon: FileText, nombre: 'guia_practica5_AFD.pdf', tamano: '340 KB' },
  { icon: Archive, nombre: 'plantilla_codigo_python.zip', tamano: '12 KB' },
]

export default function PublicarActividad() {
  const navigate = useNavigate()
  const [tipo, setTipo] = useState('Práctica')
  const [programar, setProgramar] = useState(false)
  const [todosEquipos, setTodosEquipos] = useState(true)
  const [equiposSeleccionados, setEquiposSeleccionados] = useState([])
  const [entregaTipo, setEntregaTipo] = useState('individual')

  function toggleEquipo(nombre) {
    setEquiposSeleccionados((prev) => (prev.includes(nombre) ? prev.filter((e) => e !== nombre) : [...prev, nombre]))
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
                <label className="form-label">Título de la actividad</label>
                <div className="form-control focused">Práctica 5 — Lenguajes Regulares y Expresiones</div>
              </div>

              <div className="form-group">
                <label className="form-label">Tipo de actividad</label>
                <div className="type-pill-grid">
                  {TIPOS.map((t) => (
                    <div key={t} className={`type-pill${tipo === t ? ' active' : ''}`} role="button" tabIndex={0} onClick={() => setTipo(t)}>
                      {t}
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 8, padding: '8px 10px', background: '#F0FDF4', borderRadius: 8, fontSize: 11.5, color: 'var(--green)' }}>
                  <Info className="icon-sm" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                  "En clase" y "Tarea" comparten los mismos equipos asignados.
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Instrucciones</label>
                <div className="form-textarea">
                  Implementar un autómata finito determinista (AFD) que reconozca el lenguaje L = {'{'}w ∈ {'{'}0,1{'}'}* | w termina en 01{'}'}.
                  Deben entregar el diagrama de estados, la tabla de transiciones y el código fuente en Python con pruebas unitarias para al menos 10
                  cadenas de prueba.
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Fecha límite de entrega</label>
                  <div className="form-control" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Calendar className="icon-sm" style={{ color: 'var(--gray-400)' }} />
                    <span style={{ fontSize: 13 }}>25 de abril de 2026</span>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Hora límite</label>
                  <div className="form-control" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Clock className="icon-sm" style={{ color: 'var(--gray-400)' }} />
                    <span style={{ fontSize: 13 }}>23:59</span>
                  </div>
                </div>
              </div>

              <div style={{ padding: 14, background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 12, marginBottom: 0 }}>
                <div className="flex-between mb12">
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-800)' }}>Programar para después</div>
                    <div className="text-xs">La actividad se publicará automáticamente en la fecha indicada</div>
                  </div>
                  <div className={`toggle${programar ? '' : ' off'}`} role="switch" aria-checked={programar} tabIndex={0} onClick={() => setProgramar((v) => !v)} />
                </div>
                <div className="form-row" style={{ opacity: programar ? 1 : 0.4 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Fecha de publicación</label>
                    <div className="form-control" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Calendar className="icon-sm" style={{ color: 'var(--gray-400)' }} />
                      <span style={{ fontSize: 13, color: 'var(--gray-400)' }}>Seleccionar fecha…</span>
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Hora de publicación</label>
                    <div className="form-control" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Clock className="icon-sm" style={{ color: 'var(--gray-400)' }} />
                      <span style={{ fontSize: 13, color: 'var(--gray-400)' }}>Seleccionar hora…</span>
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
                <label className="form-label">Materia</label>
                <select className="form-control">
                  <option>Teoría de la Computación — 4BM1</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Equipos destinatarios</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setTodosEquipos((v) => !v)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 12px',
                      border: '1.5px solid var(--blue)',
                      borderRadius: 8,
                      background: 'var(--blue-light)',
                    }}
                  >
                    <input type="checkbox" checked={todosEquipos} readOnly style={{ accentColor: 'var(--blue)' }} />
                    <span style={{ fontSize: 13, color: 'var(--navy)', fontWeight: 500 }}>Todos los equipos de Práctica (3)</span>
                  </div>
                  {EQUIPOS.map((eq) => (
                    <div
                      key={eq}
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleEquipo(eq)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: '1px solid var(--gray-200)', borderRadius: 8, background: 'white' }}
                    >
                      <input type="checkbox" checked={equiposSeleccionados.includes(eq)} readOnly />
                      <span style={{ fontSize: 13, color: 'var(--gray-600)' }}>{eq}</span>
                    </div>
                  ))}
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
              <div className="dropzone" style={{ padding: 24, marginBottom: 12 }}>
                <UploadCloud style={{ width: 32, height: 32, color: 'var(--blue)' }} />
                <h3 style={{ fontSize: 13, marginTop: 8 }}>Arrastra archivos aquí</h3>
                <p style={{ fontSize: 12 }}>.pdf, .docx, .pptx, .zip</p>
              </div>
              {ARCHIVOS.map((a) => (
                <div key={a.nombre} className="file-list-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <a.icon className="icon-sm" style={{ color: 'var(--blue)' }} />
                    <span>{a.nombre}</span>
                    <span className="text-xs">· {a.tamano}</span>
                  </div>
                  <div className="action-btn action-del">
                    <X className="icon-sm" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary">
              <Clock className="icon-sm" />
              Programar publicación
            </button>
            <button className="btn btn-primary">
              <Send className="icon-sm" />
              Publicar ahora
            </button>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
