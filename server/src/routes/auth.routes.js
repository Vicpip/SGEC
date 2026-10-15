const { Router } = require('express')
const authController = require('../controllers/auth.controller')
const authMiddleware = require('../middlewares/auth.middleware')
const { validateBody } = require('../middlewares/validate.middleware')
const asyncHandler = require('../utils/asyncHandler')
const { limitadoresLogin, limitadoresForgotPassword } = require('../utils/limitePeticiones')
const {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} = require('../validators/auth.validators')

const router = Router()

// Límites estrictos sobre los endpoints públicos de credenciales, más allá del límite general
// de app.js, para frenar fuerza bruta y enumeración de correos. Cuentan por IP + correo y por
// IP sola (ver utils/limitePeticiones.js). Van después de validateBody para que la clave use el
// correo ya validado.
const loginLimiter = limitadoresLogin()
const forgotPasswordLimiter = limitadoresForgotPassword()

router.post('/login', validateBody(loginSchema), loginLimiter, asyncHandler(authController.login))
router.get('/me', authMiddleware, asyncHandler(authController.me))
router.post('/logout', authMiddleware, asyncHandler(authController.logout))

router.post(
  '/forgot-password',
  validateBody(forgotPasswordSchema),
  forgotPasswordLimiter,
  asyncHandler(authController.forgotPassword)
)
router.post(
  '/reset-password',
  validateBody(resetPasswordSchema),
  asyncHandler(authController.resetPassword)
)
router.patch(
  '/change-password',
  authMiddleware,
  validateBody(changePasswordSchema),
  asyncHandler(authController.changePassword)
)

module.exports = router
