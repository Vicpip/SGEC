// Pantalla 10 — Detalle de Actividad
// Rol: Profesor
// URL: /actividades/:id
// Descripción: Información completa de la actividad publicada y sus archivos adjuntos.

import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, FileText, Archive, Download, Inbox } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import Badge from '../../components/ui/Badge'

const INSTRUCCIONES =
  'Implementar un autómata finito determinista (AFD) que reconozca el lenguaje L = {w ∈ {0,1}* | w termina en 01}. Deben entregar el diagrama de estados, la tabla de transiciones y el código fuente en Python con pruebas unitarias para al menos 10 cadenas de prueba.'

const DOCUMENTOS_REFERENCIA = [
  { icon: FileText, nombre: 'guia_practica5_AFD.pdf', tamano: '340 KB' },
  { icon: Archive, nombre: 'plantilla_codigo_python.zip', tamano: '12 KB' },
]

export default function DetalleActividad() {
  const navigate = useNavigate()

  return (
    <PageWrapper
      title="Práctica 3 — Autómatas Finitos"
      actions={
        <>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/actividades/nueva')}>
            <ArrowLeft className="icon-sm" />
            Volver
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/actividades/1/entregas')}>
            <Inbox className="icon-sm" />
            Ver entregas
          </button>
          <button className="btn btn-primary btn-sm">
            <Save className="icon-sm" />
            Guardar
          </button>
        </>
      }
    >
      <div className="card mb20">
        <div style={{ padding: '16px 20px', display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <div className="text-xs mb8">Materia</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>Teoría de la Computación</div>
          </div>
          <div style={{ borderLeft: '1px solid var(--gray-200)', paddingLeft: 24 }}>
            <div className="text-xs mb8">Tipo</div>
            <Badge variant="blue">Práctica</Badge>
          </div>
          <div style={{ borderLeft: '1px solid var(--gray-200)', paddingLeft: 24 }}>
            <div className="text-xs mb8">Fecha límite</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>22 Mar 2026</div>
          </div>
          <div style={{ borderLeft: '1px solid var(--gray-200)', paddingLeft: 24 }}>
            <div className="text-xs mb8">Equipos</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>8 equipos</div>
          </div>
          <div style={{ borderLeft: '1px solid var(--gray-200)', paddingLeft: 24 }}>
            <div className="text-xs mb8">Promedio general</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>8.4</div>
          </div>
          <div style={{ borderLeft: '1px solid var(--gray-200)', paddingLeft: 24 }}>
            <div className="text-xs mb8">Estatus</div>
            <Badge variant="blue">En revisión</Badge>
          </div>
        </div>
      </div>

      <div className="card mb20">
        <div className="card-header">
          <span className="card-title">Información de la actividad</span>
        </div>
        <div className="card-body">
          <div className="section-lbl" style={{ paddingTop: 0 }}>Instrucciones</div>
          <div
            style={{
              background: 'var(--gray-50)',
              borderRadius: 10,
              padding: 14,
              fontSize: 13,
              color: 'var(--gray-600)',
              lineHeight: 1.6,
            }}
          >
            {INSTRUCCIONES}
          </div>

          <div className="section-lbl">Documentos de referencia</div>
          <div>
            {DOCUMENTOS_REFERENCIA.map((doc) => (
              <div key={doc.nombre} className="file-chip" style={{ cursor: 'pointer' }}>
                <doc.icon className="icon-sm" />
                <span>{doc.nombre}</span>
                <span className="text-xs">· {doc.tamano}</span>
                <Download className="icon-sm" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Calificaciones por equipo e integrante</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Equipo</th>
                <th>Integrante</th>
                <th>Cal. Equipo</th>
                <th>Cal. Individual</th>
                <th>Promedio Final</th>
                <th>Estatus</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="td-bold" rowSpan={3} style={{ borderBottom: 'none', background: 'var(--blue-light)' }}>
                  Equipo Alfa
                </td>
                <td>Sofía Ramírez Torres</td>
                <td rowSpan={3} style={{ verticalAlign: 'middle', borderBottom: 'none', background: 'var(--blue-light)' }}>
                  <input className="calificacion-input" defaultValue="8.5" />
                </td>
                <td>
                  <input className="calificacion-input" defaultValue="9.0" />
                </td>
                <td style={{ fontWeight: 600, color: 'var(--green)' }}>8.8</td>
                <td>
                  <Badge variant="blue">En revisión</Badge>
                </td>
              </tr>
              <tr>
                <td>Jorge López Mendoza</td>
                <td>
                  <input className="calificacion-input" defaultValue="8.5" />
                </td>
                <td style={{ fontWeight: 600, color: 'var(--green)' }}>8.5</td>
                <td>
                  <Badge variant="blue">En revisión</Badge>
                </td>
              </tr>
              <tr>
                <td style={{ borderBottom: '2px solid var(--gray-200)' }}>Ana Martínez Soto</td>
                <td>
                  <input className="calificacion-input" defaultValue="8.0" />
                </td>
                <td style={{ fontWeight: 600, color: 'var(--yellow)' }}>8.3</td>
                <td>
                  <Badge variant="blue">En revisión</Badge>
                </td>
              </tr>

              <tr>
                <td className="td-bold" rowSpan={3} style={{ borderBottom: 'none' }}>
                  Equipo Beta
                </td>
                <td>Pablo Hernández Cruz</td>
                <td rowSpan={3} style={{ verticalAlign: 'middle', borderBottom: 'none' }}>
                  <input className="calificacion-input" defaultValue="9.0" />
                </td>
                <td>
                  <input className="calificacion-input" defaultValue="9.5" />
                </td>
                <td style={{ fontWeight: 600, color: 'var(--green)' }}>9.3</td>
                <td>
                  <Badge variant="green">Calificada</Badge>
                </td>
              </tr>
              <tr>
                <td>Lucía Castillo Vera</td>
                <td>
                  <input className="calificacion-input" defaultValue="9.0" />
                </td>
                <td style={{ fontWeight: 600, color: 'var(--green)' }}>9.0</td>
                <td>
                  <Badge variant="green">Calificada</Badge>
                </td>
              </tr>
              <tr>
                <td style={{ borderBottom: '2px solid var(--gray-200)' }}>Diego Navarro Ríos</td>
                <td>
                  <input className="calificacion-input" defaultValue="8.5" />
                </td>
                <td style={{ fontWeight: 600, color: 'var(--green)' }}>8.8</td>
                <td>
                  <Badge variant="green">Calificada</Badge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div
          style={{
            padding: '12px 20px',
            background: 'var(--blue-light)',
            borderTop: '1px solid var(--gray-200)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 13, color: 'var(--gray-600)' }}>
            Promedio general: <strong style={{ color: 'var(--navy)' }}>8.4</strong>
          </span>
          <span className="btn btn-primary">
            <Save className="icon-sm" />
            Guardar todos
          </span>
        </div>
      </div>
    </PageWrapper>
  )
}
