const { Router } = require('express')
const dashboardController = require('../controllers/dashboard.controller')
const authMiddleware = require('../middlewares/auth.middleware')
const { requireRole } = require('../middlewares/role.middleware')
const asyncHandler = require('../utils/asyncHandler')

const router = Router()

router.use(authMiddleware)
router.use(requireRole('Profesor'))

router.get('/', asyncHandler(dashboardController.obtener))

module.exports = router
