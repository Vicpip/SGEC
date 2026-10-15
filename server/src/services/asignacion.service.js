// Algoritmo de asignación aleatoria de integrantes a equipos, sin repetición de alumnos
// dentro de un mismo tipo de equipo (Práctica y Tarea cuentan como uno) en la misma materia,
// o entre bloques si la materia usa la regla 'A' (ver tiposExcluyentes).
//
// Los equipos 'Practica' y 'Tarea' comparten integrantes (ver CLAUDE.md — reglas críticas):
// cada equipo de esos tipos existe como DOS filas de `equipo` (una por tipo, mismos
// integrantes y mismo nombre) enlazadas entre sí por equipo.id_equipo_espejo. Crear, editar
// y desactivar un equipo de Práctica o Tarea opera siempre sobre ambas filas (ver
// equipos.controller.js). 'Proyecto' se asigna de forma independiente, con su propia
// reagrupación, y no tiene espejo.
//
// Tamaño de los equipos: lo define cada materia (materia.equipo_tamano_auto, equipo_min y
// equipo_max, migración 008). La asignación automática forma equipos de exactamente
// equipo_tamano_auto y reporta los sobrantes; el alta y la edición manual admiten entre
// equipo_min y equipo_max integrantes para que el profesor pueda absorber a esos sobrantes.
// Las constantes de abajo son los valores por defecto de esas columnas (3, 3 y 4).

const TIPOS_ESPEJO = ['Practica', 'Tarea']

const TAMANO_EQUIPO_AUTOMATICO = 3
const INTEGRANTES_MIN = 3
const INTEGRANTES_MAX = 4
// Tope absoluto de integrantes por equipo, para cualquier materia.
const INTEGRANTES_TOPE = 10

function mezclarAleatorio(lista) {
  const copia = [...lista]
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}

// idsAlumnos: ids de alumnos disponibles para este tipo (ya excluidos quienes tienen
// equipo activo de ese tipo en la materia). Devuelve grupos de `tamano` integrantes y los
// sobrantes que no alcanzaron a completar un equipo.
function asignarEquiposAleatorio(idsAlumnos, tamano = TAMANO_EQUIPO_AUTOMATICO) {
  const mezclados = mezclarAleatorio(idsAlumnos)
  const grupos = []
  let i = 0
  for (; i + tamano <= mezclados.length; i += tamano) {
    grupos.push(mezclados.slice(i, i + tamano))
  }
  const sobrantes = mezclados.slice(i)
  return { grupos, sobrantes }
}

// Tipos de equipo que deben tratarse como un mismo grupo de integrantes: Practica y Tarea
// comparten alumnos, así que para exclusión/asignación se consideran juntos; Proyecto es
// independiente.
function tiposEspejo(tipo) {
  return TIPOS_ESPEJO.includes(tipo) ? TIPOS_ESPEJO : [tipo]
}

// Regla de repetición de la materia (materia.regla_repeticion, migración 008):
//   'B' (por defecto): un alumno no repite dentro del mismo tipo; Práctica y Tarea cuentan como
//       uno (tiposEspejo). Puede estar a la vez en un equipo de Práctica/Tarea y en uno de
//       Proyecto.
//   'A' (A′, entre bloques): además, quien está en un equipo de Práctica/Tarea no puede estar en
//       uno de Proyecto, y viceversa. Práctica y Tarea siguen siendo el mismo equipo (espejo).
// Devuelve los tipos de equipo activos que impiden colocar a un alumno en un equipo de `tipo`.
const TODOS_LOS_TIPOS = ['Practica', 'Tarea', 'Proyecto']

function tiposExcluyentes(tipo, regla) {
  return regla === 'A' ? TODOS_LOS_TIPOS : tiposEspejo(tipo)
}

// Nombre del bloque al que pertenece un tipo, para los mensajes: 'Práctica/Tarea' o 'Proyecto'.
function nombreBloque(tipo) {
  return TIPOS_ESPEJO.includes(tipo) ? 'Práctica/Tarea' : 'Proyecto'
}

// Tipo de la fila gemela de un equipo ('Practica' <-> 'Tarea'); null si el tipo no tiene
// espejo (Proyecto).
function tipoEspejoDe(tipo) {
  if (tipo === 'Practica') return 'Tarea'
  if (tipo === 'Tarea') return 'Practica'
  return null
}

module.exports = {
  asignarEquiposAleatorio,
  tiposEspejo,
  tiposExcluyentes,
  nombreBloque,
  tipoEspejoDe,
  TAMANO_EQUIPO_AUTOMATICO,
  INTEGRANTES_MIN,
  INTEGRANTES_MAX,
  INTEGRANTES_TOPE,
}
