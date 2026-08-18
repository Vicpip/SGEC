const { Router } = require('express')
const authController = require('../controllers/auth.controller')
const authMiddleware = require('../middlewares/auth.middleware')

const router = Router()

// Express 4 no captura rechazos de promesas en handlers async automáticamente;
// este wrapper los reenvía al middleware de errores de app.js.
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
}

router.post('/login', asyncHandler(authController.login))
router.get('/me', authMiddleware, asyncHandler(authController.me))
router.post('/logout', authMiddleware, asyncHandler(authController.logout))

module.exports = router
