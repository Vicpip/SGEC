// Regla de repetición de alumnos de una materia (materia.regla_repeticion, migración 008). El
// servidor es quien valida (tiposExcluyentes en server/src/services/asignacion.service.js);
// aquí solo se replica para mostrar al profesor los alumnos que sí puede elegir.
//   'B' (por defecto): no repetir dentro del mismo tipo; Práctica y Tarea comparten equipo.
//   'A': además, quien está en Práctica/Tarea no puede estar en Proyecto, y viceversa.

export const REGLAS_REPETICION = [
  { valor: 'B', label: 'No repetir dentro del mismo tipo (Práctica y Tarea comparten equipo)' },
  { valor: 'A', label: 'No repetir entre bloques: quien está en Práctica/Tarea no puede estar en Proyecto' },
]

export const TIPOS_ESPEJO = ['Practica', 'Tarea']
const TODOS_LOS_TIPOS = ['Practica', 'Tarea', 'Proyecto']

// Tipos de equipo activos que impiden colocar a un alumno en un equipo de `tipo`.
export function tiposExcluyentes(tipo, regla) {
  if (regla === 'A') return TODOS_LOS_TIPOS
  return TIPOS_ESPEJO.includes(tipo) ? TIPOS_ESPEJO : [tipo]
}

// Ids de los alumnos que ya están ocupados para un equipo de `tipo`, según la regla. `equipos`
// son los equipos activos de la materia (GET /equipos); `idsPropios` son el equipo que se edita
// y su espejo, que no cuentan.
export function idsAlumnosOcupados(equipos, tipo, regla, idsPropios = []) {
  const tipos = tiposExcluyentes(tipo, regla)
  return new Set(
    equipos
      .filter((eq) => tipos.includes(eq.tipo) && !idsPropios.includes(eq.id_equipo))
      .flatMap((eq) => eq.integrantes.map((it) => it.id_alumno))
  )
}
