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

// TRUST_PROXY: cuántos proxies inversos hay entre el cliente y Node. Express lo usa para
// decidir de dónde saca req.ip (y con ella cuentan los límites de peticiones). En producción
// hay exactamente uno (el Nginx del host), de ahí el valor por defecto 1: req.ip es la última
// dirección de X-Forwarded-For, la que agrega ese Nginx, y no una que el cliente pueda falsear.
//   - "0" o "false": sin proxy (Node expuesto directamente); se ignora X-Forwarded-For.
//   - un número: cantidad de saltos de proxy.
//   - cualquier otro texto: lista de IPs/subredes de confianza, tal cual la entiende Express.
// "true" se rechaza: confiaría en cualquier X-Forwarded-For y dejaría falsear la IP.
function leerTrustProxy(valor) {
  if (valor === undefined || valor.trim() === '') return 1
  const limpio = valor.trim().toLowerCase()
  if (limpio === 'false' || limpio === '0') return false
  if (/^\d+$/.test(limpio)) return Number(limpio)
  if (limpio === 'true') {
    throw new Error('TRUST_PROXY=true no está permitido: indica el número de proxies (1 detrás de Nginx) o una lista de IPs')
  }
  return valor.trim()
}

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
    trustProxy: leerTrustProxy(process.env.TRUST_PROXY),
    // Correo saliente (opcional). Sin SMTP_HOST el sistema no envía nada y ningún flujo
    // se rompe: el acceso de los alumnos se resuelve con la contraseña temporal que ve
    // el profesor. Las credenciales reales viven solo en el .env del servidor.
    smtp: {
      host: process.env.SMTP_HOST || '',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
      from: process.env.EMAIL_FROM || process.env.SMTP_USER || '',
    },
    // EMAIL_DRY_RUN=true: no se envía nada; solo se registra destinatario y asunto.
    emailDryRun: process.env.EMAIL_DRY_RUN === 'true',
  }
}

module.exports = { validateEnv }
