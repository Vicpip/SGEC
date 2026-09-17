const { Router } = require('express')
const reportesController = require('../controllers/reportes.controller')
const authMiddleware = require('../middlewares/auth.middleware')
const { requireRole } = require('../middlewares/role.middleware')
const asyncHandler = require('../utils/asyncHandler')

const router = Router()

router.use(authMiddleware)
router.use(requireRole('Profesor'))

router.get('/', asyncHandler(reportesController.generar))
router.get('/pdf', asyncHandler(reportesController.exportarPdf))
router.get('/excel', asyncHandler(reportesController.exportarExcel))

module.exports = router
