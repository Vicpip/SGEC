// Algoritmo de asignación aleatoria de integrantes a equipos de 3, sin repetición
// de compañeros por tipo de equipo (Práctica, Tarea, Proyecto) dentro de la misma materia.
//
// Los equipos 'Practica' y 'Tarea' comparten integrantes (ver CLAUDE.md — reglas críticas):
// cada equipo de esos tipos existe como DOS filas de `equipo` (una por tipo, mismos
// integrantes y mismo nombre) enlazadas entre sí por equipo.id_equipo_espejo. Crear, editar
// y desactivar un equipo de Práctica o Tarea opera siempre sobre ambas filas (ver
// equipos.controller.js). 'Proyecto' se asigna de forma independiente, con su propia
// reagrupación, y no tiene espejo.
//
// Tamaño de los equipos: la asignación automática siempre forma equipos de exactamente 3 y
// reporta los 1–2 alumnos sobrantes; el alta y la edición manual admiten 3 o 4 integrantes
// para que el profesor pueda absorber a esos sobrantes.

const TIPOS_ESPEJO = ['Practica', 'Tarea']

const TAMANO_EQUIPO_AUTOMATICO = 3
const INTEGRANTES_MIN = 3
const INTEGRANTES_MAX = 4

function mezclarAleatorio(lista) {
  const copia = [...lista]
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}

// idsAlumnos: ids de alumnos disponibles para este tipo (ya excluidos quienes tienen
// equipo activo de ese tipo en la materia). Devuelve grupos de 3 y los sobrantes que no
// alcanzaron a completar un equipo.
function asignarEquiposAleatorio(idsAlumnos) {
  const mezclados = mezclarAleatorio(idsAlumnos)
  const grupos = []
  let i = 0
  for (; i + TAMANO_EQUIPO_AUTOMATICO <= mezclados.length; i += TAMANO_EQUIPO_AUTOMATICO) {
    grupos.push(mezclados.slice(i, i + TAMANO_EQUIPO_AUTOMATICO))
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
  tipoEspejoDe,
  TAMANO_EQUIPO_AUTOMATICO,
  INTEGRANTES_MIN,
  INTEGRANTES_MAX,
}
