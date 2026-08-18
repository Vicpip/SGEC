const { Router } = require('express')
const materiasController = require('../controllers/materias.controller')
const authMiddleware = require('../middlewares/auth.middleware')
const { requireRole } = require('../middlewares/role.middleware')

const router = Router()

router.use(authMiddleware)
router.use(requireRole('Profesor', 'Administrador'))

router.get('/', materiasController.listar)
router.get('/:id', materiasController.obtener)
router.post('/', materiasController.crear)
router.put('/:id', materiasController.actualizar)
router.patch('/:id/desactivar', materiasController.desactivar)

module.exports = router
