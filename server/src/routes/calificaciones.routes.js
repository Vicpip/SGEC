const { Router } = require('express')
const calificacionesController = require('../controllers/calificaciones.controller')
const authMiddleware = require('../middlewares/auth.middleware')
const { requireRole } = require('../middlewares/role.middleware')
const { validateBody } = require('../middlewares/validate.middleware')
const asyncHandler = require('../utils/asyncHandler')
const { registrarCalificacionSchema, ajustarIndividualSchema } = require('../validators/calificaciones.validators')

const router = Router()

router.use(authMiddleware)

router.get('/', requireRole('Profesor', 'Alumno'), asyncHandler(calificacionesController.listar))
router.post(
  '/',
  requireRole('Profesor'),
  validateBody(registrarCalificacionSchema),
  asyncHandler(calificacionesController.registrar)
)
router.patch(
  '/:id/individual',
  requireRole('Profesor'),
  validateBody(ajustarIndividualSchema),
  asyncHandler(calificacionesController.ajustarIndividual)
)

module.exports = router
