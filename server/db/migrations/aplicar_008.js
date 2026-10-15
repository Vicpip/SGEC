// Aplica la migración 008 de forma idempotente: consulta information_schema y ejecuta
// cada ALTER de 008_materia_ajustes_equipos.sql solo si su columna todavía no existe
// (se puede volver a correr aunque una ejecución anterior haya quedado a medias).
// Uso: node server/db/migrations/aplicar_008.js
// Toma la conexión de server/.env (o de las variables DB_* ya presentes en el entorno,
// que tienen prioridad — útil para apuntar a otra base con DB_NAME=...).

const path = require('path')
const fs = require('fs')
const mysql = require('mysql2/promise')

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') })

const ARCHIVO = '008_materia_ajustes_equipos.sql'

// Extrae del .sql cada sentencia "ALTER TABLE <tabla> ADD COLUMN <columna> ...", para que
// el archivo .sql siga siendo la única fuente de las sentencias.
function leerSentencias() {
  const sql = fs
    .readFileSync(path.join(__dirname, ARCHIVO), 'utf8')
    .split('\n')
    .filter((linea) => !linea.trim().startsWith('--'))
    .join('\n')

  return sql
    .split(';')
    .map((sentencia) => sentencia.trim())
    .filter(Boolean)
    .map((sentencia) => {
      const partes = sentencia.match(/^ALTER TABLE\s+(\w+)\s+ADD COLUMN\s+(\w+)/i)
      if (!partes) throw new Error(`Sentencia no reconocida en ${ARCHIVO}: ${sentencia.slice(0, 60)}`)
      return { tabla: partes[1], columna: partes[2], sentencia }
    })
}

async function aplicar() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
  })

  try {
    let agregadas = 0
    for (const { tabla, columna, sentencia } of leerSentencias()) {
      const [rows] = await connection.query(
        `SELECT 1 FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [tabla, columna]
      )

      if (rows.length > 0) {
        console.log(`Migración 008: ${tabla}.${columna} ya existe en ${process.env.DB_NAME}, no se hizo nada.`)
        continue
      }

      await connection.query(sentencia)
      agregadas++
      console.log(`Migración 008: ${tabla}.${columna} agregada en ${process.env.DB_NAME}.`)
    }
    if (agregadas === 0) {
      console.log(`Migración 008: las columnas ya existen en ${process.env.DB_NAME}, no se hizo nada.`)
    }
  } finally {
    await connection.end()
  }
}

aplicar().catch((err) => {
  console.error('Error aplicando la migración 008:', err.message)
  process.exit(1)
})
