const { Router } = require('express')
const calificacionesController = require('../controllers/calificaciones.controller')
const authMiddleware = require('../middlewares/auth.middleware')
const { requireRole } = require('../middlewares/role.middleware')

const router = Router()

router.use(authMiddleware)
router.use(requireRole('Profesor'))

router.post('/', calificacionesController.registrar)
router.patch('/:id/individual', calificacionesController.ajustarIndividual)

module.exports = router
