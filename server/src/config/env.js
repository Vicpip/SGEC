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

function validateEnv() {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key] && process.env[key] !== '')
  const trulyMissing = REQUIRED_VARS.filter((key) => process.env[key] === undefined)

  if (trulyMissing.length > 0) {
    throw new Error(
      `Faltan variables de entorno requeridas: ${trulyMissing.join(', ')}. Revisa server/.env.example`
    )
  }

  return {
    port: Number(process.env.PORT),
    nodeEnv: process.env.NODE_ENV || 'development',
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
  }
}

module.exports = { validateEnv }
