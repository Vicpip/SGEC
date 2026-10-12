// Pantalla 07 — Lista de Alumnos del Grupo
// Rol: Profesor
// URL: /alumnos?materia=:clave
// Descripción: Lista de alumnos inscritos en la materia/grupo, con alta manual, edición de
// datos (el correo institucional no se edita) y baja de la materia (lógica, con confirmación).

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { Search, Upload, Users, Loader2, FileDown, UserPlus, X, KeyRound } from 'lucide-react'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import PageWrapper from '../../components/layout/PageWrapper'
import Badge from '../../components/ui/Badge'
import ActionButtons from '../../components/ui/ActionButtons'
import EmptyState from '../../components/ui/EmptyState'
import CredencialesTemporales from '../../components/ui/CredencialesTemporales'
import SelectorSemestre from '../../components/ui/SelectorSemestre'
import { useSelectorMateria } from '../../hooks/useSelectorMateria'
import * as alumnosService from '../../services/alumnos.service'

const PLANTILLA_ENCABEZADOS = ['boleta', 'nombre', 'apellido_paterno', 'apellido_materno', 'grupo', 'correo_institucional', 'carrera']
const PLANTILLA_EJEMPLO = ['2020630001', 'Juan', 'Pérez', 'López', '4CM1', 'jperez@alumno.ipn.mx', 'Ingeniería en Sistemas Computacionales']

const FORM_INICIAL = { boleta: '', nombre: '', apellido_paterno: '', apellido_materno: '', grupo: '', correo: '', carrera: '' }

function formDesdeAlumno(alumno) {
  return {
    boleta: alumno.boleta ?? '',
    nombre: alumno.nombre ?? '',
    apellido_paterno: alumno.apellido_paterno ?? '',
    apellido_materno: alumno.apellido_materno ?? '',
    grupo: alumno.grupo ?? '',
    correo: alumno.correo_institucional ?? '',
    carrera: alumno.carrera ?? '',
  }
}

function descargarPlantilla() {
  const hoja = XLSX.utils.aoa_to_sheet([PLANTILLA_ENCABEZADOS, PLANTILLA_EJEMPLO])
  const libro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(libro, hoja, 'Alumnos')
  XLSX.writeFile(libro, 'plantilla_alumnos.xlsx')
}

// Alta manual (sin `alumno`) o edición de datos (con `alumno`). En edición el correo
// institucional se muestra bloqueado: es la identidad de la cuenta y no se puede cambiar.
function AlumnoModal({ claveMateria, alumno, onClose, onCreado, onEditado }) {
  const esEdicion = Boolean(alumno)
  const [form, setForm] = useState(esEdicion ? formDesdeAlumno(alumno) : FORM_INICIAL)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function actualizarCampo(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!form.boleta.trim() || !form.nombre.trim() || !form.apellido_paterno.trim() || !form.grupo.trim() || !form.correo.trim()) {
      setError('Completa los campos requeridos')
      return
    }

    const datos = {
      boleta: form.boleta.trim(),
      nombre: form.nombre.trim(),
      apellido_paterno: form.apellido_paterno.trim(),
      apellido_materno: form.apellido_materno.trim() || undefined,
      grupo: form.grupo.trim(),
      carrera: form.carrera.trim() || undefined,
    }

    setLoading(true)
    try {
      if (esEdicion) {
        await alumnosService.actualizarAlumno(alumno.id_alumno, datos)
        onEditado()
      } else {
        const data = await alumnosService.crearAlumno(claveMateria, { ...datos, correo: form.correo.trim() })
        onCreado(data.credenciales ?? [])
      }
    } catch (err) {
      const detalle = err.response?.data?.errores?.[0]
      setError(
        detalle ||
          err.response?.data?.error ||
          (esEdicion ? 'No se pudieron guardar los cambios' : 'No se pudo dar de alta al alumno')
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="card-header">
          <span className="card-title">{esEdicion ? 'Editar alumno' : 'Nuevo alumno'}</span>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar">
            <X className="icon-sm" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="card-body">
            {error && (
              <div className="login-error" style={{ marginBottom: 12 }}>
                {error}
              </div>
            )}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="alumno-boleta">
                  Boleta
                </label>
                <input
                  id="alumno-boleta"
                  className="form-control"
                  placeholder="10 dígitos"
                  value={form.boleta}
                  onChange={(e) => actualizarCampo('boleta', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="alumno-grupo">
                  Grupo
                </label>
                <input
                  id="alumno-grupo"
                  className="form-control"
                  placeholder="4CM1"
                  value={form.grupo}
                  onChange={(e) => actualizarCampo('grupo', e.target.value)}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="alumno-nombre">
                  Nombre(s)
                </label>
                <input
                  id="alumno-nombre"
                  className="form-control"
                  value={form.nombre}
                  onChange={(e) => actualizarCampo('nombre', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="alumno-apellido-paterno">
                  Apellido paterno
                </label>
                <input
                  id="alumno-apellido-paterno"
                  className="form-control"
                  value={form.apellido_paterno}
                  onChange={(e) => actualizarCampo('apellido_paterno', e.target.value)}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="alumno-apellido-materno">
                  Apellido materno
                </label>
                <input
                  id="alumno-apellido-materno"
                  className="form-control"
                  value={form.apellido_materno}
                  onChange={(e) => actualizarCampo('apellido_materno', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="alumno-correo">
                  Correo institucional
                </label>
                <input
                  id="alumno-correo"
                  className="form-control"
                  placeholder="alumno@alumno.ipn.mx"
                  value={form.correo}
                  disabled={esEdicion}
                  title={esEdicion ? 'El correo institucional no se puede editar' : undefined}
                  onChange={(e) => actualizarCampo('correo', e.target.value)}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="alumno-carrera">
                Carrera <span style={{ fontWeight: 400, color: 'var(--gray-400)' }}>(opcional)</span>
              </label>
              <input
                id="alumno-carrera"
                className="form-control"
                placeholder="Ingeniería en Sistemas Computacionales"
                maxLength={100}
                value={form.carrera}
                onChange={(e) => actualizarCampo('carrera', e.target.value)}
              />
            </div>
            {esEdicion && (
              <div className="text-xs">
                El correo institucional no se puede editar. Los cambios se aplican a la cuenta del alumno, así que
                también los verán sus otros profesores.
              </div>
            )}
          </div>
          <div className="card-header" style={{ borderTop: '1px solid var(--gray-100)', borderBottom: 'none' }}>
            <div className="form-actions" style={{ width: '100%' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <Loader2 className="icon-sm spin" /> : esEdicion ? 'Guardar cambios' : 'Dar de alta'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

// Muestra una sola vez las contraseñas temporales recién generadas (alta manual o
// "Restablecer acceso"). Solo se cierra con el botón, no con un clic fuera del cuadro,
// para no perderlas por accidente.
function CredencialesModal({ titulo, credenciales, onClose }) {
  return (
    <div className="modal-overlay">
      <div className="modal modal-wide">
        <div className="card-header">
          <span className="card-title">{titulo}</span>
        </div>
        <div className="card-body">
          <CredencialesTemporales credenciales={credenciales} />
        </div>
        <div className="card-header" style={{ borderTop: '1px solid var(--gray-100)', borderBottom: 'none' }}>
          <div className="form-actions" style={{ width: '100%' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Ya las guardé, cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Confirmación previa a regenerar la contraseña temporal de un alumno: la contraseña que
// tenga en ese momento deja de servir.
function RestablecerAccesoModal({ alumno, onClose, onRestablecido }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleConfirmar() {
    setLoading(true)
    setError('')
    try {
      const credenciales = await alumnosService.restablecerAcceso(alumno.id_alumno)
      onRestablecido(credenciales)
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo restablecer el acceso')
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={loading ? undefined : onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="card-header">
          <span className="card-title">Restablecer acceso</span>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar" disabled={loading}>
            <X className="icon-sm" />
          </button>
        </div>
        <div className="card-body" style={{ fontSize: 13, color: 'var(--gray-600)', lineHeight: 1.6 }}>
          Se generará una contraseña temporal nueva para{' '}
          <strong>
            {alumno.nombre} {alumno.apellido_paterno}
          </strong>{' '}
          ({alumno.boleta}). Su contraseña actual dejará de funcionar y deberá cambiar la temporal al iniciar sesión.
          {error && (
            <div className="login-error" style={{ marginTop: 12 }}>
              {error}
            </div>
          )}
        </div>
        <div className="card-header" style={{ borderTop: '1px solid var(--gray-100)', borderBottom: 'none' }}>
          <div className="form-actions" style={{ width: '100%' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="button" className="btn btn-primary" onClick={handleConfirmar} disabled={loading}>
              {loading ? <Loader2 className="icon-sm spin" /> : 'Generar contraseña temporal'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ListaAlumnos() {
  const navigate = useNavigate()
  const { claveMateria, cambiarMateria, semestres, semestre, cambiarSemestre, materias, materiasListas } = useSelectorMateria()
  // Numera las cargas para descartar la respuesta de una materia que ya no es la elegida.
  const solicitudRef = useRef(0)

  const [materia, setMateria] = useState(null)
  const [alumnos, setAlumnos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [alumnoARestablecer, setAlumnoARestablecer] = useState(null)
  const [alumnoAEditar, setAlumnoAEditar] = useState(null)
  const [alumnoABaja, setAlumnoABaja] = useState(null)
  // { titulo, lista } mientras se muestran contraseñas temporales recién generadas.
  const [credenciales, setCredenciales] = useState(null)

  function cargarAlumnos() {
    const solicitud = ++solicitudRef.current
    // Mientras se carga la lista de materias del semestre elegido no se pide nada: la
    // materia de la URL puede pertenecer todavía al semestre anterior.
    if (!materiasListas) {
      setLoading(true)
      return
    }
    if (!claveMateria) {
      // Sin materia elegida (el semestre filtrado no tiene materias): no hay nada que listar.
      setAlumnos([])
      setMateria(null)
      setError('')
      setLoading(false)
      return
    }
    setLoading(true)
    return alumnosService
      .listarAlumnos(claveMateria)
      .then((data) => {
        if (solicitud !== solicitudRef.current) return
        setAlumnos(data.alumnos)
        setMateria(data.materia)
        setError('')
      })
      .catch((err) => {
        if (solicitud !== solicitudRef.current) return
        setError(err.response?.data?.error || 'No se pudieron cargar los alumnos')
        setAlumnos([])
        setMateria(null)
      })
      .finally(() => {
        if (solicitud === solicitudRef.current) setLoading(false)
      })
  }

  useEffect(() => {
    cargarAlumnos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveMateria, materiasListas])

  const alumnosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()
    if (!termino) return alumnos
    return alumnos.filter((a) => {
      const nombreCompleto = `${a.apellido_paterno} ${a.apellido_materno ?? ''} ${a.nombre}`.toLowerCase()
      return nombreCompleto.includes(termino) || a.boleta.toLowerCase().includes(termino)
    })
  }, [alumnos, busqueda])

  function handleCambioMateria(e) {
    cambiarMateria(e.target.value)
  }

  function handleAlumnoCreado(nuevas) {
    setModalAbierto(false)
    if (nuevas.length > 0) {
      setCredenciales({ titulo: 'Alumno dado de alta', lista: nuevas })
    }
    cargarAlumnos()
  }

  function handleAlumnoEditado() {
    setAlumnoAEditar(null)
    cargarAlumnos()
  }

  async function handleConfirmarBaja() {
    await alumnosService.darDeBajaAlumno(alumnoABaja.id_alumno, claveMateria)
    setAlumnoABaja(null)
    cargarAlumnos()
  }

  function handleAccesoRestablecido(nuevas) {
    setAlumnoARestablecer(null)
    setCredenciales({ titulo: 'Acceso restablecido', lista: nuevas })
  }

  return (
    <PageWrapper
      title={
        materia ? (
          <>
            Alumnos — {materia.nombre}{' '}
            <span style={{ fontWeight: 400, color: 'var(--gray-400)' }}>· {materia.grupo}</span>
          </>
        ) : (
          'Alumnos'
        )
      }
      actions={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={descargarPlantilla}>
            <FileDown className="icon-sm" />
            Descargar plantilla
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate(`/alumnos/importar?materia=${claveMateria}`)}
            disabled={!claveMateria}
          >
            <Upload className="icon-sm" />
            Importar
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setModalAbierto(true)} disabled={!claveMateria}>
            <UserPlus className="icon-sm" />
            Alumno
          </button>
        </div>
      }
    >
      <div className="toolbar">
        <div className="search-wrap">
          <Search className="icon-sm" />
          <input
            className="search-input"
            placeholder="Buscar por nombre o boleta…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <SelectorSemestre semestres={semestres} value={semestre} onChange={cambiarSemestre} />
        {materias.length > 0 && (
          <select className="select-input" value={claveMateria} onChange={handleCambioMateria}>
            {materias.map((m) => (
              <option key={m.id_materia} value={m.clave}>
                {m.clave} — {m.nombre} · {m.grupo}
              </option>
            ))}
          </select>
        )}
        <div style={{ marginLeft: 'auto' }}>
          <Badge variant="blue" style={{ padding: '6px 12px' }}>
            {alumnos.length} alumnos
          </Badge>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <Loader2 className="icon-xl spin" style={{ color: 'var(--blue)' }} />
            </div>
          ) : error ? (
            <div style={{ padding: 24, color: 'var(--red)', fontSize: 13 }}>{error}</div>
          ) : materias.length === 0 ? (
            <EmptyState
              icon={Users}
              title={semestre ? `Sin materias en el semestre ${semestre}` : 'Sin materias registradas'}
              description={semestre ? 'Elige otro semestre o crea una materia en este.' : 'Crea una materia para poder inscribir alumnos.'}
            />
          ) : alumnosFiltrados.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Sin alumnos inscritos"
              description="Importa una lista desde Excel o da de alta un alumno para este grupo."
            />
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Boleta</th>
                  <th>Nombre completo</th>
                  <th>Correo institucional</th>
                  <th>Grupo</th>
                  <th>Carrera</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {alumnosFiltrados.map((al, i) => (
                  <tr key={al.id_alumno}>
                    <td className="text-xs">{i + 1}</td>
                    <td className="td-bold">{al.boleta}</td>
                    <td className="td-bold">
                      {al.apellido_paterno} {al.apellido_materno ?? ''}, {al.nombre}
                    </td>
                    <td className="text-sm">{al.correo_institucional}</td>
                    <td>{al.grupo}</td>
                    <td className="text-sm">{al.carrera ?? '—'}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <ActionButtons
                          onView={() => navigate(`/alumnos/${al.id_alumno}/actividades`)}
                          onEdit={() => setAlumnoAEditar(al)}
                          onDelete={() => setAlumnoABaja(al)}
                        />
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setAlumnoARestablecer(al)}
                          disabled={!al.acceso_pendiente}
                          title={
                            al.acceso_pendiente
                              ? 'Generar una contraseña temporal nueva para este alumno'
                              : 'El alumno ya activó su cuenta: debe usar "Olvidé mi contraseña" o pedir el restablecimiento al Administrador'
                          }
                        >
                          <KeyRound className="icon-sm" />
                          Restablecer acceso
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modalAbierto && (
        <AlumnoModal claveMateria={claveMateria} onClose={() => setModalAbierto(false)} onCreado={handleAlumnoCreado} />
      )}

      {alumnoAEditar && (
        <AlumnoModal alumno={alumnoAEditar} onClose={() => setAlumnoAEditar(null)} onEditado={handleAlumnoEditado} />
      )}

      {alumnoABaja && (
        <ConfirmDialog
          titulo="Dar de baja de la materia"
          textoConfirmar="Dar de baja"
          mensajeError="No se pudo dar de baja al alumno"
          onCancelar={() => setAlumnoABaja(null)}
          onConfirmar={handleConfirmarBaja}
        >
          <strong>
            {alumnoABaja.nombre} {alumnoABaja.apellido_paterno}
          </strong>{' '}
          ({alumnoABaja.boleta}) dejará de estar inscrito en <strong>{materia?.nombre ?? claveMateria}</strong> y ya no
          verá sus actividades ni avisos. Su cuenta, sus entregas y sus calificaciones se conservan; puedes volver a
          inscribirlo después con «Alumno» o importando el Excel. Si pertenece a un equipo activo de esta materia,
          primero tendrás que editar o desactivar ese equipo.
        </ConfirmDialog>
      )}

      {alumnoARestablecer && (
        <RestablecerAccesoModal
          alumno={alumnoARestablecer}
          onClose={() => setAlumnoARestablecer(null)}
          onRestablecido={handleAccesoRestablecido}
        />
      )}

      {credenciales && (
        <CredencialesModal
          titulo={credenciales.titulo}
          credenciales={credenciales.lista}
          onClose={() => setCredenciales(null)}
        />
      )}
    </PageWrapper>
  )
}
