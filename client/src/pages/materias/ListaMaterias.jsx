// Pantalla 03 — Lista de Materias
// Rol: Profesor / Administrador
// URL: /materias
// Descripción: Muestra las materias por semestre, permite crear y editar unidades de aprendizaje.

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, BookOpen, Loader2, ChevronRight } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import Badge from '../../components/ui/Badge'
import ActionButtons from '../../components/ui/ActionButtons'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import EmptyState from '../../components/ui/EmptyState'
import { useAuth } from '../../context/AuthContext'
import * as materiasService from '../../services/materias.service'
import * as semestresService from '../../services/semestres.service'
import * as usuariosService from '../../services/usuarios.service'
import { REGLAS_REPETICION } from '../../utils/reglaRepeticion'

const VARIANT_POR_ESTATUS = { Activa: 'green', 'En curso': 'yellow', Cerrada: 'gray' }

// Configuración de equipos de la materia (migración 008). Los valores por defecto
// reproducen el comportamiento original: equipos automáticos de 3, manuales de 3 o 4.
const TOPE_INTEGRANTES = 10
const TIPOS_EQUIPO = [
  { campo: 'usa_practica', label: 'Práctica' },
  { campo: 'usa_tarea', label: 'Tarea' },
  { campo: 'usa_proyecto', label: 'Proyecto' },
]

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

  // La configuración de equipos solo la define el Profesor; el Administrador no la ve ni la
  // manda, y el servidor conserva los valores actuales.
  const [verAjustes, setVerAjustes] = useState(false)
  const [tamanoAuto, setTamanoAuto] = useState(String(inicial?.equipo_tamano_auto ?? 3))
  const [minIntegrantes, setMinIntegrantes] = useState(String(inicial?.equipo_min ?? 3))
  const [maxIntegrantes, setMaxIntegrantes] = useState(String(inicial?.equipo_max ?? 4))
  const [reglaRepeticion, setReglaRepeticion] = useState(inicial?.regla_repeticion ?? 'B')
  const tiposUsados = {
    usa_practica: Boolean(inicial?.usa_practica ?? true),
    usa_tarea: Boolean(inicial?.usa_tarea ?? true),
    usa_proyecto: Boolean(inicial?.usa_proyecto ?? true),
  }
  // Con equipos activos el servidor solo permite ampliar el máximo (409 en otro caso).
  const conEquipos = esEdicion && Number(inicial?.total_equipos ?? 0) > 0
  const maxActual = Number(inicial?.equipo_max ?? 4)

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

    const tamano = Number(tamanoAuto)
    const min = Number(minIntegrantes)
    const max = Number(maxIntegrantes)
    if (!esAdmin) {
      const enteros = [tamano, min, max].every((n) => Number.isInteger(n))
      if (!enteros || !(min >= 1 && min <= tamano && tamano <= max && max <= TOPE_INTEGRANTES)) {
        setVerAjustes(true)
        setError(`Configuración de equipos: debe cumplirse 1 ≤ mínimo ≤ tamaño automático ≤ máximo ≤ ${TOPE_INTEGRANTES}`)
        return
      }
    }

    setLoading(true)
    try {
      const payload = { clave, nombre, grupo, id_semestre: Number(idSemestre) }
      if (esAdmin) payload.id_profesor = Number(idProfesor)
      if (!esAdmin) {
        Object.assign(payload, {
          equipo_tamano_auto: tamano,
          equipo_min: min,
          equipo_max: max,
          regla_repeticion: reglaRepeticion,
          ...tiposUsados,
        })
      }

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

        {!esAdmin && (
          <div className="mb16" style={{ border: '1px solid var(--gray-200)', borderRadius: 'var(--r-input)' }}>
            <button
              type="button"
              onClick={() => setVerAjustes((v) => !v)}
              aria-expanded={verAjustes}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '10px 12px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--gray-800)',
                fontFamily: 'inherit',
              }}
            >
              <ChevronRight className={`icon-sm accordion-chevron${verAjustes ? ' expanded' : ''}`} />
              Configuración de equipos
              <span className="text-xs" style={{ fontWeight: 400 }}>
                (equipos de {tamanoAuto}; de {minIntegrantes} a {maxIntegrantes} integrantes
                {reglaRepeticion === 'A' ? '; sin repetir entre bloques' : ''})
              </span>
            </button>

            {verAjustes && (
              <div style={{ padding: '4px 12px 12px' }}>
                <p className="text-sm mb12">
                  La asignación automática forma equipos del tamaño indicado; el alta y la edición manual admiten
                  entre el mínimo y el máximo, para acomodar a los alumnos que sobren.
                </p>
                {conEquipos && (
                  <p className="text-sm mb12" style={{ color: 'var(--yellow)' }}>
                    Esta materia tiene equipos activos: desactívalos para cambiar el tamaño, el mínimo o la regla de
                    repetición. El máximo solo se puede ampliar.
                  </p>
                )}
                <div className="form-row-3">
                  <div className="form-group">
                    <label className="form-label" htmlFor="equipo_tamano_auto">
                      Tamaño en la asignación automática
                    </label>
                    <input
                      id="equipo_tamano_auto"
                      type="number"
                      min={1}
                      max={TOPE_INTEGRANTES}
                      className="form-control"
                      value={tamanoAuto}
                      disabled={conEquipos}
                      onChange={(e) => setTamanoAuto(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="equipo_min">
                      Mínimo de integrantes
                    </label>
                    <input
                      id="equipo_min"
                      type="number"
                      min={1}
                      max={TOPE_INTEGRANTES}
                      className="form-control"
                      value={minIntegrantes}
                      disabled={conEquipos}
                      onChange={(e) => setMinIntegrantes(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="equipo_max">
                      Máximo de integrantes
                    </label>
                    <input
                      id="equipo_max"
                      type="number"
                      min={conEquipos ? maxActual : 1}
                      max={TOPE_INTEGRANTES}
                      className="form-control"
                      value={maxIntegrantes}
                      onChange={(e) => setMaxIntegrantes(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="regla_repeticion">
                    Regla de repetición de alumnos
                  </label>
                  <select
                    id="regla_repeticion"
                    className="form-control"
                    value={reglaRepeticion}
                    disabled={conEquipos}
                    onChange={(e) => setReglaRepeticion(e.target.value)}
                  >
                    {REGLAS_REPETICION.map((r) => (
                      <option key={r.valor} value={r.valor}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs" style={{ marginTop: 6 }}>
                    En ambos casos Práctica y Tarea son el mismo equipo, y cada alumno solo ve las actividades de sus
                    equipos activos: sin equipo de un tipo, no ve las actividades de ese tipo. Con la segunda opción,
                    además, un alumno no puede estar en los dos bloques (Práctica/Tarea y Proyecto): quien está en uno
                    no puede estar en el otro.
                  </p>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <span className="form-label">
                    Tipos de equipo que usa la materia <span className="text-xs">(próximamente)</span>
                  </span>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {TIPOS_EQUIPO.map((t) => (
                      <label key={t.campo} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                        <input type="checkbox" checked={tiposUsados[t.campo]} disabled readOnly />
                        {t.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

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
