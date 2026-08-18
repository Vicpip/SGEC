// Pantalla intermedia — Lista de Actividades
// Rol: Profesor
// URL: /actividades
// Descripción: Punto de entrada del ítem "Actividades" del sidebar. Lista las actividades
// publicadas y permite navegar al detalle de cada una.
//
// NOTA: esta pantalla NO forma parte de las 19 pantallas oficiales del proyecto (ver
// CLAUDE.md, sección "Las 19 pantallas"). Se agregó porque el sidebar del Profesor
// necesitaba un destino propio para "Actividades" distinto de /actividades/nueva
// (Pantalla 15 — Publicar Actividad) y de /actividades/:id (Pantalla 10 — Detalle de
// Actividad), que hasta ahora solo era alcanzable por URL directa.

import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import Badge from '../../components/ui/Badge'

const ACTIVIDADES = [
  { titulo: 'Práctica 3 — Autómatas', estatus: 'Pendiente', variant: 'yellow', detalle: 'Teoría de la Computación · 8 equipos' },
  { titulo: 'Tarea 2 — Procesos', estatus: 'Calificada', variant: 'green', detalle: 'Sistemas Operativos · 7 equipos' },
  { titulo: 'Proyecto Final — Etapa 1', estatus: 'En revisión', variant: 'blue', detalle: 'Redes de Computadoras · 5 equipos' },
]

export default function ListaActividades() {
  const navigate = useNavigate()

  return (
    <PageWrapper
      title="Actividades"
      actions={
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/actividades/nueva')}>
          <Plus className="icon-sm" />
          Publicar actividad
        </button>
      }
    >
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Actividad</th>
                <th>Detalle</th>
                <th>Estatus</th>
              </tr>
            </thead>
            <tbody>
              {ACTIVIDADES.map((a) => (
                <tr key={a.titulo} className="clickable-row" onClick={() => navigate('/actividades/1')}>
                  <td className="td-bold">{a.titulo}</td>
                  <td>{a.detalle}</td>
                  <td>
                    <Badge variant={a.variant}>{a.estatus}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageWrapper>
  )
}
