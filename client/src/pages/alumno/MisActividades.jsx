// Pantalla adicional — Mis Actividades (Alumno)
// Rol: Alumno
// URL: /alumno/actividades
// Nota: no forma parte de las 19 pantallas oficiales de CLAUDE.md; el ítem "Mis Actividades"
// del sidebar del alumno enlaza aquí en lo que se define una pantalla oficial dedicada.
// El estatus de entrega y la calificación se conectan en las Sesiones 8 y 9 del sprint; por
// ahora se muestra la información real de la actividad (ya conectada a la API, respetando la
// visibilidad de actividades programadas — ver publicacion.service.js en el backend).

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LayoutList, Layers, ChevronRight, User, Users, Loader2, ClipboardList } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import ArchivoLink from '../../components/ui/ArchivoLink'
import * as actividadesService from '../../services/actividades.service'

const TIPO_VARIANT = { 'En clase': 'gray', Practica: 'blue', Tarea: 'navy', Proyecto: 'orange' }
const TIPO_LABEL = { 'En clase': 'En clase', Practica: 'Práctica', Tarea: 'Tarea', Proyecto: 'Proyecto' }

const TABS_TIPO = [
  { key: 'todas', label: 'Todas' },
  { key: 'En clase', label: 'En clase' },
  { key: 'Practica', label: 'Práctica' },
  { key: 'Tarea', label: 'Tarea' },
  { key: 'Proyecto', label: 'Proyecto' },
]

function formatFecha(fecha) {
  return new Date(fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

function diasRestantes(fechaLimite) {
  const ms = new Date(fechaLimite).getTime() - Date.now()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

function cumpleFiltroTipo(actividad, filtro) {
  return filtro === 'todas' || actividad.tipo === filtro
}

function FilaActividad({ actividad, navigate }) {
  const dias = diasRestantes(actividad.fecha_limite)
  return (
    <tr className="clickable-row" onClick={() => navigate(`/alumno/actividades/${actividad.id_actividad}`)}>
      <td className="td-bold">
        {actividad.titulo}
        {actividad.archivos?.length > 0 && (
          <div className="tag-row" style={{ fontWeight: 400 }}>
            {actividad.archivos.map((d) => (
              <ArchivoLink
                key={d.id_archivo_actividad}
                tipo="actividad"
                id={d.id_archivo_actividad}
                nombre={d.nombre_archivo}
              />
            ))}
          </div>
        )}
      </td>
      <td>
        <Badge variant={TIPO_VARIANT[actividad.tipo] ?? 'gray'}>{TIPO_LABEL[actividad.tipo] ?? actividad.tipo}</Badge>
        {actividad.tipo_evaluacion && (
          <div className="text-xs" style={{ marginTop: 4 }}>
            {actividad.tipo_evaluacion}
          </div>
        )}
      </td>
      <td className="text-sm">{actividad.equipo_nombre ?? '—'}</td>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13 }}>{formatFecha(actividad.fecha_limite)}</span>
          {dias >= 0 && dias <= 7 && (
            <span className="countdown" style={{ padding: '3px 8px', fontSize: 11 }}>
              Faltan {dias} día{dias === 1 ? '' : 's'}
            </span>
          )}
        </div>
      </td>
      <td>
        {actividad.entrega_por_equipo ? (
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
      </td>
      <td>
        <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); navigate(`/alumno/actividades/${actividad.id_actividad}`) }}>
          Ver actividad
        </button>
      </td>
    </tr>
  )
}

function VistaPorMateria({ actividades, filtroTipo, navigate }) {
  const materias = [...new Set(actividades.map((a) => a.materia_nombre))]

  return (
    <>
      {materias.map((nombreMateria) => {
        const actividadesMateria = actividades.filter((a) => a.materia_nombre === nombreMateria)
        const filtradas = actividadesMateria.filter((a) => cumpleFiltroTipo(a, filtroTipo))
        return (
          <div key={nombreMateria} className="card mb16">
            <div className="card-header">
              <span className="card-title">{nombreMateria}</span>
              <Badge variant="blue">{actividadesMateria.length} actividades</Badge>
            </div>
            {filtradas.length === 0 ? (
              <div className="text-sm" style={{ padding: 16 }}>
                Sin actividades para este filtro.
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Actividad</th>
                      <th>Tipo</th>
                      <th>Equipo</th>
                      <th>Fecha límite</th>
                      <th>Entrega</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtradas.map((a) => (
                      <FilaActividad key={a.id_actividad} actividad={a} navigate={navigate} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}

export default function MisActividades() {
  const navigate = useNavigate()
  const [vistaAgrupada, setVistaAgrupada] = useState(false)
  const [filtroTipo, setFiltroTipo] = useState('todas')
  const [actividades, setActividades] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    actividadesService
      .listarActividades()
      .then((data) => {
        setActividades(data.actividades)
        setError('')
      })
      .catch((err) => {
        setError(err.response?.data?.error || 'No se pudieron cargar tus actividades')
        setActividades([])
      })
      .finally(() => setLoading(false))
  }, [])

  const actividadesFiltradas = useMemo(
    () => actividades.filter((a) => cumpleFiltroTipo(a, filtroTipo)),
    [actividades, filtroTipo]
  )

  return (
    <PageWrapper title="Mis Actividades">
      <div className="toolbar">
        <div className="vista-toggle">
          <button className={`vista-toggle-btn${!vistaAgrupada ? ' active' : ''}`} onClick={() => setVistaAgrupada(false)}>
            <LayoutList className="icon-sm" /> Lista
          </button>
          <button className={`vista-toggle-btn${vistaAgrupada ? ' active' : ''}`} onClick={() => setVistaAgrupada(true)}>
            <Layers className="icon-sm" /> Por materia
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', flexWrap: 'wrap' }}>
          {TABS_TIPO.map((tab) => (
            <button
              key={tab.key}
              className={`btn btn-sm ${filtroTipo === tab.key ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFiltroTipo(tab.key)}
            >
              {tab.label}
            </button>
          ))}
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
      ) : actividades.length === 0 ? (
        <div className="card">
          <EmptyState icon={ClipboardList} title="Sin actividades asignadas" description="Aún no tienes actividades dirigidas a tus equipos." />
        </div>
      ) : !vistaAgrupada ? (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Actividad</th>
                  <th>Tipo</th>
                  <th>Equipo</th>
                  <th>Fecha límite</th>
                  <th>Entrega</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {actividadesFiltradas.map((a) => (
                  <FilaActividad key={a.id_actividad} actividad={a} navigate={navigate} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <VistaPorMateria actividades={actividades} filtroTipo={filtroTipo} navigate={navigate} />
      )}
    </PageWrapper>
  )
}
