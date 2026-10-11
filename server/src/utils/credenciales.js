// Generación de secretos de acceso compartida por auth.controller.js y
// alumnos.controller.js: token de recuperación/activación y contraseña temporal.
const crypto = require('crypto')

const RONDAS_BCRYPT = 10
const RESET_TOKEN_VIGENCIA_MS = 24 * 60 * 60 * 1000 // 24 horas

// El token viaja en claro solo dentro del enlace del correo; en la BD se guarda su
// hash SHA-256 (reset_token_hash).
function generarTokenReset() {
  const tokenPlano = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(tokenPlano).digest('hex')
  return { tokenPlano, tokenHash }
}

function hashTokenReset(tokenPlano) {
  return crypto.createHash('sha256').update(tokenPlano).digest('hex')
}

// Alfabeto sin caracteres ambiguos al dictarse o copiarse a mano (0/O, 1/l/I).
const ALFABETO_TEMPORAL = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
const BLOQUES_TEMPORAL = 3
const LARGO_BLOQUE = 4

// Contraseña temporal aleatoria: 12 caracteres en tres bloques (ej. "Xk7m-Qp4T-b9Wd"),
// unos 69 bits de entropía. Solo se guarda su hash bcrypt; el texto claro se devuelve
// una única vez al profesor en la respuesta del alta/importación/restablecer.
function generarContrasenaTemporal() {
  const bloques = []
  for (let b = 0; b < BLOQUES_TEMPORAL; b++) {
    let bloque = ''
    for (let i = 0; i < LARGO_BLOQUE; i++) {
      bloque += ALFABETO_TEMPORAL[crypto.randomInt(ALFABETO_TEMPORAL.length)]
    }
    bloques.push(bloque)
  }
  return bloques.join('-')
}

module.exports = {
  RONDAS_BCRYPT,
  RESET_TOKEN_VIGENCIA_MS,
  generarTokenReset,
  hashTokenReset,
  generarContrasenaTemporal,
}
