const { Router } = require('express')
const multer = require('multer')
const actividadesController = require('../controllers/actividades.controller')
const authMiddleware = require('../middlewares/auth.middleware')
const { requireRole } = require('../middlewares/role.middleware')

const upload = multer({ dest: 'uploads/' })
const router = Router()

router.use(authMiddleware)

router.get('/', requireRole('Profesor', 'Alumno'), actividadesController.listar)
router.get('/:id', requireRole('Profesor', 'Alumno'), actividadesController.obtener)
router.post('/', requireRole('Profesor'), upload.array('archivos'), actividadesController.crear)
router.put('/:id', requireRole('Profesor'), actividadesController.actualizar)
router.patch('/:id/desactivar', requireRole('Profesor'), actividadesController.desactivar)

module.exports = router
