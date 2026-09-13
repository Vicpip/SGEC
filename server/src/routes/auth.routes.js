const { Router } = require('express')
const rateLimit = require('express-rate-limit')
const authController = require('../controllers/auth.controller')
const authMiddleware = require('../middlewares/auth.middleware')
const { validateBody } = require('../middlewares/validate.middleware')
const asyncHandler = require('../utils/asyncHandler')
const {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} = require('../validators/auth.validators')

const router = Router()

// Límites estrictos sobre los endpoints públicos de credenciales, más allá del
// límite general de app.js, para frenar fuerza bruta y enumeración de correos.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de inicio de sesión. Intenta de nuevo más tarde.' },
})

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intenta de nuevo más tarde.' },
})

router.post('/login', loginLimiter, validateBody(loginSchema), asyncHandler(authController.login))
router.get('/me', authMiddleware, asyncHandler(authController.me))
router.post('/logout', authMiddleware, asyncHandler(authController.logout))

router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  validateBody(forgotPasswordSchema),
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
