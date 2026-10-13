// Crea el Administrador inicial de una instalación de producción, a partir de variables de
// entorno. Sustituye a los seeds de desarrollo (server/db/seeds/), cuyas contraseñas están
// publicadas en el repositorio y por eso NO deben cargarse en producción.
//
// Uso (dentro del contenedor; la contraseña no queda en el historial de la terminal):
//   read -s -p "Contraseña del administrador: " ADMIN_PASSWORD; echo
//   docker compose exec -e ADMIN_EMAIL=<correo>@ipn.mx -e ADMIN_PASSWORD="$ADMIN_PASSWORD" server node db/create_admin.js
//   unset ADMIN_PASSWORD
// Uso local:  ADMIN_EMAIL=... ADMIN_PASSWORD=... node server/db/create_admin.js
//
// Variables:
//   ADMIN_EMAIL       correo institucional (dominio permitido para Administrador). Requerida.
//   ADMIN_PASSWORD    mínimo 12 caracteres, con mayúscula, minúscula y número. Requerida.
//   ADMIN_NOMBRE, ADMIN_APELLIDO   opcionales (por defecto "Administrador" / "SGEC").
//   ADMIN_ACTUALIZAR=true   si la cuenta ya existe y es de un Administrador, le cambia la
//                           contraseña, la reactiva y cierra sus sesiones abiertas.
//
// Nunca imprime la contraseña. La conexión se toma de las variables DB_* del entorno (en el
// contenedor) o de server/.env.

const path = require('path')
const bcrypt = require('bcryptjs')
const mysql = require('mysql2/promise')

require('dotenv').config({ path: path.join(__dirname, '..', '.env') })
require('../src/config/zonaHoraria')

const RONDAS_BCRYPT = 10
const LARGO_MINIMO = 12

function terminar(mensaje) {
  console.error(`create_admin: ${mensaje}`)
  process.exit(1)
}

// Mismo criterio que utils/correoInstitucional.js: los dominios que empiezan por "alumno."
// son de los alumnos; un Administrador usa cualquiera de los demás dominios permitidos.
function dominiosDeAdministrador() {
  return (process.env.ALLOWED_EMAIL_DOMAINS || '')
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter((d) => d && !d.startsWith('alumno.'))
}

async function crearAdministrador() {
  const correo = (process.env.ADMIN_EMAIL || '').trim().toLowerCase()
  const contrasena = process.env.ADMIN_PASSWORD || ''
  const nombre = (process.env.ADMIN_NOMBRE || 'Administrador').trim()
  const apellido = (process.env.ADMIN_APELLIDO || 'SGEC').trim()
  const actualizar = process.env.ADMIN_ACTUALIZAR === 'true'

  if (!correo || !contrasena) {
    terminar('faltan ADMIN_EMAIL y/o ADMIN_PASSWORD en el entorno')
  }

  const dominio = correo.split('@')[1] || ''
  const dominios = dominiosDeAdministrador()
  if (!/^[^@\s]+@[^@\s]+$/.test(correo) || !dominios.includes(dominio)) {
    terminar(`ADMIN_EMAIL debe ser un correo de alguno de estos dominios: ${dominios.join(', ') || '(ALLOWED_EMAIL_DOMAINS vacío)'}`)
  }

  if (
    contrasena.length < LARGO_MINIMO ||
    !/[A-Z]/.test(contrasena) ||
    !/[a-z]/.test(contrasena) ||
    !/[0-9]/.test(contrasena)
  ) {
    terminar(`ADMIN_PASSWORD debe tener al menos ${LARGO_MINIMO} caracteres e incluir mayúscula, minúscula y número`)
  }

  const conexion = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
  })

  try {
    const hash = await bcrypt.hash(contrasena, RONDAS_BCRYPT)
    const [existentes] = await conexion.query(
      'SELECT id_usuario, rol FROM usuario WHERE correo_institucional = ?',
      [correo]
    )

    if (existentes.length === 0) {
      const [result] = await conexion.query(
        `INSERT INTO usuario (correo_institucional, contrasena_hash, rol, nombre, apellido_paterno, activo)
         VALUES (?, ?, 'Administrador', ?, ?, TRUE)`,
        [correo, hash, nombre, apellido]
      )
      console.log(`create_admin: Administrador creado (id_usuario ${result.insertId}, ${correo}).`)
      return
    }

    const existente = existentes[0]
    if (existente.rol !== 'Administrador') {
      terminar(`ya existe una cuenta con ese correo y su rol es ${existente.rol}; no se modificó`)
    }
    if (!actualizar) {
      console.log(
        `create_admin: ya existe un Administrador con ese correo (id_usuario ${existente.id_usuario}); no se modificó. ` +
          'Usa ADMIN_ACTUALIZAR=true para cambiar su contraseña.'
      )
      return
    }

    // Truncado al segundo: MySQL redondea la fracción de un DATETIME (ver utils/credenciales.js).
    const ahora = new Date(Math.floor(Date.now() / 1000) * 1000)
    await conexion.query(
      `UPDATE usuario
       SET contrasena_hash = ?, activo = TRUE, debe_cambiar_contrasena = FALSE,
           reset_token_hash = NULL, reset_token_expira = NULL, contrasena_cambiada_en = ?
       WHERE id_usuario = ?`,
      [hash, ahora, existente.id_usuario]
    )
    console.log(`create_admin: contraseña del Administrador ${correo} actualizada; sus sesiones abiertas quedaron cerradas.`)
  } finally {
    await conexion.end()
  }
}

crearAdministrador().catch((err) => {
  console.error('create_admin: error:', err.code || err.message)
  process.exit(1)
})
