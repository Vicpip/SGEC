// Pantalla 04 — Lista de Equipos
// Rol: Profesor
// URL: /equipos?materia=:clave
// Descripción: Muestra todos los equipos de una materia. Filtra por tipo. Los equipos de
// Práctica y de Tarea son dos tarjetas del mismo equipo (comparten integrantes y están
// enlazadas por id_equipo_espejo): desactivar una desactiva también la otra.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, ArrowRight, Shuffle, Users, Loader2, AlertTriangle } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import ActionButtons from '../../components/ui/ActionButtons'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import EmptyState from '../../components/ui/EmptyState'
import SelectorSemestre from '../../components/ui/SelectorSemestre'
import { useSelectorMateria } from '../../hooks/useSelectorMateria'
import { rangoIntegrantes } from '../../utils/rangoIntegrantes'
import * as equiposService from '../../services/equipos.service'

const TIPO_VARIANT = { Practica: 'blue', Tarea: 'navy', Proyecto: 'orange' }
const TIPO_LABEL = { Practica: 'Práctica', Tarea: 'Tarea', Proyecto: 'Proyecto' }
const TIPOS = ['Practica', 'Tarea', 'Proyecto']

function iniciales(integrante) {
  return `${integrante.nombre?.[0] ?? ''}${integrante.apellido_paterno?.[0] ?? ''}`.toUpperCase()
}

export default function ListaEquipos() {
  const navigate = useNavigate()
  const { claveMateria, cambiarMateria, semestres, semestre, cambiarSemestre, materias, materiasListas } = useSelectorMateria()
  // Numera las cargas para descartar la respuesta de una materia que ya no es la elegida.
  const solicitudRef = useRef(0)

  const [materia, setMateria] = useState(null)
  // Tamaño automático y máximo de integrantes de la materia (3 y 4 por defecto).
  const rango = rangoIntegrantes(materia)
  const [equipos, setEquipos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [tipoGenerar, setTipoGenerar] = useState('Practica')
  const [generando, setGenerando] = useState(false)
  const [avisoGenerar, setAvisoGenerar] = useState(null)
  // Alumnos que la asignación automática no pudo acomodar: [{ id_alumno, nombre }].
  const [sinAsignar, setSinAsignar] = useState([])
  const [equipoADesactivar, setEquipoADesactivar] = useState(null)

  function cargarEquipos() {
    const solicitud = ++solicitudRef.current
    // Mientras se carga la lista de materias del semestre elegido no se pide nada: la
    // materia de la URL puede pertenecer todavía al semestre anterior.
    if (!materiasListas) {
      setLoading(true)
      return
    }
    if (!claveMateria) {
      // Sin materia elegida (el semestre filtrado no tiene materias): no hay nada que listar.
      setEquipos([])
      setMateria(null)
      setError('')
      setLoading(false)
      return
    }
    setLoading(true)
    equiposService
      .listarEquipos(claveMateria)
      .then((data) => {
        if (solicitud !== solicitudRef.current) return
        setEquipos(data.equipos)
        setMateria(data.materia)
        setError('')
      })
      .catch((err) => {
        if (solicitud !== solicitudRef.current) return
        setError(err.response?.data?.error || 'No se pudieron cargar los equipos')
        setEquipos([])
        setMateria(null)
      })
      .finally(() => {
        if (solicitud === solicitudRef.current) setLoading(false)
      })
  }

  useEffect(() => {
    cargarEquipos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveMateria, materiasListas])

  function handleCambioMateria(e) {
    cambiarMateria(e.target.value)
    setAvisoGenerar(null)
    setSinAsignar([])
  }

  function handleCambioSemestre(clave) {
    cambiarSemestre(clave)
    setAvisoGenerar(null)
    setSinAsignar([])
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
    setSinAsignar([])
    setError('')
    try {
      const data = await equiposService.generarEquipos({ id_materia: materia.id_materia, tipo: tipoGenerar })
      const sobrantes = data.sin_asignar ?? []
      setAvisoGenerar(
        `Se crearon ${data.equipos_creados} equipo(s) de ${
          tipoGenerar === 'Proyecto' ? 'Proyecto' : 'Práctica y Tarea (comparten integrantes)'
        }. ` + (sobrantes.length > 0 ? '' : 'Todos los alumnos disponibles fueron asignados.')
      )
      setSinAsignar(sobrantes)
      cargarEquipos()
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudieron generar los equipos')
      // Con menos alumnos disponibles que el tamaño automático el servidor dice quiénes son.
      setSinAsignar(err.response?.data?.sin_asignar ?? [])
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
        <SelectorSemestre semestres={semestres} value={semestre} onChange={handleCambioSemestre} />
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

      {sinAsignar.length > 0 && (
        <div className="credenciales-aviso" style={{ marginBottom: 16 }}>
          <AlertTriangle className="icon-sm" />
          <div>
            <strong>
              {sinAsignar.length === 1 ? 'Quedó 1 alumno sin equipo' : `Quedaron ${sinAsignar.length} alumnos sin equipo`} de{' '}
              {tipoGenerar === 'Proyecto' ? 'Proyecto' : 'Práctica/Tarea'}:
            </strong>{' '}
            {sinAsignar.map((s) => s.nombre).join(', ')}. La asignación automática forma equipos de {rango.tamano}; agrégalos
            a mano a un equipo existente desde su detalle (un equipo admite hasta {rango.max} integrantes).
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <Loader2 className="icon-xl spin" style={{ color: 'var(--blue)' }} />
        </div>
      ) : equiposFiltrados.length === 0 ? (
        <div className="card">
          {materiasListas && materias.length === 0 ? (
            <EmptyState
              icon={Users}
              title={semestre ? `Sin materias en el semestre ${semestre}` : 'Sin materias registradas'}
              description={semestre ? 'Elige otro semestre o crea una materia en este.' : 'Crea una materia para poder formar equipos.'}
            />
          ) : (
            <EmptyState
              icon={Users}
              title="Sin equipos registrados"
              description="Crea un equipo manualmente o usa la asignación aleatoria masiva."
            />
          )}
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
          volverán a estar disponibles para otro equipo y dejarán de recibir las actividades dirigidas
          a él. Las entregas y calificaciones ya registradas se conservan.
          {equipoADesactivar.id_equipo_espejo && (
            <>
              {' '}
              <strong>
                También se desactiva su equipo de {equipoADesactivar.tipo === 'Practica' ? 'Tarea' : 'Práctica'}
              </strong>
              : los equipos de Práctica y de Tarea comparten integrantes y se dan de baja juntos.
            </>
          )}
        </ConfirmDialog>
      )}
    </PageWrapper>
  )
}
