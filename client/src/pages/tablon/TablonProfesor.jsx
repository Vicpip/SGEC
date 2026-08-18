// Pantalla 18 — Tablón de Avisos
// Rol: Profesor
// URL: /tablon
// Descripción: Publicación de avisos dirigidos a una materia o a todas las materias del profesor.

import { Plus, Paperclip, FileText, X, Megaphone, Pencil, Trash2 } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'

const AVISOS = [
  {
    titulo: 'Cambio de aula: Práctica 5',
    materia: 'Teoría de la Computación · Hoy, 09:12',
    cuerpo: 'La práctica 5 se realizará en el Laboratorio 4, piso 2. Recuerden traer su laptop y el código de la práctica anterior.',
    archivo: null,
    badge: 'Teoría de la Computación',
    variant: 'blue',
    notificados: '32 alumnos notificados',
  },
  {
    titulo: 'Semana de exámenes parciales',
    materia: 'Todas las materias · Ayer, 15:40',
    cuerpo: 'Los parciales serán del 28 de abril al 2 de mayo. Consulten el calendario académico oficial adjunto.',
    archivo: 'calendario_parciales_2026.pdf',
    badge: 'Todas las materias',
    variant: 'navy',
    notificados: '118 alumnos notificados',
  },
  {
    titulo: 'Material de apoyo disponible',
    materia: 'Sistemas Operativos · Hace 3 días',
    cuerpo: 'Subí las diapositivas del tema de Planificación de Procesos al tablón.',
    archivo: 'slides_planificacion_procesos.pptx',
    badge: 'Sistemas Operativos',
    variant: 'orange',
    notificados: '28 alumnos notificados',
  },
]

export default function TablonProfesor() {
  return (
    <PageWrapper title="Tablón de Avisos" actions={<div className="topbar-semester">2026/1</div>}>
      <div className="two-col">
        <div className="card" style={{ height: 'fit-content' }}>
          <div className="card-header">
            <span className="card-title">
              <Plus className="icon" style={{ verticalAlign: 'middle', marginRight: 6, color: 'var(--blue)' }} />
              Nuevo aviso
            </span>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">Título del aviso</label>
              <div className="form-control focused">Recordatorio: Examen parcial semana 14</div>
            </div>
            <div className="form-group">
              <label className="form-label">Mensaje</label>
              <div className="form-textarea">
                Recuerden que el examen parcial del módulo de Lenguajes Regulares se llevará a cabo el próximo lunes 28 de abril en el aula B-204. Deben
                traer su credencial vigente. El examen abarca los temas 4 al 7 del programa.
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Dirigido a</label>
              <select className="form-control" defaultValue="tc-401-4bm1">
                <option value="todas">Todas mis materias</option>
                <option value="tc-401-4bm1">Teoría de la Computación — 4BM1</option>
                <option value="so-301-3bm2">Sistemas Operativos — 3BM2</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Adjuntar documentos</label>
              <div className="dropzone" style={{ padding: 20, marginBottom: 8 }}>
                <Paperclip style={{ width: 28, height: 28, color: 'var(--blue)' }} />
                <p style={{ marginTop: 8, fontSize: 12 }}>Arrastra archivos o haz clic</p>
              </div>
              <div className="file-list-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText className="icon-sm" style={{ color: 'var(--blue)' }} />
                  <span>temario_parcial_2_TC.pdf</span>
                </div>
                <div className="action-btn action-del">
                  <X className="icon-sm" />
                </div>
              </div>
            </div>
            <button className="btn btn-primary w100" style={{ justifyContent: 'center' }}>
              <Megaphone className="icon-sm" />
              Publicar aviso
            </button>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 14 }}>
            Avisos publicados (3)
          </div>
          {AVISOS.map((av) => (
            <div key={av.titulo} className="notice-card">
              <div className="notice-header">
                <div className="notice-avatar">MG</div>
                <div className="notice-meta">
                  <strong>{av.titulo}</strong>
                  <span>{av.materia}</span>
                </div>
                <div className="actions">
                  <div className="action-btn action-edit">
                    <Pencil className="icon-sm" />
                  </div>
                  <div className="action-btn action-del">
                    <Trash2 className="icon-sm" />
                  </div>
                </div>
              </div>
              <div className="notice-body">{av.cuerpo}</div>
              {av.archivo && (
                <div style={{ marginBottom: 10 }}>
                  <span className="file-chip">
                    <FileText className="icon-sm" />
                    {av.archivo}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={`badge badge-${av.variant}`}>{av.badge}</span>
                <span className="text-xs">{av.notificados}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  )
}
