// Pantalla 19 — Tablón de Avisos
// Rol: Alumno
// URL: /alumno/tablon
// Descripción: Lista de avisos publicados por los profesores del alumno (de las materias en
// las que está inscrito, más los avisos globales de esos profesores), con filtro de leídos/no
// leídos. Al abrir un aviso sin leer, se marca automáticamente como leído.

import { useEffect, useMemo, useState } from 'react'
import { Download, Loader2, Megaphone } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import ArchivoLink from '../../components/ui/ArchivoLink'
import * as avisosService from '../../services/avisos.service'

function formatFecha(fecha) {
  if (!fecha) return ''
  return new Date(fecha).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function nombreProfesor(av) {
  return `${av.profesor_nombre} ${av.profesor_apellido_paterno}`.trim()
}

export default function TablonAlumno() {
  const [avisos, setAvisos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filtroMateria, setFiltroMateria] = useState('todas')
  const [filtroLectura, setFiltroLectura] = useState('todos')

  useEffect(() => {
    avisosService
      .listarAvisos()
      .then((data) => {
        setAvisos(data)
        setError('')
      })
      .catch((err) => {
        setError(err.response?.data?.error || 'No se pudieron cargar tus avisos')
        setAvisos([])
      })
      .finally(() => setLoading(false))
  }, [])

  const materiasDisponibles = useMemo(() => {
    const mapa = new Map()
    avisos.forEach((av) => {
      if (av.materia_clave) mapa.set(av.materia_clave, av.materia_nombre)
    })
    return [...mapa.entries()]
  }, [avisos])

  const sinLeer = avisos.filter((av) => !av.leido).length

  const avisosFiltrados = useMemo(() => {
    return avisos.filter((av) => {
      if (filtroMateria !== 'todas' && av.materia_clave !== filtroMateria) return false
      if (filtroLectura === 'noLeidos' && av.leido) return false
      if (filtroLectura === 'leidos' && !av.leido) return false
      return true
    })
  }, [avisos, filtroMateria, filtroLectura])

  async function handleAbrirAviso(av) {
    if (av.leido) return
    setAvisos((prev) => prev.map((a) => (a.id_aviso === av.id_aviso ? { ...a, leido: true } : a)))
    try {
      await avisosService.marcarAvisoLeido(av.id_aviso)
    } catch {
      setAvisos((prev) => prev.map((a) => (a.id_aviso === av.id_aviso ? { ...a, leido: false } : a)))
    }
  }

  return (
    <PageWrapper
      title="Tablón de Avisos"
      actions={
        <>
          <div className="topbar-semester">2026/1</div>
          {sinLeer > 0 && (
            <Badge variant="unread" style={{ fontSize: 12, padding: '5px 12px' }}>
              {sinLeer} sin leer
            </Badge>
          )}
        </>
      }
    >
      <div className="toolbar">
        <select className="select-input" style={{ minWidth: 220 }} value={filtroMateria} onChange={(e) => setFiltroMateria(e.target.value)}>
          <option value="todas">Todas las materias</option>
          {materiasDisponibles.map(([clave, nombre]) => (
            <option key={clave} value={clave}>
              {nombre}
            </option>
          ))}
        </select>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className={`btn btn-sm ${filtroLectura === 'todos' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFiltroLectura('todos')}>
            Todos
          </button>
          <button
            className={`btn btn-sm ${filtroLectura === 'noLeidos' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFiltroLectura('noLeidos')}
          >
            Sin leer ({sinLeer})
          </button>
          <button className={`btn btn-sm ${filtroLectura === 'leidos' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFiltroLectura('leidos')}>
            Leídos
          </button>
        </div>
      </div>

      {error && (
        <div className="login-error" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <Loader2 className="icon-xl spin" style={{ color: 'var(--blue)' }} />
        </div>
      ) : avisosFiltrados.length === 0 ? (
        <div className="card">
          <EmptyState icon={Megaphone} title="Sin avisos" description="No hay avisos que coincidan con este filtro." />
        </div>
      ) : (
        <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {avisosFiltrados.map((av) => (
            <div
              key={av.id_aviso}
              className={`notice-card${av.leido ? '' : ' unread'}`}
              role="button"
              tabIndex={0}
              onClick={() => handleAbrirAviso(av)}
            >
              <div className="notice-header">
                <div className="notice-avatar">{nombreProfesor(av)[0]}</div>
                <div className="notice-meta">
                  <strong>{nombreProfesor(av)}</strong>
                  <span>
                    {av.id_materia ? `${av.materia_clave} — ${av.materia_nombre}` : 'Todas sus materias'} · {formatFecha(av.fecha_publicacion)}
                  </span>
                </div>
                <Badge variant={av.leido ? 'gray' : 'unread'} style={{ fontSize: 10 }}>
                  {av.leido ? 'Leído' : 'Nuevo'}
                </Badge>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-800)', marginBottom: 6 }}>{av.titulo}</div>
              <div className="notice-body">{av.contenido}</div>
              {av.archivos.length > 0 && (
                <div className="tag-row" style={{ marginTop: 10 }}>
                  {av.archivos.map((archivo) => (
                    <ArchivoLink
                      key={archivo.id_archivo_aviso}
                      tipo="aviso"
                      id={archivo.id_archivo_aviso}
                      nombre={archivo.nombre_archivo}
                      icon={Download}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </PageWrapper>
  )
}
