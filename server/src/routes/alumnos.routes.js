const { Router } = require('express')
const multer = require('multer')
const alumnosController = require('../controllers/alumnos.controller')
const authMiddleware = require('../middlewares/auth.middleware')
const { requireRole } = require('../middlewares/role.middleware')
const { validateBody } = require('../middlewares/validate.middleware')
const asyncHandler = require('../utils/asyncHandler')
const { validateEnv } = require('../config/env')
const { crearAlumnoSchema, actualizarAlumnoSchema } = require('../validators/alumnos.validators')

const env = validateEnv()

// Memoria (no disco): el archivo solo se necesita para parsearlo en el
// request actual, nunca se persiste — evita huérfanos en uploads/.
// limits.fileSize/files y fileFilter mitigan el hallazgo de npm audit de
// multer (severidad alta, DoS por archivos/campos sin límite).
const MIME_EXCEL_PERMITIDOS = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
]

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxFileSizeMb * 1024 * 1024, files: 1 },
  fileFilter(req, file, cb) {
    const extensionValida = /\.(xlsx|xls)$/i.test(file.originalname)
    if (!extensionValida || !MIME_EXCEL_PERMITIDOS.includes(file.mimetype)) {
      return cb(new Error('Solo se permiten archivos .xlsx o .xls'))
    }
    cb(null, true)
  },
})

function subirExcel(req, res, next) {
  upload.single('archivo')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `Error al subir el archivo: ${err.message}` })
    }
    if (err) {
      return res.status(400).json({ error: err.message })
    }
    next()
  })
}

const router = Router()

router.use(authMiddleware)

// El rol va por ruta (no con router.use) porque restablecer-acceso también admite al
// Administrador y el buscador es exclusivo de él; el resto del módulo es del Profesor.
const soloProfesor = requireRole('Profesor')

router.get('/', soloProfesor, asyncHandler(alumnosController.listar))
// Antes de '/:id' para que "buscar" no se interprete como un id de alumno.
router.get('/buscar', requireRole('Administrador'), asyncHandler(alumnosController.buscar))
router.get('/:id', soloProfesor, asyncHandler(alumnosController.obtener))
router.get('/:id/actividades', soloProfesor, asyncHandler(alumnosController.actividadesDeAlumno))
router.post('/', soloProfesor, validateBody(crearAlumnoSchema), asyncHandler(alumnosController.crear))
router.post('/importar', soloProfesor, subirExcel, asyncHandler(alumnosController.importarExcel))
router.put('/:id', soloProfesor, validateBody(actualizarAlumnoSchema), asyncHandler(alumnosController.actualizar))
router.patch('/:id/baja', soloProfesor, asyncHandler(alumnosController.darDeBaja))
router.post(
  '/:id/restablecer-acceso',
  requireRole('Profesor', 'Administrador'),
  asyncHandler(alumnosController.restablecerAcceso)
)

module.exports = router
