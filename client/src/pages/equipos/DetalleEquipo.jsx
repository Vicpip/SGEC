// Pantalla 06 — Detalle del Equipo
// Rol: Profesor
// URL: /equipos/:id
// Descripción: Integrantes, calificaciones y actividades asociadas al equipo.

import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil, Plus, Save } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'

const INTEGRANTES = [
  { iniciales: 'SR', nombre: 'Sofía Ramírez Torres', boleta: '2023630045', promedio: 9.1, variant: 'green' },
  { iniciales: 'JL', nombre: 'Jorge López Mendoza', boleta: '2023630078', promedio: 8.6, variant: 'green', bg: '#27AE60' },
  { iniciales: 'AM', nombre: 'Ana Martínez Soto', boleta: '2023630112', promedio: 8.4, variant: 'yellow', bg: '#E07B2A' },
]

const RESUMEN = [
  { valor: '8.7', color: 'var(--navy)', label: 'Promedio equipo' },
  { valor: '67%', color: 'var(--green)', label: 'Entregadas' },
  { valor: '4', color: 'var(--blue)', label: 'A tiempo' },
  { valor: '2', color: 'var(--red)', label: 'Pendientes' },
]

const ACTIVIDADES = [
  { nombre: 'Práctica 1 — AFD', entregaTipo: 'individual', calEquipo: '9.0', calSofia: '9.5', calJorge: '9.0', calAna: '8.5', promedio: '9.0', promedioColor: 'var(--green)', estatus: 'Calificada', variant: 'green' },
  { nombre: 'Práctica 2 — AFND', entregaTipo: 'individual', calEquipo: '8.5', calSofia: '9.0', calJorge: '8.0', calAna: '8.5', promedio: '8.5', promedioColor: 'var(--green)', estatus: 'Calificada', variant: 'green' },
  { nombre: 'Práctica 3 — Autómatas', entregaTipo: 'equipo', calEquipo: '8.5', calSofia: '9.0', calJorge: '8.5', calAna: '8.0', promedio: '8.5', promedioColor: 'var(--green)', estatus: 'En revisión', variant: 'blue' },
  { nombre: 'Práctica 5 — Lenguajes', entregaTipo: 'individual', calEquipo: null, calSofia: null, calJorge: null, calAna: null, promedio: '—', promedioColor: 'var(--gray-400)', estatus: 'Pendiente', variant: 'yellow' },
]

export default function DetalleEquipo() {
  const navigate = useNavigate()

  return (
    <PageWrapper
      title={
        <>
          Equipo Alfa <span style={{ fontWeight: 400, color: 'var(--gray-400)' }}>· Teoría de la Computación</span>
        </>
      }
      actions={
        <>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/equipos')}>
            <ArrowLeft className="icon-sm" />
            Volver
          </button>
          <button className="btn btn-primary btn-sm">
            <Pencil className="icon-sm" />
            Editar
          </button>
        </>
      }
    >
      <div className="card mb20" style={{ overflow: 'hidden' }}>
        <div
          style={{
            background: 'linear-gradient(135deg,var(--navy) 0%,var(--blue) 100%)',
            padding: '20px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 12,
                background: 'rgba(255,255,255,.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                color: 'white',
                fontWeight: 700,
              }}
            >
              Α
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>Equipo Alfa</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)' }}>Teoría de la Computación · 4BM1 · 2026/1</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, textAlign: 'center', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'white' }}>8.7</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)' }}>Promedio</div>
            </div>
            <div style={{ borderLeft: '1px solid rgba(255,255,255,.2)', paddingLeft: 16 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'white' }}>4/6</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)' }}>Actividades</div>
            </div>
            <div style={{ borderLeft: '1px solid rgba(255,255,255,.2)', paddingLeft: 16 }}>
              <Badge variant="blue">Práctica</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="two-col mb20">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Integrantes</span>
            <Badge variant="blue">3 alumnos</Badge>
          </div>
          <div className="card-body" style={{ padding: 14 }}>
            {INTEGRANTES.map((it, i) => (
              <div key={it.boleta} className={`integrante-row${i < INTEGRANTES.length - 1 ? ' mb8' : ''}`}>
                <div className="integrante-info">
                  <Avatar initials={it.iniciales} bg={it.bg} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{it.nombre}</div>
                    <div className="text-xs">{it.boleta}</div>
                  </div>
                </div>
                <Badge variant={it.variant}>{it.promedio}</Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Resumen de desempeño</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {RESUMEN.map((r) => (
                <div key={r.label} style={{ background: 'var(--gray-50)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: r.color }}>{r.valor}</div>
                  <div className="text-xs">{r.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Actividades del equipo</span>
          <button className="btn btn-primary btn-sm">
            <Plus className="icon-sm" />
            Agregar
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Actividad</th>
                <th>Entrega</th>
                <th>Cal. Equipo</th>
                <th>Sofía R.</th>
                <th>Jorge L.</th>
                <th>Ana M.</th>
                <th>Promedio</th>
                <th>Estatus</th>
              </tr>
            </thead>
            <tbody>
              {ACTIVIDADES.map((a) => (
                <tr key={a.nombre}>
                  <td>
                    <span className="link-inline" onClick={() => navigate('/actividades/1')}>
                      {a.nombre}
                    </span>
                  </td>
                  <td>
                    <Badge variant={a.entregaTipo === 'equipo' ? 'blue' : 'gray'} style={{ fontSize: 10, padding: '2px 8px' }}>
                      {a.entregaTipo === 'equipo' ? 'Equipo' : 'Ind.'}
                    </Badge>
                  </td>
                  <td>
                    <input className="calificacion-input" defaultValue={a.calEquipo ?? undefined} placeholder={a.calEquipo ? undefined : '—'} />
                  </td>
                  <td>
                    <input className="calificacion-input" defaultValue={a.calSofia ?? undefined} placeholder={a.calSofia ? undefined : '—'} />
                  </td>
                  <td>
                    <input className="calificacion-input" defaultValue={a.calJorge ?? undefined} placeholder={a.calJorge ? undefined : '—'} />
                  </td>
                  <td>
                    <input className="calificacion-input" defaultValue={a.calAna ?? undefined} placeholder={a.calAna ? undefined : '—'} />
                  </td>
                  <td className={a.promedio === '—' ? '' : 'td-bold'} style={{ color: a.promedioColor }}>
                    {a.promedio}
                  </td>
                  <td>
                    <Badge variant={a.variant}>{a.estatus}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div
          className="form-actions"
          style={{
            padding: '12px 20px',
            background: 'var(--blue-light)',
            borderTop: '1px solid var(--gray-200)',
          }}
        >
          <span className="btn btn-secondary btn-sm">Descartar</span>
          <span className="btn btn-primary btn-sm">
            <Save className="icon-sm" />
            Guardar calificaciones
          </span>
        </div>
      </div>
    </PageWrapper>
  )
}
