// Pantalla 08 — Importar Alumnos desde Excel
// Rol: Profesor
// URL: /alumnos/importar?materia=:clave
// Descripción: Carga masiva de alumnos desde un archivo .xlsx, con validación de errores fila por fila.

import { useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, FileSpreadsheet, FileText, AlertTriangle, Check, Loader2 } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import Badge from '../../components/ui/Badge'
import * as alumnosService from '../../services/alumnos.service'

export default function ImportarAlumnos() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const claveMateria = searchParams.get('materia') ?? ''
  const inputRef = useRef(null)

  const [archivo, setArchivo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState(null)

  function volver() {
    navigate(claveMateria ? `/alumnos?materia=${claveMateria}` : '/alumnos')
  }

  function handleSeleccionar() {
    inputRef.current?.click()
  }

  function handleArchivoChange(e) {
    setArchivo(e.target.files?.[0] ?? null)
    setResultado(null)
    setError('')
  }

  async function handleImportar() {
    if (!archivo) {
      setError('Selecciona un archivo .xlsx o .xls')
      return
    }
    if (!claveMateria) {
      setError('No se especificó la materia a la que se inscribirán los alumnos')
      return
    }

    setLoading(true)
    setError('')
    try {
      const data = await alumnosService.importarAlumnos(claveMateria, archivo)
      setResultado(data)
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo importar el archivo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageWrapper
      title="Importar Alumnos desde Excel"
      actions={
        <button className="btn btn-secondary btn-sm" onClick={volver}>
          <ArrowLeft className="icon-sm" />
          {resultado ? 'Volver a la lista' : 'Cancelar'}
        </button>
      }
    >
      <div style={{ maxWidth: 900 }}>
        <div className="card mb20">
          <div className="card-body">
            <div className="dropzone" onClick={handleSeleccionar} style={{ cursor: 'pointer' }}>
              <FileSpreadsheet style={{ width: 40, height: 40, color: 'var(--blue)' }} />
              <h3>Arrastra tu archivo aquí o haz clic para seleccionar</h3>
              <p>Formatos: .xlsx, .xls</p>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
                onChange={handleArchivoChange}
              />
              <div style={{ marginTop: 16, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <span className="btn btn-primary" onClick={(e) => { e.stopPropagation(); handleSeleccionar() }}>
                  Seleccionar archivo
                </span>
              </div>
              {archivo && (
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
                  {archivo.name} — {(archivo.size / 1024).toFixed(0)} KB
                </div>
              )}
            </div>

            {error && (
              <div className="login-error" style={{ marginTop: 16 }}>
                {error}
              </div>
            )}

            {resultado && (
              <>
                <div style={{ margin: '16px 0 14px' }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--gray-600)', marginBottom: 8 }}>
                    Resultado: <span style={{ color: 'var(--green)' }}>{resultado.insertados} alumnos nuevos</span> ·{' '}
                    <span style={{ color: 'var(--blue)' }}>{resultado.inscritos} inscripciones nuevas</span> ·{' '}
                    <span style={{ color: 'var(--gray-400)' }}>{resultado.ya_inscritos} ya inscritos</span>
                    {resultado.errores.length > 0 && (
                      <>
                        {' · '}
                        <span style={{ color: 'var(--red)' }}>{resultado.errores.length} filas con errores</span>
                      </>
                    )}
                  </div>
                  {resultado.errores.map((e) => (
                    <div className="alert-row" key={e.fila}>
                      <AlertTriangle
                        className="icon-sm"
                        style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }}
                      />
                      Fila {e.fila}: {e.errores.join('; ')}
                    </div>
                  ))}
                </div>

                <div className="card">
                  <div className="card-header">
                    <span className="card-title">Resumen de la importación</span>
                    <Badge variant="blue">{resultado.total} filas procesadas</Badge>
                  </div>
                </div>
              </>
            )}

            <div className="form-actions" style={{ marginTop: 16 }}>
              <span className="btn btn-secondary" onClick={volver}>
                {resultado ? 'Volver a la lista' : 'Cancelar'}
              </span>
              {!resultado && (
                <span className="btn btn-primary" onClick={loading ? undefined : handleImportar}>
                  {loading ? <Loader2 className="icon-sm spin" /> : <Check className="icon-sm" />}
                  Confirmar importación
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
