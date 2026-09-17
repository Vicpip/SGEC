const path = require('path')
const crypto = require('crypto')
const { Router } = require('express')
const multer = require('multer')
const actividadesController = require('../controllers/actividades.controller')
const authMiddleware = require('../middlewares/auth.middleware')
const { requireRole } = require('../middlewares/role.middleware')
const { validateBody } = require('../middlewares/validate.middleware')
const asyncHandler = require('../utils/asyncHandler')
const { validateEnv } = require('../config/env')
const { crearActividadSchema, actualizarActividadSchema } = require('../validators/actividades.validators')

const env = validateEnv()

// Documentos de referencia que el profesor adjunta a la actividad: sí se persisten en
// disco (a diferencia del Excel de importación de alumnos, que es transitorio) porque el
// alumno debe poder consultarlos mientras la actividad exista. limits.fileSize/files y
// fileFilter mitigan el mismo hallazgo de npm audit de multer (severidad alta, DoS por
// archivos/campos sin límite) resuelto para alumnos/importar en la Sesión 5.
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
const MAX_ARCHIVOS = 10

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

router.get('/', requireRole('Profesor', 'Alumno'), asyncHandler(actividadesController.listar))
router.get('/:id', requireRole('Profesor', 'Alumno'), asyncHandler(actividadesController.obtener))
router.post(
  '/',
  requireRole('Profesor'),
  subirArchivos,
  validateBody(crearActividadSchema),
  asyncHandler(actividadesController.crear)
)
router.put('/:id', requireRole('Profesor'), validateBody(actualizarActividadSchema), asyncHandler(actividadesController.actualizar))
router.patch('/:id/desactivar', requireRole('Profesor'), asyncHandler(actividadesController.desactivar))

module.exports = router
