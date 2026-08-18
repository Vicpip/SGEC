const { Router } = require('express')
const equiposController = require('../controllers/equipos.controller')
const authMiddleware = require('../middlewares/auth.middleware')
const { requireRole } = require('../middlewares/role.middleware')

const router = Router()

router.use(authMiddleware)
router.use(requireRole('Profesor'))

router.get('/', equiposController.listar)
router.get('/:id', equiposController.obtener)
router.post('/', equiposController.crear)
router.put('/:id', equiposController.actualizar)
router.patch('/:id/desactivar', equiposController.desactivar)

module.exports = router
