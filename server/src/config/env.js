const REQUIRED_VARS = [
  'PORT',
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_NAME',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'UPLOAD_DIR',
  'MAX_FILE_SIZE_MB',
  'ALLOWED_EMAIL_DOMAINS',
]

// Placeholder de server/.env.example: si llega tal cual a producción, el JWT es
// falsificable por cualquiera que haya visto el repositorio.
const JWT_SECRET_PLACEHOLDER = 'cambia_este_secreto_en_produccion'
const JWT_SECRET_MIN_LENGTH = 32

function validateEnv() {
  const trulyMissing = REQUIRED_VARS.filter((key) => process.env[key] === undefined)

  if (trulyMissing.length > 0) {
    throw new Error(
      `Faltan variables de entorno requeridas: ${trulyMissing.join(', ')}. Revisa server/.env.example`
    )
  }

  const nodeEnv = process.env.NODE_ENV || 'development'
  if (nodeEnv === 'production') {
    if (
      process.env.JWT_SECRET === JWT_SECRET_PLACEHOLDER ||
      process.env.JWT_SECRET.length < JWT_SECRET_MIN_LENGTH
    ) {
      throw new Error(
        `JWT_SECRET inseguro para producción: debe tener al menos ${JWT_SECRET_MIN_LENGTH} caracteres y no puede ser el placeholder de .env.example. Genera uno con: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
      )
    }
  }

  return {
    port: Number(process.env.PORT),
    nodeEnv,
    db: {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME,
    },
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN,
    },
    uploadDir: process.env.UPLOAD_DIR,
    maxFileSizeMb: Number(process.env.MAX_FILE_SIZE_MB),
    allowedEmailDomains: process.env.ALLOWED_EMAIL_DOMAINS.split(',').map((d) => d.trim()),
    // Origen del frontend, usado para restringir CORS y para armar enlaces de
    // recuperación de contraseña. Opcional: cae a la URL de desarrollo de Vite.
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  }
}

module.exports = { validateEnv }
