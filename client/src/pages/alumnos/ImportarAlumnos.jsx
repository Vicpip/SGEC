// Pantalla 08 — Importar Alumnos desde Excel
// Rol: Profesor
// URL: /alumnos/importar
// Descripción: Carga masiva de alumnos desde un archivo .xlsx, con validación de errores fila por fila.

import { useNavigate } from 'react-router-dom'
import { ArrowLeft, FileSpreadsheet, FileText, AlertTriangle, Check } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import Badge from '../../components/ui/Badge'

const VISTA_PREVIA = [
  { n: 1, boleta: '2023630045', nombre: 'Ramírez Torres, Sofía Valentina', grupo: '4BM1', estatus: 'Válido', variant: 'green', error: false },
  { n: 2, boleta: '2023630078', nombre: 'López Mendoza, Jorge Alberto', grupo: '4BM1', estatus: 'Válido', variant: 'green', error: false },
  { n: 14, boleta: '202363A089', nombre: 'Pérez Sánchez, Rodrigo', grupo: '4BM1', estatus: 'Error en boleta', variant: 'red', error: true, boletaError: true },
  { n: 27, boleta: '2023630211', nombre: '—', grupo: '4BM1', estatus: 'Nombre vacío', variant: 'red', error: true, nombreError: true },
]

export default function ImportarAlumnos() {
  const navigate = useNavigate()

  return (
    <PageWrapper
      title="Importar Alumnos desde Excel"
      actions={
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/alumnos')}>
          <ArrowLeft className="icon-sm" />
          Cancelar
        </button>
      }
    >
      <div style={{ maxWidth: 900 }}>
        <div className="card mb20">
          <div className="card-body">
            <div className="dropzone">
              <FileSpreadsheet style={{ width: 40, height: 40, color: 'var(--blue)' }} />
              <h3>Arrastra tu archivo aquí o haz clic para seleccionar</h3>
              <p>Formatos: .xlsx, .xls &nbsp;·&nbsp; Tamaño máximo: 5 MB</p>
              <div style={{ marginTop: 16, display: 'flex', gap: 10, justifyContent: 'center' }}>
                <span className="btn btn-primary">Seleccionar archivo</span>
                <span className="btn btn-secondary">Descargar plantilla</span>
              </div>
              <div
                style={{
                  marginTop: 14,
                  padding: '8px 16px',
                  background: 'rgba(46,117,182,.12)',
                  borderRadius: 8,
                  fontSize: 12,
                  color: 'var(--blue)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <FileText className="icon-sm" />
                lista_alumnos_4BM1_2026-1.xlsx — 18 KB
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--gray-600)', marginBottom: 8 }}>
                Resultado: <span style={{ color: 'var(--green)' }}>30 filas válidas</span> ·{' '}
                <span style={{ color: 'var(--red)' }}>2 filas con errores</span>
              </div>
              <div className="alert-row">
                <AlertTriangle className="icon-sm" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                Fila 14: El campo "Boleta" contiene caracteres no numéricos (202363A089)
              </div>
              <div className="alert-row">
                <AlertTriangle className="icon-sm" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                Fila 27: El campo "Nombre" está vacío
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <span className="card-title">Vista previa de datos</span>
                <Badge variant="blue">32 filas</Badge>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Boleta</th>
                      <th>Nombre completo</th>
                      <th>Grupo</th>
                      <th>Estatus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {VISTA_PREVIA.map((fila) => (
                      <tr key={fila.n} className={fila.error ? 'error-row' : undefined}>
                        <td className="text-xs">{fila.n}</td>
                        <td style={fila.boletaError ? { color: 'var(--red)' } : undefined}>{fila.boleta}</td>
                        <td style={fila.nombreError ? { color: 'var(--red)' } : undefined}>{fila.nombre}</td>
                        <td>{fila.grupo}</td>
                        <td>
                          <Badge variant={fila.variant}>{fila.estatus}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ marginTop: 16, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <span className="btn btn-secondary" onClick={() => navigate('/alumnos')}>
                Cancelar
              </span>
              <span className="btn btn-danger">Omitir errores e importar (30)</span>
              <span className="btn btn-primary">
                <Check className="icon-sm" />
                Confirmar importación (30)
              </span>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
