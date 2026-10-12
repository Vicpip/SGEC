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

// Edita nombre, apellidos, boleta, grupo y carrera. El correo institucional no es editable
// (el servidor rechaza el campo). Devuelve el alumno actualizado.
export function actualizarAlumno(idAlumno, datos) {
  return api.put(`/alumnos/${idAlumno}`, datos).then(({ data }) => data.alumno)
}

// Baja lógica del alumno en UNA materia. Responde 409 (con la lista de equipos en el
// mensaje) si el alumno pertenece a un equipo activo de esa materia.
export function darDeBajaAlumno(idAlumno, materiaClave) {
  return api.patch(`/alumnos/${idAlumno}/baja`, null, { params: { materia: materiaClave } }).then(({ data }) => data)
}

// Solo Administrador: busca alumnos por correo institucional o boleta (mínimo 3 caracteres,
// máximo 10 resultados) para la pantalla "Accesos de alumnos".
export function buscarAlumnos(q) {
  return api.get('/alumnos/buscar', { params: { q } }).then(({ data }) => data.alumnos)
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
