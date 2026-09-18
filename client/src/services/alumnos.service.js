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

export function crearAlumno(materiaClave, datos) {
  return api.post('/alumnos', { ...datos, materia: materiaClave }).then(({ data }) => data.alumno)
}

export function importarAlumnos(materiaClave, archivo) {
  const formData = new FormData()
  formData.append('materia', materiaClave)
  formData.append('archivo', archivo)
  return api
    .post('/alumnos/importar', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then(({ data }) => data.resultado)
}
