# Historial de sesiones — SGEC

Registro histórico del desarrollo. Hasta la Sesión 16 estas instrucciones vivían en `CLAUDE.md`;
la Sesión 17 las movió aquí para que `CLAUDE.md` describa solo el estado actual. **Son el plan
original de cada sesión, no la documentación vigente**: varias reglas cambiaron después (por
ejemplo, los equipos admiten 3 o 4 integrantes en alta manual, la materia se cierra con
`estatus` y el límite de inicios de sesión ya no es solo por IP). Ante cualquier conflicto manda
el código y, después, `docs/`.

## Sprint backend (septiembre de 2026)

| Sesión | Tema | Commit |
|---|---|---|
| S1 | Seguridad base + Auth completo | cd3f6f2 |
| S2 | Semestres + Gestión de Usuarios/Profesores + Sidebar Admin | ec5a5e8 |
| S3 | Seeds completos | 0cfe125 |
| S4 | Materias | dbe3181 |
| S5 | Alumnos + importación Excel | 111f853 |
| S6 | Equipos + asignación aleatoria masiva | 302011c |
| S7 | Actividades + publicación programada | 2af81ef |
| S8 | Entregas | 80a8ae2 |
| S9 | Calificaciones | 66c6cc8 |
| S10 | Avisos / Tablón | 4307c63 |
| S11 | Reportes | 3e55ede |
| S12 | Auditoría de seguridad final y hardening | 109daaf |

Las sesiones S1 y S2 no tenían instrucciones escritas en `CLAUDE.md` (se agregaron a partir de
la S3, commit e98ae73). La auditoría de la S12 está en `docs/SECURITY.md`.

## Plan de cierre (octubre de 2026)

Las sesiones 13 a 17 siguieron `PLAN-CIERRE.md` (en la raíz del repositorio de trabajo) y cada una
dejó su resumen en `docs/cierre/S<N>.md`. Las correcciones que pedía la revisión de una sesión
se hicieron al principio de la siguiente, en un commit propio.

| Sesión | Tema | Commit | Correcciones de revisión |
|---|---|---|---|
| S13 | Adjuntos y acceso de alumnos | 9dfcbf5 | a12f23a (al inicio de S14) |
| S14 | ABC completo y tipo de evaluación | 91c096d | — |
| S15 | Equipos espejo, reporte y panel del alumno | 08a032d | b8b195c (al inicio de S16) |
| S16 | Hardening de producción | 7d6a40f | f1ed059 (al inicio de S17) |
| S17 | Cierre documental | ee0b5d2 | — |

---

## Instrucciones originales por sesión (S3 a S12)

Reglas globales que aplican a TODAS las sesiones:
- Leer CLAUDE.md, README.md y server/db/schema.sql al inicio de cada sesión.
- Todo endpoint de listado/detalle filtra por propiedad del recurso (WHERE id_profesor = req.user.id_usuario o WHERE id_alumno = req.user.id_usuario según corresponda). Nunca confiar en parámetros del cliente para esto.
- Todo query usa placeholders ? de mysql2, nunca concatenación de strings.
- Borrado siempre lógico (activo = FALSE), nunca DELETE físico, excepto materia que usa estatus = 'Cerrada'.
- Al terminar cada sesión: hacer commit con mensaje "feat: sesión N - <tema>" y actualizar la tabla de estado en CLAUDE.md (cambiar ⏳ a ✅ con el hash del commit).

---

### Sesión 3 — Seeds completos

**Objetivo:** poblar la BD con datos suficientes para probar todas las sesiones siguientes de punta a punta sin cargar datos a mano.

**Archivos a crear:**
- server/db/seeds/04_materia.sql — al menos 2 materias activas, distintos profesores y semestre
- server/db/seeds/05_alumnos_extra.sql — mínimo 12 alumnos con correos @alumno.ipn.mx válidos, boletas únicas, inscritos en materia_alumno
- server/db/seeds/06_equipos.sql — equipos de exactamente 3 integrantes, tipos Practica, Tarea y Proyecto, sin que ningún alumno repita compañeros dentro del mismo tipo en la misma materia; insertar también en equipo_alumno
- server/db/seeds/07_actividades.sql — al menos una actividad de cada tipo (En clase, Practica, Tarea, Proyecto); incluir una con programada = TRUE y fecha_publicacion futura, una con todos_los_equipos = TRUE, y una con entrega_por_equipo = TRUE
- server/db/seeds/08_entregas.sql — entregas variadas: algunas entregadas, algunas pendientes, al menos una de un equipo con entrega_por_equipo = TRUE
- server/db/seeds/09_calificaciones.sql — mix de calificaciones grupales (individual = FALSE) e individuales (individual = TRUE)
- server/db/seeds/10_avisos.sql — un aviso con id_materia específica y uno global (id_materia = NULL)
- Actualizar server/db/run_seeds.js con el nuevo orden de archivos

**Verificar al terminar:** ejecutar todos los seeds en orden sobre la BD local limpia (DROP + CREATE + schema.sql + seeds en orden) y confirmar que no hay errores de FK ni de constraint.

**Commit:** "feat: sesión 3 - seeds completos"

---

### Sesión 4 — Materias

**Archivos a crear/modificar:**
- server/src/controllers/materias.controller.js — implementar real (hoy es 501)
- client/src/pages/materias/ListaMaterias.jsx — conectar a API (hoy es mock)
- client/src/services/materias.service.js — nuevo

**Endpoints:**

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | /api/materias | Profesor (solo las suyas) / Admin (todas) | listar, filtrable por ?semestre= |
| POST | /api/materias | Profesor, Admin | crear; requiere id_semestre existente |
| GET | /api/materias/:id | Profesor dueño o Admin | detalle |
| PUT | /api/materias/:id | Profesor dueño o Admin | editar |
| PATCH | /api/materias/:id/desactivar | Profesor dueño o Admin | estatus = 'Cerrada' |

**Reglas de negocio:**
- Profesor solo puede ver/editar/cerrar materias donde id_profesor = req.user.id_usuario
- Admin puede ver y operar sobre cualquier materia
- No permitir crear materia con clave duplicada dentro del mismo semestre (responder 409)

**Commit:** "feat: sesión 4 - materias"

---

### Sesión 5 — Alumnos + importación Excel

**Archivos a crear/modificar:**
- server/src/controllers/alumnos.controller.js — implementar real (hoy es 501)
- server/src/services/excel.service.js — implementar parseo real con xlsx (hoy lanza Error)
- client/src/pages/alumnos/ListaAlumnos.jsx — conectar a API
- client/src/pages/alumnos/ImportarAlumnos.jsx — conectar a API
- client/src/pages/alumnos/ActividadesAlumno.jsx — conectar a API
- client/src/services/alumnos.service.js — nuevo

**Endpoints:**

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | /api/alumnos?materia=:clave | Profesor dueño de la materia | lista inscritos |
| GET | /api/alumnos/:id | Profesor (de una materia compartida) | detalle |
| GET | /api/alumnos/:id/actividades | Profesor | tabla de actividades del alumno |
| POST | /api/alumnos/importar | Profesor | sube .xlsx, valida y da de alta en alumno + materia_alumno |

**Reglas de negocio:**
- excel.service.js: validar fila por fila (correo con dominio @alumno.ipn.mx, boleta única, columnas requeridas); reportar errores por fila sin abortar todo el archivo
- Si un alumno ya existe (correo o boleta duplicada), solo inscribirlo en materia_alumno si no estaba ya — no crear duplicado ni lanzar error fatal
- multer: limits.fileSize desde MAX_FILE_SIZE_MB; fileFilter que solo acepte .xlsx / MIME de Excel
- Revisar y corregir en esta sesión el hallazgo de npm audit de multer (severidad alta, DoS)

**Commit:** "feat: sesión 5 - alumnos e importación excel"

---

### Sesión 6 — Equipos + asignación aleatoria masiva

**Archivos a crear/modificar:**
- server/src/controllers/equipos.controller.js — implementar real (hoy es 501)
- server/src/services/asignacion.service.js — implementar algoritmo real (hoy lanza Error)
- client/src/pages/equipos/ListaEquipos.jsx — conectar a API
- client/src/pages/equipos/CrearEquipo.jsx — conectar a API
- client/src/pages/equipos/DetalleEquipo.jsx — conectar a API (solo lectura de calificaciones aquí; el submit de nota va en BandejaEntregas)
- client/src/pages/alumno/MisEquipos.jsx — conectar a API
- client/src/services/equipos.service.js — nuevo

**Endpoints:**

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | /api/equipos?materia=:clave | Profesor dueño / Alumno (solo los suyos) | listar |
| POST | /api/equipos | Profesor | crear equipo manual |
| POST | /api/equipos/generar | Profesor | asignación aleatoria masiva para toda la materia y tipo |
| GET | /api/equipos/:id | Profesor dueño / Alumno miembro | detalle |
| PUT | /api/equipos/:id | Profesor dueño | editar integrantes |
| PATCH | /api/equipos/:id/desactivar | Profesor dueño | borrado lógico |

**Reglas de negocio (críticas):**
- Exactamente 3 integrantes por equipo — rechazar si no se cumplen (400)
- Antes de asignar, verificar que el alumno no tenga ya equipo de ese tipo en esa materia (consultar equipo_alumno + equipo.tipo + equipo.id_materia)
- /api/equipos/generar: si hay menos de 3 alumnos disponibles (sin equipo de ese tipo), responder 422 con mensaje claro indicando cuántos alumnos quedan sin asignar
- Un Alumno solo puede ver sus propios equipos (filtrar por equipo_alumno.id_alumno = req.user.id_usuario)

**Commit:** "feat: sesión 6 - equipos y asignación aleatoria"

---

### Sesión 7 — Actividades + publicación programada

**Archivos a crear/modificar:**
- server/src/controllers/actividades.controller.js — implementar real (hoy es 501)
- client/src/pages/actividades/DetalleActividad.jsx — conectar a API (solo lectura de calificaciones aquí)
- client/src/pages/actividades/PublicarActividad.jsx — conectar a API
- client/src/pages/actividades/ListaActividades.jsx — conectar a API
- client/src/pages/alumno/MisActividades.jsx — conectar a API
- client/src/services/actividades.service.js — nuevo

**Endpoints:**

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | /api/actividades?materia=:clave | Profesor dueño / Alumno (aplica esVisibleParaAlumno) | listar |
| GET | /api/actividades/:id | Profesor dueño / Alumno con acceso | detalle |
| POST | /api/actividades | Profesor | crear (con archivos adjuntos vía multer.array) |
| PUT | /api/actividades/:id | Profesor dueño | editar |
| PATCH | /api/actividades/:id/desactivar | Profesor dueño | borrado lógico |

**Reglas de negocio (críticas):**
- Usar publicacion.service.js (ya implementado) para filtrar visibilidad al Alumno
- Un Alumno NUNCA debe recibir en el JSON una actividad con programada = TRUE y fecha_publicacion futura — filtrar en el WHERE del query, no solo en el frontend
- Si todos_los_equipos = TRUE pero la materia no tiene equipos del tipo indicado, responder 422 con mensaje claro

**Commit:** "feat: sesión 7 - actividades y publicación programada"

---

### Sesión 8 — Entregas

**Archivos a crear/modificar:**
- server/src/controllers/entregas.controller.js — implementar real (hoy es 501)
- client/src/pages/actividades/BandejaEntregas.jsx — conectar a API (esta es la fuente canónica del submit de calificación — las vistas en DetalleEquipo y DetalleActividad son solo lectura)
- client/src/pages/alumno/EntregarActividad.jsx — conectar a API
- client/src/services/entregas.service.js — nuevo

**Endpoints:**

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | /api/entregas/actividad/:idActividad | Profesor dueño de la materia | bandeja de entregas |
| GET | /api/entregas/:id | Profesor dueño / Alumno dueño de la entrega | detalle |
| POST | /api/entregas | Alumno | sube archivo(s) + comentario |

**Reglas de negocio (críticas):**
- Si entrega_por_equipo = TRUE: al crear la entrega, marcar a todos los integrantes del equipo como 'Entregado' en una sola transacción
- Si entrega_por_equipo = FALSE: solo marcar al alumno que sube
- Entregas después de fecha_limite: aceptar con marca de entrega tardía (campo fecha_entrega vs fecha_limite), no bloquear — documentar este comportamiento en un comentario en el controlador
- Un Alumno solo puede crear/ver su propia entrega (id_alumno = req.user.id_usuario)

**Commit:** "feat: sesión 8 - entregas"

---

### Sesión 9 — Calificaciones

**Archivos a crear/modificar:**
- server/src/controllers/calificaciones.controller.js — implementar real (hoy es 501)
- client/src/pages/alumno/MisCalificaciones.jsx — conectar a API
- client/src/services/calificaciones.service.js — nuevo
- client/src/pages/actividades/BandejaEntregas.jsx — agregar submit real de calificación (es la fuente canónica)
- client/src/pages/equipos/DetalleEquipo.jsx — cambiar inputs de nota a solo lectura
- client/src/pages/actividades/DetalleActividad.jsx — cambiar inputs de nota a solo lectura

**Endpoints:**

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| POST | /api/calificaciones | Profesor dueño de la actividad | registrar nota grupal (aplica a todo el equipo) |
| PATCH | /api/calificaciones/:id/individual | Profesor dueño | ajustar nota de un alumno específico (individual = TRUE) |

**Reglas de negocio:**
- Un Alumno solo puede leer sus propias calificaciones (id_alumno = req.user.id_usuario)
- Al registrar nota grupal, insertar una fila en calificacion por cada integrante del equipo con individual = FALSE
- Al ajustar individual, actualizar solo la fila del alumno específico y marcar individual = TRUE

**Commit:** "feat: sesión 9 - calificaciones"

---

### Sesión 10 — Avisos / Tablón

**Archivos a crear/modificar:**
- server/src/controllers/avisos.controller.js — implementar real (hoy es 501)
- client/src/pages/tablon/TablonProfesor.jsx — conectar a API; confirmar/implementar selector "Todas mis materias" (id_materia = NULL)
- client/src/pages/tablon/TablonAlumno.jsx — conectar a API
- client/src/services/avisos.service.js — nuevo

**Endpoints:**

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | /api/avisos | Profesor (los suyos) / Alumno (los de sus materias + globales de sus profesores) | listar con archivos adjuntos |
| POST | /api/avisos | Profesor | crear (con multer.array, id_materia opcional) |
| PATCH | /api/avisos/:id/leido | Alumno | marca aviso_leido |

**Reglas de negocio:**
- Para id_materia = NULL (aviso global): dirigir a todos los alumnos de todas las materias activas (estatus != 'Cerrada') del profesor que publica
- Un Alumno solo ve avisos de materias en las que está inscrito + los globales de sus profesores

**Commit:** "feat: sesión 10 - avisos y tablón"

---

### Sesión 11 — Reportes

**Archivos a crear/modificar:**
- server/src/services/reporte.service.js — implementar generación real (hoy lanza Error)
- server/src/controllers/reportes.controller.js — implementar real (hoy es 501)
- server/package.json — agregar pdfkit (o pdf-lib si se prefiere)
- client/src/pages/reportes/GeneradorReportes.jsx — conectar a API
- client/src/services/reportes.service.js — nuevo

**Endpoints:**

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | /api/reportes?semestre=&materia=&tipo= | Profesor (sus materias) | datos en JSON para vista previa |
| GET | /api/reportes/pdf | Profesor | exporta PDF |
| GET | /api/reportes/excel | Profesor | exporta Excel (xlsx ya instalado) |

**Reglas de negocio:**
- El reporte debe incluir exactamente estos 6 campos requeridos: Profesor, Unidad de aprendizaje, Nombre del equipo, Integrantes, Promedio obtenido, % actividades realizadas / no realizadas
- NUNCA permitir a un Profesor exportar datos de materias que no son suyas vía manipulación de query params — validar id_profesor server-side siempre, ignorar lo que venga en el query string

**Commit:** "feat: sesión 11 - reportes"

---

### Sesión 12 — Auditoría de seguridad final y hardening

**Objetivo:** revisión completa antes del cierre del Servicio Social (16 de octubre de 2026). No se agregan features nuevas — solo fixes de seguridad y calidad.

**Checklist obligatorio (ejecutar contra el código real, no contra este documento):**

1. Repetir el checklist de seguridad de la auditoría inicial sobre todo el código implementado
2. Confirmar que CADA endpoint de listado/detalle filtra por propiedad del recurso (es el hallazgo más importante de todo el plan)
3. Revisar limits y fileFilter de multer en las 4 rutas que reciben archivos (alumnos, actividades, entregas, avisos) — incluye el hallazgo de severidad alta de npm audit
4. Confirmar que el manejador de errores global no filtra stack traces ni mensajes de MySQL en NODE_ENV=production
5. Ejecutar npm audit en client/ y server/ y documentar decisión sobre cada hallazgo
6. Revisar variables de entorno del VPS: JWT_SECRET fuerte, CORS apuntando solo al dominio real, NODE_ENV=production
7. Prueba de penetración manual básica: intentar acceder a rutas de otro rol con token válido de rol distinto (Alumno pidiendo endpoints de Profesor, etc.) — confirmar 403 en todos los casos
8. Revisar /admin/configuracion: definir su alcance real o retirarla del router y el Sidebar

**Commit:** "feat: sesión 12 - hardening y auditoría final"
