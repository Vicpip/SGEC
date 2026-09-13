const { Router } = require('express')
const semestresController = require('../controllers/semestres.controller')
const authMiddleware = require('../middlewares/auth.middleware')
const { requireRole } = require('../middlewares/role.middleware')
const { validateBody } = require('../middlewares/validate.middleware')
const asyncHandler = require('../utils/asyncHandler')
const { crearSemestreSchema, actualizarSemestreSchema } = require('../validators/semestres.validators')

const router = Router()

router.use(authMiddleware)

router.get('/', asyncHandler(semestresController.listar))
router.post(
  '/',
  requireRole('Administrador'),
  validateBody(crearSemestreSchema),
  asyncHandler(semestresController.crear)
)
router.put(
  '/:id',
  requireRole('Administrador'),
  validateBody(actualizarSemestreSchema),
  asyncHandler(semestresController.actualizar)
)

module.exports = router
