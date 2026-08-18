// Pantalla 11 — Gestión de Profesores
// Rol: Administrador
// URL: /admin/profesores
// Descripción: Alta, edición y baja lógica de cuentas de profesor a nivel institucional.

import { Search, Plus } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import ActionButtons from '../../components/ui/ActionButtons'

const PROFESORES = [
  {
    iniciales: 'MG',
    nombre: 'García Ruiz, Miguel Ángel',
    correo: 'mgarcia@escom.ipn.mx',
    departamento: 'Ciencias de la Computación',
    materias: [
      { texto: 'TC-401', variant: 'blue' },
      { texto: 'SO-301', variant: 'blue' },
      { texto: '+2', variant: 'navy' },
    ],
    alumnos: 118,
    estatus: 'Activo',
    estatusVariant: 'green',
  },
  {
    iniciales: 'AL',
    bg: '#27AE60',
    nombre: 'Luna Paredes, Adriana',
    correo: 'aluna@escom.ipn.mx',
    departamento: 'Sistemas de Cómputo',
    materias: [
      { texto: 'BD-401', variant: 'blue' },
      { texto: 'IA-501', variant: 'blue' },
    ],
    alumnos: 64,
    estatus: 'Activo',
    estatusVariant: 'green',
  },
  {
    iniciales: 'RV',
    bg: '#8E44AD',
    nombre: 'Vargas Romero, Roberto',
    correo: 'rvargas@escom.ipn.mx',
    departamento: 'Ingeniería de Software',
    materias: [{ texto: 'IS-301', variant: 'blue' }],
    alumnos: 57,
    estatus: 'Activo',
    estatusVariant: 'green',
  },
  {
    iniciales: 'CM',
    bg: '#E07B2A',
    nombre: 'Martínez Cruz, Claudia',
    correo: 'cmartinez@escom.ipn.mx',
    departamento: 'Ciencias de la Computación',
    materias: [{ texto: 'Sin asignar', variant: 'gray' }],
    alumnos: 0,
    estatus: 'Sin materias',
    estatusVariant: 'yellow',
  },
]

export default function GestionProfesores() {
  return (
    <PageWrapper
      title="Gestión de Profesores"
      actions={
        <>
          <div className="topbar-semester">2026/1</div>
          <button className="btn btn-primary">
            <Plus className="icon-sm" />
            Nuevo profesor
          </button>
        </>
      }
    >
      <div className="toolbar">
        <div className="search-wrap">
          <Search className="icon-sm" />
          <input className="search-input" placeholder="Buscar por nombre o correo…" />
        </div>
        <select className="select-input">
          <option>Todos los departamentos</option>
        </select>
      </div>

      <div className="card">
        <div className="table-wrap">
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
              {PROFESORES.map((p, i) => (
                <tr key={p.correo}>
                  <td className="text-xs">{i + 1}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar size="xs" initials={p.iniciales} bg={p.bg} />
                      <span className="td-bold">{p.nombre}</span>
                    </div>
                  </td>
                  <td className="text-sm">{p.correo}</td>
                  <td className="text-sm">{p.departamento}</td>
                  <td>
                    <div className="tag-row">
                      {p.materias.map((m) => (
                        <Badge key={m.texto} variant={m.variant}>
                          {m.texto}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td>{p.alumnos}</td>
                  <td>
                    <Badge variant={p.estatusVariant}>{p.estatus}</Badge>
                  </td>
                  <td>
                    <ActionButtons onEdit={() => {}} onDelete={() => {}} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '12px 16px', background: 'var(--gray-50)', borderTop: '1px solid var(--gray-100)', fontSize: 12, color: 'var(--gray-400)' }}>
          4 profesores registrados
        </div>
      </div>
    </PageWrapper>
  )
}
