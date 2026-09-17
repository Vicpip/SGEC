// Pantalla 14 — Generador de Reportes
// Rol: Profesor
// URL: /reportes
// Descripción: Genera reportes de desempeño por materia y tipo de equipo, exportables a PDF/Excel.

import { useEffect, useState } from 'react'
import { BarChart2, FileText, Table as TableIcon, Loader2, BarChart3 } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import Badge from '../../components/ui/Badge'
import ProgressBar from '../../components/ui/ProgressBar'
import EmptyState from '../../components/ui/EmptyState'
import * as reportesService from '../../services/reportes.service'
import * as materiasService from '../../services/materias.service'
import * as semestresService from '../../services/semestres.service'

const TIPO_VARIANT = { Practica: 'blue', Tarea: 'navy', Proyecto: 'orange' }
const TIPO_LABEL = { Practica: 'Práctica', Tarea: 'Tarea', Proyecto: 'Proyecto' }
const TIPOS = ['Practica', 'Tarea', 'Proyecto']

function colorPromedio(promedio) {
  if (promedio == null) return 'var(--gray-400)'
  if (promedio >= 8) return 'var(--green)'
  if (promedio >= 6) return 'var(--yellow)'
  return 'var(--red)'
}

function formatearFecha(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })
}

export default function GeneradorReportes() {
  const [semestres, setSemestres] = useState([])
  const [materias, setMaterias] = useState([])
  const [filtroSemestre, setFiltroSemestre] = useState('')
  const [filtroMateria, setFiltroMateria] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('Todos')

  const [reporte, setReporte] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exportando, setExportando] = useState(null)

  useEffect(() => {
    semestresService.listarSemestres().then(setSemestres).catch(() => {})
    materiasService.listarMaterias().then(setMaterias).catch(() => {})
    generar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function filtrosActuales() {
    const params = {}
    if (filtroSemestre) params.semestre = filtroSemestre
    if (filtroMateria) params.materia = filtroMateria
    if (filtroTipo !== 'Todos') params.tipo = filtroTipo
    return params
  }

  function generar() {
    setLoading(true)
    setError('')
    reportesService
      .obtenerReporte(filtrosActuales())
      .then(setReporte)
      .catch((err) => {
        setError(err.response?.data?.error || 'No se pudo generar el reporte')
        setReporte(null)
      })
      .finally(() => setLoading(false))
  }

  async function handleExportar(tipoExporte) {
    setExportando(tipoExporte)
    setError('')
    try {
      const extension = tipoExporte === 'pdf' ? 'pdf' : 'xlsx'
      const blob =
        tipoExporte === 'pdf'
          ? await reportesService.exportarReportePdf(filtrosActuales())
          : await reportesService.exportarReporteExcel(filtrosActuales())
      reportesService.descargarBlob(blob, `reporte-sgec.${extension}`)
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo exportar el reporte')
    } finally {
      setExportando(null)
    }
  }

  const materiaSeleccionada = materias.find((m) => m.clave === filtroMateria)
  const tituloReporte = materiaSeleccionada
    ? `${materiaSeleccionada.nombre}${filtroTipo !== 'Todos' ? ` · ${TIPO_LABEL[filtroTipo]}` : ''}`
    : `Todas mis materias${filtroTipo !== 'Todos' ? ` · ${TIPO_LABEL[filtroTipo]}` : ''}`

  const metricas = reporte
    ? [
        { valor: String(reporte.resumen.total_equipos), label: 'Equipos', bg: 'var(--blue-light)', color: 'var(--navy)' },
        { valor: String(reporte.resumen.total_integrantes), label: 'Integrantes', bg: 'var(--blue-light)', color: 'var(--navy)' },
        {
          valor: reporte.resumen.promedio_general != null ? String(reporte.resumen.promedio_general) : '—',
          label: 'Promedio',
          bg: 'var(--blue-light)',
          color: 'var(--green)',
        },
        { valor: `${reporte.resumen.pct_realizadas_general}%`, label: 'Realizadas', bg: '#F0FDF4', color: 'var(--green)' },
        { valor: `${reporte.resumen.pct_no_realizadas_general}%`, label: 'No realizadas', bg: '#FEF2F2', color: 'var(--red)' },
      ]
    : []

  return (
    <PageWrapper title="Generador de Reportes" actions={<div className="topbar-semester">{filtroSemestre || 'Todos los semestres'}</div>}>
      <div className="card mb20">
        <div className="card-header">
          <span className="card-title">Parámetros del reporte</span>
        </div>
        <div className="card-body">
          <div className="form-row-3 mb16">
            <div className="form-group">
              <label className="form-label">Semestre</label>
              <select className="form-control" value={filtroSemestre} onChange={(e) => setFiltroSemestre(e.target.value)}>
                <option value="">Todos los semestres</option>
                {semestres.map((s) => (
                  <option key={s.id_semestre} value={s.clave}>
                    {s.clave}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Materia</label>
              <select className="form-control" value={filtroMateria} onChange={(e) => setFiltroMateria(e.target.value)}>
                <option value="">Todas mis materias</option>
                {materias.map((m) => (
                  <option key={m.id_materia} value={m.clave}>
                    {m.clave} — {m.nombre} · {m.grupo}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Tipo de equipo</label>
              <select className="form-control" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
                <option value="Todos">Todos los tipos</option>
                {TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {TIPO_LABEL[t]}s
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" onClick={generar} disabled={loading}>
              {loading ? <Loader2 className="icon-sm spin" /> : <BarChart2 className="icon-sm" />}
              Generar reporte
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="login-error" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <Loader2 className="icon-xl spin" style={{ color: 'var(--blue)' }} />
        </div>
      ) : !reporte || reporte.equipos.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={BarChart3}
            title="Sin datos para los filtros indicados"
            description="Ajusta el semestre, la materia o el tipo de equipo e intenta de nuevo."
          />
        </div>
      ) : (
        <div className="report-preview">
          <div className="report-preview-header">
            <div>
              <h3>Reporte — {tituloReporte}</h3>
              <span>Generado el {formatearFecha(reporte.generado_en)}</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-sm"
                style={{ background: 'rgba(255,255,255,.15)', color: 'white', border: '1px solid rgba(255,255,255,.3)' }}
                onClick={() => handleExportar('pdf')}
                disabled={exportando !== null}
              >
                {exportando === 'pdf' ? <Loader2 className="icon-sm spin" /> : <FileText className="icon-sm" />}
                Exportar PDF
              </button>
              <button
                className="btn btn-sm"
                style={{ background: '#217346', color: 'white', border: 'none' }}
                onClick={() => handleExportar('excel')}
                disabled={exportando !== null}
              >
                {exportando === 'excel' ? <Loader2 className="icon-sm spin" /> : <TableIcon className="icon-sm" />}
                Exportar Excel
              </button>
            </div>
          </div>
          <div style={{ padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 20 }}>
              {metricas.map((m) => (
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
                    <th>Profesor</th>
                    <th>Unidad de aprendizaje</th>
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
                  {reporte.equipos.map((eq, idx) => (
                    <tr key={`${eq.materia_clave}-${eq.equipo_nombre}-${eq.tipo}-${idx}`}>
                      <td>{eq.profesor}</td>
                      <td>{eq.materia}</td>
                      <td className="td-bold">{eq.equipo_nombre}</td>
                      <td>
                        <Badge variant={TIPO_VARIANT[eq.tipo]}>{TIPO_LABEL[eq.tipo]}</Badge>
                      </td>
                      <td style={{ fontSize: 12 }}>{eq.integrantes}</td>
                      <td>{eq.actividades_realizadas}</td>
                      <td>{eq.actividades_pendientes}</td>
                      <td className="td-bold" style={{ color: colorPromedio(eq.promedio) }}>
                        {eq.promedio ?? '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <ProgressBar percent={eq.pct_realizadas} width="80px" color={eq.pct_realizadas < 50 ? 'var(--yellow)' : undefined} />
                          <span className="text-xs">{eq.pct_realizadas}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
