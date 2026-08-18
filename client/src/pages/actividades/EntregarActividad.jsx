// Pantalla 17 — Entregar Actividad
// Rol: Alumno
// URL: /alumno/actividades/:id
// Descripción: Formulario de entrega individual/por equipo y estatus de los compañeros de equipo.

import { Clock, FileText, Archive, UploadCloud, Send, CheckCircle, Download, User, Users } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'

const DOCUMENTOS = [
  { icon: FileText, nombre: 'guia_practica5_AFD.pdf' },
  { icon: Archive, nombre: 'plantilla_codigo_python.zip' },
]

const ENTREGA_TIPO = 'individual'

const INTEGRANTES = [
  { iniciales: 'SR', nombre: 'Sofía Ramírez Torres', tu: true, boleta: '2023630045', estatus: 'Sin entregar', variant: 'yellow' },
  { iniciales: 'JL', nombre: 'Jorge López Mendoza', bg: '#27AE60', boleta: '2023630078', estatus: 'Entregado', variant: 'green' },
  { iniciales: 'AM', nombre: 'Ana Martínez Soto', bg: '#E07B2A', boleta: '2023630112', estatus: 'Sin entregar', variant: 'yellow' },
]

export default function EntregarActividad() {
  return (
    <PageWrapper title="Entregar Actividad" actions={<div className="topbar-semester">2026/1</div>}>
      <div className="two-col">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div
              style={{
                background: 'linear-gradient(135deg,var(--navy),var(--blue))',
                padding: '16px 20px',
                borderRadius: 'var(--r-card) var(--r-card) 0 0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ color: 'white' }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Práctica 5 — Lenguajes Regulares</div>
                <div style={{ fontSize: 11.5, opacity: 0.7, marginTop: 3 }}>Teoría de la Computación · Equipo Alfa</div>
              </div>
              <Badge variant="blue" style={{ background: 'rgba(255,255,255,.2)', color: 'white' }}>
                Práctica
              </Badge>
            </div>
            <div className="card-body">
              <div className="flex-between mb16">
                <div>
                  <div className="text-xs mb8">Fecha límite</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>25 Abr 2026 · 23:59</div>
                </div>
                <div className="countdown">
                  <Clock className="icon-sm" />
                  Faltan 6 días
                </div>
              </div>

              <div className="section-lbl">Instrucciones</div>
              <div style={{ fontSize: 13, color: 'var(--gray-600)', lineHeight: 1.6 }}>
                Implementar un autómata finito determinista (AFD) que reconozca el lenguaje L = {'{'}w ∈ {'{'}0,1{'}'}* | w termina en 01{'}'}. Entreguen
                el diagrama de estados, la tabla de transiciones y el código fuente en Python con pruebas unitarias.
              </div>

              <div className="section-lbl mt16">Documentos del profesor</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {DOCUMENTOS.map((d) => (
                  <span key={d.nombre} className="file-chip">
                    <d.icon className="icon-sm" />
                    {d.nombre}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">Integrantes de tu equipo</span>
            </div>
            <div className="card-body" style={{ padding: 14 }}>
              {INTEGRANTES.map((it, i) => (
                <div key={it.boleta} className={`integrante-row${i < INTEGRANTES.length - 1 ? ' mb8' : ''}`}>
                  <div className="integrante-info">
                    <Avatar initials={it.iniciales} bg={it.bg} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        {it.nombre} {it.tu && <span style={{ color: 'var(--blue)', fontSize: 11 }}>(tú)</span>}
                      </div>
                      <div className="text-xs">{it.boleta}</div>
                    </div>
                  </div>
                  <Badge variant={it.variant}>{it.estatus}</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Tu entrega</span>
            </div>
            <div className="card-body">
              {ENTREGA_TIPO === 'equipo' ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'var(--blue-light)',
                    border: '1px solid var(--blue)',
                    borderRadius: 8,
                    padding: '8px 12px',
                    marginBottom: 12,
                    fontSize: 12,
                    color: 'var(--blue)',
                  }}
                >
                  <Users className="icon-sm" />
                  Entrega por equipo — con que uno entregue, todos quedan como completados
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'var(--gray-100)',
                    border: '1px solid var(--gray-200)',
                    borderRadius: 8,
                    padding: '8px 12px',
                    marginBottom: 12,
                    fontSize: 12,
                    color: 'var(--gray-600)',
                  }}
                >
                  <User className="icon-sm" />
                  Entrega individual — cada integrante sube su propio archivo
                </div>
              )}
              <div className="dropzone" style={{ padding: 32, marginBottom: 12 }}>
                <UploadCloud style={{ width: 36, height: 36, color: 'var(--blue)' }} />
                <h3 style={{ fontSize: 14, marginTop: 10 }}>Arrastra tu archivo o haz clic</h3>
                <p style={{ fontSize: 12, marginTop: 4 }}>.zip, .pdf, .py — máx. 20 MB</p>
                <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }}>
                  Seleccionar archivo
                </button>
              </div>
              <div className="form-group">
                <label className="form-label">Comentarios (opcional)</label>
                <div className="form-textarea" style={{ minHeight: 80, color: 'var(--gray-400)' }}>
                  Agrega comentarios o aclaraciones para tu profesor…
                </div>
              </div>
              <button className="btn btn-primary w100" style={{ justifyContent: 'center', padding: 11 }}>
                <Send className="icon-sm" />
                Enviar entrega
              </button>
            </div>
          </div>

          <div className="card" style={{ border: '1.5px solid var(--green)' }}>
            <div className="card-header" style={{ background: '#F0FDF4' }}>
              <span className="card-title" style={{ color: 'var(--green)' }}>
                <CheckCircle className="icon" style={{ color: 'var(--green)', marginRight: 6, verticalAlign: 'middle' }} />
                Entrega de Jorge López
              </span>
              <Badge variant="green">Entregado</Badge>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 13 }}>
                <div>
                  <div className="text-xs mb8">Fecha de entrega</div>
                  <div style={{ fontWeight: 600 }}>24 Abr 2026, 22:10</div>
                </div>
                <div style={{ borderLeft: '1px solid var(--gray-200)', paddingLeft: 16 }}>
                  <div className="text-xs mb8">Estatus</div>
                  <Badge variant="green">Entregado</Badge>
                </div>
              </div>
              <div className="file-list-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText className="icon-sm" style={{ color: 'var(--blue)' }} />
                  <span>practica5_alfa_jorge.zip</span>
                  <span className="text-xs">· 1.2 MB</span>
                </div>
                <div className="action-btn action-view">
                  <Download className="icon-sm" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
