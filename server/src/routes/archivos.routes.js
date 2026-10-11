const { Router } = require('express')
const archivosController = require('../controllers/archivos.controller')
const authMiddleware = require('../middlewares/auth.middleware')
const { requireRole } = require('../middlewares/role.middleware')
const asyncHandler = require('../utils/asyncHandler')

const router = Router()

router.use(authMiddleware)

// :tipo = actividad | entrega | aviso; la autorización fina por recurso vive en el
// controlador (archivos.controller.js).
router.get('/:tipo/:id', requireRole('Profesor', 'Alumno'), asyncHandler(archivosController.descargar))

module.exports = router
