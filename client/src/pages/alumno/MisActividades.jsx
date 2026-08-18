// Pantalla adicional — Mis Actividades (Alumno)
// Rol: Alumno
// URL: /alumno/actividades
// Nota: no forma parte de las 19 pantallas oficiales de CLAUDE.md; el ítem "Mis Actividades"
// del sidebar del alumno enlaza aquí en lo que se define una pantalla oficial dedicada.

import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LayoutList, Layers, ChevronRight, User, Users, X } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import Badge from '../../components/ui/Badge'

const TIPO_VARIANT = { Practica: 'blue', Tarea: 'navy', Proyecto: 'orange' }
const TIPO_LABEL = { Practica: 'Práctica', Tarea: 'Tarea', Proyecto: 'Proyecto' }
const ESTATUS_VARIANT = { Calificada: 'green', 'En revision': 'yellow', Pendiente: 'red', Entregado: 'blue' }
const ESTATUS_LABEL = { Calificada: 'Calificada', 'En revision': 'En revisión', Pendiente: 'Pendiente', Entregado: 'Entregado' }

const TABS_ESTATUS = [
  { key: 'todas', label: 'Todas' },
  { key: 'pendientes', label: 'Pendientes' },
  { key: 'entregadas', label: 'Entregadas' },
  { key: 'calificadas', label: 'Calificadas' },
]

const ACTIVIDADES = [
  {
    id: 1,
    titulo: 'Práctica 1 — AFD',
    tipo: 'Practica',
    materia: 'Teoría de la Computación',
    equipo: 'Equipo Alfa',
    equipoId: 1,
    fechaLimite: '15 Feb 2026',
    diasRestantes: null,
    entregaPorEquipo: false,
    estatusEntrega: 'Calificada',
    calificacionEquipo: 9.0,
    calificacionIndividual: 9.5,
  },
  {
    id: 2,
    titulo: 'Tarea 1 — Lenguajes Formales',
    tipo: 'Tarea',
    materia: 'Teoría de la Computación',
    equipo: 'Grupo T1',
    equipoId: 2,
    fechaLimite: '10 Mar 2026',
    diasRestantes: null,
    entregaPorEquipo: false,
    estatusEntrega: 'Calificada',
    calificacionEquipo: 8.0,
    calificacionIndividual: 8.0,
  },
  {
    id: 3,
    titulo: 'Práctica 3 — Autómatas',
    tipo: 'Practica',
    materia: 'Teoría de la Computación',
    equipo: 'Equipo Alfa',
    equipoId: 1,
    fechaLimite: '22 Mar 2026',
    diasRestantes: null,
    entregaPorEquipo: true,
    estatusEntrega: 'En revision',
    calificacionEquipo: null,
    calificacionIndividual: null,
  },
  {
    id: 4,
    titulo: 'Tarea 2 — Gramáticas',
    tipo: 'Tarea',
    materia: 'Teoría de la Computación',
    equipo: 'Grupo T1',
    equipoId: 2,
    fechaLimite: '5 May 2026',
    diasRestantes: 10,
    entregaPorEquipo: false,
    estatusEntrega: 'Pendiente',
    calificacionEquipo: null,
    calificacionIndividual: null,
  },
  {
    id: 5,
    titulo: 'Práctica 5 — Lenguajes Regulares',
    tipo: 'Practica',
    materia: 'Teoría de la Computación',
    equipo: 'Equipo Alfa',
    equipoId: 1,
    fechaLimite: '25 Abr 2026',
    diasRestantes: 6,
    entregaPorEquipo: false,
    estatusEntrega: 'Pendiente',
    calificacionEquipo: null,
    calificacionIndividual: null,
  },
  {
    id: 6,
    titulo: 'Proyecto Final — Etapa 1',
    tipo: 'Proyecto',
    materia: 'Teoría de la Computación',
    equipo: 'Proyecto Sigma',
    equipoId: 3,
    fechaLimite: '1 Abr 2026',
    diasRestantes: null,
    entregaPorEquipo: true,
    estatusEntrega: 'Calificada',
    calificacionEquipo: 7.0,
    calificacionIndividual: 7.5,
  },
]

function colorCalificacion(cal) {
  if (cal >= 8) return 'var(--green)'
  if (cal >= 6) return 'var(--yellow)'
  return 'var(--red)'
}

function cumpleFiltroEstatus(actividad, filtro) {
  if (filtro === 'pendientes') return actividad.estatusEntrega === 'Pendiente'
  if (filtro === 'entregadas') return actividad.estatusEntrega === 'En revision' || actividad.estatusEntrega === 'Entregado'
  if (filtro === 'calificadas') return actividad.estatusEntrega === 'Calificada'
  return true
}

function AccionActividad({ actividad, navigate }) {
  const ir = () => navigate(`/alumno/actividades/${actividad.id}`)
  if (actividad.estatusEntrega === 'Pendiente') {
    return <button className="btn btn-primary btn-sm" onClick={ir}>Entregar</button>
  }
  if (actividad.estatusEntrega === 'Calificada') {
    return <button className="btn btn-ghost btn-sm" onClick={ir}>Ver detalle</button>
  }
  return <button className="btn btn-secondary btn-sm" onClick={ir}>Ver entrega</button>
}

function FilaActividad({ actividad, mostrarEquipo, navigate }) {
  return (
    <tr>
      <td className="td-bold">{actividad.titulo}</td>
      <td><Badge variant={TIPO_VARIANT[actividad.tipo]}>{TIPO_LABEL[actividad.tipo]}</Badge></td>
      {mostrarEquipo && <td className="text-sm">{actividad.equipo}</td>}
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13 }}>{actividad.fechaLimite}</span>
          {actividad.diasRestantes != null && actividad.diasRestantes <= 7 && (
            <span className="countdown" style={{ padding: '3px 8px', fontSize: 11 }}>
              Faltan {actividad.diasRestantes} días
            </span>
          )}
        </div>
      </td>
      <td>
        {actividad.entregaPorEquipo ? (
          <Badge variant="blue"><Users className="icon-sm" style={{ marginRight: 4 }} />Por equipo</Badge>
        ) : (
          <Badge variant="gray"><User className="icon-sm" style={{ marginRight: 4 }} />Individual</Badge>
        )}
      </td>
      <td><Badge variant={ESTATUS_VARIANT[actividad.estatusEntrega]}>{ESTATUS_LABEL[actividad.estatusEntrega]}</Badge></td>
      <td>
        {actividad.calificacionIndividual != null ? (
          <span style={{ fontWeight: 600, color: colorCalificacion(actividad.calificacionIndividual) }}>
            {actividad.calificacionIndividual.toFixed(1)}
          </span>
        ) : (
          <span style={{ color: 'var(--gray-400)' }}>—</span>
        )}
      </td>
      <td><AccionActividad actividad={actividad} navigate={navigate} /></td>
    </tr>
  )
}

function VistaPorMateria({ actividades, filtroEstatus, navigate }) {
  const [expandida, setExpandida] = useState(true)

  const materia = actividades[0]?.materia ?? 'Teoría de la Computación'
  const pendientes = actividades.filter((a) => a.estatusEntrega === 'Pendiente').length
  const calificadas = actividades.map((a) => a.calificacionIndividual).filter((c) => c != null)
  const promedio = calificadas.length ? calificadas.reduce((sum, c) => sum + c, 0) / calificadas.length : null

  const equipoIds = [...new Set(actividades.map((a) => a.equipoId))]
  const grupos = equipoIds.map((id) => {
    const todas = actividades.filter((a) => a.equipoId === id)
    return {
      id,
      nombre: todas[0].equipo,
      tipo: todas[0].tipo,
      actividades: todas.filter((a) => cumpleFiltroEstatus(a, filtroEstatus)),
    }
  })

  return (
    <div className="card">
      <div className="accordion-header" onClick={() => setExpandida((v) => !v)}>
        <ChevronRight className={`icon accordion-chevron${expandida ? ' expanded' : ''}`} />
        <span style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--gray-800)' }}>{materia}</span>
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
          <Badge variant="blue">{actividades.length} actividades</Badge>
          <Badge variant="yellow">{pendientes} pendientes</Badge>
          <Badge variant="green">Promedio: {promedio != null ? promedio.toFixed(1) : '—'}</Badge>
        </div>
      </div>

      {expandida && (
        <div className="accordion-panel">
          {grupos.map((grupo) => (
            <div key={grupo.id}>
              <div className="sub-header-equipo">
                <Badge variant={TIPO_VARIANT[grupo.tipo]}>{TIPO_LABEL[grupo.tipo]}</Badge>
                {grupo.nombre}
              </div>
              {grupo.actividades.length > 0 ? (
                <div className="card mb16">
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Actividad</th><th>Tipo</th><th>Fecha límite</th><th>Entrega</th><th>Estatus</th><th>Calificación</th><th>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grupo.actividades.map((a) => (
                          <FilaActividad key={a.id} actividad={a} mostrarEquipo={false} navigate={navigate} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-sm mb16">Sin actividades para este filtro.</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const ESTATUS_KEYS = TABS_ESTATUS.map((t) => t.key)

export default function MisActividades() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [vistaAgrupada, setVistaAgrupada] = useState(false)
  const [filtroEstatus, setFiltroEstatus] = useState(() => {
    const p = searchParams.get('estatus')
    return p && ESTATUS_KEYS.includes(p) ? p : 'todas'
  })

  const equipoIdParam = searchParams.get('equipo')
  const equipoFiltroId = equipoIdParam ? Number(equipoIdParam) : null
  const equipoFiltroNombre = equipoFiltroId
    ? ACTIVIDADES.find((a) => a.equipoId === equipoFiltroId)?.equipo
    : null

  const estatusParam = searchParams.get('estatus')
  const estatusFiltroLabel = estatusParam && ESTATUS_KEYS.includes(estatusParam)
    ? TABS_ESTATUS.find((t) => t.key === estatusParam)?.label
    : null

  const limpiarFiltroEquipo = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('equipo')
    setSearchParams(next, { replace: true })
  }

  const limpiarFiltroEstatus = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('estatus')
    setSearchParams(next, { replace: true })
    setFiltroEstatus('todas')
  }

  const seleccionarTabEstatus = (key) => {
    setFiltroEstatus(key)
    if (searchParams.has('estatus')) {
      const next = new URLSearchParams(searchParams)
      next.delete('estatus')
      setSearchParams(next, { replace: true })
    }
  }

  const actividadesBase = equipoFiltroId
    ? ACTIVIDADES.filter((a) => a.equipoId === equipoFiltroId)
    : ACTIVIDADES
  const actividadesFiltradas = actividadesBase.filter((a) => cumpleFiltroEstatus(a, filtroEstatus))

  return (
    <PageWrapper title="Mis Actividades">
      {equipoFiltroNombre && (
        <div className="filtro-activo-chip mb16">
          Filtrando por: {equipoFiltroNombre}
          <button onClick={limpiarFiltroEquipo}><X className="icon-sm" /></button>
        </div>
      )}

      {estatusFiltroLabel && (
        <div className="filtro-activo-chip mb16">
          Filtrando por: {estatusFiltroLabel}
          <button onClick={limpiarFiltroEstatus}><X className="icon-sm" /></button>
        </div>
      )}

      <div className="toolbar">
        <div className="vista-toggle">
          <button
            className={`vista-toggle-btn${!vistaAgrupada ? ' active' : ''}`}
            onClick={() => setVistaAgrupada(false)}
          >
            <LayoutList className="icon-sm" /> Lista
          </button>
          <button
            className={`vista-toggle-btn${vistaAgrupada ? ' active' : ''}`}
            onClick={() => setVistaAgrupada(true)}
          >
            <Layers className="icon-sm" /> Por materia
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
          {TABS_ESTATUS.map((tab) => (
            <button
              key={tab.key}
              className={`btn btn-sm ${filtroEstatus === tab.key ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => seleccionarTabEstatus(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {!vistaAgrupada ? (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Actividad</th><th>Tipo</th><th>Equipo</th><th>Fecha límite</th><th>Entrega</th><th>Estatus</th><th>Calificación</th><th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {actividadesFiltradas.map((a) => (
                  <FilaActividad key={a.id} actividad={a} mostrarEquipo navigate={navigate} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <VistaPorMateria actividades={actividadesBase} filtroEstatus={filtroEstatus} navigate={navigate} />
      )}
    </PageWrapper>
  )
}
