# CLAUDE.md — SGEC

Guía de referencia para futuras sesiones de Claude Code trabajando en este repositorio.

## Qué es este proyecto

**SGEC (Sistema de Gestión de Equipos Colaborativos)** es un sistema web desarrollado como
**Servicio Social** en la **Escuela Superior de Cómputo (ESCOM)**, **Instituto Politécnico
Nacional (IPN)**, México — período 17 de marzo al 16 de octubre de 2026.

Autores: Caballero Paredes Victor · Carbajal Martínez Itzel Aurora.

Resuelve la gestión manual (hojas de cálculo) de equipos colaborativos dentro de las unidades
de aprendizaje de ESCOM: conformación de equipos de 3 integrantes, publicación de actividades,
registro de calificaciones y generación de reportes de desempeño.

El contexto funcional completo (descripción, características, roles, reglas de negocio) vive en
`README.md`, en la raíz de este repositorio — léelo antes de implementar cualquier módulo nuevo.

## Stack y versiones

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite 5 |
| Ruteo | react-router-dom 6 |
| Estado de datos remoto | @tanstack/react-query 5 |
| HTTP | axios |
| Íconos | lucide-react (sin emojis en toda la UI) |
| Gráficas | recharts |
| Backend | Node.js 20+ · Express 4 |
| Base de datos | MySQL 8 (mysql2) |
| Autenticación | JWT (jsonwebtoken) + bcryptjs |
| Import/Export | xlsx (SheetJS) para importar alumnos, pdfkit (o similar) para reportes en PDF |
| Uploads | multer |

## Cómo arrancar el proyecto

```bash
# Backend
cd server
npm install
cp .env.example .env       # editar credenciales de MySQL y JWT_SECRET
npm run dev                 # nodemon, puerto 3001

# Frontend (otra terminal)
cd client
npm install
cp .env.example .env        # editar VITE_API_URL si aplica
npm run dev                 # Vite, puerto 5173

# Base de datos (una sola vez)
mysql -u root -p -e "CREATE DATABASE sgec CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p sgec < server/db/schema.sql
```

La API queda expuesta en `http://localhost:3001/api`; Vite hace proxy de `/api` hacia el backend
(ver `client/vite.config.js`), por lo que el frontend puede llamar rutas relativas `/api/...`
en desarrollo sin problemas de CORS.

## Estructura de carpetas

```
sgec/
├── client/                  Frontend React
│   ├── public/               Estáticos servidos tal cual (favicon, etc.)
│   ├── src/
│   │   ├── assets/            Logos, íconos SVG propios del proyecto
│   │   ├── components/
│   │   │   ├── ui/             Botones, tablas, badges, modales reutilizables
│   │   │   ├── layout/         Sidebar, Header, PageWrapper — el shell de toda pantalla autenticada
│   │   │   └── forms/          Formularios genéricos reutilizables (inputs controlados, etc.)
│   │   ├── pages/              Una carpeta por módulo, un componente por pantalla
│   │   │   └── alumno/           Vistas exclusivas del rol Alumno: MisEquipos.jsx,
│   │   │                          MisActividades.jsx, MisCalificaciones.jsx
│   │   ├── hooks/              Custom hooks (useAuth, useFetch, etc.)
│   │   ├── context/            AuthContext (y futuros contexts, p. ej. SemestreContext)
│   │   ├── services/           Llamadas a la API REST (api.js + un *.service.js por módulo)
│   │   ├── utils/               Helpers puros (formatDate, calcPromedios, etc.)
│   │   ├── router/              React Router — todas las rutas y su protección por rol
│   │   └── main.jsx              Entry point: BrowserRouter + QueryClientProvider + AuthProvider
│   └── vite.config.js
│
├── server/                  Backend Node.js + Express
│   ├── src/
│   │   ├── config/             db.js (pool MySQL2), env.js (valida variables de entorno)
│   │   ├── controllers/        Lógica de cada módulo (uno por entidad principal)
│   │   ├── routes/              Express routers, montados en /api/<recurso> desde app.js
│   │   ├── middlewares/        auth.middleware (JWT), role.middleware (requireRole), validate.middleware
│   │   ├── services/            Lógica de negocio reutilizable (ver más abajo)
│   │   └── app.js                Express app + middlewares globales + montaje de rutas
│   ├── db/
│   │   ├── schema.sql            DDL completo de las 16 tablas — fuente de verdad del modelo de datos
│   │   ├── seeds/                 Datos de prueba (INSERTs), uno por entidad
│   │   └── migrations/            Migraciones incrementales posteriores al schema inicial
│   ├── uploads/                  Archivos subidos (actividades, entregas, avisos) — no versionar
│   └── server.js                  Entry point: carga .env, valida env, levanta app.js en PORT
│
├── README.md                 Contexto funcional completo del sistema
└── CLAUDE.md                 Este archivo
```

Servicios de negocio en `server/src/services/`:

- `asignacion.service.js` — algoritmo de asignación aleatoria de integrantes a equipos de 3,
  sin repetir compañeros por tipo de equipo dentro de la misma materia.
- `excel.service.js` — parseo y validación fila por fila de listas de alumnos (`.xlsx`).
- `reporte.service.js` — generación de reportes de desempeño exportables a PDF y Excel.
- `publicacion.service.js` — determina si una actividad programada ya es visible al alumno.

## Convenciones de código

- **Base de datos y rutas de API**: `snake_case` (`correo_institucional`, `/api/semestres`).
- **JavaScript/JSX**: `camelCase` para variables y funciones.
- **Archivos de página**: `PascalCase.jsx` (ej. `ListaEquipos.jsx`), un componente por archivo.
- **Archivos de servicio (frontend)**: `modulo.service.js` (ej. `equipos.service.js`).
- **Archivos de servicio (backend)**: `modulo.service.js` en `server/src/services/`.
- **Rutas de API**: en plural, en español, alineadas a las tablas principales:
  `/api/auth`, `/api/usuarios`, `/api/semestres`, `/api/materias`, `/api/alumnos`,
  `/api/equipos`, `/api/actividades`, `/api/entregas`, `/api/calificaciones`,
  `/api/avisos`, `/api/reportes`.
- Sin emojis en código, comentarios ni UI — solo íconos SVG vía `lucide-react`.
- Borrado lógico siempre (`activo = FALSE`), nunca `DELETE` físico en las tablas que lo soportan.

## Modelo de datos (16 tablas)

Ver DDL completo en `server/db/schema.sql`.

| Tabla | Descripción |
|---|---|
| `usuario` | Autenticación y rol (Administrador, Profesor, Alumno). Incluye `correo_alterno` (opcional) y `notificaciones_email` para el sistema de notificaciones por correo |
| `profesor` | Extiende `usuario`: no_empleado, departamento |
| `alumno` | Extiende `usuario`: boleta, grupo, carrera (`carrera` es nullable — puede venir vacía en importación Excel) |
| `semestre` | Período académico (ej. 2026/1) |
| `materia` | Unidad de aprendizaje por semestre y profesor. Borrado lógico vía `estatus ENUM('Activa','En curso','Cerrada')` — ya NO tiene campo `activo` |
| `materia_alumno` | Inscripción alumno–materia |
| `equipo` | Grupo colaborativo por tipo de actividad |
| `equipo_alumno` | Integrantes del equipo |
| `actividad` | En clase/práctica/tarea/proyecto publicado por el profesor. `id_equipo` (nullable) y `todos_los_equipos` definen a qué equipo(s) se dirige. `entrega_por_equipo BOOLEAN DEFAULT FALSE` — si TRUE, una entrega de cualquier integrante marca la actividad como completada para todo el equipo |
| `archivo_actividad` | Archivos adjuntos del profesor a la actividad |
| `entrega` | Entrega del alumno por actividad |
| `archivo_entrega` | Archivos adjuntos de la entrega del alumno |
| `calificacion` | Nota por alumno/actividad (grupal o individual) |
| `aviso` | Comunicado del Tablón de Avisos |
| `archivo_aviso` | Archivos adjuntos del aviso |
| `aviso_leido` | Registro de lectura de avisos por alumno |

## Reglas de negocio críticas

- Cada equipo tiene exactamente **3 integrantes**.
- Un alumno **no puede repetir** equipo por tipo (Práctica, Tarea, Proyecto) dentro de la misma materia.
- Los equipos `Practica` y `Tarea` **comparten los mismos integrantes**; la diferencia es solo
  lógica al asignar actividades — no crear equipos duplicados por eso. Del mismo modo, las
  actividades de tipo `'En clase'` y `'Tarea'` se asignan a los mismos equipos (comparten
  integrantes); la diferencia es solo el tipo de actividad.
- El tipo de `actividad` admite 4 valores: `En clase`, `Practica`, `Tarea`, `Proyecto`. Si
  `todos_los_equipos = TRUE`, la actividad se dirige a todos los equipos del tipo indicado en
  esa materia (`id_equipo` puede ser NULL); si es `FALSE`, va dirigida al equipo específico en
  `id_equipo`.
- Las calificaciones son **grupales por defecto**; el profesor puede ajustarlas individualmente
  (`individual = TRUE` en `calificacion`).
- Cuando `entrega_por_equipo = TRUE`: al subir una entrega, el sistema marca automáticamente a
  todos los integrantes del equipo con estatus 'Entregado'. La calificación sigue siendo
  individual (el profesor puede diferenciar).
- Cuando `entrega_por_equipo = FALSE`: cada integrante debe subir su propio archivo. Un
  integrante sin entrega queda como 'Pendiente' independientemente de sus compañeros.
- Las actividades con `programada = TRUE` son invisibles al alumno hasta `fecha_publicacion`
  (ver `publicacion.service.js`).
- Un aviso con `id_materia = NULL` se dirige a **todos los alumnos de todas las materias activas**
  del profesor que lo publica.
- El borrado es **lógico**: la mayoría de las tablas usan `activo` (los registros se desactivan,
  nunca se eliminan, para conservar el historial de semestres anteriores). `materia` es la
  excepción: su campo `estatus` reemplaza a `activo` — una materia con `estatus = 'Cerrada'`
  equivale al borrado lógico.
- El acceso requiere **correo institucional** válido, verificado contra `ALLOWED_EMAIL_DOMAINS`
  (`escom.ipn.mx`, `alumno.ipn.mx`, `ipn.mx`). El dominio válido para alumnos es
  `@alumno.ipn.mx`; para profesores y administradores es `@ipn.mx`.
- Los usuarios pueden registrar un `correo_alterno` para recibir notificaciones por email además
  del correo institucional. `notificaciones_email = FALSE` desactiva los emails de notificación
  para ese usuario.

## Las 19 pantallas

| # | Pantalla | Rol | URL |
|---|---|---|---|
| 01 | Inicio de Sesión | Todos | `/login` |
| 02 | Dashboard | Profesor | `/dashboard` |
| 03 | Lista de Materias | Profesor / Admin | `/materias` |
| 04 | Lista de Equipos | Profesor | `/equipos?materia=:clave` |
| 05 | Crear Equipo | Profesor | `/equipos/nuevo` |
| 06 | Detalle del Equipo | Profesor | `/equipos/:id` |
| 07 | Lista de Alumnos del Grupo | Profesor | `/alumnos?materia=:clave` |
| 08 | Importar Alumnos desde Excel | Profesor | `/alumnos/importar` |
| 09 | Ver Actividades del Alumno | Profesor | `/alumnos/:id/actividades` |
| 10 | Detalle de Actividad | Profesor | `/actividades/:id` |
| 11 | Gestión de Profesores | Administrador | `/admin/profesores` |
| 12 | Panel del Alumno | Alumno | `/alumno/dashboard` |
| 13 | Perfil y Configuración | Todos | `/perfil` |
| 14 | Generador de Reportes | Profesor | `/reportes` |
| 15 | Publicar Actividad | Profesor | `/actividades/nueva` |
| 16 | Bandeja de Entregas | Profesor | `/actividades/:id/entregas` |
| 17 | Entregar Actividad | Alumno | `/alumno/actividades/:id` |
| 18 | Tablón de Avisos | Profesor | `/tablon` |
| 19 | Tablón de Avisos | Alumno | `/alumno/tablon` |

Cada página vive en `client/src/pages/<módulo>/` con un comentario de encabezado
(pantalla, rol, URL, descripción) y actualmente renderiza un placeholder
("Módulo en construcción") a la espera de su implementación real.

Nota sobre `client/src/router/index.jsx`: el ítem "Actividades" del sidebar del Profesor
enlaza a `/actividades`, una pantalla intermedia (`client/src/pages/actividades/ListaActividades.jsx`)
que **no** forma parte de las 19 pantallas oficiales — se agregó únicamente para que
"Actividades" tenga un destino navegable propio, listando actividades y enlazando a
`/actividades/:id` (Pantalla 10) y `/actividades/nueva` (Pantalla 15).

## Paleta de colores y tokens de diseño

Fuente de verdad visual: `SGEC Mockup v2.html` y `sgec-v2.css` (raíz del repositorio padre,
fuera de `sgec/`). Los tokens ya están portados a `client/src/index.css`.

| Token | Valor | Uso |
|---|---|---|
| `--navy` | `#1F3864` | Sidebar, encabezados de tabla |
| `--blue` | `#2E75B6` | Botón primario, acentos, hover activo |
| `--blue-light` | `#EBF0FA` | Fondos suaves, filas alternas, badges |
| `--gray-50` | `#F8F9FC` | Fondo general de la app |
| `--gray-800` | `#1A202C` | Texto principal |
| `--green` | `#27AE60` | Badge Proyecto / estatus Calificada |
| `--orange` | `#E07B2A` | Badge Tarea |
| `--yellow` | `#D97706` | Estatus En revisión |
| `--red` | `#E53E3E` | Estatus Pendiente, acciones destructivas |

Badges de tipo de equipo/actividad: **Práctica** = azul (`badge-blue`), **Tarea** = azul marino
(`badge-navy`), **Proyecto** = naranja (`badge-orange`), **En clase** = gris (`badge-gray`,
solo aplica a actividades).
Badges de estatus de entrega: **Calificada** = verde, **En revisión** = amarillo,
**Pendiente** = rojo.

Tipografía: Inter (o sans-serif del sistema como fallback). Sin emojis en ninguna pantalla —
solo íconos `lucide-react`. Tarjetas con sombra suave (`--shadow`) y `border-radius: 16px`
(`--r-card`). Botón primario: fondo `--blue`, texto blanco, hover a `--navy`.

## Notas de seguridad

- Contraseñas nunca en claro: se almacenan como `contrasena_hash` (bcrypt) en `usuario`.
- Toda ruta protegida exige `Authorization: Bearer <token>`, validado por `auth.middleware.js`.
- Autorización por rol vía `requireRole(...)` (`role.middleware.js`) — nunca confiar en el rol
  que mande el cliente; siempre extraerlo del payload del JWT verificado.
- El login debe validar que el dominio del correo esté en `ALLOWED_EMAIL_DOMAINS` antes de
  emitir un token.
- `JWT_SECRET` y credenciales de base de datos viven solo en `.env` (nunca versionado);
  `env.js` valida al arrancar que todas las variables requeridas existan.
- Archivos subidos (`multer`) se limitan por `MAX_FILE_SIZE_MB` y se guardan fuera del control
  de versiones (`server/uploads/`, ignorado salvo `.gitkeep`).
- `npm audit` conocidos y aceptados por ahora: `xlsx` (SheetJS) no tiene fix publicado en npm
  para sus CVEs de prototype pollution/ReDoS — es la librería que pide el README para importar
  Excel; si se vuelve bloqueante, evaluar migrar al paquete oficial servido desde cdn.sheetjs.com.
  `esbuild`/`vite` tienen un hallazgo moderado que solo afecta al servidor de desarrollo local
  (no a producción); el fix requiere saltar a Vite 8 (breaking) y no se aplicó en esta base.

## Estado actual del proyecto

**Sprint backend (septiembre 2026)** — plan de 12 sesiones de implementación completado.

| Sesión | Tema | Estado | Commit |
|--------|------|--------|--------|
| S1 | Seguridad base + Auth completo | ✅ Completa | cd3f6f2 |
| S2 | Semestres + Gestión de Usuarios/Profesores + Sidebar Admin | ✅ Completa | ec5a5e8 |
| S3 | Seeds completos | ✅ Completa | 0cfe125 |
| S4 | Materias | ✅ Completa | dbe3181 |
| S5 | Alumnos + importación Excel | ✅ Completa | 111f853 |
| S6 | Equipos + asignación aleatoria masiva | ✅ Completa | 302011c |
| S7 | Actividades + publicación programada | ✅ Completa | 2af81ef |
| S8 | Entregas | ✅ Completa | 80a8ae2 |
| S9 | Calificaciones | ✅ Completa | 66c6cc8 |
| S10 | Avisos / Tablón | ✅ Completa | 4307c63 |
| S11 | Reportes | ✅ Completa | 3e55ede |
| S12 | Auditoría de seguridad final y hardening | ✅ Completa | 109daaf |

**Plan de cierre (octubre 2026)** — sesiones 13 a 17, descritas en `PLAN-CIERRE.md` (raíz del
repo). El resumen de cada una vive en `docs/cierre/S<N>.md`.

| Sesión | Tema | Estado | Commit |
|--------|------|--------|--------|
| S13 | Adjuntos y acceso de alumnos | ✅ Completa | HASH_S13 |
| S14 | ABC completo y tipo de evaluación | ⏳ Pendiente | — |
| S15 | Equipos espejo, reporte y panel del alumno | ⏳ Pendiente | — |
| S16 | Hardening de producción | ⏳ Pendiente | — |
| S17 | Cierre documental | ⏳ Pendiente | — |

**Pendientes transversales:** los dos que dejó S12 quedaron resueltos en S13 —
`email.service.js` ya envía por SMTP con nodemailer (opcional: solo si hay variables `SMTP_*`;
las credenciales reales se configuran en el `.env` del servidor) y los adjuntos se descargan por
`GET /api/archivos/:tipo/:id`. Lo que sigue abierto es el resto del plan de cierre (S14–S17).
La migración `002` (`usuario.debe_cambiar_contrasena`) debe aplicarse en toda base existente
antes de desplegar el código de S13 (ver `docs/DEPLOYMENT.md`).

Documentación técnica completa en `docs/`: `ARQUITECTURA.md`, `API.md`, `SECURITY.md`,
`DEPLOYMENT.md`.

## Instrucciones por sesión

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
