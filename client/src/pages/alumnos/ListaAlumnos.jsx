// Pantalla 07 — Lista de Alumnos del Grupo
// Rol: Profesor
// URL: /alumnos?materia=:clave
// Descripción: Lista de alumnos inscritos en la materia/grupo.

import { useNavigate } from 'react-router-dom'
import { Search, Upload } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import Badge from '../../components/ui/Badge'
import ActionButtons from '../../components/ui/ActionButtons'

const ALUMNOS = [
  { n: 1, boleta: '2023630045', nombre: 'Ramírez Torres, Sofía Valentina', grupo: '4BM1', practica: 'Equipo Alfa', tarea: 'Grupo T1', tareaVariant: 'navy', proyecto: 'Proyecto Sigma' },
  { n: 2, boleta: '2023630078', nombre: 'López Mendoza, Jorge Alberto', grupo: '4BM1', practica: 'Equipo Alfa', tarea: 'Grupo T2', tareaVariant: 'navy', proyecto: 'Proyecto Sigma' },
  { n: 3, boleta: '2023630134', nombre: 'Hernández Cruz, Pablo Emilio', grupo: '4BM1', practica: 'Equipo Beta', tarea: 'Grupo T3', tareaVariant: 'navy', proyecto: 'Proyecto Omega' },
  { n: 4, boleta: '2023630189', nombre: 'Flores Gutiérrez, Valeria Isabel', grupo: '4BM1', practica: 'Equipo Gamma', tarea: 'Grupo T2', tareaVariant: 'navy', proyecto: 'Proyecto Sigma' },
  { n: 5, boleta: '2023630172', nombre: 'Navarro Ríos, Diego Alejandro', grupo: '4BM1', practica: 'Equipo Beta', tarea: 'Sin asignar', tareaVariant: 'gray', proyecto: 'Sin asignar', proyectoVariant: 'gray' },
]

export default function ListaAlumnos() {
  const navigate = useNavigate()

  return (
    <PageWrapper
      title={
        <>
          Alumnos — Teoría de la Computación <span style={{ fontWeight: 400, color: 'var(--gray-400)' }}>· 4BM1</span>
        </>
      }
      actions={
        <>
          <div className="topbar-semester">2026/1</div>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/alumnos/importar')}>
            <Upload className="icon-sm" />
            Importar
          </button>
        </>
      }
    >
      <div className="toolbar">
        <div className="search-wrap">
          <Search className="icon-sm" />
          <input className="search-input" placeholder="Buscar por nombre o boleta…" />
        </div>
        <select className="select-input" defaultValue="4BM1">
          <option value="4BM1">4BM1</option>
        </select>
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', flexWrap: 'wrap' }}>
          <Badge variant="blue" style={{ padding: '6px 12px' }}>32 alumnos</Badge>
          <Badge variant="green" style={{ padding: '6px 12px' }}>32 en práctica</Badge>
          <Badge variant="navy" style={{ padding: '6px 12px' }}>30 en tarea</Badge>
          <Badge variant="orange" style={{ padding: '6px 12px' }}>27 en proyecto</Badge>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Boleta</th>
                <th>Nombre completo</th>
                <th>Grupo</th>
                <th>Equipo Práctica</th>
                <th>Equipo Tarea</th>
                <th>Equipo Proyecto</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ALUMNOS.map((al) => (
                <tr key={al.boleta}>
                  <td className="text-xs">{al.n}</td>
                  <td className="td-bold">{al.boleta}</td>
                  <td className="td-bold">{al.nombre}</td>
                  <td>{al.grupo}</td>
                  <td>
                    <Badge variant="blue">{al.practica}</Badge>
                  </td>
                  <td>
                    <Badge variant={al.tareaVariant}>{al.tarea}</Badge>
                  </td>
                  <td>
                    <Badge variant={al.proyectoVariant ?? 'orange'}>{al.proyecto}</Badge>
                  </td>
                  <td>
                    <ActionButtons onView={() => navigate('/alumnos/1/actividades')} onEdit={() => {}} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div
          style={{
            padding: '12px 16px',
            background: 'var(--gray-50)',
            borderTop: '1px solid var(--gray-100)',
            fontSize: 12,
            color: 'var(--gray-400)',
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <span>Mostrando 5 de 32 alumnos</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span className="btn btn-secondary btn-sm">1</span>
            <span className="btn btn-secondary btn-sm">2</span>
            <span className="btn btn-secondary btn-sm">3</span>
            <span className="btn btn-secondary btn-sm">4</span>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
