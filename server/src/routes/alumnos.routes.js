const { Router } = require('express')
const multer = require('multer')
const alumnosController = require('../controllers/alumnos.controller')
const authMiddleware = require('../middlewares/auth.middleware')
const { requireRole } = require('../middlewares/role.middleware')

const upload = multer({ dest: 'uploads/' })
const router = Router()

router.use(authMiddleware)
router.use(requireRole('Profesor'))

router.get('/', alumnosController.listar)
router.get('/:id', alumnosController.obtener)
router.get('/:id/actividades', alumnosController.actividadesDeAlumno)
router.post('/importar', upload.single('archivo'), alumnosController.importarExcel)

module.exports = router
