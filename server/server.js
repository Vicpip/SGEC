require('dotenv').config()
// Antes que cualquier otro módulo: fija la zona horaria del proceso (ver el archivo).
const { ZONA_HORARIA, zonaHorariaCoherente } = require('./src/config/zonaHoraria')

const { validateEnv } = require('./src/config/env')
const app = require('./src/app')

const env = validateEnv()

if (!zonaHorariaCoherente()) {
  console.error(
    `[zona horaria] ATENCIÓN: el proceso usa TZ=${process.env.TZ}, que no equivale a UTC-06:00. ` +
      `Las fechas de publicación y de entrega se compararán mal. Usa TZ=${ZONA_HORARIA}.`
  )
}

app.listen(env.port, () => {
  console.log(`SGEC API escuchando en http://localhost:${env.port} (TZ=${process.env.TZ}, trust proxy=${env.trustProxy})`)
})
