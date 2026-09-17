const path = require('path')
const crypto = require('crypto')
const { Router } = require('express')
const multer = require('multer')
const avisosController = require('../controllers/avisos.controller')
const authMiddleware = require('../middlewares/auth.middleware')
const { requireRole } = require('../middlewares/role.middleware')
const { validateBody } = require('../middlewares/validate.middleware')
const asyncHandler = require('../utils/asyncHandler')
const { validateEnv } = require('../config/env')
const { crearAvisoSchema } = require('../validators/avisos.validators')

const env = validateEnv()

// Documentos que el profesor adjunta al aviso: se persisten en disco (el alumno debe poder
// descargarlos desde el Tablón). limits.fileSize/files y fileFilter mitigan el mismo hallazgo
// de npm audit de multer (severidad alta, DoS) resuelto para alumnos/actividades/entregas en
// las Sesiones 5, 7 y 8.
const MIME_PERMITIDOS = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/x-zip-compressed',
  'image/png',
  'image/jpeg',
]
const EXTENSION_PERMITIDA = /\.(pdf|docx?|pptx?|zip|png|jpe?g)$/i
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
    if (!EXTENSION_PERMITIDA.test(file.originalname) || !MIME_PERMITIDOS.includes(file.mimetype)) {
      return cb(new Error('Tipo de archivo no permitido. Usa .pdf, .doc(x), .ppt(x), .zip, .png o .jpg'))
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

router.get('/', requireRole('Profesor', 'Alumno'), asyncHandler(avisosController.listar))
router.post(
  '/',
  requireRole('Profesor'),
  subirArchivos,
  validateBody(crearAvisoSchema),
  asyncHandler(avisosController.crear)
)
router.patch('/:id/leido', requireRole('Alumno'), asyncHandler(avisosController.marcarLeido))

module.exports = router
