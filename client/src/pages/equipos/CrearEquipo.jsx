// Pantalla 05 — Crear Equipo
// Rol: Profesor
// URL: /equipos/nuevo
// Descripción: Formulario para crear un equipo, de forma manual o aleatoria sin repetición. El
// número de integrantes lo define la materia (3 o 4 por defecto) y la asignación aleatoria
// propone su tamaño automático (3 por defecto). Un equipo de Práctica o de Tarea se crea para
// ambos tipos a la vez (comparten integrantes).

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Shuffle, Check, Loader2 } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import Avatar from '../../components/ui/Avatar'
import SelectorSemestre from '../../components/ui/SelectorSemestre'
import { useSelectorMateria } from '../../hooks/useSelectorMateria'
import * as alumnosService from '../../services/alumnos.service'
import * as equiposService from '../../services/equipos.service'
import { rangoIntegrantes, textoRango } from '../../utils/rangoIntegrantes'

const TIPOS = ['Practica', 'Tarea', 'Proyecto']
const TIPO_LABEL = { Practica: 'Práctica', Tarea: 'Tarea', Proyecto: 'Proyecto' }
// Practica y Tarea comparten integrantes (ver CLAUDE.md): un alumno con equipo de
// cualquiera de esos dos tipos queda excluido del pool de elegibles del otro.
const TIPOS_ESPEJO = ['Practica', 'Tarea']

function tiposExcluidos(tipo) {
  return TIPOS_ESPEJO.includes(tipo) ? TIPOS_ESPEJO : [tipo]
}

function iniciales(alumno) {
  return `${alumno.nombre?.[0] ?? ''}${alumno.apellido_paterno?.[0] ?? ''}`.toUpperCase()
}

export default function CrearEquipo() {
  const navigate = useNavigate()
  const { claveMateria, cambiarMateria, semestres, semestre, cambiarSemestre, materias, materiasListas } = useSelectorMateria()
  // Numera las cargas para descartar la respuesta de una materia que ya no es la elegida.
  const solicitudRef = useRef(0)

  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState('Practica')
  const [alumnos, setAlumnos] = useState([])
  const [equipos, setEquipos] = useState([])
  const [seleccion, setSeleccion] = useState([])
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const solicitud = ++solicitudRef.current
    // Mientras se carga la lista de materias del semestre elegido no se pide nada: la
    // materia de la URL puede pertenecer todavía al semestre anterior.
    if (!materiasListas) {
      setLoading(true)
      return
    }
    if (!claveMateria) {
      setAlumnos([])
      setEquipos([])
      setSeleccion([])
      setLoading(false)
      return
    }
    setLoading(true)
    setSeleccion([])
    Promise.all([alumnosService.listarAlumnos(claveMateria), equiposService.listarEquipos(claveMateria)])
      .then(([alumnosData, equiposData]) => {
        if (solicitud !== solicitudRef.current) return
        setAlumnos(alumnosData.alumnos)
        setEquipos(equiposData.equipos)
        setError('')
      })
      .catch((err) => {
        if (solicitud !== solicitudRef.current) return
        setError(err.response?.data?.error || 'No se pudieron cargar los alumnos de la materia')
        setAlumnos([])
        setEquipos([])
      })
      .finally(() => {
        if (solicitud === solicitudRef.current) setLoading(false)
      })
  }, [claveMateria, materiasListas])

  const materiaActual = materias.find((m) => m.clave === claveMateria)
  // Rango de integrantes y tamaño automático de la materia elegida (3, 3 y 4 por defecto).
  const rango = rangoIntegrantes(materiaActual)

  const elegibles = useMemo(() => {
    const tiposAExcluir = tiposExcluidos(tipo)
    const idsConEquipo = new Set(
      equipos.filter((eq) => tiposAExcluir.includes(eq.tipo)).flatMap((eq) => eq.integrantes.map((it) => it.id_alumno))
    )
    return alumnos.filter((al) => !idsConEquipo.has(al.id_alumno))
  }, [alumnos, equipos, tipo])

  useEffect(() => {
    setSeleccion((prev) => prev.filter((id) => elegibles.some((al) => al.id_alumno === id)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, elegibles.length])

  function toggleSeleccion(idAlumno) {
    setSeleccion((prev) => {
      if (prev.includes(idAlumno)) return prev.filter((id) => id !== idAlumno)
      if (prev.length >= rango.max) return prev
      return [...prev, idAlumno]
    })
  }

  function handleAleatorio() {
    const copia = [...elegibles]
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[copia[i], copia[j]] = [copia[j], copia[i]]
    }
    setSeleccion(copia.slice(0, rango.tamano).map((al) => al.id_alumno))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!nombre.trim()) {
      setError('El nombre del equipo es requerido')
      return
    }
    if (seleccion.length < rango.min || seleccion.length > rango.max) {
      setError(`Selecciona ${textoRango(rango)} integrantes`)
      return
    }
    if (!materiaActual) {
      setError('Elige una materia')
      return
    }

    setGuardando(true)
    try {
      await equiposService.crearEquipo({
        id_materia: materiaActual.id_materia,
        nombre: nombre.trim(),
        tipo,
        integrantes: seleccion,
      })
      navigate(`/equipos?materia=${claveMateria}`)
    } catch (err) {
      const detalle = err.response?.data?.errores?.[0]
      setError(detalle || err.response?.data?.error || 'No se pudo crear el equipo')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <PageWrapper
      title="Crear Nuevo Equipo"
      actions={
        <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/equipos?materia=${claveMateria}`)}>
          <ArrowLeft className="icon-sm" />
          Cancelar
        </button>
      }
    >
      <div className="two-col">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Información del equipo</span>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label" htmlFor="nombre">
                Nombre del equipo
              </label>
              <input
                id="nombre"
                className="form-control"
                placeholder="Equipo 1"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="materia">
                Materia
              </label>
              <SelectorSemestre
                className="form-control"
                semestres={semestres}
                value={semestre}
                onChange={cambiarSemestre}
              />
              <select
                id="materia"
                className="form-control"
                style={{ marginTop: 8 }}
                value={claveMateria}
                onChange={(e) => cambiarMateria(e.target.value)}
              >
                {materias.map((m) => (
                  <option key={m.id_materia} value={m.clave}>
                    {m.clave} — {m.nombre} · {m.grupo}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Tipo de equipo</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {TIPOS.map((t) => (
                  <div
                    key={t}
                    onClick={() => setTipo(t)}
                    style={{
                      cursor: 'pointer',
                      border: t === tipo ? '2px solid var(--blue)' : '1px solid var(--gray-200)',
                      background: t === tipo ? 'var(--blue-light)' : 'transparent',
                      borderRadius: 10,
                      padding: 10,
                      textAlign: 'center',
                      fontSize: 12,
                      fontWeight: t === tipo ? 600 : 400,
                      color: t === tipo ? 'var(--blue)' : 'var(--gray-400)',
                    }}
                  >
                    {TIPO_LABEL[t]}
                  </div>
                ))}
              </div>
            </div>
            {TIPOS_ESPEJO.includes(tipo) && (
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--gray-600)',
                  marginBottom: 16,
                  padding: '8px 12px',
                  background: 'var(--blue-light)',
                  borderRadius: 10,
                  borderLeft: '3px solid var(--blue)',
                }}
              >
                Los equipos de Práctica y de Tarea comparten integrantes: al crear este equipo se crea también su equipo
                de {tipo === 'Practica' ? 'Tarea' : 'Práctica'}, con el mismo nombre y los mismos alumnos.
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Número de integrantes</label>
              <div className="form-control">
                {seleccion.length} seleccionado{seleccion.length === 1 ? '' : 's'} (mínimo {rango.min}, máximo {rango.max})
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Integrantes asignados</span>
            <button className="btn btn-secondary btn-sm" onClick={handleAleatorio} disabled={elegibles.length < rango.tamano}>
              <Shuffle className="icon-sm" />
              Asignar aleatoriamente
            </button>
          </div>
          <div className="card-body">
            {loading ? (
              <div style={{ padding: 24, textAlign: 'center' }}>
                <Loader2 className="icon-lg spin" style={{ color: 'var(--blue)' }} />
              </div>
            ) : elegibles.length === 0 ? (
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--gray-400)',
                  padding: '8px 12px',
                  background: 'var(--blue-light)',
                  borderRadius: 10,
                  borderLeft: '3px solid var(--blue)',
                }}
              >
                No hay alumnos disponibles para tipo {TIPO_LABEL[tipo]} en esta materia (todos ya tienen equipo).
              </div>
            ) : (
              <>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--gray-400)',
                    marginBottom: 14,
                    padding: '8px 12px',
                    background: 'var(--blue-light)',
                    borderRadius: 10,
                    borderLeft: '3px solid var(--blue)',
                  }}
                >
                  Selecciona {textoRango(rango)} integrantes de la lista, o usa la asignación aleatoria (elige {rango.tamano}).
                </div>
                {elegibles.map((al) => {
                  const marcado = seleccion.includes(al.id_alumno)
                  return (
                    <div
                      key={al.id_alumno}
                      className="integrante-row"
                      style={{
                        cursor: 'pointer',
                        border: marcado ? '1px solid var(--blue)' : '1px solid transparent',
                        background: marcado ? 'var(--blue-light)' : 'transparent',
                        borderRadius: 10,
                      }}
                      onClick={() => toggleSeleccion(al.id_alumno)}
                    >
                      <div className="integrante-info">
                        <Avatar initials={iniciales(al)} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-800)' }}>
                            {al.nombre} {al.apellido_paterno} {al.apellido_materno ?? ''}
                          </div>
                          <div className="text-xs">Boleta: {al.boleta}</div>
                        </div>
                      </div>
                      <input type="checkbox" checked={marcado} readOnly />
                    </div>
                  )
                })}
              </>
            )}

            {error && (
              <div className="login-error" style={{ marginTop: 16 }}>
                {error}
              </div>
            )}

            <div className="form-actions" style={{ marginTop: 20 }}>
              <button className="btn btn-secondary" onClick={() => navigate(`/equipos?materia=${claveMateria}`)} disabled={guardando}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={guardando || seleccion.length < rango.min || seleccion.length > rango.max}
              >
                {guardando ? <Loader2 className="icon-sm spin" /> : <Check className="icon-sm" />}
                Crear equipo
              </button>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
