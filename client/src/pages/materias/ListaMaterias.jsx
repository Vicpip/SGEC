// Pantalla 03 — Lista de Materias
// Rol: Profesor / Administrador
// URL: /materias
// Descripción: Muestra las materias por semestre, permite crear y editar unidades de aprendizaje.

import { useNavigate } from 'react-router-dom'
import { Search, Plus } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import Badge from '../../components/ui/Badge'
import ActionButtons from '../../components/ui/ActionButtons'

const MATERIAS = [
  { clave: 'TC-401', nombre: 'Teoría de la Computación', grupo: '4BM1', semestre: '2026/1', alumnos: 32, equipos: 8, estatus: 'Activa', variant: 'green' },
  { clave: 'SO-301', nombre: 'Sistemas Operativos', grupo: '3BM2', semestre: '2026/1', alumnos: 28, equipos: 7, estatus: 'Activa', variant: 'green' },
  { clave: 'RC-501', nombre: 'Redes de Computadoras', grupo: '5BM3', semestre: '2026/1', alumnos: 30, equipos: 5, estatus: 'Activa', variant: 'green' },
  { clave: 'CM-601', nombre: 'Compiladores', grupo: '6BM1', semestre: '2026/1', alumnos: 28, equipos: 3, estatus: 'En curso', variant: 'yellow' },
  { clave: 'BD-401', nombre: 'Bases de Datos Avanzadas', grupo: '4BM2', semestre: '2025/2', alumnos: 35, equipos: 9, estatus: 'Cerrada', variant: 'gray' },
]

export default function ListaMaterias() {
  const navigate = useNavigate()

  return (
    <PageWrapper title="Materias">
      <div className="toolbar">
        <div className="search-wrap">
          <Search className="icon-sm" />
          <input className="search-input" placeholder="Buscar materia…" defaultValue="Teoría" readOnly />
        </div>
        <select className="select-input" defaultValue="2026/1">
          <option value="todos">Todos los semestres</option>
          <option value="2026/1">2026/1</option>
          <option value="2025/2">2025/2</option>
        </select>
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn btn-primary">
            <Plus className="icon-sm" />
            Nueva materia
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
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
              {MATERIAS.map((m) => (
                <tr key={m.clave}>
                  <td className="td-bold">{m.clave}</td>
                  <td className="td-bold" style={{ cursor: 'pointer' }} onClick={() => navigate(`/equipos?materia=${m.clave}`)}>
                    {m.nombre}
                  </td>
                  <td>{m.grupo}</td>
                  <td>{m.semestre}</td>
                  <td>{m.alumnos}</td>
                  <td>{m.equipos}</td>
                  <td>
                    <Badge variant={m.variant}>{m.estatus}</Badge>
                  </td>
                  <td>
                    <ActionButtons onEdit={() => {}} onDelete={() => {}} />
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
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <span>Mostrando 5 de 6 materias</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span className="btn btn-secondary btn-sm">Anterior</span>
            <span className="btn btn-primary btn-sm">1</span>
            <span className="btn btn-secondary btn-sm">Siguiente</span>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
