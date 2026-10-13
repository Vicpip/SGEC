# SGEC — Referencia de API

Base URL: `http://localhost:3001/api` en desarrollo (Vite hace proxy de `/api`). Todas las rutas
salvo las explícitamente públicas requieren `Authorization: Bearer <token>`. El rol siempre se
lee del JWT verificado (`req.user.rol`), nunca de un parámetro del cliente.

Errores comunes a casi todos los endpoints, no repetidos en cada sección:

| Código | Cuándo |
|---|---|
| 401 | Falta el header `Authorization`, el token es inválido/expiró, o el usuario referenciado ya no existe/está inactivo |
| 403 | Token válido pero rol no permitido, o el recurso no pertenece al usuario autenticado |
| 400 | Body/params no pasan la validación Joi (`{ message, errores: [...] }`) o falta un parámetro requerido |
| 404 | El recurso no existe o (para Alumno) no debe revelarse que existe |
| 500 | Error no controlado — en `NODE_ENV=production` responde `{ error: "Error interno del servidor" }` sin detalle |

## auth

Rutas públicas salvo `/me`, `/logout`, `/change-password`. Límites de tasa propios además del
general de `/api`: `/login` 5 intentos/15 min, `/forgot-password` 3 intentos/15 min.

| Método | Ruta | Rol | Body / params | Respuestas |
|---|---|---|---|---|
| POST | `/auth/login` | Público | `{correo_institucional, contrasena, rol}` | 200 `{token, usuario}` (`usuario.debe_cambiar_contrasena` indica contraseña temporal pendiente de cambio; `usuario.semestre_activo` es la clave del semestre activo o `null`); 400 dominio de correo no corresponde al rol; 401 credenciales inválidas; 403 cuenta inactiva; 429 demasiados intentos |
| GET | `/auth/me` | Autenticado | — | 200 `{usuario}` (incluye `debe_cambiar_contrasena` y `semestre_activo`: el semestre con `activo = TRUE` de fecha de inicio más reciente, que muestra el topbar); 401 usuario inactivo o eliminado |
| POST | `/auth/logout` | Autenticado | — | 200 `{message}` (stateless: solo confirma, el cliente descarta el token) |
| POST | `/auth/forgot-password` | Público | `{correo_institucional}` | 200 siempre `{message}` genérico (no revela si el correo existe); 429 |
| POST | `/auth/reset-password` | Público | `{token, nueva_contrasena}` | 200 `{message}` (pone `debe_cambiar_contrasena` en FALSE); 400 token inválido o expirado (vigencia 24 h) |
| PATCH | `/auth/change-password` | Autenticado | `{contrasena_actual, nueva_contrasena}` | 200 `{message, token, debe_cambiar_contrasena: false}` (el cliente debe reemplazar su token por el nuevo); 400 la nueva es igual a la actual; 401 `codigo: CONTRASENA_ACTUAL_INCORRECTA` si la contraseña actual no coincide (el cliente no cierra la sesión); 401 sin `codigo` si el token es inválido o expiró (el cliente sí la cierra) |

**Cambio obligatorio de contraseña.** Las cuentas de alumno creadas por un profesor (alta manual,
importación o `restablecer-acceso`) quedan con `usuario.debe_cambiar_contrasena = TRUE`. El JWT
que emite `/auth/login` para esas cuentas lleva el indicador y, mientras lo lleve,
`auth.middleware.js` responde **403** `{error, codigo: "CAMBIO_CONTRASENA_REQUERIDO"}` en toda
ruta que no sea `/api/auth/*`. `change-password` apaga el indicador y devuelve un token nuevo.

`nueva_contrasena` exige mínimo 8 caracteres, al menos una mayúscula y un número (Joi, mismo
criterio que el copy de Perfil.jsx). El login valida el dominio del correo contra el rol elegido
antes de tocar la base de datos.

## usuarios

Base de Gestión de Profesores (Admin) y Perfil (todos). `GET /:id` lo puede invocar el propio
usuario o un Administrador — nunca otro Profesor/Alumno. `PUT /:id` es exclusivo del
Administrador: nadie cambia su propio nombre por la API. Lo único que un usuario edita de su
cuenta son sus preferencias de notificación, con `PATCH /me`. El campo `rol` nunca se acepta en
una actualización.

| Método | Ruta | Rol | Body / params | Respuestas |
|---|---|---|---|---|
| GET | `/usuarios` | Administrador | `?rol=Profesor` agrega materias/alumnos totales por profesor | 200 `{usuarios}` |
| GET | `/usuarios/:id` | Propio o Administrador | — | 200 `{usuario}`; 403 si no es propio; 404 |
| POST | `/usuarios` | Administrador | `{correo_institucional, contrasena, rol: Profesor|Administrador, nombre, apellido_paterno, apellido_materno?, no_empleado (requerido si Profesor), departamento?}` | 201 `{usuario}`; 400 dominio inválido; 409 correo o no_empleado duplicado |
| PUT | `/usuarios/:id` | Administrador | `{nombre, apellido_paterno, apellido_materno?, correo_alterno?, notificaciones_email?, no_empleado?, departamento?}` (`correo_alterno` y `notificaciones_email` solo se modifican si vienen) | 200 `{message}`; 400 campo no permitido; 403 si no es Administrador (también sobre la cuenta propia); 404; 409 `no_empleado` duplicado |
| PATCH | `/usuarios/me` | Cualquier rol (la cuenta del JWT) | `{correo_alterno?, notificaciones_email?}` — lista blanca, al menos uno | 200 `{message, usuario: {correo_alterno, notificaciones_email}}`; 400 si viene cualquier otro campo (`nombre`, `rol`, `activo`…), un correo inválido o el cuerpo vacío |
| PATCH | `/usuarios/:id/desactivar` | Administrador | — | 200 `{message}`; 404 |
| PATCH | `/usuarios/:id/reactivar` | Administrador | — | 200 `{message}` (idempotente); 404; 409 si la cuenta no es de un Profesor |

Los alumnos **no** se dan de alta aquí — se crean vía `POST /alumnos/importar` (ver abajo).

## semestres

Catálogo global (no tiene noción de propiedad por profesor).

| Método | Ruta | Rol | Body / params | Respuestas |
|---|---|---|---|---|
| GET | `/semestres` | Autenticado (cualquier rol) | — | 200 `{semestres}` |
| POST | `/semestres` | Administrador | `{clave, fecha_inicio, fecha_fin}` (fin ≥ inicio) | 201 `{semestre}`; 409 clave duplicada |
| PUT | `/semestres/:id` | Administrador | `{clave, fecha_inicio, fecha_fin, activo}` | 200 `{message}`; 404; 409 clave duplicada |

## materias

Pantalla 03. Un Profesor solo ve/edita/cierra sus propias materias (`materia.id_profesor`
resuelto desde su `id_usuario`, nunca del payload del cliente); un Administrador opera sobre
cualquiera.

| Método | Ruta | Rol | Body / params | Respuestas |
|---|---|---|---|---|
| GET | `/materias` | Profesor (las suyas) / Administrador (todas) | `?semestre=<clave>` | 200 `{materias}` (incluye `total_alumnos`, `total_equipos`) |
| GET | `/materias/:id` | Profesor dueño / Administrador | — | 200 `{materia}`; 403; 404 |
| POST | `/materias` | Profesor, Administrador | `{clave, nombre, grupo, id_semestre, id_profesor (requerido solo si lo crea un Administrador)}` | 201 `{materia}`; 400 semestre/profesor inexistente; 409 si ese profesor ya tiene una materia con esa clave en el semestre (aunque el grupo sea otro), o si otro profesor ya usa esa clave + grupo + semestre; 422 el semestre está inactivo |
| PUT | `/materias/:id` | Profesor dueño / Administrador | `{clave, nombre, grupo, id_semestre, estatus, id_profesor?}` | 200 `{message}`; 403; 404; 409 (mismas dos reglas que el alta); 422 si se intenta mover la materia a un semestre inactivo (editar una que ya está en él sí se permite) |
| PATCH | `/materias/:id/desactivar` | Profesor dueño / Administrador | — | 200 `{message}` (`estatus = 'Cerrada'`); 403; 404 |

**Clave de materia.** La clave no es única en el sistema: profesores distintos pueden usar la
misma en un semestre, y una clave puede reutilizarse en otro semestre. Lo que no se permite es
que un mismo profesor tenga dos materias con la misma clave en el mismo semestre (409: "Ya tienes
una materia con esa clave en este semestre; usa una clave distinta para el otro grupo (por
ejemplo, agregando el grupo al final)").

**Resolución por clave.** Las rutas que reciben `materia=<clave>` (`GET /alumnos`, `POST /alumnos`,
`POST /alumnos/importar`, `PATCH /alumnos/:id/baja`, `GET /equipos` y `GET /actividades` del
Profesor) buscan la materia solo entre las del profesor autenticado
(`services/materias.service.js`). Aceptan además dos parámetros opcionales para desambiguar,
en el query string o en el cuerpo según la ruta: `semestre=<clave del semestre>` e
`id_materia=<id>` (un id de otro profesor responde 404). Sin ellos, si el profesor reutilizó la
clave en otro semestre se toma la materia más reciente. Ninguna de esas rutas está abierta al
Administrador.

## alumnos

Pantallas 07, 08, 09. Un Profesor solo ve alumnos de materias donde es dueño.

| Método | Ruta | Rol | Body / params | Respuestas |
|---|---|---|---|---|
| GET | `/alumnos?materia=<clave>` | Profesor | opcionales `&semestre=` / `&id_materia=` | 200 `{alumnos, materia}` (`materia` incluye `semestre`); 400 falta `materia` o `id_materia` no numérico; 404 materia no encontrada/no propia |
| GET | `/alumnos/buscar?q=<texto>` | Administrador | `q`: parte del correo institucional o de la boleta (mínimo 3 caracteres) | 200 `{alumnos}`: como máximo 10, cada uno solo con `{id_alumno, nombre, correo_institucional, boleta, activo, acceso_pendiente}`; 400 `q` ausente o de menos de 3 caracteres; 403 Profesor o Alumno |
| GET | `/alumnos/:id` | Profesor (con materia compartida) | — | 200 `{alumno}`; 403 sin materia en común; 404 |
| GET | `/alumnos/:id/actividades` | Profesor (con materia compartida) | — | 200 `{alumno, actividades}` (incluye equipo y calificación por actividad); 403; 404 |
| POST | `/alumnos` | Profesor | `{boleta, nombre, apellido_paterno, apellido_materno?, correo, grupo, carrera?, materia}` (`materia` = clave; opcionales `semestre`, `id_materia`) | 201 `{alumno, credenciales}`; 400 datos inválidos; 404 materia no propia; 409 boleta/correo en conflicto |
| POST | `/alumnos/importar` | Profesor | multipart: `archivo` (.xlsx/.xls, multer memoria, `MAX_FILE_SIZE_MB`, 1 archivo), `materia` (clave) | 200 `{resultado: {total, insertados, inscritos, ya_inscritos, errores: [{fila, errores}]}, credenciales}`; 400 archivo inválido/falta materia; 404 materia no propia |
| PUT | `/alumnos/:id` | Profesor con el alumno inscrito (inscripción vigente) en una materia suya no cerrada | `{boleta (10 dígitos), nombre, apellido_paterno, apellido_materno?, grupo, carrera?}` — **el correo institucional no se edita**: enviar `correo` o `correo_institucional` responde 400 | 200 `{alumno}`; 400; 403; 404; 409 boleta duplicada |
| PATCH | `/alumnos/:id/baja?materia=<clave>` | Profesor dueño de esa materia | — | 200 `{message}` (baja lógica: `materia_alumno.activo = FALSE`); 400 falta `materia`; 404 materia no propia o alumno no inscrito en ella; 409 `{error, equipos: [{id_equipo, nombre, tipo}]}` si pertenece a un equipo activo de esa materia |
| POST | `/alumnos/:id/restablecer-acceso` | Profesor con el alumno inscrito en una materia suya no cerrada **y solo si el alumno aún no activó su cuenta**; Administrador (cualquier alumno) | — | 200 `{credenciales}` (1 elemento); 403 sin materia activa en común; 404 alumno inexistente; 409 cuenta inactiva; 409 `codigo: CUENTA_YA_ACTIVADA` si lo pide un Profesor y el alumno ya eligió su contraseña |

**Baja y reinscripción.** La baja desinscribe al alumno de una sola materia y conserva su cuenta,
entregas y calificaciones. Desde ese momento deja de aparecer en los listados y conteos de esa
materia, y el alumno deja de ver sus actividades y avisos. Volver a darlo de alta (`POST /alumnos`
o `importar`) reactiva la misma inscripción: no se duplica la fila ni se generan credenciales.
`GET /alumnos` incluye `acceso_pendiente` (1 = el alumno aún no activa su cuenta y el profesor
todavía puede restablecer su acceso).

`importar` valida fila por fila (boleta 10 dígitos, correo `@alumno.ipn.mx`, columnas
requeridas) y nunca aborta el archivo completo por una fila inválida.

**Contraseñas temporales (`credenciales`).** Cada cuenta de alumno **nueva** recibe una
contraseña temporal aleatoria (12 caracteres legibles en tres bloques, ej. `Xk7m-Qp4T-b9Wd`)
que se guarda solo como hash bcrypt. El texto claro se devuelve **una única vez** en
`credenciales: [{id_alumno, boleta, nombre, correo_institucional, contrasena_temporal}]`; la
respuesta lleva `Cache-Control: no-store`. Un alumno que ya existía (misma boleta **y** mismo
correo) solo se inscribe en la materia: no aparece en `credenciales` y no se le modifica nombre,
correo, grupo, carrera ni contraseña. Si coincide solo la boleta o solo el correo, el alta
responde 409 (y la importación reporta el error en esa fila) sin revelar los datos de la cuenta.
`restablecer-acceso` regenera la temporal, vuelve a exigir el cambio e invalida cualquier
enlace de activación/recuperación pendiente. Un Profesor solo puede usarlo mientras el alumno no
haya activado su cuenta (`debe_cambiar_contrasena = TRUE`); después, el alumno usa "Olvidé mi
contraseña" o lo restablece el Administrador. Cada restablecimiento se registra en el log del
servidor (id de quien lo pidió, rol, id del alumno y fecha). Si hay SMTP configurado, el alta y la importación
envían además un correo de bienvenida con un enlace de activación (nunca la contraseña).

## equipos

Pantallas 04, 05, 06. Lectura: Profesor dueño de la materia / Alumno solo sus propios equipos.
Escritura: solo Profesor.

| Método | Ruta | Rol | Body / params | Respuestas |
|---|---|---|---|---|
| GET | `/equipos?materia=<clave>` | Profesor / Alumno (ignora `materia`, siempre los suyos) | opcionales `&semestre=` / `&id_materia=` (Profesor) | 200 `{equipos, materia?}` (con integrantes) |
| GET | `/equipos/:id` | Profesor dueño / Alumno integrante | — | 200 `{equipo}`; 403; 404 |
| POST | `/equipos` | Profesor | `{id_materia, nombre, tipo: Practica|Tarea|Proyecto, integrantes: [3 o 4 ids únicos]}` | 201 `{equipo, equipo_espejo}` (`equipo_espejo` = `{id_equipo, tipo}` de la fila gemela, o `null` en Proyecto); 400 menos de 3, más de 4, repetidos o integrante no inscrito; 404 materia no propia; 409 integrante ya tiene equipo de ese tipo |
| POST | `/equipos/generar` | Profesor | `{id_materia, tipo}` | 201 `{equipos, equipos_creados, alumnos_sin_asignar, ids_alumnos_sin_asignar, sin_asignar: [{id_alumno, nombre}]}`; 404 materia no propia; 422 `{error, alumnos_disponibles, sin_asignar}` con menos de 3 alumnos disponibles |
| PUT | `/equipos/:id` | Profesor dueño | `{nombre, integrantes: [3 o 4 ids únicos]}` | 200 `{message, equipos_actualizados: [ids]}`; 400; 403; 404; 409 |
| PATCH | `/equipos/:id/desactivar` | Profesor dueño | — | 200 `{message, equipos_desactivados: [ids]}`; 403; 404 |

**Espejo Práctica/Tarea.** Un equipo de Práctica o de Tarea son dos filas de `equipo` (una por tipo, mismos
integrantes) enlazadas por `id_equipo_espejo`, que viene en el listado y en el detalle (`null` en Proyecto).
`POST /equipos` crea las dos filas; `PUT` y `PATCH …/desactivar` se pueden invocar con el id de cualquiera de
las dos y operan sobre ambas en una sola transacción. `/equipos/generar` siempre forma equipos de exactamente 3;
los 1–2 alumnos que sobran vuelven en `sin_asignar` y se agregan a mano (el alta/edición manual admite 4).

`Practica` y `Tarea` son tipos espejo: `generar` sobre cualquiera de los dos crea ambas filas de
`equipo` con los mismos integrantes en una sola pasada. `Proyecto` se reagrupa de forma
independiente.

## actividades

Pantallas 10, 15 (y la pantalla intermedia `/actividades` del sidebar de Profesor). Multer en
disco, `MAX_FILE_SIZE_MB`, hasta 10 archivos, extensión+MIME en lista blanca
(pdf/doc(x)/ppt(x)/zip/png/jpg), nombre de archivo aleatorio (`crypto.randomBytes`).

| Método | Ruta | Rol | Body / params | Respuestas |
|---|---|---|---|---|
| GET | `/actividades?materia=<clave>` | Profesor (las de su materia) / Alumno (las visibles para él, de materias con inscripción vigente) | opcionales `&semestre=` / `&id_materia=` (Profesor) | 200 `{actividades, materia?}` |
| GET | `/actividades/:id` | Profesor dueño / Alumno con acceso | — | 200 `{actividad}`; 403; 404 (también si está programada y aún no visible) |
| POST | `/actividades` | Profesor | multipart: `archivos[]` + `{id_materia, id_equipo?, todos_los_equipos, entrega_por_equipo, titulo, descripcion?, tipo: En clase|Practica|Tarea|Proyecto, tipo_evaluacion?, fecha_limite, programada, fecha_publicacion (requerida si programada)}` | 201 `{actividad}`; 400; 404 materia no propia; 422 sin equipos del tipo indicado |
| PUT | `/actividades/:id` | Profesor dueño | `{titulo, descripcion?, tipo_evaluacion?, fecha_limite, programada, fecha_publicacion}` + opcionales `{tipo, entrega_por_equipo, todos_los_equipos, id_equipo}` (si se omiten se conservan) | 200 `{message}`; 400; 403; 404; 409 actividad desactivada; 409 `codigo: ACTIVIDAD_CON_ENTREGAS` si se intenta cambiar `tipo`, `entrega_por_equipo` o el destino y la actividad ya tiene entregas o calificaciones; 422 sin equipos del tipo |
| PATCH | `/actividades/:id/desactivar` | Profesor dueño | — | 200 `{message}`; 403; 404 |

`tipo_evaluacion` es el tipo de actividad a evaluar (Ejercicio, Mapa mental, Cuestionario,
Reporte, Exposición…): texto libre opcional, con `trim` y máximo 60 caracteres (más de 60 responde
400). No altera el ENUM `tipo`. Se devuelve en los listados y el detalle de actividades, en
`GET /alumnos/:id/actividades` y en el encabezado de `GET /entregas/actividad/:idActividad`. Para el
Profesor, `GET /actividades/:id` incluye además `tiene_entregas` (entregas distintas de `Pendiente` o
calificaciones registradas). Los archivos adjuntos no se modifican con `PUT`.

**Regla crítica de visibilidad:** para el Alumno, el filtro `programada = FALSE OR
fecha_publicacion <= NOW()` va en el `WHERE` SQL (`publicacion.service.js`), tanto en el listado
como en `GET /:id` — nunca se filtra solo en el frontend, y el acceso directo a una actividad
programada no visible responde 404 (no 403) para no confirmar su existencia.

## entregas

Pantallas 16, 17. Multer en disco, hasta 5 archivos; acepta además de documentos habituales
extensiones de código fuente (py/js/ts/java/c/cpp/sql/etc.) porque los alumnos entregan tareas
de programación — el filtro se apoya sobre todo en la extensión, el MIME es señal secundaria.

| Método | Ruta | Rol | Body / params | Respuestas |
|---|---|---|---|---|
| GET | `/entregas/actividad/:idActividad` | Profesor dueño / Alumno (solo el roster de su propio equipo) | — | 200 `{actividad, equipos: [{id_equipo, nombre, integrantes: [{..., entrega, calificacion}]}], mi_id_alumno}`; 403; 404 |
| GET | `/entregas/:id` | Profesor dueño / Alumno dueño | — | 200 `{entrega}`; 403; 404 |
| POST | `/entregas` | Alumno | multipart: `archivos[]` + `{id_actividad, comentario?}` | 201 `{entrega: {..., tardia}, companeros_marcados}`; 403 no pertenece a un equipo objetivo; 404 actividad no encontrada/no visible; 409 ya existe una entrega propia |

Si `actividad.entrega_por_equipo = TRUE`, la entrega del alumno y el marcado del resto del
equipo (fila `entrega` con `estatus = 'En revision'` para quien no tuviera una) ocurren en una
sola transacción SQL; compañeros que ya tenían fila propia no se tocan. Una entrega después de
`fecha_limite` se acepta igual (`tardia: true` en la respuesta) — no se bloquea.

## calificaciones

Pantallas 06, 09, 10, 16 (lectura/registro). `BandejaEntregas.jsx` es la única pantalla con
formularios de calificación; el resto consume estos mismos endpoints solo en modo lectura.

| Método | Ruta | Rol | Body / params | Respuestas |
|---|---|---|---|---|
| GET | `/calificaciones` | Alumno (las propias) / Profesor (`?id_equipo=` requerido) | — | 200 `{calificaciones}` (Alumno) o `{equipo, integrantes, actividades: [{..., calificaciones}]}` (Profesor); 400 falta `id_equipo`; 403; 404 |
| POST | `/calificaciones` | Profesor dueño de la actividad | `{id_actividad, id_equipo, nota (0–10), comentario?}` | 201 `{calificaciones: [...]}` (una fila por integrante, `individual = FALSE`); 403; 404; 422 equipo no es objetivo de la actividad o sin integrantes |
| PATCH | `/calificaciones/:id/individual` | Profesor dueño | `{nota, comentario?}` | 200 `{calificacion}` (`individual = TRUE`, solo esa fila); 403; 404 |

Registrar una nota grupal es una recalificación completa del equipo: sobrescribe cualquier
ajuste individual previo (`ON DUPLICATE KEY UPDATE ... individual = FALSE`). Al registrar,
las entregas ya existentes de esos alumnos pasan a `estatus = 'Calificada'` (un alumno sin
entrega sigue `Pendiente` aunque se le califique).

## avisos

Pantallas 18, 19. Multer en disco, hasta 5 archivos, mismas reglas de extensión/MIME que
actividades.

| Método | Ruta | Rol | Body / params | Respuestas |
|---|---|---|---|---|
| GET | `/avisos?materia=<clave>` | Profesor (los suyos) / Alumno (los de sus materias + globales de sus profesores con materia activa) | — | 200 `{avisos}` |
| POST | `/avisos` | Profesor | multipart: `archivos[]` + `{id_materia? (omitido = aviso global), titulo, contenido}` | 201 `{aviso}`; 404 materia no propia o cerrada |
| PATCH | `/avisos/:id/leido` | Alumno | — | 200 `{message}`; 403 aviso no visible para el alumno; 404 |

Un aviso con `id_materia = NULL` es global: se dirige a todos los alumnos inscritos en
cualquier materia **activa** (`estatus != 'Cerrada'`) de ese profesor, evaluado en cada lectura
(no se congela al publicarlo — si el alumno se da de baja o la materia se cierra después, el
aviso deja de serle visible).

## reportes

Pantalla 14. Los query params son solo filtros de presentación; el `WHERE` siempre ancla
primero a `id_profesor` resuelto de `req.user.id_usuario` — un `?materia=` de otro profesor
simplemente no aparece en el resultado (nunca 403 por manipulación de query, porque nunca se
llega a "encontrarla").

| Método | Ruta | Rol | Body / params | Respuestas |
|---|---|---|---|---|
| GET | `/reportes?semestre=&materia=&tipo=` | Profesor | `tipo`: `Practica`, `Tarea`, `Proyecto` o `Todos` | 200 `{generado_en, filtros, equipos: [...], resumen, nota_promedio, nota_realizadas}` (JSON para vista previa); 400 `tipo` no válido |
| GET | `/reportes/pdf?semestre=&materia=&tipo=` | Profesor | — | 200 `application/pdf`, `Content-Disposition: attachment`. Carta horizontal: tabla "Desempeño por equipo" y tabla "Detalle por actividad"; las filas no se parten entre páginas y cada página repite el encabezado de la tabla y lleva "Página X de Y" |
| GET | `/reportes/excel?semestre=&materia=&tipo=` | Profesor | — | 200 `application/vnd...spreadsheetml.sheet`, `Content-Disposition: attachment` |

Cada fila de `equipos` trae los 6 campos requeridos: profesor, unidad de aprendizaje (materia),
nombre del equipo, integrantes, promedio obtenido, % actividades realizadas / no realizadas — más
`semestre`, `grupo`, `tipos`, `tipo_etiqueta`, `ids_equipo`, `total_integrantes`, `actividades_total`,
`pares_total`, `pares_realizados`, `pares_no_realizados` y `actividades: [{id_actividad, titulo, tipo,
tipo_evaluacion, fecha_limite, entrega_por_equipo, pares_total, pares_realizados, promedio}]`.

Cómo se calcula (Sesión 15):

- **Una fila por equipo.** El par Práctica/Tarea (filas enlazadas por `id_equipo_espejo`) sale como una sola
  fila con `tipo_etiqueta = "Práctica / Tarea"` que reúne las actividades de Práctica, Tarea y En clase;
  Proyecto va aparte. Con `?tipo=` la fila se limita a ese tipo de equipo y a sus actividades.
- **Realizada, por pares (actividad, integrante).** `pct_realizadas` = pares realizados ÷ pares totales. Un par
  cuenta si el integrante tiene una entrega con estatus distinto de `Pendiente` o una calificación registrada
  (cubre las actividades En clase sin archivo). Con `entrega_por_equipo = TRUE` la entrega de un integrante
  marca a todo el equipo; con `FALSE` cuenta cada integrante.
- **Denominador.** Solo actividades activas y ya publicadas (una programada cuya `fecha_publicacion` no ha
  llegado no cuenta) y solo integrantes con inscripción vigente (`materia_alumno.activo = TRUE`).
- **Promedio.** Solo de las calificaciones registradas (una actividad sin nota no cuenta como 0); el PDF, el
  Excel y la pantalla lo indican en una nota al pie. `resumen.total_integrantes` cuenta alumnos distintos.
- El Excel trae dos hojas: `Reporte` (una fila por equipo) y `Actividades` (el detalle, con tipo de evaluación).

## dashboard

| Método | Ruta | Rol | Body / params | Respuestas |
|---|---|---|---|---|
| GET | `/dashboard` | Profesor / Alumno | — | 200; 403 Administrador |

El contenido depende del rol del JWT. **Profesor:** `{semestre, materias_activas, equipos, alumnos_inscritos,
actividades_recientes, avisos_recientes}`. **Alumno** (Panel del Alumno, Pantalla 12): `{semestre, resumen:
{equipos_activos, actividades_asignadas, actividades_realizadas, actividades_pendientes, promedio_general,
avisos_sin_leer}, equipos, proximas_actividades (máx. 5; primero las que siguen en plazo, con `vencida`),
ultimas_calificaciones (máx. 5), avisos_sin_leer (máx. 3)}`, siempre acotado a su propio `id_alumno` y con las
mismas reglas de visibilidad de "Mis actividades" y del Tablón (nunca una actividad programada sin publicar).

## archivos

Descarga de adjuntos. El archivo se localiza por el nombre almacenado en la base de datos y se
resuelve siempre dentro de `UPLOAD_DIR`; el cliente solo manda el tipo y el id.

| Método | Ruta | Rol | Body / params | Respuestas |
|---|---|---|---|---|
| GET | `/archivos/:tipo/:id` | Profesor / Alumno (según tipo) | `tipo` = `actividad`, `entrega` o `aviso`; `id` = PK de `archivo_actividad` / `archivo_entrega` / `archivo_aviso` | 200 el archivo; 403 sin permiso; 404 tipo/id inexistente, actividad no visible para el alumno, o archivo faltante en disco |

Permisos por tipo:

- **actividad** — Profesor dueño de la materia. Alumno: inscrito en la materia, actividad activa,
  ya publicada (misma condición SQL que el listado; una programada futura responde 404) y
  dirigida a todos los equipos o a un equipo suyo.
- **entrega** — Profesor dueño de la materia. Alumno autor; sus compañeros del equipo de esa
  entrega solo si la actividad tiene `entrega_por_equipo = TRUE`.
- **aviso** — Profesor autor. Alumno que puede ver el aviso (inscrito en su materia o, si es
  global, en alguna materia no cerrada de ese profesor).
- El Administrador no descarga adjuntos (403).

Cabeceras de la respuesta: `X-Content-Type-Options: nosniff`, `Cache-Control: private, no-store`,
`Content-Disposition: inline` solo para PDF/PNG/JPG y `attachment` (con
`Content-Type: application/octet-stream`) para todo lo demás. Como el token viaja en el header
`Authorization`, el frontend descarga con axios en modo `blob` (`ArchivoLink.jsx`), no con un
`<a href>` directo.
