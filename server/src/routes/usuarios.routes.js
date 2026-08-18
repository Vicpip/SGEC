const { Router } = require('express')
const usuariosController = require('../controllers/usuarios.controller')
const authMiddleware = require('../middlewares/auth.middleware')
const { requireRole } = require('../middlewares/role.middleware')

const router = Router()

router.use(authMiddleware)

router.get('/', requireRole('Administrador'), usuariosController.listar)
router.get('/:id', usuariosController.obtener)
router.post('/', requireRole('Administrador'), usuariosController.crear)
router.put('/:id', usuariosController.actualizar)
router.patch('/:id/desactivar', requireRole('Administrador'), usuariosController.desactivar)

module.exports = router
