// Pantalla 14 — Generador de Reportes
// Rol: Profesor
// URL: /reportes
// Descripción: Genera reportes de desempeño por materia y tipo de equipo, exportables a PDF/Excel.

import { BarChart2, FileText, Table as TableIcon } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import Badge from '../../components/ui/Badge'
import ProgressBar from '../../components/ui/ProgressBar'

const METRICAS = [
  { valor: '3', label: 'Equipos', bg: 'var(--blue-light)', color: 'var(--navy)' },
  { valor: '9', label: 'Integrantes', bg: 'var(--blue-light)', color: 'var(--navy)' },
  { valor: '8.5', label: 'Promedio', bg: 'var(--blue-light)', color: 'var(--green)' },
  { valor: '73%', label: 'Realizadas', bg: '#F0FDF4', color: 'var(--green)' },
  { valor: '27%', label: 'No realizadas', bg: '#FEF2F2', color: 'var(--red)' },
]

const EQUIPOS = [
  { nombre: 'Equipo Alfa', integrantes: 'Ramírez T., López M., Martínez S.', realizadas: 4, pendientes: 2, promedio: 8.7, pct: 67 },
  { nombre: 'Equipo Beta', integrantes: 'Hernández C., Castillo V., Navarro R.', realizadas: 5, pendientes: 1, promedio: 9.1, pct: 83 },
  { nombre: 'Equipo Gamma', integrantes: 'Flores G., Morales J., Pérez S.', realizadas: 2, pendientes: 4, promedio: 7.5, pct: 33 },
]

function colorPromedio(promedio) {
  if (promedio >= 8) return 'var(--green)'
  if (promedio >= 6) return 'var(--yellow)'
  return 'var(--red)'
}

export default function GeneradorReportes() {
  return (
    <PageWrapper title="Generador de Reportes" actions={<div className="topbar-semester">2026/1</div>}>
      <div className="card mb20">
        <div className="card-header">
          <span className="card-title">Parámetros del reporte</span>
        </div>
        <div className="card-body">
          <div className="form-row-3 mb16">
            <div className="form-group">
              <label className="form-label">Semestre</label>
              <select className="form-control">
                <option>2026/1</option>
                <option>2025/2</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Materia</label>
              <select className="form-control">
                <option>Teoría de la Computación</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Tipo de equipo</label>
              <select className="form-control">
                <option>Todos los tipos</option>
                <option>Prácticas</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary">
              <BarChart2 className="icon-sm" />
              Generar reporte
            </button>
          </div>
        </div>
      </div>

      <div className="report-preview">
        <div className="report-preview-header">
          <div>
            <h3>Reporte — Teoría de la Computación · Prácticas</h3>
            <span>Generado el 10 de abril de 2026 · Semestre 2026/1</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,.15)', color: 'white', border: '1px solid rgba(255,255,255,.3)' }}>
              <FileText className="icon-sm" />
              Exportar PDF
            </button>
            <button className="btn btn-sm" style={{ background: '#217346', color: 'white', border: 'none' }}>
              <TableIcon className="icon-sm" />
              Exportar Excel
            </button>
          </div>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 20 }}>
            {METRICAS.map((m) => (
              <div key={m.label} style={{ background: m.bg, borderRadius: 12, padding: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: m.color }}>{m.valor}</div>
                <div className="text-xs">{m.label}</div>
              </div>
            ))}
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Equipo</th>
                  <th>Tipo</th>
                  <th>Integrantes</th>
                  <th>Realizadas</th>
                  <th>Pendientes</th>
                  <th>Promedio</th>
                  <th>% Realizadas</th>
                </tr>
              </thead>
              <tbody>
                {EQUIPOS.map((eq) => (
                  <tr key={eq.nombre}>
                    <td className="td-bold">{eq.nombre}</td>
                    <td>
                      <Badge variant="blue">Práctica</Badge>
                    </td>
                    <td style={{ fontSize: 12 }}>{eq.integrantes}</td>
                    <td>{eq.realizadas}</td>
                    <td>{eq.pendientes}</td>
                    <td className="td-bold" style={{ color: colorPromedio(eq.promedio) }}>
                      {eq.promedio}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ProgressBar percent={eq.pct} width="80px" color={eq.pct < 50 ? 'var(--yellow)' : undefined} />
                        <span className="text-xs">{eq.pct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
