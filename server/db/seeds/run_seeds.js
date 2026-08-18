// Ejecuta todos los seeds de desarrollo en orden.
// Uso: node server/db/seeds/run_seeds.js

const path = require('path')
const fs = require('fs')
const mysql = require('mysql2/promise')

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') })

const SEED_FILES = ['00_admin.sql', '01_semestre.sql', '02_profesor.sql', '03_alumno.sql']

async function runSeeds() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
    multipleStatements: true,
  })

  try {
    for (const file of SEED_FILES) {
      const sql = fs.readFileSync(path.join(__dirname, file), 'utf8')
      console.log(`Ejecutando ${file}...`)
      await connection.query(sql)
    }
    console.log('Seeds ejecutados correctamente.')
  } finally {
    await connection.end()
  }
}

runSeeds().catch((err) => {
  console.error('Error ejecutando seeds:', err.message)
  process.exit(1)
})
