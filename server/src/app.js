const express = require('express')
const cors = require('cors')

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

const app = express()

app.use(cors())
app.use(express.json())

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

app.use((req, res) => {
  res.status(404).json({ error: 'Recurso no encontrado' })
})

app.use((err, req, res, next) => {
  console.error(err)
  res.status(err.status || 500).json({ error: err.message || 'Error interno del servidor' })
})

module.exports = app
