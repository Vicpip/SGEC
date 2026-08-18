const RUTA_POR_ROL = {
  Administrador: '/admin/profesores',
  Profesor: '/dashboard',
  Alumno: '/alumno/dashboard',
}

export function rutaDashboardPorRol(rol) {
  return RUTA_POR_ROL[rol] ?? '/login'
}
