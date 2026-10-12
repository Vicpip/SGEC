import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import * as materiasService from '../services/materias.service'
import * as semestresService from '../services/semestres.service'

// El semestre elegido se recuerda mientras dure la pestaña, para que el filtro se conserve
// al pasar entre Equipos, Alumnos y Actividades.
const CLAVE_FILTRO = 'sgec_filtro_semestre'
const SIN_MATERIAS = []

function leerFiltroGuardado() {
  try {
    return sessionStorage.getItem(CLAVE_FILTRO) ?? ''
  } catch {
    return ''
  }
}

function guardarFiltro(clave) {
  try {
    if (clave) sessionStorage.setItem(CLAVE_FILTRO, clave)
    else sessionStorage.removeItem(CLAVE_FILTRO)
  } catch {
    // sessionStorage no disponible: el filtro simplemente no se recuerda.
  }
}

// Selector de materia con filtro por semestre para las pantallas del Profesor que trabajan
// sobre una materia (?materia=<clave>): Equipos, Alumnos y Actividades.
//
// - `semestre` ('' = todos) filtra la lista con GET /api/materias?semestre=<clave>.
// - La materia vive en la URL (?materia=). Si no hay ninguna, se elige la primera de la
//   lista. Si la URL trae una materia que no pertenece al semestre filtrado (por ejemplo, se
//   llegó desde un enlace), manda la URL: el filtro vuelve a "Todos los semestres".
// - `materiasListas` es false mientras se carga la lista del semestre elegido; con
//   `materiasListas && !claveMateria` la pantalla sabe que no hay materias que mostrar.
export function useSelectorMateria() {
  const [searchParams, setSearchParams] = useSearchParams()
  const claveMateria = searchParams.get('materia') ?? ''

  const [semestres, setSemestres] = useState([])
  const [semestre, setSemestre] = useState(leerFiltroGuardado)
  // Lista cargada junto con el semestre al que corresponde, para no confundir la lista del
  // semestre anterior con la del recién elegido mientras llega la respuesta.
  const [cargadas, setCargadas] = useState({ semestre: null, lista: SIN_MATERIAS })

  const materiasListas = cargadas.semestre === semestre
  const materias = materiasListas ? cargadas.lista : SIN_MATERIAS

  useEffect(() => {
    semestresService
      .listarSemestres()
      .then((data) => {
        setSemestres(data)
        // Un filtro guardado que ya no existe (semestre renombrado) se descarta.
        setSemestre((actual) => {
          if (actual && !data.some((s) => s.clave === actual)) {
            guardarFiltro('')
            return ''
          }
          return actual
        })
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    let vigente = true
    materiasService
      .listarMaterias(semestre ? { semestre } : {})
      .then((data) => {
        if (vigente) setCargadas({ semestre, lista: data })
      })
      .catch(() => {
        if (vigente) setCargadas({ semestre, lista: SIN_MATERIAS })
      })
    return () => {
      vigente = false
    }
  }, [semestre])

  useEffect(() => {
    if (!materiasListas) return
    if (claveMateria) {
      if (semestre && !materias.some((m) => m.clave === claveMateria)) {
        guardarFiltro('')
        setSemestre('')
      }
      return
    }
    if (materias[0]) {
      setSearchParams({ materia: materias[0].clave }, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materiasListas, materias, claveMateria, semestre])

  function cambiarMateria(clave) {
    setSearchParams(clave ? { materia: clave } : {})
  }

  // Al cambiar de semestre se suelta la materia actual: se elegirá la primera del nuevo.
  function cambiarSemestre(clave) {
    guardarFiltro(clave)
    setSemestre(clave)
    setSearchParams({}, { replace: true })
  }

  return { claveMateria, cambiarMateria, semestres, semestre, cambiarSemestre, materias, materiasListas }
}
