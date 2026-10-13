const { Router } = require('express')
const usuariosController = require('../controllers/usuarios.controller')
const authMiddleware = require('../middlewares/auth.middleware')
const { requireRole } = require('../middlewares/role.middleware')
const { validateBody } = require('../middlewares/validate.middleware')
const asyncHandler = require('../utils/asyncHandler')
const {
  crearUsuarioSchema,
  actualizarUsuarioSchema,
  actualizarPerfilPropioSchema,
} = require('../validators/usuarios.validators')

const router = Router()

router.use(authMiddleware)

router.get('/', requireRole('Administrador'), asyncHandler(usuariosController.listar))
// PATCH /me: cualquier rol edita SUS preferencias de notificación (y solo eso).
router.patch('/me', validateBody(actualizarPerfilPropioSchema), asyncHandler(usuariosController.actualizarPropio))
// GET /:id no lleva requireRole: el propio usuario también puede consultar su cuenta. La
// verificación de propiedad (self o Administrador) vive en el controlador.
router.get('/:id', asyncHandler(usuariosController.obtener))
router.post(
  '/',
  requireRole('Administrador'),
  validateBody(crearUsuarioSchema),
  asyncHandler(usuariosController.crear)
)
router.put(
  '/:id',
  requireRole('Administrador'),
  validateBody(actualizarUsuarioSchema),
  asyncHandler(usuariosController.actualizar)
)
router.patch('/:id/desactivar', requireRole('Administrador'), asyncHandler(usuariosController.desactivar))
router.patch('/:id/reactivar', requireRole('Administrador'), asyncHandler(usuariosController.reactivar))

module.exports = router
