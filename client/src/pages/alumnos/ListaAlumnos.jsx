// Pantalla 07 — Lista de Alumnos del Grupo
// Rol: Profesor
// URL: /alumnos?materia=:clave
// Descripción: Lista de alumnos inscritos en la materia/grupo.

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, Upload, Users, Loader2 } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import Badge from '../../components/ui/Badge'
import ActionButtons from '../../components/ui/ActionButtons'
import EmptyState from '../../components/ui/EmptyState'
import * as alumnosService from '../../services/alumnos.service'
import * as materiasService from '../../services/materias.service'

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

  useEffect(() => {
    if (!claveMateria) return

    setLoading(true)
    alumnosService
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
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => navigate(`/alumnos/importar?materia=${claveMateria}`)}
          disabled={!claveMateria}
        >
          <Upload className="icon-sm" />
          Importar
        </button>
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
              description="Importa una lista desde Excel para dar de alta a los alumnos de este grupo."
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
    </PageWrapper>
  )
}
