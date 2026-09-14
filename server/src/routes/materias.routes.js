const { Router } = require('express')
const materiasController = require('../controllers/materias.controller')
const authMiddleware = require('../middlewares/auth.middleware')
const { requireRole } = require('../middlewares/role.middleware')
const { validateBody } = require('../middlewares/validate.middleware')
const asyncHandler = require('../utils/asyncHandler')
const { crearMateriaSchema, actualizarMateriaSchema } = require('../validators/materias.validators')

const router = Router()

router.use(authMiddleware)
router.use(requireRole('Profesor', 'Administrador'))

router.get('/', asyncHandler(materiasController.listar))
router.get('/:id', asyncHandler(materiasController.obtener))
router.post('/', validateBody(crearMateriaSchema), asyncHandler(materiasController.crear))
router.put('/:id', validateBody(actualizarMateriaSchema), asyncHandler(materiasController.actualizar))
router.patch('/:id/desactivar', asyncHandler(materiasController.desactivar))

module.exports = router
