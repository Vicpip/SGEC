// Aplica la migración 005 de forma idempotente: consulta information_schema y solo
// ejecuta el ALTER si usuario.contrasena_cambiada_en todavía no existe.
// Uso: node server/db/migrations/aplicar_005.js
// Toma la conexión de server/.env (o de las variables DB_* ya presentes en el entorno,
// que tienen prioridad — útil para apuntar a otra base con DB_NAME=...).

const path = require('path')
const fs = require('fs')
const mysql = require('mysql2/promise')

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') })

async function aplicar() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
  })

  try {
    const [rows] = await connection.query(
      `SELECT 1 FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuario' AND COLUMN_NAME = 'contrasena_cambiada_en'`
    )

    if (rows.length > 0) {
      console.log(`Migración 005: la columna ya existe en ${process.env.DB_NAME}, no se hizo nada.`)
      return
    }

    const sql = fs.readFileSync(path.join(__dirname, '005_contrasena_cambiada_en.sql'), 'utf8')
    await connection.query(sql)
    console.log(`Migración 005 aplicada en ${process.env.DB_NAME}.`)
  } finally {
    await connection.end()
  }
}

aplicar().catch((err) => {
  console.error('Error aplicando la migración 005:', err.message)
  process.exit(1)
})
