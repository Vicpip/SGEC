function requireRole(...rolesPermitidos) {
  return function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' })
    }

    if (!rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tienes permiso para acceder a este recurso' })
    }

    next()
  }
}

module.exports = { requireRole }
