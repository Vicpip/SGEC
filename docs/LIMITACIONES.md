# Limitaciones conocidas — SGEC

Documento iniciado en la Sesión 14 del plan de cierre (`PLAN-CIERRE.md`) y actualizado en las
Sesiones 15 y 16. La Sesión 17 lo completa con el resto de las limitaciones declaradas del
sistema; aquí están las que se confirmaron con pruebas durante esas sesiones.

## 1. Una clave de materia reutilizada en otro semestre tapa a la anterior

**Estado tras la Sesión 16.** El caso grave quedó corregido: un mismo profesor ya no puede tener
dos materias con la misma clave en el mismo semestre (`POST` y `PUT /api/materias` responden 409
con el mensaje "Ya tienes una materia con esa clave en este semestre; usa una clave distinta para
el otro grupo (por ejemplo, agregando el grupo al final)"). Profesores distintos sí pueden usar la
misma clave: cada uno alcanza solo la suya y sus alumnos la correcta (comprobado con sesiones de
los tres roles; ver `docs/cierre/S16.md`). Toda búsqueda por clave pasa por
`server/src/services/materias.service.js`, que la acota a quien llama.

**Qué sigue pasando.** Las pantallas de alumnos, equipos y actividades identifican la materia por
su `clave` (`/alumnos?materia=BD2026`, `/equipos?materia=…`, `/actividades?materia=…`, y el campo
`materia` del alta manual, la importación Excel y la baja de alumnos). Si un profesor **reutiliza
una clave en otro semestre** (por ejemplo, vuelve a dar de alta `BD2026` en 2026/2), esas
pantallas operan sobre la materia más reciente y la del semestre anterior deja de ser alcanzable
desde ellas (sus alumnos, equipos y actividades siguen en la base de datos; no importa el
estatus: una materia `Cerrada` más reciente también tapa a la anterior). Las rutas que reciben el
id (`/api/materias/:id`, `/api/actividades/:id`, `/api/equipos/:id`) y los reportes (que tienen
filtro por semestre) no tienen este problema.

Lo mismo aplica a los datos anteriores a la corrección: si en una base ya existían dos materias
del mismo profesor con la misma clave en el mismo semestre (era posible entre la Sesión 15 y la
16), gana la más reciente hasta que el profesor le cambie la clave a una de las dos. Editarla sin
cambiar la clave responde 409 precisamente para forzar ese cambio.

**Por qué no se corrigió del todo.** El arreglo completo es que los selectores y las URL del
cliente usen `id_materia` en lugar de la clave (unas ocho pantallas). La decisión 6 del plan de
cierre deja ese rediseño fuera del alcance. El servidor ya está preparado: todas las rutas por
clave aceptan los parámetros opcionales `semestre` e `id_materia` para elegir la materia exacta
(`docs/API.md`), pero el cliente todavía no los envía. El filtro por semestre de los selectores
(Sesión 15) solo filtra la lista que se muestra.

**Qué hacer mientras tanto.** No reutilizar una clave de un semestre a otro: incluir el periodo en
la clave (por ejemplo `BD-2026-2`), y si se imparte la misma unidad de aprendizaje a dos grupos,
agregar el grupo al final (`BD-2026-2-4CM1`).

**Qué no es una limitación.** Un alumno inscrito en dos materias con la misma clave (de dos
profesores) ve las actividades y avisos de ambas; cada fila indica su grupo. Ninguna pantalla del
alumno resuelve una materia por clave.

## 2. Restablecer el acceso de un alumno que ya activó su cuenta (resuelta en la Sesión 15)

El Administrador ya tiene la pantalla **Accesos de alumnos** (`/admin/accesos`): busca por correo
institucional o boleta y restablece el acceso con una contraseña temporal. Lo que sigue siendo una
limitación: el buscador devuelve como máximo 10 resultados y exige al menos 3 caracteres (no es un
listado de alumnos), y la contraseña temporal no caduca hasta que el alumno la cambie.

## 3. Editar una actividad no permite cambiar sus archivos adjuntos

`PUT /api/actividades/:id` no recibe archivos. En el formulario de edición los documentos de
referencia se muestran en solo lectura. Para cambiarlos hay que desactivar la actividad y
publicarla de nuevo (lo que solo es razonable si todavía no tiene entregas).

## 4. Equipos de Práctica/Tarea creados antes de la Sesión 15 que quedaron sin espejo

Desde la Sesión 15 los equipos de Práctica y de Tarea están enlazados por `equipo.id_equipo_espejo`
y crear, editar o desactivar uno opera sobre los dos. La migración 004 enlaza los equipos que ya
existían cuando hay exactamente uno de Práctica y uno de Tarea activos con el mismo nombre en la
materia. Quedan **sin enlazar** (y el script `aplicar_004.js` los lista):

- los equipos creados con el alta manual anterior, que solo generaba una fila (un equipo de
  Práctica sin su Tarea, o al revés);
- los nombres repetidos dentro de la misma materia y tipo.

Un equipo sin espejo sigue funcionando, pero solo recibe las actividades de su propio tipo, se edita
y desactiva solo, y en el reporte aparece como una fila "Práctica" o "Tarea" por separado. La
aplicación no ofrece una acción para crearle el espejo: hay que desactivarlo y volver a crearlo
(lo razonable solo si todavía no tiene entregas).

Además, la migración enlaza por nombre sin comparar integrantes. Si las dos filas de un par tenían
integrantes distintos, `aplicar_004.js` lo reporta; al editar ese equipo ambas filas quedan con los
integrantes que se guarden.

## 5. Dar de baja a un alumno que está en un equipo exige rehacer el equipo

La baja de un alumno responde 409 si pertenece a un equipo activo de la materia. Como los equipos
tienen como mínimo 3 integrantes, el profesor debe sustituirlo por otro alumno o desactivar el
equipo antes de darlo de baja. Desde la Sesión 15 la edición manual admite 3 o 4 integrantes: un
equipo de 4 puede quedarse en 3 sin sustituir a nadie.

## 6. El reporte por tipo y los equipos de 4 integrantes

- La asignación automática siempre forma equipos de exactamente 3; los 1–2 alumnos que sobran no se
  reparten solos: el sistema muestra sus nombres y el profesor los agrega a mano a un equipo.
- El porcentaje de "actividades realizadas" del reporte se calcula por integrante (entregas o
  calificaciones recibidas entre actividades publicadas × integrantes). No distingue entregas
  tardías de entregas a tiempo.
- El promedio del reporte solo considera las actividades calificadas (decisión 5 del plan).
