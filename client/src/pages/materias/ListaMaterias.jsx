// Pantalla 03 — Lista de Materias
// Rol: Profesor / Administrador
// URL: /materias
// Descripción: Muestra las materias por semestre, permite crear y editar unidades de aprendizaje.

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, BookOpen, Loader2 } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import Badge from '../../components/ui/Badge'
import ActionButtons from '../../components/ui/ActionButtons'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import EmptyState from '../../components/ui/EmptyState'
import { useAuth } from '../../context/AuthContext'
import * as materiasService from '../../services/materias.service'
import * as semestresService from '../../services/semestres.service'
import * as usuariosService from '../../services/usuarios.service'

const VARIANT_POR_ESTATUS = { Activa: 'green', 'En curso': 'yellow', Cerrada: 'gray' }

function MateriaForm({ inicial, semestres, profesores, esAdmin, onCancel, onSaved }) {
  const esEdicion = Boolean(inicial?.id_materia)
  const [clave, setClave] = useState(inicial?.clave ?? '')
  const [nombre, setNombre] = useState(inicial?.nombre ?? '')
  const [grupo, setGrupo] = useState(inicial?.grupo ?? '')
  const [idSemestre, setIdSemestre] = useState(inicial?.id_semestre ?? semestres[0]?.id_semestre ?? '')
  const [idProfesor, setIdProfesor] = useState(inicial?.id_profesor ?? profesores[0]?.id_profesor ?? '')
  const [estatus, setEstatus] = useState(inicial?.estatus ?? 'Activa')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!clave || !nombre || !grupo || !idSemestre) {
      setError('Completa clave, nombre, grupo y semestre')
      return
    }
    if (esAdmin && !idProfesor) {
      setError('Selecciona el profesor de la materia')
      return
    }

    setLoading(true)
    try {
      const payload = { clave, nombre, grupo, id_semestre: Number(idSemestre) }
      if (esAdmin) payload.id_profesor = Number(idProfesor)

      if (esEdicion) {
        await materiasService.actualizarMateria(inicial.id_materia, { ...payload, estatus })
      } else {
        await materiasService.crearMateria(payload)
      }
      onSaved()
    } catch (err) {
      const detalle = err.response?.data?.errores?.[0]
      setError(detalle || err.response?.data?.error || 'No se pudo guardar la materia')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="card mb20" onSubmit={handleSubmit}>
      <div className="card-header">
        <span className="card-title">{esEdicion ? 'Editar materia' : 'Nueva materia'}</span>
      </div>
      <div className="card-body">
        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="clave">
              Clave
            </label>
            <input
              id="clave"
              className="form-control"
              placeholder="TC-401"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="grupo">
              Grupo
            </label>
            <input
              id="grupo"
              className="form-control"
              placeholder="4BM1"
              value={grupo}
              onChange={(e) => setGrupo(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="semestre">
              Semestre
            </label>
            <select
              id="semestre"
              className="form-control"
              value={idSemestre}
              onChange={(e) => setIdSemestre(e.target.value)}
            >
              {semestres.map((s) => (
                <option key={s.id_semestre} value={s.id_semestre}>
                  {s.clave}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group" style={{ flex: 2 }}>
            <label className="form-label" htmlFor="nombre">
              Nombre de la materia
            </label>
            <input
              id="nombre"
              className="form-control"
              placeholder="Teoría de la Computación"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>
          {esAdmin && (
            <div className="form-group">
              <label className="form-label" htmlFor="profesor">
                Profesor
              </label>
              <select
                id="profesor"
                className="form-control"
                value={idProfesor}
                onChange={(e) => setIdProfesor(e.target.value)}
              >
                {profesores.map((p) => (
                  <option key={p.id_profesor} value={p.id_profesor}>
                    {p.nombre} {p.apellido_paterno}
                  </option>
                ))}
              </select>
            </div>
          )}
          {esEdicion && (
            <div className="form-group">
              <label className="form-label" htmlFor="estatus">
                Estatus
              </label>
              <select id="estatus" className="form-control" value={estatus} onChange={(e) => setEstatus(e.target.value)}>
                <option value="Activa">Activa</option>
                <option value="En curso">En curso</option>
                <option value="Cerrada">Cerrada</option>
              </select>
            </div>
          )}
        </div>

        {error && (
          <div className="login-error" style={{ marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={loading}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <Loader2 className="icon-sm spin" /> : 'Guardar'}
          </button>
        </div>
      </div>
    </form>
  )
}

export default function ListaMaterias() {
  const navigate = useNavigate()
  const { rol } = useAuth()
  const esAdmin = rol === 'Administrador'

  const [materias, setMaterias] = useState([])
  const [semestres, setSemestres] = useState([])
  const [profesores, setProfesores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtroSemestre, setFiltroSemestre] = useState('todos')
  const [formMateria, setFormMateria] = useState(null) // null = oculto, {} = crear, {...} = editar
  const [materiaACerrar, setMateriaACerrar] = useState(null)

  async function cargar() {
    setLoading(true)
    try {
      const params = filtroSemestre !== 'todos' ? { semestre: filtroSemestre } : {}
      const data = await materiasService.listarMaterias(params)
      setMaterias(data)
      setError('')
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudieron cargar las materias')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    semestresService.listarSemestres().then(setSemestres).catch(() => {})
    if (esAdmin) {
      usuariosService.listarProfesores().then(setProfesores).catch(() => {})
    }
  }, [esAdmin])

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroSemestre])

  function handleSaved() {
    setFormMateria(null)
    cargar()
  }

  async function handleConfirmarCerrar() {
    await materiasService.desactivarMateria(materiaACerrar.id_materia)
    setMateriaACerrar(null)
    cargar()
  }

  const materiasFiltradas = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()
    if (!termino) return materias
    return materias.filter(
      (m) => m.clave.toLowerCase().includes(termino) || m.nombre.toLowerCase().includes(termino)
    )
  }, [materias, busqueda])

  return (
    <PageWrapper title="Materias">
      <div className="toolbar">
        <div className="search-wrap">
          <Search className="icon-sm" />
          <input
            className="search-input"
            placeholder="Buscar materia…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <select className="select-input" value={filtroSemestre} onChange={(e) => setFiltroSemestre(e.target.value)}>
          <option value="todos">Todos los semestres</option>
          {semestres.map((s) => (
            <option key={s.id_semestre} value={s.clave}>
              {s.clave}
            </option>
          ))}
        </select>
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn btn-primary" onClick={() => setFormMateria({})}>
            <Plus className="icon-sm" />
            Nueva materia
          </button>
        </div>
      </div>

      {formMateria !== null && (
        <MateriaForm
          inicial={formMateria}
          semestres={semestres}
          profesores={profesores}
          esAdmin={esAdmin}
          onCancel={() => setFormMateria(null)}
          onSaved={handleSaved}
        />
      )}

      <div className="card">
        <div className="table-wrap">
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <Loader2 className="icon-xl spin" style={{ color: 'var(--blue)' }} />
            </div>
          ) : error ? (
            <div style={{ padding: 24, color: 'var(--red)', fontSize: 13 }}>{error}</div>
          ) : materiasFiltradas.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="Sin materias registradas"
              description="Crea la primera materia para poder conformar equipos."
            />
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Clave</th>
                  <th>Materia</th>
                  <th>Grupo</th>
                  <th>Semestre</th>
                  <th>Alumnos</th>
                  <th>Equipos</th>
                  <th>Estatus</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {materiasFiltradas.map((m) => (
                  <tr key={m.id_materia}>
                    <td className="td-bold">{m.clave}</td>
                    <td
                      className="td-bold"
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/equipos?materia=${m.clave}`)}
                    >
                      {m.nombre}
                    </td>
                    <td>{m.grupo}</td>
                    <td>{m.semestre}</td>
                    <td>{m.total_alumnos}</td>
                    <td>{m.total_equipos}</td>
                    <td>
                      <Badge variant={VARIANT_POR_ESTATUS[m.estatus] ?? 'gray'}>{m.estatus}</Badge>
                    </td>
                    <td>
                      <ActionButtons
                        onEdit={() => setFormMateria(m)}
                        onDelete={m.estatus !== 'Cerrada' ? () => setMateriaACerrar(m) : undefined}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {materiaACerrar && (
        <ConfirmDialog
          titulo="Cerrar materia"
          textoConfirmar="Cerrar materia"
          mensajeError="No se pudo cerrar la materia"
          onCancelar={() => setMateriaACerrar(null)}
          onConfirmar={handleConfirmarCerrar}
        >
          La materia{' '}
          <strong>
            {materiaACerrar.clave} — {materiaACerrar.nombre} · {materiaACerrar.grupo}
          </strong>{' '}
          quedará con estatus «Cerrada»: sus alumnos dejarán de recibir tus avisos generales y ya no podrás
          restablecer su acceso por esta materia. Sus equipos, actividades y calificaciones se conservan. Puedes
          reabrirla después cambiando su estatus desde «Editar».
        </ConfirmDialog>
      )}
    </PageWrapper>
  )
}
