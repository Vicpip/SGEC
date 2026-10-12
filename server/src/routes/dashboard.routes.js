const { Router } = require('express')
const dashboardController = require('../controllers/dashboard.controller')
const authMiddleware = require('../middlewares/auth.middleware')
const { requireRole } = require('../middlewares/role.middleware')
const asyncHandler = require('../utils/asyncHandler')

const router = Router()

router.use(authMiddleware)
// Profesor: Dashboard (Pantalla 02). Alumno: Mi Panel (Pantalla 12). El controlador decide
// qué resumen arma según el rol del JWT; el Administrador no tiene panel.
router.use(requireRole('Profesor', 'Alumno'))

router.get('/', asyncHandler(dashboardController.obtener))

module.exports = router
