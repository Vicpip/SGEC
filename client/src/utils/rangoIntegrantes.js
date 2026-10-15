// Rango de integrantes de un equipo según la configuración de su materia (migración 008:
// materia.equipo_tamano_auto, equipo_min y equipo_max). El servidor es quien valida; aquí
// solo se replica para guiar al profesor. Si la materia aún no trae esos campos se usan los
// valores por defecto, que son el comportamiento original (3, 3 y 4).
export function rangoIntegrantes(materia) {
  const min = Number(materia?.equipo_min) || 3
  const max = Number(materia?.equipo_max) || 4
  const tamano = Number(materia?.equipo_tamano_auto) || 3
  return { min, max, tamano }
}

// "3 o 4", "entre 3 y 5" o "exactamente 3", para los mensajes de la interfaz.
export function textoRango({ min, max }) {
  if (min === max) return `exactamente ${min}`
  if (max === min + 1) return `${min} o ${max}`
  return `entre ${min} y ${max}`
}
