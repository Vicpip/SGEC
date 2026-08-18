// Pantalla 19 — Tablón de Avisos
// Rol: Alumno
// URL: /alumno/tablon
// Descripción: Lista de avisos publicados por los profesores del alumno, con filtro de leídos/no leídos.

import { Download } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import Badge from '../../components/ui/Badge'

const AVISOS = [
  {
    titulo: 'Cambio de aula: Práctica 5',
    materia: 'Teoría de la Computación · Hoy, 09:12',
    cuerpo: 'La práctica 5 se realizará en el Laboratorio 4, piso 2. Recuerden traer su laptop y el código de la práctica anterior.',
    archivo: null,
    leido: false,
  },
  {
    titulo: 'Semana de exámenes parciales',
    materia: 'Todas las materias · Ayer, 15:40',
    cuerpo: 'Los parciales serán del 28 de abril al 2 de mayo. Consulten el calendario académico oficial. El examen abarca los temas vistos hasta la semana 13.',
    archivo: 'calendario_parciales_2026.pdf',
    leido: false,
  },
  {
    titulo: 'Práctica 5 publicada — Revisa tu bandeja de actividades',
    materia: 'Todas las materias · Ayer, 15:41',
    cuerpo: 'Se ha publicado la Práctica 5 — Lenguajes Regulares con fecha límite el 25 de abril. Accede a la sección de Mis Actividades para ver las instrucciones y los archivos de apoyo.',
    archivo: null,
    leido: false,
  },
  {
    titulo: 'Material de apoyo disponible',
    materia: 'Sistemas Operativos · Hace 3 días',
    cuerpo: 'Subí las diapositivas del tema de Planificación de Procesos. Serán base para el examen parcial.',
    archivo: 'slides_planificacion_procesos.pptx',
    leido: true,
  },
]

export default function TablonAlumno() {
  return (
    <PageWrapper
      title="Tablón de Avisos"
      actions={
        <>
          <div className="topbar-semester">2026/1</div>
          <Badge variant="unread" style={{ fontSize: 12, padding: '5px 12px' }}>
            3 sin leer
          </Badge>
        </>
      }
    >
      <div className="toolbar">
        <select className="select-input" style={{ minWidth: 220 }} defaultValue="tc">
          <option value="todas">Todas las materias</option>
          <option value="tc">Teoría de la Computación</option>
          <option value="so">Sistemas Operativos</option>
        </select>
        <div style={{ display: 'flex', gap: 6 }}>
          <span className="btn btn-primary btn-sm">Todos</span>
          <span className="btn btn-secondary btn-sm">Sin leer (3)</span>
          <span className="btn btn-secondary btn-sm">Leídos</span>
        </div>
      </div>

      <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {AVISOS.map((av) => (
          <div key={av.titulo} className={`notice-card${av.leido ? '' : ' unread'}`}>
            <div className="notice-header">
              <div className="notice-avatar">MG</div>
              <div className="notice-meta">
                <strong>Mtro. Miguel Ángel García Ruiz</strong>
                <span>{av.materia}</span>
              </div>
              <Badge variant={av.leido ? 'gray' : 'unread'} style={{ fontSize: 10 }}>
                {av.leido ? 'Leído' : 'Nuevo'}
              </Badge>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-800)', marginBottom: 6 }}>{av.titulo}</div>
            <div className="notice-body">{av.cuerpo}</div>
            {av.archivo && (
              <div style={{ marginTop: 10 }}>
                <span className="file-chip">
                  <Download className="icon-sm" />
                  {av.archivo}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </PageWrapper>
  )
}
