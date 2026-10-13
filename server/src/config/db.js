const { DESFASE_MYSQL } = require('./zonaHoraria')
const mysql = require('mysql2/promise')
const { validateEnv } = require('./env')

const env = validateEnv()

// dateStrings: las fechas se leen como texto ('YYYY-MM-DD HH:MM:SS'), sin conversión.
// No se fija la opción `timezone` de mysql2: los Date que se mandan como parámetro se
// escriben en la zona local del proceso, que config/zonaHoraria.js deja en la del sistema.
const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
})

// Cada conexión nueva fija su zona de sesión, para que NOW(), CURRENT_TIMESTAMP y las
// columnas TIMESTAMP usen la misma hora que Node sin depender de cómo esté configurado el
// servidor MySQL. La sentencia se encola antes que cualquier consulta de quien pidió la
// conexión, así que nunca se ejecuta una consulta con la zona anterior.
pool.pool.on('connection', (conexion) => {
  conexion.query(`SET time_zone = '${DESFASE_MYSQL}'`)
})

module.exports = pool
