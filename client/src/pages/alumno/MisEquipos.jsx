// Pantalla adicional — Mis Equipos (Alumno)
// Rol: Alumno
// URL: /alumno/equipos
// Nota: no forma parte de las 19 pantallas oficiales de CLAUDE.md; el ítem "Mis Equipos"
// del sidebar del alumno enlaza aquí en lo que se define una pantalla oficial dedicada.
// Actividades/promedio por equipo se conectan en Sesiones 7 y 9 (pendientes).

import { useEffect, useState } from 'react'
import { Loader2, Users } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import EmptyState from '../../components/ui/EmptyState'
import { useAuth } from '../../context/AuthContext'
import * as equiposService from '../../services/equipos.service'

const TIPO_VARIANT = { Practica: 'blue', Tarea: 'navy', Proyecto: 'orange' }
const TIPO_LABEL = { Practica: 'Práctica', Tarea: 'Tarea', Proyecto: 'Proyecto' }

function iniciales(persona) {
  return `${persona.nombre?.[0] ?? ''}${persona.apellido_paterno?.[0] ?? ''}`.toUpperCase()
}

export default function MisEquipos() {
  const { user } = useAuth()
  const [equipos, setEquipos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    equiposService
      .listarEquipos()
      .then((data) => {
        setEquipos(data.equipos)
        setError('')
      })
      .catch((err) => {
        setError(err.response?.data?.error || 'No se pudieron cargar tus equipos')
        setEquipos([])
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <PageWrapper title="Mis Equipos">
      {loading ? (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <Loader2 className="icon-xl spin" style={{ color: 'var(--blue)' }} />
        </div>
      ) : error ? (
        <div className="login-error">{error}</div>
      ) : equipos.length === 0 ? (
        <div className="card">
          <EmptyState icon={Users} title="Sin equipos asignados" description="Tu profesor aún no te ha asignado a un equipo." />
        </div>
      ) : (
        <>
          <div style={{ fontSize: 13, color: 'var(--gray-400)', marginBottom: 20 }}>
            <strong style={{ color: 'var(--gray-800)' }}>{equipos.length} equipos activos</strong>
          </div>

          <div className="equipo-grid">
            {equipos.map((eq) => (
              <div key={eq.id_equipo} className="equipo-card">
                <div className="equipo-card-header">
                  <div>
                    <div className="equipo-name">{eq.nombre}</div>
                    <div className="text-xs" style={{ marginTop: 4 }}>
                      {eq.materia_nombre} · {eq.materia_grupo}
                    </div>
                  </div>
                  <Badge variant={TIPO_VARIANT[eq.tipo]}>{TIPO_LABEL[eq.tipo]}</Badge>
                </div>

                <div className="equipo-members">
                  {eq.integrantes.map((it) => {
                    const esTu = it.id_alumno === user?.id_alumno
                    return (
                      <div key={it.id_alumno} className="member-row">
                        <Avatar
                          size="xs"
                          initials={iniciales(it)}
                          style={esTu ? { border: '2px solid var(--green)' } : undefined}
                        />
                        <span>
                          {it.nombre} {it.apellido_paterno}
                          {esTu && <span style={{ color: 'var(--green)', fontWeight: 600 }}> (tú)</span>}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </PageWrapper>
  )
}
