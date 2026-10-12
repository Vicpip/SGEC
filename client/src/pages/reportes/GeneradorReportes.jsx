// Pantalla 14 — Generador de Reportes
// Rol: Profesor
// URL: /reportes
// Descripción: Genera reportes de desempeño por semestre, materia y tipo de equipo, exportables
// a PDF/Excel. Una fila por equipo: el par Práctica/Tarea (mismos integrantes) se muestra como
// una sola fila "Práctica / Tarea"; Proyecto va aparte. Todos los cálculos vienen del servidor.

import { useEffect, useState } from 'react'
import { BarChart2, FileText, Table as TableIcon, Loader2, BarChart3, Info } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import Badge from '../../components/ui/Badge'
import ProgressBar from '../../components/ui/ProgressBar'
import EmptyState from '../../components/ui/EmptyState'
import SelectorSemestre from '../../components/ui/SelectorSemestre'
import * as reportesService from '../../services/reportes.service'
import * as materiasService from '../../services/materias.service'
import * as semestresService from '../../services/semestres.service'

const TIPO_LABEL = { Practica: 'Práctica', Tarea: 'Tarea', Proyecto: 'Proyecto' }
const TIPOS = ['Practica', 'Tarea', 'Proyecto']
const TIPO_ACTIVIDAD_VARIANT = { 'En clase': 'gray', Practica: 'blue', Tarea: 'navy', Proyecto: 'orange' }
const TIPO_ACTIVIDAD_LABEL = { 'En clase': 'En clase', Practica: 'Práctica', Tarea: 'Tarea', Proyecto: 'Proyecto' }

// Badge de la fila: azul para Práctica (y para el par Práctica / Tarea), azul marino para
// Tarea sola, naranja para Proyecto.
function variantDeFila(tipos) {
  if (tipos.includes('Proyecto')) return 'orange'
  if (tipos.includes('Practica')) return 'blue'
  return 'navy'
}

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
    generar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // El selector de materia solo ofrece las del semestre elegido (GET /api/materias?semestre=).
  // Si la materia seleccionada no pertenece al nuevo semestre, se vuelve a "Todas".
  useEffect(() => {
    let vigente = true
    materiasService
      .listarMaterias(filtroSemestre ? { semestre: filtroSemestre } : {})
      .then((data) => {
        if (!vigente) return
        setMaterias(data)
        setFiltroMateria((actual) => (actual && !data.some((m) => m.clave === actual) ? '' : actual))
      })
      .catch(() => {
        if (vigente) setMaterias([])
      })
    return () => {
      vigente = false
    }
  }, [filtroSemestre])

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

  // El título describe el reporte que está en pantalla (sus filtros), no los selectores, que
  // pueden haber cambiado después de generarlo.
  const filtrosReporte = reporte?.filtros ?? {}
  const materiaDelReporte = reporte?.equipos.find((eq) => eq.materia_clave === filtrosReporte.materia)
  const tituloReporte = [
    filtrosReporte.materia ? materiaDelReporte?.materia ?? filtrosReporte.materia : 'Todas mis materias',
    filtrosReporte.semestre ? `Semestre ${filtrosReporte.semestre}` : null,
    filtrosReporte.tipo ? TIPO_LABEL[filtrosReporte.tipo] : null,
  ]
    .filter(Boolean)
    .join(' · ')

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

  const equiposConActividades = reporte ? reporte.equipos.filter((eq) => eq.actividades.length > 0) : []

  return (
    <PageWrapper title="Generador de Reportes" actions={<div className="topbar-semester">{filtroSemestre || 'Todos los semestres'}</div>}>
      <div className="card mb20">
        <div className="card-header">
          <span className="card-title">Parámetros del reporte</span>
        </div>
        <div className="card-body">
          <div className="form-row-3 mb16">
            <div className="form-group">
              <label className="form-label" htmlFor="reporte-semestre">
                Semestre
              </label>
              <SelectorSemestre
                id="reporte-semestre"
                className="form-control"
                semestres={semestres}
                value={filtroSemestre}
                onChange={setFiltroSemestre}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="reporte-materia">
                Materia
              </label>
              <select
                id="reporte-materia"
                className="form-control"
                value={filtroMateria}
                onChange={(e) => setFiltroMateria(e.target.value)}
              >
                <option value="">{filtroSemestre ? `Todas mis materias de ${filtroSemestre}` : 'Todas mis materias'}</option>
                {materias.map((m) => (
                  <option key={m.id_materia} value={m.clave}>
                    {m.clave} — {m.nombre} · {m.grupo}
                    {filtroSemestre ? '' : ` · ${m.semestre}`}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="reporte-tipo">
                Tipo de equipo
              </label>
              <select id="reporte-tipo" className="form-control" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginBottom: 20 }}>
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
                    <th>Semestre</th>
                    <th>Unidad de aprendizaje</th>
                    <th>Grupo</th>
                    <th>Equipo</th>
                    <th>Tipo</th>
                    <th>Integrantes</th>
                    <th>Promedio</th>
                    <th>% Realizadas</th>
                    <th>% No realizadas</th>
                  </tr>
                </thead>
                <tbody>
                  {reporte.equipos.map((eq) => (
                    <tr key={eq.ids_equipo.join('-')}>
                      <td>{eq.profesor}</td>
                      <td>{eq.semestre}</td>
                      <td>{eq.materia}</td>
                      <td>{eq.grupo}</td>
                      <td className="td-bold">{eq.equipo_nombre}</td>
                      <td>
                        <Badge variant={variantDeFila(eq.tipos)}>{eq.tipo_etiqueta}</Badge>
                      </td>
                      <td style={{ fontSize: 12 }}>{eq.integrantes || '—'}</td>
                      <td className="td-bold" style={{ color: colorPromedio(eq.promedio) }}>
                        {eq.promedio ?? '—'}
                      </td>
                      <td>
                        {eq.pares_total === 0 ? (
                          <span className="text-xs">Sin actividades</span>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ProgressBar percent={eq.pct_realizadas} width="70px" color={eq.pct_realizadas < 50 ? 'var(--yellow)' : undefined} />
                            <span className="text-xs">
                              {eq.pct_realizadas}% ({eq.pares_realizados}/{eq.pares_total})
                            </span>
                          </div>
                        )}
                      </td>
                      <td>{eq.pares_total === 0 ? '—' : `${eq.pct_no_realizadas}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'flex-start',
                marginTop: 14,
                padding: '10px 12px',
                background: 'var(--blue-light)',
                borderRadius: 10,
                fontSize: 12,
                color: 'var(--gray-600)',
                lineHeight: 1.5,
              }}
            >
              <Info className="icon-sm" style={{ flexShrink: 0, marginTop: 2, color: 'var(--blue)' }} />
              <div>
                <div>{reporte.nota_promedio}</div>
                <div>{reporte.nota_realizadas}</div>
              </div>
            </div>

            {equiposConActividades.length > 0 && (
              <>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-800)', margin: '24px 0 10px' }}>
                  Detalle de actividades por equipo
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Equipo</th>
                        <th>Actividad</th>
                        <th>Tipo</th>
                        <th>Tipo de evaluación</th>
                        <th>Realizadas</th>
                        <th>Promedio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {equiposConActividades.flatMap((eq) =>
                        eq.actividades.map((act) => (
                          <tr key={`${eq.ids_equipo.join('-')}-${act.id_actividad}`}>
                            <td className="td-bold">
                              {eq.equipo_nombre}
                              <div className="text-xs" style={{ fontWeight: 400 }}>
                                {eq.materia} · {eq.grupo}
                              </div>
                            </td>
                            <td>{act.titulo}</td>
                            <td>
                              <Badge variant={TIPO_ACTIVIDAD_VARIANT[act.tipo] ?? 'gray'}>{TIPO_ACTIVIDAD_LABEL[act.tipo] ?? act.tipo}</Badge>
                            </td>
                            <td className="text-sm">{act.tipo_evaluacion || '—'}</td>
                            <td>
                              {act.pares_realizados} de {act.pares_total}
                              {act.entrega_por_equipo && (
                                <span className="text-xs" style={{ marginLeft: 6 }}>
                                  (entrega por equipo)
                                </span>
                              )}
                            </td>
                            <td className="td-bold" style={{ color: colorPromedio(act.promedio) }}>
                              {act.promedio ?? '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
