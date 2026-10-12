// Aplica la migración 004 de forma idempotente: consulta information_schema y ejecuta cada
// sentencia de 004_equipo_espejo.sql solo si su efecto todavía no existe (columna, índice,
// llave foránea). El backfill se ejecuta siempre: solo toca equipos que aún no tienen espejo,
// así que se puede volver a correr aunque una ejecución anterior haya quedado a medias.
// Uso: node server/db/migrations/aplicar_004.js
// Toma la conexión de server/.env (o de las variables DB_* ya presentes en el entorno,
// que tienen prioridad — útil para apuntar a otra base con DB_NAME=...).
//
// Al terminar informa lo que conviene revisar a mano (no modifica nada de eso):
//   - equipos activos de Práctica o Tarea que quedaron sin espejo;
//   - pares cuyos integrantes no coinciden entre la fila de Práctica y la de Tarea.

const path = require('path')
const fs = require('fs')
const mysql = require('mysql2/promise')

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') })

const ARCHIVO = '004_equipo_espejo.sql'

// Cada sentencia del .sql (que sigue siendo la única fuente de las sentencias) se clasifica
// para saber contra qué vista de information_schema comprobarla.
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
      let partes = sentencia.match(/^ALTER TABLE\s+(\w+)\s+ADD COLUMN\s+(\w+)/i)
      if (partes) return { clase: 'columna', tabla: partes[1], nombre: partes[2], sentencia }

      partes = sentencia.match(/^ALTER TABLE\s+(\w+)\s+ADD INDEX\s+(\w+)/i)
      if (partes) return { clase: 'indice', tabla: partes[1], nombre: partes[2], sentencia }

      partes = sentencia.match(/^ALTER TABLE\s+(\w+)\s+ADD CONSTRAINT\s+(\w+)\s+FOREIGN KEY/i)
      if (partes) return { clase: 'llave', tabla: partes[1], nombre: partes[2], sentencia }

      if (/^UPDATE\s+equipo\b/i.test(sentencia)) return { clase: 'backfill', tabla: 'equipo', nombre: 'backfill', sentencia }

      throw new Error(`Sentencia no reconocida en ${ARCHIVO}: ${sentencia.slice(0, 60)}`)
    })
}

const COMPROBACIONES = {
  columna: `SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
  indice: `SELECT 1 FROM information_schema.STATISTICS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
  llave: `SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ? AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
}

async function informar(connection) {
  const [sinEspejo] = await connection.query(
    `SELECT eq.id_equipo, eq.id_materia, eq.nombre, eq.tipo
     FROM equipo eq
     WHERE eq.activo = TRUE AND eq.tipo IN ('Practica', 'Tarea') AND eq.id_equipo_espejo IS NULL
     ORDER BY eq.id_materia, eq.nombre, eq.tipo`
  )
  if (sinEspejo.length > 0) {
    console.log(`Migración 004: ${sinEspejo.length} equipo(s) activo(s) de Práctica/Tarea SIN espejo (revisar a mano):`)
    for (const eq of sinEspejo) {
      console.log(`  - equipo ${eq.id_equipo} (materia ${eq.id_materia}) "${eq.nombre}" [${eq.tipo}]`)
    }
  }

  const [distintos] = await connection.query(
    `SELECT p.id_equipo AS id_practica, p.id_equipo_espejo AS id_tarea, p.id_materia, p.nombre
     FROM equipo p
     WHERE p.tipo = 'Practica' AND p.id_equipo_espejo IS NOT NULL
       AND (
         EXISTS (SELECT 1 FROM equipo_alumno a WHERE a.id_equipo = p.id_equipo
                 AND a.id_alumno NOT IN (SELECT b.id_alumno FROM equipo_alumno b WHERE b.id_equipo = p.id_equipo_espejo))
         OR
         EXISTS (SELECT 1 FROM equipo_alumno b WHERE b.id_equipo = p.id_equipo_espejo
                 AND b.id_alumno NOT IN (SELECT a.id_alumno FROM equipo_alumno a WHERE a.id_equipo = p.id_equipo))
       )
     ORDER BY p.id_materia, p.nombre`
  )
  if (distintos.length > 0) {
    console.log(
      `Migración 004: ${distintos.length} par(es) con integrantes DISTINTOS entre Práctica y Tarea (al editar el equipo en la aplicación ambas filas quedarán con los mismos integrantes):`
    )
    for (const par of distintos) {
      console.log(`  - "${par.nombre}" (materia ${par.id_materia}): Práctica ${par.id_practica} / Tarea ${par.id_tarea}`)
    }
  }
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
    for (const { clase, tabla, nombre, sentencia } of leerSentencias()) {
      if (clase === 'backfill') {
        const [result] = await connection.query(sentencia)
        console.log(`Migración 004: backfill de espejos en ${process.env.DB_NAME}: ${result.affectedRows} fila(s) emparejada(s).`)
        continue
      }

      const [rows] = await connection.query(COMPROBACIONES[clase], [tabla, nombre])
      if (rows.length > 0) {
        console.log(`Migración 004: ${clase} ${tabla}.${nombre} ya existe en ${process.env.DB_NAME}, no se hizo nada.`)
        continue
      }

      await connection.query(sentencia)
      console.log(`Migración 004: ${clase} ${tabla}.${nombre} agregada en ${process.env.DB_NAME}.`)
    }

    await informar(connection)
  } finally {
    await connection.end()
  }
}

aplicar().catch((err) => {
  console.error('Error aplicando la migración 004:', err.message)
  process.exit(1)
})
