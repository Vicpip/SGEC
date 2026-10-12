// Pantalla intermedia — Lista de Actividades
// Rol: Profesor
// URL: /actividades
// Descripción: Punto de entrada del ítem "Actividades" del sidebar. Lista las actividades
// publicadas y permite navegar al detalle de cada una.
//
// NOTA: esta pantalla NO forma parte de las 19 pantallas oficiales del proyecto (ver
// CLAUDE.md, sección "Las 19 pantallas"). Se agregó porque el sidebar del Profesor
// necesitaba un destino propio para "Actividades" distinto de /actividades/nueva
// (Pantalla 15 — Publicar Actividad) y de /actividades/:id (Pantalla 10 — Detalle de
// Actividad), que hasta ahora solo era alcanzable por URL directa.

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Loader2, ClipboardList, Users, User } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import ActionButtons from '../../components/ui/ActionButtons'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import SelectorSemestre from '../../components/ui/SelectorSemestre'
import { useSelectorMateria } from '../../hooks/useSelectorMateria'
import * as actividadesService from '../../services/actividades.service'

const TIPO_VARIANT = { 'En clase': 'gray', Practica: 'blue', Tarea: 'navy', Proyecto: 'orange' }
const TIPO_LABEL = { 'En clase': 'En clase', Practica: 'Práctica', Tarea: 'Tarea', Proyecto: 'Proyecto' }

function formatFecha(fecha) {
  return new Date(fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ListaActividades() {
  const navigate = useNavigate()
  const { claveMateria, cambiarMateria, semestres, semestre, cambiarSemestre, materias, materiasListas } = useSelectorMateria()
  // Numera las cargas para descartar la respuesta de una materia que ya no es la elegida.
  const solicitudRef = useRef(0)

  const [materia, setMateria] = useState(null)
  const [actividades, setActividades] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actividadADesactivar, setActividadADesactivar] = useState(null)

  function cargarActividades() {
    const solicitud = ++solicitudRef.current
    // Mientras se carga la lista de materias del semestre elegido no se pide nada: la
    // materia de la URL puede pertenecer todavía al semestre anterior.
    if (!materiasListas) {
      setLoading(true)
      return
    }
    if (!claveMateria) {
      // Sin materia elegida (el semestre filtrado no tiene materias): no hay nada que listar.
      setActividades([])
      setMateria(null)
      setError('')
      setLoading(false)
      return
    }
    setLoading(true)
    actividadesService
      .listarActividades(claveMateria)
      .then((data) => {
        if (solicitud !== solicitudRef.current) return
        setActividades(data.actividades)
        setMateria(data.materia)
        setError('')
      })
      .catch((err) => {
        if (solicitud !== solicitudRef.current) return
        setError(err.response?.data?.error || 'No se pudieron cargar las actividades')
        setActividades([])
        setMateria(null)
      })
      .finally(() => {
        if (solicitud === solicitudRef.current) setLoading(false)
      })
  }

  useEffect(() => {
    cargarActividades()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveMateria, materiasListas])

  async function handleConfirmarDesactivar() {
    await actividadesService.desactivarActividad(actividadADesactivar.id_actividad)
    setActividadADesactivar(null)
    cargarActividades()
  }

  return (
    <PageWrapper
      title={
        materia ? (
          <>
            Actividades — {materia.nombre} <span style={{ fontWeight: 400, color: 'var(--gray-400)' }}>· {materia.grupo}</span>
          </>
        ) : (
          'Actividades'
        )
      }
      actions={
        <button
          className="btn btn-primary btn-sm"
          onClick={() => navigate(`/actividades/nueva?materia=${claveMateria}`)}
          disabled={!claveMateria}
        >
          <Plus className="icon-sm" />
          Publicar actividad
        </button>
      }
    >
      <div className="toolbar">
        <SelectorSemestre semestres={semestres} value={semestre} onChange={cambiarSemestre} />
        {materias.length > 0 && (
          <select className="select-input" value={claveMateria} onChange={(e) => cambiarMateria(e.target.value)}>
            {materias.map((m) => (
              <option key={m.id_materia} value={m.clave}>
                {m.clave} — {m.nombre} · {m.grupo}
              </option>
            ))}
          </select>
        )}
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
      ) : (
        <div className="card">
          {materiasListas && materias.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title={semestre ? `Sin materias en el semestre ${semestre}` : 'Sin materias registradas'}
              description={semestre ? 'Elige otro semestre o crea una materia en este.' : 'Crea una materia para poder publicar actividades.'}
            />
          ) : actividades.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Sin actividades publicadas"
              description="Publica una actividad para esta materia desde el botón superior."
            />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Actividad</th>
                    <th>Tipo</th>
                    <th>Evaluación</th>
                    <th>Dirigida a</th>
                    <th>Entrega</th>
                    <th>Fecha límite</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {actividades.map((a) => (
                    <tr key={a.id_actividad} className="clickable-row" onClick={() => navigate(`/actividades/${a.id_actividad}`)}>
                      <td className="td-bold">
                        {a.titulo}
                        {!!a.programada && (
                          <span className="text-xs" style={{ color: 'var(--gray-400)', marginLeft: 6 }}>
                            (programada)
                          </span>
                        )}
                      </td>
                      <td>
                        <Badge variant={TIPO_VARIANT[a.tipo] ?? 'gray'}>{TIPO_LABEL[a.tipo] ?? a.tipo}</Badge>
                      </td>
                      <td className="text-sm">{a.tipo_evaluacion || '—'}</td>
                      <td className="text-sm">{a.todos_los_equipos ? 'Todos los equipos' : a.equipo_nombre ?? '—'}</td>
                      <td>
                        {a.entrega_por_equipo ? (
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
                      <td className="text-sm">{formatFecha(a.fecha_limite)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <ActionButtons
                          onView={() => navigate(`/actividades/${a.id_actividad}`)}
                          onEdit={() => navigate(`/actividades/${a.id_actividad}/editar`)}
                          onDelete={() => setActividadADesactivar(a)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {actividadADesactivar && (
        <ConfirmDialog
          titulo="Desactivar actividad"
          textoConfirmar="Desactivar"
          mensajeError="No se pudo desactivar la actividad"
          onCancelar={() => setActividadADesactivar(null)}
          onConfirmar={handleConfirmarDesactivar}
        >
          La actividad <strong>{actividadADesactivar.titulo}</strong> dejará de aparecer para ti y para los alumnos.
          Sus entregas y calificaciones se conservan en la base de datos, pero ya no podrás consultarlas desde el
          sistema. Esta acción no se puede deshacer desde la aplicación.
        </ConfirmDialog>
      )}
    </PageWrapper>
  )
}
