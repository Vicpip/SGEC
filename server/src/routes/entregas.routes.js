const { Router } = require('express')
const multer = require('multer')
const entregasController = require('../controllers/entregas.controller')
const authMiddleware = require('../middlewares/auth.middleware')
const { requireRole } = require('../middlewares/role.middleware')

const upload = multer({ dest: 'uploads/' })
const router = Router()

router.use(authMiddleware)

router.get('/actividad/:idActividad', requireRole('Profesor'), entregasController.listarPorActividad)
router.get('/:id', requireRole('Profesor', 'Alumno'), entregasController.obtener)
router.post('/', requireRole('Alumno'), upload.array('archivos'), entregasController.crear)

module.exports = router
