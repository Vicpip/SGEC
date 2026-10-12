// Pantalla 04 — Lista de Equipos
// Rol: Profesor
// URL: /equipos?materia=:clave
// Descripción: Muestra todos los equipos de una materia. Filtra por tipo.

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, Plus, ArrowRight, Shuffle, Users, Loader2 } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import ActionButtons from '../../components/ui/ActionButtons'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import EmptyState from '../../components/ui/EmptyState'
import * as equiposService from '../../services/equipos.service'
import * as materiasService from '../../services/materias.service'

const TIPO_VARIANT = { Practica: 'blue', Tarea: 'navy', Proyecto: 'orange' }
const TIPO_LABEL = { Practica: 'Práctica', Tarea: 'Tarea', Proyecto: 'Proyecto' }
const TIPOS = ['Practica', 'Tarea', 'Proyecto']

function iniciales(integrante) {
  return `${integrante.nombre?.[0] ?? ''}${integrante.apellido_paterno?.[0] ?? ''}`.toUpperCase()
}

export default function ListaEquipos() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const claveMateria = searchParams.get('materia') ?? ''

  const [materias, setMaterias] = useState([])
  const [materia, setMateria] = useState(null)
  const [equipos, setEquipos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [tipoGenerar, setTipoGenerar] = useState('Practica')
  const [generando, setGenerando] = useState(false)
  const [avisoGenerar, setAvisoGenerar] = useState(null)
  const [equipoADesactivar, setEquipoADesactivar] = useState(null)

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

  function cargarEquipos() {
    if (!claveMateria) return
    setLoading(true)
    equiposService
      .listarEquipos(claveMateria)
      .then((data) => {
        setEquipos(data.equipos)
        setMateria(data.materia)
        setError('')
      })
      .catch((err) => {
        setError(err.response?.data?.error || 'No se pudieron cargar los equipos')
        setEquipos([])
        setMateria(null)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    cargarEquipos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveMateria])

  function handleCambioMateria(e) {
    setSearchParams({ materia: e.target.value })
    setAvisoGenerar(null)
  }

  async function handleConfirmarDesactivar() {
    await equiposService.desactivarEquipo(equipoADesactivar.id_equipo)
    setEquipoADesactivar(null)
    cargarEquipos()
  }

  async function handleGenerar() {
    if (!materia) return
    setGenerando(true)
    setAvisoGenerar(null)
    setError('')
    try {
      const data = await equiposService.generarEquipos({ id_materia: materia.id_materia, tipo: tipoGenerar })
      setAvisoGenerar(
        `Se crearon ${data.equipos_creados} equipo(s) de tipo ${TIPO_LABEL[tipoGenerar]}. ` +
          (data.alumnos_sin_asignar > 0
            ? `${data.alumnos_sin_asignar} alumno(s) quedaron sin asignar.`
            : 'Todos los alumnos disponibles fueron asignados.')
      )
      cargarEquipos()
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudieron generar los equipos')
    } finally {
      setGenerando(false)
    }
  }

  const equiposFiltrados = useMemo(() => {
    let lista = equipos
    if (filtroTipo !== 'todos') {
      lista = lista.filter((eq) => eq.tipo === filtroTipo)
    }
    const termino = busqueda.trim().toLowerCase()
    if (termino) {
      lista = lista.filter(
        (eq) =>
          eq.nombre.toLowerCase().includes(termino) ||
          eq.integrantes.some((it) => `${it.nombre} ${it.apellido_paterno}`.toLowerCase().includes(termino))
      )
    }
    return lista
  }, [equipos, filtroTipo, busqueda])

  const conteoPorTipo = useMemo(() => {
    const conteo = { Practica: 0, Tarea: 0, Proyecto: 0 }
    equipos.forEach((eq) => {
      conteo[eq.tipo] = (conteo[eq.tipo] ?? 0) + 1
    })
    return conteo
  }, [equipos])

  return (
    <PageWrapper
      title={
        materia ? (
          <>
            Equipos — {materia.nombre} <span style={{ fontWeight: 400, color: 'var(--gray-400)' }}>· {materia.grupo}</span>
          </>
        ) : (
          'Equipos'
        )
      }
      actions={
        <button
          className="btn btn-primary btn-sm"
          onClick={() => navigate(`/equipos/nuevo?materia=${claveMateria}`)}
          disabled={!claveMateria}
        >
          <Plus className="icon-sm" />
          Nuevo equipo
        </button>
      }
    >
      <div className="toolbar">
        <div className="search-wrap">
          <Search className="icon-sm" />
          <input
            className="search-input"
            placeholder="Buscar equipo o alumno…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        {materias.length > 0 && (
          <select className="select-input" value={claveMateria} onChange={handleCambioMateria}>
            {materias.map((m) => (
              <option key={m.id_materia} value={m.clave}>
                {m.clave} — {m.nombre} · {m.grupo}
              </option>
            ))}
          </select>
        )}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span
            className={`btn btn-sm ${filtroTipo === 'todos' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFiltroTipo('todos')}
          >
            Todos ({equipos.length})
          </span>
          {TIPOS.map((t) => (
            <span
              key={t}
              className={`btn btn-sm ${filtroTipo === t ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFiltroTipo(t)}
            >
              {TIPO_LABEL[t]}s ({conteoPorTipo[t] ?? 0})
            </span>
          ))}
        </div>
      </div>

      <div className="card mb20">
        <div className="card-body" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="text-sm font-600">Asignación aleatoria masiva</span>
          <select className="select-input" value={tipoGenerar} onChange={(e) => setTipoGenerar(e.target.value)}>
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {TIPO_LABEL[t]}
              </option>
            ))}
          </select>
          <button className="btn btn-secondary btn-sm" onClick={handleGenerar} disabled={!materia || generando}>
            {generando ? <Loader2 className="icon-sm spin" /> : <Shuffle className="icon-sm" />}
            Generar equipos
          </button>
          {avisoGenerar && <span className="text-xs" style={{ color: 'var(--blue)' }}>{avisoGenerar}</span>}
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
      ) : equiposFiltrados.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Users}
            title="Sin equipos registrados"
            description="Crea un equipo manualmente o usa la asignación aleatoria masiva."
          />
        </div>
      ) : (
        <div className="equipo-grid">
          {equiposFiltrados.map((eq) => (
            <div key={eq.id_equipo} className="equipo-card">
              <div className="equipo-card-header">
                <div>
                  <div className="equipo-name">{eq.nombre}</div>
                  <div className="text-xs" style={{ marginTop: 4 }}>{materia?.nombre}</div>
                </div>
                <Badge variant={TIPO_VARIANT[eq.tipo]}>{TIPO_LABEL[eq.tipo]}</Badge>
              </div>
              <div className="equipo-members">
                {eq.integrantes.map((it) => (
                  <div key={it.id_alumno} className="member-row">
                    <Avatar size="xs" initials={iniciales(it)} />
                    {it.nombre} {it.apellido_paterno}
                  </div>
                ))}
              </div>
              <div className="flex-between">
                <ActionButtons onView={() => navigate(`/equipos/${eq.id_equipo}`)} onDelete={() => setEquipoADesactivar(eq)} />
                <span className="btn btn-ghost btn-sm" onClick={() => navigate(`/equipos/${eq.id_equipo}`)}>
                  Ver detalle <ArrowRight className="icon-sm" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {equipoADesactivar && (
        <ConfirmDialog
          titulo="Desactivar equipo"
          textoConfirmar="Desactivar"
          mensajeError="No se pudo desactivar el equipo"
          onCancelar={() => setEquipoADesactivar(null)}
          onConfirmar={handleConfirmarDesactivar}
        >
          El equipo <strong>{equipoADesactivar.nombre}</strong> ({TIPO_LABEL[equipoADesactivar.tipo]}) quedará desactivado: sus integrantes
          volverán a estar disponibles para otro equipo de ese tipo y dejarán de recibir las actividades dirigidas
          a él. Las entregas y calificaciones ya registradas se conservan.
          {equipoADesactivar.tipo !== 'Proyecto' && (
            <>
              {' '}
              Solo se desactiva este equipo: si existe su equipo gemelo de{' '}
              {equipoADesactivar.tipo === 'Practica' ? 'Tarea' : 'Práctica'} con el mismo nombre, desactívalo por separado.
            </>
          )}
        </ConfirmDialog>
      )}
    </PageWrapper>
  )
}
