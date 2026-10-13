// Ejecuta todos los seeds de DESARROLLO/DEMO en orden.
// Uso: node server/db/seeds/run_seeds.js
//
// Estos datos traen cuentas con contraseñas publicadas en el repositorio (Admin1234!,
// Profesor1234!, Alumno1234!): sirven para desarrollar y para una demostración, nunca para
// una instalación real. Por eso, con NODE_ENV=production el script se niega a correr salvo
// que se pida de forma explícita con SEED_DEMO=true:
//   docker compose exec -e SEED_DEMO=true server node db/seeds/run_seeds.js
// Una instalación de producción arranca vacía y su Administrador se crea con
// server/db/create_admin.js.

const path = require('path')
const fs = require('fs')
const mysql = require('mysql2/promise')

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') })

const SEED_FILES = [
  '00_admin.sql',
  '01_semestre.sql',
  '02_profesor.sql',
  '03_alumno.sql',
  '04_materia.sql',
  '05_alumnos_extra.sql',
  '06_equipos.sql',
  '07_actividades.sql',
  '08_entregas.sql',
  '09_calificaciones.sql',
  '10_avisos.sql',
  '11_semestre_2026_2.sql',
]

async function runSeeds() {
  if (process.env.NODE_ENV === 'production' && process.env.SEED_DEMO !== 'true') {
    throw new Error(
      'NODE_ENV=production: los seeds de demo crean cuentas con contraseñas públicas y no se cargan salvo con SEED_DEMO=true. Para crear el Administrador real usa db/create_admin.js'
    )
  }

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
