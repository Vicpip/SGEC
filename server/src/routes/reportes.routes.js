const { Router } = require('express')
const reportesController = require('../controllers/reportes.controller')
const authMiddleware = require('../middlewares/auth.middleware')
const { requireRole } = require('../middlewares/role.middleware')

const router = Router()

router.use(authMiddleware)
router.use(requireRole('Profesor'))

router.get('/', reportesController.generar)
router.get('/pdf', reportesController.exportarPdf)
router.get('/excel', reportesController.exportarExcel)

module.exports = router
