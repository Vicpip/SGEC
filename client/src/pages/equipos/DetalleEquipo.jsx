// Pantalla 06 — Detalle del Equipo
// Rol: Profesor
// URL: /equipos/:id
// Descripción: Integrantes del equipo y sus calificaciones por actividad. Esta vista es
// SOLO LECTURA para calificaciones — el registro y ajuste ocurre únicamente en
// BandejaEntregas.jsx (Sesión 9, fuente canónica).

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Check, Loader2, ClipboardList, Trash2 } from 'lucide-react'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import PageWrapper from '../../components/layout/PageWrapper'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import EmptyState from '../../components/ui/EmptyState'
import * as equiposService from '../../services/equipos.service'
import * as alumnosService from '../../services/alumnos.service'
import * as calificacionesService from '../../services/calificaciones.service'

const TIPO_ACTIVIDAD_VARIANT = { 'En clase': 'gray', Practica: 'blue', Tarea: 'navy', Proyecto: 'orange' }
const TIPO_ACTIVIDAD_LABEL = { 'En clase': 'En clase', Practica: 'Práctica', Tarea: 'Tarea', Proyecto: 'Proyecto' }

const TIPO_VARIANT = { Practica: 'blue', Tarea: 'navy', Proyecto: 'orange' }
const TIPO_LABEL = { Practica: 'Práctica', Tarea: 'Tarea', Proyecto: 'Proyecto' }
const TIPOS_ESPEJO = ['Practica', 'Tarea']

function tiposExcluidos(tipo) {
  return TIPOS_ESPEJO.includes(tipo) ? TIPOS_ESPEJO : [tipo]
}

function iniciales(persona) {
  return `${persona.nombre?.[0] ?? ''}${persona.apellido_paterno?.[0] ?? ''}`.toUpperCase()
}

export default function DetalleEquipo() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [equipo, setEquipo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [editando, setEditando] = useState(false)
  const [nombreEdit, setNombreEdit] = useState('')
  const [seleccion, setSeleccion] = useState([])
  const [alumnosMateria, setAlumnosMateria] = useState([])
  const [equiposMateria, setEquiposMateria] = useState([])
  const [guardando, setGuardando] = useState(false)
  const [actividadesCalificadas, setActividadesCalificadas] = useState([])
  const [confirmarBaja, setConfirmarBaja] = useState(false)

  async function handleConfirmarDesactivar() {
    await equiposService.desactivarEquipo(equipo.id_equipo)
    navigate(`/equipos?materia=${equipo.materia_clave}`)
  }

  function cargar() {
    setLoading(true)
    equiposService
      .obtenerEquipo(id)
      .then((data) => {
        setEquipo(data)
        setError('')
      })
      .catch((err) => {
        setError(err.response?.data?.error || 'No se pudo cargar el equipo')
        setEquipo(null)
      })
      .finally(() => setLoading(false))

    calificacionesService
      .listarCalificacionesDeEquipo(id)
      .then((data) => setActividadesCalificadas(data.actividades))
      .catch(() => setActividadesCalificadas([]))
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function iniciarEdicion() {
    if (!equipo) return
    setNombreEdit(equipo.nombre)
    setSeleccion(equipo.integrantes.map((it) => it.id_alumno))
    setEditando(true)
    try {
      const [alumnosData, equiposData] = await Promise.all([
        alumnosService.listarAlumnos(equipo.materia_clave),
        equiposService.listarEquipos(equipo.materia_clave),
      ])
      setAlumnosMateria(alumnosData.alumnos)
      setEquiposMateria(equiposData.equipos)
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudieron cargar los alumnos de la materia')
    }
  }

  const elegibles = useMemo(() => {
    if (!equipo) return []
    const tiposAExcluir = tiposExcluidos(equipo.tipo)
    // Excluye tanto el propio equipo como su "espejo" (Practica/Tarea con el mismo
    // nombre comparten integrantes, ver CLAUDE.md) — de lo contrario sus propios
    // integrantes aparecerían como ya ocupados y desaparecerían del pool elegible.
    const idsConEquipo = new Set(
      equiposMateria
        .filter((eq) => tiposAExcluir.includes(eq.tipo) && eq.id_equipo !== equipo.id_equipo && eq.nombre !== equipo.nombre)
        .flatMap((eq) => eq.integrantes.map((it) => it.id_alumno))
    )
    return alumnosMateria.filter((al) => !idsConEquipo.has(al.id_alumno))
  }, [alumnosMateria, equiposMateria, equipo])

  function toggleSeleccion(idAlumno) {
    setSeleccion((prev) => {
      if (prev.includes(idAlumno)) return prev.filter((id) => id !== idAlumno)
      if (prev.length >= 3) return prev
      return [...prev, idAlumno]
    })
  }

  async function handleGuardar() {
    if (!nombreEdit.trim() || seleccion.length !== 3) {
      setError('El equipo necesita un nombre y exactamente 3 integrantes')
      return
    }
    setGuardando(true)
    setError('')
    try {
      await equiposService.actualizarEquipo(id, { nombre: nombreEdit.trim(), integrantes: seleccion })
      setEditando(false)
      cargar()
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo actualizar el equipo')
    } finally {
      setGuardando(false)
    }
  }

  if (loading) {
    return (
      <PageWrapper title="Equipo">
        <div style={{ padding: 48, textAlign: 'center' }}>
          <Loader2 className="icon-xl spin" style={{ color: 'var(--blue)' }} />
        </div>
      </PageWrapper>
    )
  }

  if (!equipo) {
    return (
      <PageWrapper
        title="Equipo"
        actions={
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/equipos')}>
            <ArrowLeft className="icon-sm" />
            Volver
          </button>
        }
      >
        <div className="login-error">{error || 'Equipo no encontrado'}</div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper
      title={
        <>
          {equipo.nombre} <span style={{ fontWeight: 400, color: 'var(--gray-400)' }}>· {equipo.materia_nombre}</span>
        </>
      }
      actions={
        <>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/equipos?materia=${equipo.materia_clave}`)}>
            <ArrowLeft className="icon-sm" />
            Volver
          </button>
          {!editando && !!equipo.activo && (
            <>
              <button className="btn btn-primary btn-sm" onClick={iniciarEdicion}>
                <Pencil className="icon-sm" />
                Editar
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => setConfirmarBaja(true)}>
                <Trash2 className="icon-sm" />
                Desactivar
              </button>
            </>
          )}
        </>
      }
    >
      {error && (
        <div className="login-error" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div className="card mb20" style={{ overflow: 'hidden' }}>
        <div
          style={{
            background: 'linear-gradient(135deg,var(--navy) 0%,var(--blue) 100%)',
            padding: '20px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>{equipo.nombre}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)' }}>
              {equipo.materia_nombre} · {equipo.materia_grupo}
            </div>
          </div>
          <Badge variant={TIPO_VARIANT[equipo.tipo]}>{TIPO_LABEL[equipo.tipo]}</Badge>
        </div>
      </div>

      <div className="card mb20">
        <div className="card-header">
          <span className="card-title">Integrantes</span>
          <Badge variant="blue">{editando ? seleccion.length : equipo.integrantes.length} alumnos</Badge>
        </div>
        <div className="card-body" style={{ padding: 14 }}>
          {!editando ? (
            equipo.integrantes.map((it, i) => (
              <div key={it.id_alumno} className={`integrante-row${i < equipo.integrantes.length - 1 ? ' mb8' : ''}`}>
                <div className="integrante-info">
                  <Avatar initials={iniciales(it)} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {it.nombre} {it.apellido_paterno} {it.apellido_materno ?? ''}
                    </div>
                    <div className="text-xs">{it.boleta}</div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="nombre-equipo">
                  Nombre del equipo
                </label>
                <input
                  id="nombre-equipo"
                  className="form-control"
                  value={nombreEdit}
                  onChange={(e) => setNombreEdit(e.target.value)}
                />
              </div>
              {elegibles.map((al) => {
                const marcado = seleccion.includes(al.id_alumno)
                return (
                  <div
                    key={al.id_alumno}
                    className="integrante-row mb8"
                    style={{
                      cursor: 'pointer',
                      border: marcado ? '1px solid var(--blue)' : '1px solid transparent',
                      background: marcado ? 'var(--blue-light)' : 'transparent',
                      borderRadius: 10,
                    }}
                    onClick={() => toggleSeleccion(al.id_alumno)}
                  >
                    <div className="integrante-info">
                      <Avatar initials={iniciales(al)} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>
                          {al.nombre} {al.apellido_paterno} {al.apellido_materno ?? ''}
                        </div>
                        <div className="text-xs">{al.boleta}</div>
                      </div>
                    </div>
                    <input type="checkbox" checked={marcado} readOnly />
                  </div>
                )
              })}
              <div className="form-actions" style={{ marginTop: 12 }}>
                <button className="btn btn-secondary" onClick={() => setEditando(false)} disabled={guardando}>
                  Cancelar
                </button>
                <button className="btn btn-primary" onClick={handleGuardar} disabled={guardando || seleccion.length !== 3}>
                  {guardando ? <Loader2 className="icon-sm spin" /> : <Check className="icon-sm" />}
                  Guardar cambios
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Actividades y calificaciones del equipo</span>
        </div>
        {actividadesCalificadas.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Sin actividades todavía"
            description="Cuando el profesor publique actividades para este equipo, aparecerán aquí con su calificación."
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Actividad</th>
                  <th>Tipo</th>
                  <th>Integrante</th>
                  <th>Nota</th>
                </tr>
              </thead>
              <tbody>
                {actividadesCalificadas.flatMap((act) =>
                  equipo.integrantes.map((it) => {
                    const cal = act.calificaciones.find((c) => c.id_alumno === it.id_alumno)
                    return (
                      <tr key={`${act.id_actividad}-${it.id_alumno}`}>
                        <td className="td-bold">{act.titulo}</td>
                        <td>
                          <Badge variant={TIPO_ACTIVIDAD_VARIANT[act.tipo] ?? 'gray'}>{TIPO_ACTIVIDAD_LABEL[act.tipo] ?? act.tipo}</Badge>
                        </td>
                        <td>
                          {it.nombre} {it.apellido_paterno}
                        </td>
                        <td>
                          {cal ? (
                            <span style={{ fontWeight: 700, color: 'var(--navy)' }}>
                              {Number(cal.nota).toFixed(1)}
                              {cal.individual && (
                                <Badge variant="orange" style={{ marginLeft: 8 }}>
                                  Individual
                                </Badge>
                              )}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--gray-400)' }}>—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {confirmarBaja && (
        <ConfirmDialog
          titulo="Desactivar equipo"
          textoConfirmar="Desactivar"
          mensajeError="No se pudo desactivar el equipo"
          onCancelar={() => setConfirmarBaja(false)}
          onConfirmar={handleConfirmarDesactivar}
        >
          El equipo <strong>{equipo.nombre}</strong> ({TIPO_LABEL[equipo.tipo]}) quedará desactivado: sus integrantes
          volverán a estar disponibles para otro equipo de ese tipo y dejarán de recibir las actividades dirigidas
          a él. Las entregas y calificaciones ya registradas se conservan.
          {equipo.tipo !== 'Proyecto' && (
            <>
              {' '}
              Solo se desactiva este equipo: si existe su equipo gemelo de{' '}
              {equipo.tipo === 'Practica' ? 'Tarea' : 'Práctica'} con el mismo nombre, desactívalo por separado.
            </>
          )}
        </ConfirmDialog>
      )}
    </PageWrapper>
  )
}
