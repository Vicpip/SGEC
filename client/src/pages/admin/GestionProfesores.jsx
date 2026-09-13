// Pantalla 11 — Gestión de Profesores
// Rol: Administrador
// URL: /admin/profesores
// Descripción: Alta, edición y baja lógica de cuentas de profesor a nivel institucional.

import { useEffect, useMemo, useState } from 'react'
import { Search, Plus, Loader2 } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import ActionButtons from '../../components/ui/ActionButtons'
import EmptyState from '../../components/ui/EmptyState'
import * as usuariosService from '../../services/usuarios.service'

const REGLA_CONTRASENA = /^(?=.*[A-Z])(?=.*[0-9]).{8,}$/

function ProfesorForm({ inicial, onCancel, onSaved }) {
  const esEdicion = Boolean(inicial?.id_usuario)
  const [correo, setCorreo] = useState(inicial?.correo_institucional ?? '')
  const [contrasena, setContrasena] = useState('')
  const [nombre, setNombre] = useState(inicial?.nombre ?? '')
  const [apellidoPaterno, setApellidoPaterno] = useState(inicial?.apellido_paterno ?? '')
  const [apellidoMaterno, setApellidoMaterno] = useState(inicial?.apellido_materno ?? '')
  const [noEmpleado, setNoEmpleado] = useState(inicial?.no_empleado ?? '')
  const [departamento, setDepartamento] = useState(inicial?.departamento ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!nombre || !apellidoPaterno || !noEmpleado) {
      setError('Nombre, apellido paterno y número de empleado son requeridos')
      return
    }
    if (!esEdicion && (!correo || !REGLA_CONTRASENA.test(contrasena))) {
      setError('Ingresa el correo y una contraseña con al menos 8 caracteres, una mayúscula y un número')
      return
    }

    setLoading(true)
    try {
      if (esEdicion) {
        await usuariosService.actualizarUsuario(inicial.id_usuario, {
          nombre,
          apellido_paterno: apellidoPaterno,
          apellido_materno: apellidoMaterno || undefined,
          no_empleado: noEmpleado,
          departamento: departamento || undefined,
        })
      } else {
        await usuariosService.crearProfesor({
          correo_institucional: correo,
          contrasena,
          nombre,
          apellido_paterno: apellidoPaterno,
          apellido_materno: apellidoMaterno || undefined,
          no_empleado: noEmpleado,
          departamento: departamento || undefined,
        })
      }
      onSaved()
    } catch (err) {
      const detalle = err.response?.data?.errores?.[0]
      setError(detalle || err.response?.data?.error || 'No se pudo guardar el profesor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="card mb20" onSubmit={handleSubmit}>
      <div className="card-header">
        <span className="card-title">{esEdicion ? 'Editar profesor' : 'Nuevo profesor'}</span>
      </div>
      <div className="card-body">
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Nombre(s)</label>
            <input className="form-control" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Apellido paterno</label>
            <input
              className="form-control"
              value={apellidoPaterno}
              onChange={(e) => setApellidoPaterno(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Apellido materno</label>
            <input
              className="form-control"
              value={apellidoMaterno}
              onChange={(e) => setApellidoMaterno(e.target.value)}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Correo institucional</label>
            <input
              type="email"
              className="form-control"
              placeholder="usuario@ipn.mx"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              disabled={esEdicion}
            />
          </div>
          {!esEdicion && (
            <div className="form-group">
              <label className="form-label">Contraseña temporal</label>
              <input
                type="password"
                className="form-control"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">N.° de empleado</label>
            <input className="form-control" value={noEmpleado} onChange={(e) => setNoEmpleado(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Departamento</label>
            <input className="form-control" value={departamento} onChange={(e) => setDepartamento(e.target.value)} />
          </div>
        </div>

        {!esEdicion && (
          <div
            style={{
              padding: '8px 12px',
              background: 'var(--blue-light)',
              borderRadius: 10,
              fontSize: 12,
              color: 'var(--blue)',
              marginBottom: 16,
            }}
          >
            La contraseña temporal debe tener al menos 8 caracteres, una mayúscula y un número.
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

function iniciales(profesor) {
  const a = profesor.nombre?.[0] ?? ''
  const b = profesor.apellido_paterno?.[0] ?? ''
  return `${a}${b}`.toUpperCase()
}

export default function GestionProfesores() {
  const [profesores, setProfesores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [departamento, setDepartamento] = useState('')
  const [formProfesor, setFormProfesor] = useState(null) // null = oculto, {} = crear, {...} = editar

  async function cargar() {
    setLoading(true)
    try {
      const data = await usuariosService.listarProfesores()
      setProfesores(data)
      setError('')
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudieron cargar los profesores')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  const departamentos = useMemo(
    () => [...new Set(profesores.map((p) => p.departamento).filter(Boolean))],
    [profesores]
  )

  const profesoresFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return profesores.filter((p) => {
      const coincideTexto =
        !texto ||
        `${p.nombre} ${p.apellido_paterno} ${p.apellido_materno ?? ''}`.toLowerCase().includes(texto) ||
        p.correo_institucional.toLowerCase().includes(texto)
      const coincideDepartamento = !departamento || p.departamento === departamento
      return coincideTexto && coincideDepartamento
    })
  }, [profesores, busqueda, departamento])

  function handleSaved() {
    setFormProfesor(null)
    cargar()
  }

  async function handleDesactivar(profesor) {
    const nombreCompleto = `${profesor.nombre} ${profesor.apellido_paterno}`
    if (!window.confirm(`¿Desactivar la cuenta de ${nombreCompleto}? Podrá reactivarse más adelante.`)) {
      return
    }
    try {
      await usuariosService.desactivarUsuario(profesor.id_usuario)
      cargar()
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo desactivar al profesor')
    }
  }

  return (
    <PageWrapper
      title="Gestión de Profesores"
      actions={
        <>
          <div className="topbar-semester">2026/1</div>
          <button className="btn btn-primary" onClick={() => setFormProfesor({})}>
            <Plus className="icon-sm" />
            Nuevo profesor
          </button>
        </>
      }
    >
      {formProfesor !== null && (
        <ProfesorForm inicial={formProfesor} onCancel={() => setFormProfesor(null)} onSaved={handleSaved} />
      )}

      <div className="toolbar">
        <div className="search-wrap">
          <Search className="icon-sm" />
          <input
            className="search-input"
            placeholder="Buscar por nombre o correo…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <select className="select-input" value={departamento} onChange={(e) => setDepartamento(e.target.value)}>
          <option value="">Todos los departamentos</option>
          {departamentos.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <div className="card">
        <div className="table-wrap">
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <Loader2 className="icon-xl spin" style={{ color: 'var(--blue)' }} />
            </div>
          ) : error ? (
            <div style={{ padding: 24, color: 'var(--red)', fontSize: 13 }}>{error}</div>
          ) : profesoresFiltrados.length === 0 ? (
            <EmptyState title="Sin profesores registrados" description="Da de alta al primer profesor con el botón «Nuevo profesor»." />
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nombre</th>
                  <th>Correo institucional</th>
                  <th>Departamento</th>
                  <th>Materias</th>
                  <th>Alumnos</th>
                  <th>Estatus</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {profesoresFiltrados.map((p, i) => (
                  <tr key={p.id_usuario}>
                    <td className="text-xs">{i + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar size="xs" initials={iniciales(p)} />
                        <span className="td-bold">
                          {p.apellido_paterno} {p.apellido_materno ?? ''}, {p.nombre}
                        </span>
                      </div>
                    </td>
                    <td className="text-sm">{p.correo_institucional}</td>
                    <td className="text-sm">{p.departamento || 'Sin asignar'}</td>
                    <td>
                      <Badge variant={p.total_materias > 0 ? 'blue' : 'gray'}>
                        {p.total_materias} materia{p.total_materias === 1 ? '' : 's'}
                      </Badge>
                    </td>
                    <td>{p.total_alumnos}</td>
                    <td>
                      <Badge variant={p.activo ? 'green' : 'red'}>{p.activo ? 'Activo' : 'Inactivo'}</Badge>
                    </td>
                    <td>
                      <ActionButtons
                        onEdit={() => setFormProfesor(p)}
                        onDelete={p.activo ? () => handleDesactivar(p) : undefined}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div
          style={{
            padding: '12px 16px',
            background: 'var(--gray-50)',
            borderTop: '1px solid var(--gray-100)',
            fontSize: 12,
            color: 'var(--gray-400)',
          }}
        >
          {profesoresFiltrados.length} profesor{profesoresFiltrados.length === 1 ? '' : 'es'} registrado
          {profesoresFiltrados.length === 1 ? '' : 's'}
        </div>
      </div>
    </PageWrapper>
  )
}
