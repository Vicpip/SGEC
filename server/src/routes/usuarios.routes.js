const { Router } = require('express')
const usuariosController = require('../controllers/usuarios.controller')
const authMiddleware = require('../middlewares/auth.middleware')
const { requireRole } = require('../middlewares/role.middleware')
const { validateBody } = require('../middlewares/validate.middleware')
const asyncHandler = require('../utils/asyncHandler')
const { crearUsuarioSchema, actualizarUsuarioSchema } = require('../validators/usuarios.validators')

const router = Router()

router.use(authMiddleware)

router.get('/', requireRole('Administrador'), asyncHandler(usuariosController.listar))
// GET/PUT /:id no llevan requireRole: el propio usuario también puede consultar y
// editar su cuenta. La verificación de propiedad (self o Administrador) vive en el
// controlador, junto con el resto de las reglas de negocio (ver usuarios.controller.js).
router.get('/:id', asyncHandler(usuariosController.obtener))
router.post(
  '/',
  requireRole('Administrador'),
  validateBody(crearUsuarioSchema),
  asyncHandler(usuariosController.crear)
)
router.put('/:id', validateBody(actualizarUsuarioSchema), asyncHandler(usuariosController.actualizar))
router.patch('/:id/desactivar', requireRole('Administrador'), asyncHandler(usuariosController.desactivar))
router.patch('/:id/reactivar', requireRole('Administrador'), asyncHandler(usuariosController.reactivar))

module.exports = router
