// Pantalla 07 — Lista de Alumnos del Grupo
// Rol: Profesor
// URL: /alumnos?materia=:clave
// Descripción: Lista de alumnos inscritos en la materia/grupo.

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { Search, Upload, Users, Loader2, FileDown, UserPlus, X } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import Badge from '../../components/ui/Badge'
import ActionButtons from '../../components/ui/ActionButtons'
import EmptyState from '../../components/ui/EmptyState'
import * as alumnosService from '../../services/alumnos.service'
import * as materiasService from '../../services/materias.service'

const PLANTILLA_ENCABEZADOS = ['boleta', 'nombre', 'apellido_paterno', 'apellido_materno', 'grupo', 'correo_institucional']
const PLANTILLA_EJEMPLO = ['2020630001', 'Juan', 'Pérez', 'López', '4CM1', 'jperez@alumno.ipn.mx']

const FORM_INICIAL = { boleta: '', nombre: '', apellido_paterno: '', apellido_materno: '', grupo: '', correo: '' }

function descargarPlantilla() {
  const hoja = XLSX.utils.aoa_to_sheet([PLANTILLA_ENCABEZADOS, PLANTILLA_EJEMPLO])
  const libro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(libro, hoja, 'Alumnos')
  XLSX.writeFile(libro, 'plantilla_alumnos.xlsx')
}

function NuevoAlumnoModal({ claveMateria, onClose, onCreado }) {
  const [form, setForm] = useState(FORM_INICIAL)
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

    setLoading(true)
    try {
      await alumnosService.crearAlumno(claveMateria, {
        boleta: form.boleta.trim(),
        nombre: form.nombre.trim(),
        apellido_paterno: form.apellido_paterno.trim(),
        apellido_materno: form.apellido_materno.trim() || undefined,
        grupo: form.grupo.trim(),
        correo: form.correo.trim(),
      })
      onCreado()
    } catch (err) {
      const detalle = err.response?.data?.errores?.[0]
      setError(detalle || err.response?.data?.error || 'No se pudo dar de alta al alumno')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="card-header">
          <span className="card-title">Nuevo alumno</span>
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
                  onChange={(e) => actualizarCampo('correo', e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="card-header" style={{ borderTop: '1px solid var(--gray-100)', borderBottom: 'none' }}>
            <div className="form-actions" style={{ width: '100%' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <Loader2 className="icon-sm spin" /> : 'Dar de alta'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ListaAlumnos() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const claveMateria = searchParams.get('materia') ?? ''

  const [materias, setMaterias] = useState([])
  const [materia, setMateria] = useState(null)
  const [alumnos, setAlumnos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)

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

  function cargarAlumnos() {
    if (!claveMateria) return
    setLoading(true)
    return alumnosService
      .listarAlumnos(claveMateria)
      .then((data) => {
        setAlumnos(data.alumnos)
        setMateria(data.materia)
        setError('')
      })
      .catch((err) => {
        setError(err.response?.data?.error || 'No se pudieron cargar los alumnos')
        setAlumnos([])
        setMateria(null)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    cargarAlumnos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveMateria])

  const alumnosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()
    if (!termino) return alumnos
    return alumnos.filter((a) => {
      const nombreCompleto = `${a.apellido_paterno} ${a.apellido_materno ?? ''} ${a.nombre}`.toLowerCase()
      return nombreCompleto.includes(termino) || a.boleta.toLowerCase().includes(termino)
    })
  }, [alumnos, busqueda])

  function handleCambioMateria(e) {
    setSearchParams({ materia: e.target.value })
  }

  function handleAlumnoCreado() {
    setModalAbierto(false)
    cargarAlumnos()
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
              title="Sin materias registradas"
              description="Crea una materia para poder inscribir alumnos."
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
                      <ActionButtons onView={() => navigate(`/alumnos/${al.id_alumno}/actividades`)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modalAbierto && (
        <NuevoAlumnoModal
          claveMateria={claveMateria}
          onClose={() => setModalAbierto(false)}
          onCreado={handleAlumnoCreado}
        />
      )}
    </PageWrapper>
  )
}
