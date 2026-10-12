# Limitaciones conocidas — SGEC

Documento iniciado en la Sesión 14 del plan de cierre (`PLAN-CIERRE.md`) y actualizado en la
Sesión 15. La Sesión 17 lo completa con el resto de las limitaciones declaradas del sistema; aquí
están las que se confirmaron con pruebas durante esas sesiones.

## 1. Las materias se resuelven por clave (y gana la más reciente)

**Qué pasa.** Las pantallas de alumnos, equipos y actividades identifican la materia por su
`clave` (`/alumnos?materia=BD2026`, `/equipos?materia=…`, `/actividades?materia=…`, y el campo
`materia` del alta manual, la importación Excel y la baja de alumnos). El servidor busca
`WHERE clave = ? AND id_profesor = ? ORDER BY fecha_creacion DESC LIMIT 1`. Si un mismo profesor
tiene **dos materias con la misma clave**, todas esas rutas operan solo sobre la creada más
recientemente; la otra queda inalcanzable desde esas pantallas (sus alumnos, equipos y actividades
siguen en la base de datos, pero no se pueden listar ni operar). No importa el estatus: una materia
`Cerrada` más reciente también tapa a la anterior.

**Cuándo ocurre.**
- *Misma clave, distinto grupo, mismo semestre* (el índice único de la tabla es clave + grupo +
  semestre): **desde la Sesión 15 la API ya lo permite** — `POST /api/materias` solo responde 409
  si se repite la combinación clave + grupo + semestre. Es decir, este caso ya es alcanzable desde
  la interfaz: un profesor que dé de alta `BD2026` para el grupo `4CM1` y otra vez para `4CM2`
  solo podrá operar desde las pantallas de alumnos, equipos y actividades la creada al final.
- *Misma clave en semestres distintos* (por ejemplo, reutilizar `BD2026` el semestre siguiente):
  ya es posible hoy. Al crear la materia nueva, la del semestre anterior deja de ser alcanzable
  desde las pantallas de alumnos, equipos y actividades.

**Evidencia (Sesión 14, base temporal).** Con una segunda materia `BD2026` grupo `4CM9` insertada
directamente en la base para el mismo profesor y semestre, `GET /api/materias` devolvió las dos,
pero `GET /api/alumnos?materia=BD2026` y `GET /api/equipos?materia=BD2026` respondieron con la
materia nueva (0 alumnos, 0 equipos) y la original (`4CM1`, 6 alumnos, 6 equipos) no se pudo
consultar por ninguna ruta basada en clave.

**Por qué no se corrigió.** El arreglo real es que los selectores y las URL usen `id_materia` en
lugar de la clave: toca cinco consultas del servidor y unas ocho pantallas del cliente. La
decisión 6 del plan de cierre deja ese rediseño fuera del alcance.

El filtro por semestre que la Sesión 15 agregó a los selectores de materia **no** resuelve esto:
filtra la lista que se muestra, pero la materia elegida se sigue enviando al servidor por su clave.

**Qué hacer mientras tanto.** No reutilizar una clave: usar claves que incluyan el periodo y el
grupo (por ejemplo `BD-2026-2-4CM1`). Las rutas que ya reciben el id (`/api/materias/:id`,
`/api/actividades/:id`, `/api/equipos/:id`, reportes) no tienen este problema.

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
