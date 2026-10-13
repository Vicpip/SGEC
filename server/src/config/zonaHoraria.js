// Zona horaria única del sistema: la del centro de México, fija en UTC-06:00 (México dejó
// de usar horario de verano en 2022).
//
// Por qué importa: las fechas de las actividades (fecha_limite, fecha_publicacion) viajan y
// se guardan como "hora de pared" sin zona — el formulario manda `2026-12-01T23:59:00` y la
// columna es DATETIME. Tres relojes tienen que leer esa hora igual:
//   1. Node, al convertir el texto en Date (Joi) y al comparar contra `new Date()`
//      (publicacion.service.js, entregas.controller.js, auth.controller.js).
//   2. mysql2, al escribir un Date como parámetro: usa la zona local del proceso de Node.
//   3. MySQL, al evaluar NOW() / CURRENT_TIMESTAMP y al mostrar las columnas TIMESTAMP:
//      usa la zona de la sesión.
// Si alguno queda en UTC (el valor por defecto de un contenedor), una actividad programada
// se publica 6 horas antes y las entregas se marcan como tardías 6 horas antes de tiempo.
//
// Este módulo fija el punto 1 y 2 (process.env.TZ, si no viene ya del entorno) y expone el
// desfase que config/db.js aplica a cada conexión para el punto 3. Debe cargarse antes de
// crear cualquier Date: lo requieren server.js y config/db.js en su primera línea.

const ZONA_HORARIA = 'America/Mexico_City'
const DESFASE_MYSQL = '-06:00'
const DESFASE_MINUTOS = 360

if (!process.env.TZ) {
  process.env.TZ = ZONA_HORARIA
}

// true si el reloj local de Node coincide con el desfase que se le fija a MySQL.
function zonaHorariaCoherente() {
  return new Date().getTimezoneOffset() === DESFASE_MINUTOS
}

module.exports = { ZONA_HORARIA, DESFASE_MYSQL, zonaHorariaCoherente }
