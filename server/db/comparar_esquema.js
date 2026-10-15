// Compara el esquema de dos bases de datos del mismo servidor MySQL. Solo lectura: consulta
// information_schema y no modifica nada.
//
// Uso:  node server/db/comparar_esquema.js <base_a> <base_b>
//   En el servidor de producción (dentro del contenedor):
//   docker compose exec server node db/comparar_esquema.js sgec sgec_check
//
// Compara tablas, columnas (tipo, nulabilidad, valor por defecto, extra), índices (columnas,
// orden y unicidad) y llaves foráneas (columnas, tabla y columnas referenciadas, ON DELETE y
// ON UPDATE). No compara datos, motor, collation de tabla ni el orden de las columnas.
//
// Imprime las diferencias y termina con código 0 si los esquemas coinciden, 1 si hay
// diferencias y 2 si no se pudo comparar (argumentos, conexión o una base inexistente).
//
// La conexión se toma de server/.env o de las variables DB_* del entorno (que tienen
// prioridad). El usuario necesita permiso de lectura sobre ambas bases.

const path = require('path')
const mysql = require('mysql2/promise')

require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const NOMBRE_VALIDO = /^[A-Za-z0-9_$]{1,64}$/

async function leerEsquema(conn, base) {
  const [[existe]] = await conn.query(
    'SELECT COUNT(*) AS n FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?',
    [base]
  )
  if (!existe.n) throw new Error(`la base "${base}" no existe o no es visible para este usuario`)

  const [tablas] = await conn.query(
    `SELECT TABLE_NAME AS tabla FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'`,
    [base]
  )

  const [columnas] = await conn.query(
    `SELECT TABLE_NAME AS tabla, COLUMN_NAME AS columna, COLUMN_TYPE AS tipo,
            IS_NULLABLE AS nulo, COLUMN_DEFAULT AS defecto, EXTRA AS extra
     FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ?`,
    [base]
  )

  const [indices] = await conn.query(
    `SELECT TABLE_NAME AS tabla, INDEX_NAME AS indice, NON_UNIQUE AS no_unico,
            GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ',') AS columnas
     FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ?
     GROUP BY TABLE_NAME, INDEX_NAME, NON_UNIQUE`,
    [base]
  )

  const [llaves] = await conn.query(
    `SELECT k.TABLE_NAME AS tabla, k.CONSTRAINT_NAME AS restriccion,
            GROUP_CONCAT(k.COLUMN_NAME ORDER BY k.ORDINAL_POSITION SEPARATOR ',') AS columnas,
            k.REFERENCED_TABLE_NAME AS ref_tabla,
            GROUP_CONCAT(k.REFERENCED_COLUMN_NAME ORDER BY k.ORDINAL_POSITION SEPARATOR ',') AS ref_columnas,
            r.DELETE_RULE AS al_borrar, r.UPDATE_RULE AS al_actualizar
     FROM information_schema.KEY_COLUMN_USAGE k
     JOIN information_schema.REFERENTIAL_CONSTRAINTS r
       ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
      AND r.TABLE_NAME = k.TABLE_NAME
     WHERE k.TABLE_SCHEMA = ? AND k.REFERENCED_TABLE_NAME IS NOT NULL
     GROUP BY k.TABLE_NAME, k.CONSTRAINT_NAME, k.REFERENCED_TABLE_NAME, r.DELETE_RULE, r.UPDATE_RULE`,
    [base]
  )

  const mapa = (filas, clave, valor) => new Map(filas.map((f) => [clave(f), valor(f)]))

  return {
    tablas: new Set(tablas.map((t) => t.tabla)),
    columnas: mapa(
      columnas,
      (c) => `${c.tabla}.${c.columna}`,
      (c) => `${c.tipo} ${c.nulo === 'YES' ? 'NULL' : 'NOT NULL'} DEFAULT ${c.defecto === null ? '(ninguno)' : c.defecto}${c.extra ? ` ${c.extra}` : ''}`
    ),
    indices: mapa(
      indices,
      (i) => `${i.tabla}.${i.indice}`,
      (i) => `${Number(i.no_unico) ? 'INDEX' : 'UNIQUE'} (${i.columnas})`
    ),
    // Las llaves foráneas se identifican por su definición, no por su nombre: MySQL nombra
    // solas las que no lo declaran (tabla_ibfk_N) y ese número puede variar entre una base
    // migrada y una creada desde cero sin que el esquema sea distinto.
    llaves: mapa(
      llaves,
      (l) => `${l.tabla} (${l.columnas}) -> ${l.ref_tabla} (${l.ref_columnas})`,
      (l) => `ON DELETE ${l.al_borrar} ON UPDATE ${l.al_actualizar}`
    ),
  }
}

function compararConjunto(etiqueta, a, b, nombreA, nombreB, salida) {
  for (const x of [...a].sort()) if (!b.has(x)) salida.push(`${etiqueta} solo en ${nombreA}: ${x}`)
  for (const x of [...b].sort()) if (!a.has(x)) salida.push(`${etiqueta} solo en ${nombreB}: ${x}`)
}

function compararMapa(etiqueta, a, b, nombreA, nombreB, salida, tablasComunes) {
  const enTablaComun = (clave) => tablasComunes.has(clave.split(/[. ]/)[0])
  const claves = [...new Set([...a.keys(), ...b.keys()])].filter(enTablaComun).sort()
  for (const clave of claves) {
    if (!b.has(clave)) salida.push(`${etiqueta} solo en ${nombreA}: ${clave} ${a.get(clave)}`)
    else if (!a.has(clave)) salida.push(`${etiqueta} solo en ${nombreB}: ${clave} ${b.get(clave)}`)
    else if (a.get(clave) !== b.get(clave)) {
      salida.push(`${etiqueta} distinta: ${clave}\n    ${nombreA}: ${a.get(clave)}\n    ${nombreB}: ${b.get(clave)}`)
    }
  }
}

async function main() {
  const [baseA, baseB] = process.argv.slice(2)
  if (!baseA || !baseB || !NOMBRE_VALIDO.test(baseA) || !NOMBRE_VALIDO.test(baseB)) {
    console.error('Uso: node db/comparar_esquema.js <base_a> <base_b>')
    process.exit(2)
  }

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
  })

  let a
  let b
  try {
    a = await leerEsquema(conn, baseA)
    b = await leerEsquema(conn, baseB)
  } finally {
    await conn.end()
  }

  const diferencias = []
  compararConjunto('Tabla', a.tablas, b.tablas, baseA, baseB, diferencias)
  const comunes = new Set([...a.tablas].filter((t) => b.tablas.has(t)))
  compararMapa('Columna', a.columnas, b.columnas, baseA, baseB, diferencias, comunes)
  compararMapa('Índice', a.indices, b.indices, baseA, baseB, diferencias, comunes)
  compararMapa('Llave foránea', a.llaves, b.llaves, baseA, baseB, diferencias, comunes)

  console.log(
    `${baseA}: ${a.tablas.size} tablas, ${a.columnas.size} columnas, ${a.indices.size} índices, ${a.llaves.size} llaves foráneas`
  )
  console.log(
    `${baseB}: ${b.tablas.size} tablas, ${b.columnas.size} columnas, ${b.indices.size} índices, ${b.llaves.size} llaves foráneas`
  )

  if (diferencias.length === 0) {
    console.log('Sin diferencias: los esquemas coinciden.')
    process.exit(0)
  }
  console.log(`\n${diferencias.length} diferencia(s):`)
  for (const d of diferencias) console.log(`  - ${d}`)
  process.exit(1)
}

main().catch((err) => {
  console.error(`comparar_esquema: ${err.message}`)
  process.exit(2)
})
