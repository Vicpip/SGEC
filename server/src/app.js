const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')

const { validateEnv } = require('./config/env')
const authRoutes = require('./routes/auth.routes')
const usuariosRoutes = require('./routes/usuarios.routes')
const semestresRoutes = require('./routes/semestres.routes')
const materiasRoutes = require('./routes/materias.routes')
const alumnosRoutes = require('./routes/alumnos.routes')
const equiposRoutes = require('./routes/equipos.routes')
const actividadesRoutes = require('./routes/actividades.routes')
const entregasRoutes = require('./routes/entregas.routes')
const calificacionesRoutes = require('./routes/calificaciones.routes')
const avisosRoutes = require('./routes/avisos.routes')
const reportesRoutes = require('./routes/reportes.routes')
const dashboardRoutes = require('./routes/dashboard.routes')

const env = validateEnv()
const app = express()

app.use(helmet())
app.use(cors({ origin: env.clientUrl }))
app.use(express.json())

// Límite general de peticiones por IP; los endpoints sensibles de auth.routes.js
// tienen límites más estrictos propios.
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRoutes)
app.use('/api/usuarios', usuariosRoutes)
app.use('/api/semestres', semestresRoutes)
app.use('/api/materias', materiasRoutes)
app.use('/api/alumnos', alumnosRoutes)
app.use('/api/equipos', equiposRoutes)
app.use('/api/actividades', actividadesRoutes)
app.use('/api/entregas', entregasRoutes)
app.use('/api/calificaciones', calificacionesRoutes)
app.use('/api/avisos', avisosRoutes)
app.use('/api/reportes', reportesRoutes)
app.use('/api/dashboard', dashboardRoutes)

app.use((req, res) => {
  res.status(404).json({ error: 'Recurso no encontrado' })
})

app.use((err, req, res, next) => {
  console.error(err)
  const status = err.status || 500
  // En producción no se exponen detalles internos (rutas, mensajes de MySQL, etc.)
  // en errores 500; sí se conservan mensajes de error controlados (4xx).
  const message =
    status === 500 && env.nodeEnv === 'production'
      ? 'Error interno del servidor'
      : err.message || 'Error interno del servidor'
  res.status(status).json({ error: message })
})

module.exports = app
