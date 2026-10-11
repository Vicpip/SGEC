import api from './api'

export function listarAlumnos(materiaClave) {
  return api.get('/alumnos', { params: { materia: materiaClave } }).then(({ data }) => data)
}

export function obtenerAlumno(id) {
  return api.get(`/alumnos/${id}`).then(({ data }) => data.alumno)
}

export function obtenerActividadesAlumno(id) {
  return api.get(`/alumnos/${id}/actividades`).then(({ data }) => data)
}

// Devuelve { alumno, credenciales }: `credenciales` trae la contraseña temporal solo si la
// cuenta se creó en esta petición (vacío si el alumno ya existía). No se vuelve a entregar.
export function crearAlumno(materiaClave, datos) {
  return api.post('/alumnos', { ...datos, materia: materiaClave }).then(({ data }) => data)
}

// Regenera la contraseña temporal del alumno. Devuelve la lista `credenciales` (1 elemento).
export function restablecerAcceso(idAlumno) {
  return api.post(`/alumnos/${idAlumno}/restablecer-acceso`).then(({ data }) => data.credenciales)
}

export function importarAlumnos(materiaClave, archivo) {
  const formData = new FormData()
  formData.append('materia', materiaClave)
  formData.append('archivo', archivo)
  return api
    .post('/alumnos/importar', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then(({ data }) => ({ ...data.resultado, credenciales: data.credenciales ?? [] }))
}
