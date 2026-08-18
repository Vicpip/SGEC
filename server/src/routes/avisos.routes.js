const { Router } = require('express')
const multer = require('multer')
const avisosController = require('../controllers/avisos.controller')
const authMiddleware = require('../middlewares/auth.middleware')
const { requireRole } = require('../middlewares/role.middleware')

const upload = multer({ dest: 'uploads/' })
const router = Router()

router.use(authMiddleware)

router.get('/', requireRole('Profesor', 'Alumno'), avisosController.listar)
router.post('/', requireRole('Profesor'), upload.array('archivos'), avisosController.crear)
router.patch('/:id/leido', requireRole('Alumno'), avisosController.marcarLeido)

module.exports = router
