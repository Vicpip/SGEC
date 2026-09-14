const { Router } = require('express')
const equiposController = require('../controllers/equipos.controller')
const authMiddleware = require('../middlewares/auth.middleware')
const { requireRole } = require('../middlewares/role.middleware')
const { validateBody } = require('../middlewares/validate.middleware')
const asyncHandler = require('../utils/asyncHandler')
const { crearEquipoSchema, actualizarEquipoSchema, generarEquiposSchema } = require('../validators/equipos.validators')

const router = Router()

router.use(authMiddleware)

// Lectura: Profesor (dueño de la materia) y Alumno (solo sus propios equipos).
router.get('/', requireRole('Profesor', 'Alumno'), asyncHandler(equiposController.listar))
router.get('/:id', requireRole('Profesor', 'Alumno'), asyncHandler(equiposController.obtener))

// Escritura: solo Profesor.
router.post('/', requireRole('Profesor'), validateBody(crearEquipoSchema), asyncHandler(equiposController.crear))
router.post('/generar', requireRole('Profesor'), validateBody(generarEquiposSchema), asyncHandler(equiposController.generar))
router.put('/:id', requireRole('Profesor'), validateBody(actualizarEquipoSchema), asyncHandler(equiposController.actualizar))
router.patch('/:id/desactivar', requireRole('Profesor'), asyncHandler(equiposController.desactivar))

module.exports = router
