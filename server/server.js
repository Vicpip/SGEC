require('dotenv').config()

const { validateEnv } = require('./src/config/env')
const app = require('./src/app')

const env = validateEnv()

app.listen(env.port, () => {
  console.log(`SGEC API escuchando en http://localhost:${env.port}`)
})
