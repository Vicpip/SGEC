// Pantalla 09 — Ver Actividades del Alumno
// Rol: Profesor
// URL: /alumnos/:id/actividades
// Descripción: Historial de actividades y calificaciones de un alumno específico.

import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'

const ACTIVIDADES = [
  { nombre: 'Práctica 1 — AFD', tipo: 'Práctica', tipoVariant: 'blue', equipo: 'Equipo Alfa', calEquipo: '9.0', calIndividual: '9.5', calColor: 'var(--green)', estatus: 'Calificada', estatusVariant: 'green', fecha: '15 Feb 2026' },
  { nombre: 'Tarea 1 — Lenguajes formales', tipo: 'Tarea', tipoVariant: 'navy', equipo: 'Grupo T1', calEquipo: '8.0', calIndividual: '8.0', calColor: 'var(--yellow)', estatus: 'Calificada', estatusVariant: 'green', fecha: '10 Mar 2026' },
  { nombre: 'Práctica 3 — Autómatas', tipo: 'Práctica', tipoVariant: 'blue', equipo: 'Equipo Alfa', calEquipo: '8.5', calIndividual: '9.0', calColor: 'var(--blue)', estatus: 'En revisión', estatusVariant: 'blue', fecha: '22 Mar 2026' },
  { nombre: 'Tarea 2 — Gramáticas formales', tipo: 'Tarea', tipoVariant: 'navy', equipo: 'Grupo T1', calEquipo: '—', calIndividual: '—', calColor: 'var(--gray-400)', estatus: 'Pendiente', estatusVariant: 'yellow', fecha: '5 Abr 2026' },
  { nombre: 'Proyecto — Etapa 1', tipo: 'Proyecto', tipoVariant: 'orange', equipo: 'Proyecto Sigma', calEquipo: '7.0', calIndividual: '7.5', calColor: 'var(--yellow)', estatus: 'Entregada', estatusVariant: 'green', fecha: '1 Abr 2026' },
]

export default function ActividadesAlumno() {
  const navigate = useNavigate()

  return (
    <PageWrapper
      title="Actividades del Alumno"
      actions={
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/alumnos')}>
          <ArrowLeft className="icon-sm" />
          Volver
        </button>
      }
    >
      <div className="card mb20" style={{ overflow: 'hidden' }}>
        <div style={{ background: 'linear-gradient(135deg,var(--navy) 0%,var(--blue) 100%)', padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <Avatar size="lg" initials="SR" style={{ width: 56, height: 56, fontSize: 20 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'white' }}>Sofía Valentina Ramírez Torres</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.65)' }}>Boleta: 2023630045 · Grupo 4BM1 · 2026/1</div>
          </div>
          <div style={{ display: 'flex', gap: 20, textAlign: 'center', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'white' }}>9.1</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)' }}>Promedio</div>
            </div>
            <div style={{ borderLeft: '1px solid rgba(255,255,255,.2)', paddingLeft: 20 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'white' }}>8/10</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)' }}>Entregadas</div>
            </div>
          </div>
        </div>
        <div style={{ padding: '14px 24px', background: 'white', display: 'flex', gap: 20, fontSize: 13, flexWrap: 'wrap' }}>
          <span>
            <strong style={{ color: 'var(--navy)' }}>Materia:</strong> Teoría de la Computación
          </span>
          <span>
            <strong style={{ color: 'var(--navy)' }}>Práctica:</strong> Equipo Alfa
          </span>
          <span>
            <strong style={{ color: 'var(--navy)' }}>Tarea:</strong> Grupo T1
          </span>
          <span>
            <strong style={{ color: 'var(--navy)' }}>Proyecto:</strong> Sigma
          </span>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Historial de actividades</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Actividad</th>
                <th>Tipo</th>
                <th>Equipo</th>
                <th>Cal. Equipo</th>
                <th>Cal. Individual</th>
                <th>Estatus</th>
                <th>Fecha entrega</th>
              </tr>
            </thead>
            <tbody>
              {ACTIVIDADES.map((a) => (
                <tr key={a.nombre}>
                  <td className="td-bold">{a.nombre}</td>
                  <td>
                    <Badge variant={a.tipoVariant}>{a.tipo}</Badge>
                  </td>
                  <td>{a.equipo}</td>
                  <td>{a.calEquipo}</td>
                  <td className={a.calIndividual === '—' ? '' : 'td-bold'} style={{ color: a.calColor }}>
                    {a.calIndividual}
                  </td>
                  <td>
                    <Badge variant={a.estatusVariant}>{a.estatus}</Badge>
                  </td>
                  <td className="text-sm">{a.fecha}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageWrapper>
  )
}
