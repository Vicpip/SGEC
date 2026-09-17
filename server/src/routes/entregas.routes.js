const path = require('path')
const crypto = require('crypto')
const { Router } = require('express')
const multer = require('multer')
const entregasController = require('../controllers/entregas.controller')
const authMiddleware = require('../middlewares/auth.middleware')
const { requireRole } = require('../middlewares/role.middleware')
const { validateBody } = require('../middlewares/validate.middleware')
const asyncHandler = require('../utils/asyncHandler')
const { validateEnv } = require('../config/env')
const { crearEntregaSchema } = require('../validators/entregas.validators')

const env = validateEnv()

// Archivos que el alumno adjunta a su entrega: se persisten en disco (el profesor debe
// poder descargarlos desde la Bandeja de Entregas). limits.fileSize/files y fileFilter
// mitigan el mismo hallazgo de npm audit de multer (severidad alta, DoS por archivos/campos
// sin límite) resuelto para alumnos/importar y actividades en las Sesiones 5 y 7. Se acepta,
// además de los formatos de documento habituales, un conjunto razonable de extensiones de
// código fuente (los alumnos entregan tareas de programación) — para estas, el mimetype que
// reporta el navegador es poco confiable, así que el filtro se apoya sobre todo en la
// extensión y solo usa el mimetype como señal adicional cuando es reconocible.
const EXTENSION_PERMITIDA = /\.(pdf|docx?|pptx?|zip|rar|png|jpe?g|py|js|jsx|ts|tsx|java|c|cpp|h|hpp|sql|txt|md)$/i
const MIME_PERMITIDOS = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'image/png',
  'image/jpeg',
  'text/plain',
  'text/x-python',
  'text/javascript',
  'application/javascript',
  'application/octet-stream',
])
const MAX_ARCHIVOS = 5

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, env.uploadDir)
  },
  filename(req, file, cb) {
    const nombreUnico = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${path.extname(file.originalname)}`
    cb(null, nombreUnico)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: env.maxFileSizeMb * 1024 * 1024, files: MAX_ARCHIVOS },
  fileFilter(req, file, cb) {
    if (!EXTENSION_PERMITIDA.test(file.originalname) || !MIME_PERMITIDOS.has(file.mimetype)) {
      return cb(new Error('Tipo de archivo no permitido'))
    }
    cb(null, true)
  },
})

function subirArchivos(req, res, next) {
  upload.array('archivos', MAX_ARCHIVOS)(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `Error al subir archivos: ${err.message}` })
    }
    if (err) {
      return res.status(400).json({ error: err.message })
    }
    next()
  })
}

const router = Router()

router.use(authMiddleware)

router.get('/actividad/:idActividad', requireRole('Profesor', 'Alumno'), asyncHandler(entregasController.listarPorActividad))
router.get('/:id', requireRole('Profesor', 'Alumno'), asyncHandler(entregasController.obtener))
router.post(
  '/',
  requireRole('Alumno'),
  subirArchivos,
  validateBody(crearEntregaSchema),
  asyncHandler(entregasController.crear)
)

module.exports = router
