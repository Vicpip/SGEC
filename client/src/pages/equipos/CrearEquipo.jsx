// Pantalla 05 — Crear Equipo
// Rol: Profesor
// URL: /equipos/nuevo
// Descripción: Formulario para asignar equipos de 3 integrantes, de forma manual o aleatoria sin repetición.

import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Shuffle, ArrowLeftRight, Check } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import Avatar from '../../components/ui/Avatar'

const INTEGRANTES = [
  { iniciales: 'CB', nombre: 'Carlos Becerra Díaz', boleta: '2023630142' },
  { iniciales: 'LV', nombre: 'Lorena Vega Paredes', boleta: '2023630089', bg: '#27AE60' },
  { iniciales: 'HM', nombre: 'Hugo Montoya Reyes', boleta: '2023630201', bg: '#E07B2A' },
]

export default function CrearEquipo() {
  const navigate = useNavigate()

  return (
    <PageWrapper
      title="Crear Nuevo Equipo"
      actions={
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/equipos')}>
          <ArrowLeft className="icon-sm" />
          Cancelar
        </button>
      }
    >
      <div className="two-col">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Información del equipo</span>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">Nombre del equipo</label>
              <div className="form-control focused">Equipo Épsilon</div>
            </div>
            <div className="form-group">
              <label className="form-label">Materia</label>
              <select className="form-control" defaultValue="tc-401-4bm1">
                <option value="tc-401-4bm1">Teoría de la Computación — 4BM1</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Tipo de equipo</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div
                  style={{
                    border: '2px solid var(--blue)',
                    background: 'var(--blue-light)',
                    borderRadius: 10,
                    padding: 10,
                    textAlign: 'center',
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--blue)',
                  }}
                >
                  Práctica
                </div>
                <div style={{ border: '1px solid var(--gray-200)', borderRadius: 10, padding: 10, textAlign: 'center', fontSize: 12, color: 'var(--gray-400)' }}>
                  Tarea
                </div>
                <div style={{ border: '1px solid var(--gray-200)', borderRadius: 10, padding: 10, textAlign: 'center', fontSize: 12, color: 'var(--gray-400)' }}>
                  Proyecto
                </div>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Número de integrantes</label>
              <div className="form-control">3</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Integrantes asignados</span>
            <button className="btn btn-secondary btn-sm">
              <Shuffle className="icon-sm" />
              Asignar aleatoriamente
            </button>
          </div>
          <div className="card-body">
            <div
              style={{
                fontSize: 12,
                color: 'var(--gray-400)',
                marginBottom: 14,
                padding: '8px 12px',
                background: 'var(--blue-light)',
                borderRadius: 10,
                borderLeft: '3px solid var(--blue)',
              }}
            >
              3 alumnos asignados aleatoriamente. Puedes intercambiar manualmente.
            </div>
            {INTEGRANTES.map((it) => (
              <div key={it.boleta} className="integrante-row">
                <div className="integrante-info">
                  <Avatar initials={it.iniciales} bg={it.bg} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-800)' }}>{it.nombre}</div>
                    <div className="text-xs">Boleta: {it.boleta}</div>
                  </div>
                </div>
                <button className="btn btn-secondary btn-sm">
                  <ArrowLeftRight className="icon-sm" />
                  Intercambiar
                </button>
              </div>
            ))}
            <div className="form-actions" style={{ marginTop: 20 }}>
              <button className="btn btn-secondary" onClick={() => navigate('/equipos')}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={() => navigate('/equipos')}>
                <Check className="icon-sm" />
                Crear equipo
              </button>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
