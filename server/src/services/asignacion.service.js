// Algoritmo de asignación aleatoria de integrantes a equipos de 3, sin repetición
// de compañeros por tipo de equipo (Práctica, Tarea, Proyecto) dentro de la misma materia.
//
// Los equipos 'Practica' y 'Tarea' comparten integrantes (ver CLAUDE.md — reglas críticas):
// una asignación masiva de cualquiera de esos dos tipos genera ambas filas de `equipo`
// (mismos integrantes, mismo nombre) en una sola pasada, para no producir agrupaciones
// distintas entre Práctica y Tarea de la misma materia. 'Proyecto' se asigna de forma
// independiente, con su propia reagrupación.

const TIPOS_ESPEJO = ['Practica', 'Tarea']

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
  for (; i + 3 <= mezclados.length; i += 3) {
    grupos.push(mezclados.slice(i, i + 3))
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

module.exports = { asignarEquiposAleatorio, tiposEspejo }
