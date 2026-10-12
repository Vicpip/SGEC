# Limitaciones conocidas — SGEC

Documento iniciado en la Sesión 14 del plan de cierre (`PLAN-CIERRE.md`). La Sesión 17 lo completa
con el resto de las limitaciones declaradas del sistema; aquí están las que se confirmaron con
pruebas durante la Sesión 14.

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
  semestre, así que la base lo permite): hoy la API **no** deja crearla — `POST /api/materias`
  responde 409 si la clave ya existe en el semestre, sin mirar el grupo. La Sesión 15 tiene
  previsto alinear esa validación con el índice único; en cuanto eso ocurra, el caso será
  alcanzable desde la interfaz.
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

**Qué hacer mientras tanto.** No reutilizar una clave: usar claves que incluyan el periodo y el
grupo (por ejemplo `BD-2026-2-4CM1`). Las rutas que ya reciben el id (`/api/materias/:id`,
`/api/actividades/:id`, `/api/equipos/:id`, reportes) no tienen este problema.

## 2. El Administrador puede restablecer el acceso de un alumno, pero no tiene pantalla

`POST /api/alumnos/:id/restablecer-acceso` acepta al rol Administrador (para alumnos que ya
activaron su cuenta, a los que un profesor ya no puede restablecer). No existe una pantalla de
alumnos para el Administrador, así que hoy solo se puede invocar con una herramienta como `curl`.
El camino normal de un alumno que olvidó su contraseña es "Olvidé mi contraseña", que requiere el
correo SMTP configurado en el servidor.

## 3. Editar una actividad no permite cambiar sus archivos adjuntos

`PUT /api/actividades/:id` no recibe archivos. En el formulario de edición los documentos de
referencia se muestran en solo lectura. Para cambiarlos hay que desactivar la actividad y
publicarla de nuevo (lo que solo es razonable si todavía no tiene entregas).

## 4. Desactivar un equipo de Práctica o Tarea no desactiva a su gemelo

Los equipos de Práctica y Tarea comparten integrantes y hoy se emparejan por nombre. Desactivar uno
deja activo al otro; el diálogo de confirmación lo advierte. La Sesión 15 reemplaza ese
emparejamiento por una columna explícita y hace la operación sobre ambos.

## 5. Dar de baja a un alumno que está en un equipo exige rehacer el equipo

La baja de un alumno responde 409 si pertenece a un equipo activo de la materia. Como los equipos
son de exactamente 3 integrantes, el profesor debe sustituirlo por otro alumno o desactivar el
equipo antes de darlo de baja. La Sesión 15 permite equipos de 3 o 4 en la edición manual, lo que
da algo más de margen.
