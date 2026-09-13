// Pantalla adicional — Gestión de Semestres (no es una de las 19 oficiales)
// Rol: Administrador
// URL: /admin/semestres
// Descripción: Alta y edición de períodos académicos (ej. 2026/1). Toda materia
// requiere un semestre existente, así que esta pantalla es el punto de partida
// del flujo semestre -> materia -> equipo.

import { useEffect, useState } from 'react'
import { Plus, CalendarRange, Loader2 } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import Badge from '../../components/ui/Badge'
import ActionButtons from '../../components/ui/ActionButtons'
import EmptyState from '../../components/ui/EmptyState'
import * as semestresService from '../../services/semestres.service'

function SemestreForm({ inicial, onCancel, onSaved }) {
  const esEdicion = Boolean(inicial?.id_semestre)
  const [clave, setClave] = useState(inicial?.clave ?? '')
  const [fechaInicio, setFechaInicio] = useState(inicial?.fecha_inicio ?? '')
  const [fechaFin, setFechaFin] = useState(inicial?.fecha_fin ?? '')
  const [activo, setActivo] = useState(inicial?.activo ?? true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!clave || !fechaInicio || !fechaFin) {
      setError('Completa clave, fecha de inicio y fecha de fin')
      return
    }
    if (fechaFin < fechaInicio) {
      setError('La fecha de fin debe ser posterior a la fecha de inicio')
      return
    }

    setLoading(true)
    try {
      if (esEdicion) {
        await semestresService.actualizarSemestre(inicial.id_semestre, {
          clave,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          activo,
        })
      } else {
        await semestresService.crearSemestre({ clave, fecha_inicio: fechaInicio, fecha_fin: fechaFin })
      }
      onSaved()
    } catch (err) {
      const detalle = err.response?.data?.errores?.[0]
      setError(detalle || err.response?.data?.error || 'No se pudo guardar el semestre')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="card mb20" onSubmit={handleSubmit}>
      <div className="card-header">
        <span className="card-title">{esEdicion ? 'Editar semestre' : 'Nuevo semestre'}</span>
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
              placeholder="2026/1"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="fecha-inicio">
              Fecha de inicio
            </label>
            <input
              id="fecha-inicio"
              type="date"
              className="form-control"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="fecha-fin">
              Fecha de fin
            </label>
            <input
              id="fecha-fin"
              type="date"
              className="form-control"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
            />
          </div>
        </div>

        {esEdicion && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 16 }}>
            <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
            Semestre activo
          </label>
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

export default function GestionSemestres() {
  const [semestres, setSemestres] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formSemestre, setFormSemestre] = useState(null) // null = oculto, {} = crear, {...} = editar

  async function cargar() {
    setLoading(true)
    try {
      const data = await semestresService.listarSemestres()
      setSemestres(data)
      setError('')
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudieron cargar los semestres')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  function handleSaved() {
    setFormSemestre(null)
    cargar()
  }

  return (
    <PageWrapper
      title="Gestión de Semestres"
      actions={
        <button className="btn btn-primary" onClick={() => setFormSemestre({})}>
          <Plus className="icon-sm" />
          Nuevo semestre
        </button>
      }
    >
      {formSemestre !== null && (
        <SemestreForm inicial={formSemestre} onCancel={() => setFormSemestre(null)} onSaved={handleSaved} />
      )}

      <div className="card">
        <div className="table-wrap">
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <Loader2 className="icon-xl spin" style={{ color: 'var(--blue)' }} />
            </div>
          ) : error ? (
            <div style={{ padding: 24, color: 'var(--red)', fontSize: 13 }}>{error}</div>
          ) : semestres.length === 0 ? (
            <EmptyState
              icon={CalendarRange}
              title="Sin semestres registrados"
              description="Crea el primer semestre para poder dar de alta materias."
            />
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Clave</th>
                  <th>Fecha de inicio</th>
                  <th>Fecha de fin</th>
                  <th>Estatus</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {semestres.map((s) => (
                  <tr key={s.id_semestre}>
                    <td className="td-bold">{s.clave}</td>
                    <td className="text-sm">{s.fecha_inicio}</td>
                    <td className="text-sm">{s.fecha_fin}</td>
                    <td>
                      <Badge variant={s.activo ? 'green' : 'gray'}>{s.activo ? 'Activo' : 'Inactivo'}</Badge>
                    </td>
                    <td>
                      <ActionButtons onEdit={() => setFormSemestre(s)} />
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
