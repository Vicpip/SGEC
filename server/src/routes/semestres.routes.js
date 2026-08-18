const { Router } = require('express')
const semestresController = require('../controllers/semestres.controller')
const authMiddleware = require('../middlewares/auth.middleware')
const { requireRole } = require('../middlewares/role.middleware')

const router = Router()

router.use(authMiddleware)

router.get('/', semestresController.listar)
router.post('/', requireRole('Administrador'), semestresController.crear)
router.put('/:id', requireRole('Administrador'), semestresController.actualizar)

module.exports = router
