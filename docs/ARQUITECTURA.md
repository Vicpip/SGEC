# SGEC — Arquitectura

Documento de una sola página para onboarding: qué es cada pieza del sistema y cómo encajan
entre sí. Para el detalle de endpoints ver [API.md](./API.md); para hallazgos y decisiones de
seguridad, [SECURITY.md](./SECURITY.md); para levantar el proyecto, [DEPLOYMENT.md](./DEPLOYMENT.md).

## Qué es

SGEC (Sistema de Gestión de Equipos Colaborativos) reemplaza la gestión manual en hojas de
cálculo de equipos colaborativos dentro de las unidades de aprendizaje de ESCOM-IPN: conformación
de equipos de 3 integrantes, publicación de actividades, registro de calificaciones y generación
de reportes de desempeño. Tres roles: Administrador, Profesor, Alumno.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite 5, react-router-dom 6, @tanstack/react-query 5, axios, lucide-react, recharts |
| Backend | Node.js 20+ · Express 4 |
| Base de datos | MySQL 8 (mysql2/promise, pool de conexiones) |
| Autenticación | JWT (jsonwebtoken) + bcryptjs, validación de body con Joi |
| Import/Export | xlsx (SheetJS) para importar alumnos; pdfkit + xlsx para reportes |
| Uploads | multer (memoria para el Excel de importación, disco para adjuntos de actividad/entrega/aviso) |
| Seguridad de transporte | helmet, cors (origen único), express-rate-limit |

## Estructura de carpetas

```
sgec/
├── client/               Frontend React
│   src/
│   ├── components/        ui/ (genéricos), layout/ (Sidebar, PageWrapper), forms/
│   ├── pages/              una carpeta por módulo/rol (materias, equipos, alumnos,
│   │                       actividades, tablon, reportes, admin, alumno, perfil, auth)
│   ├── context/            AuthContext — token + usuario en localStorage
│   ├── hooks/, services/  un *.service.js por módulo, todos sobre services/api.js (axios)
│   ├── router/             todas las rutas y su protección por rol (ProtectedRoute)
│   └── utils/
│
├── server/               Backend Node + Express
│   src/
│   ├── config/             db.js (pool MySQL2), env.js (valida variables de entorno)
│   ├── controllers/        un archivo por entidad principal — toda la lógica de negocio
│   │                       y de propiedad de recursos vive aquí, no en las rutas
│   ├── routes/              Express routers montados en /api/<recurso> desde app.js;
│   │                       aquí vive multer (limits + fileFilter) en los 4 recursos que
│   │                       reciben archivos: alumnos, actividades, entregas, avisos
│   ├── middlewares/        auth.middleware (verifica JWT), role.middleware (requireRole),
│   │                       validate.middleware (Joi)
│   ├── validators/          un *.validators.js por módulo (esquemas Joi)
│   ├── services/            lógica de negocio reutilizable (ver abajo)
│   └── app.js                Express app + helmet + cors + rate limit + manejador de errores
│   db/
│   ├── schema.sql            DDL completo — fuente de verdad del modelo de datos
│   ├── seeds/                 datos de prueba, un archivo por entidad, orden en run_seeds.js
│   └── migrations/
│   uploads/                  archivos subidos (fuera de git salvo .gitkeep)
│
└── docs/                  Esta carpeta
```

Servicios de negocio en `server/src/services/`:

- **asignacion.service.js** — algoritmo de asignación aleatoria de integrantes a equipos de 3,
  sin repetir compañeros por tipo de equipo dentro de la misma materia.
- **excel.service.js** — parseo y validación fila por fila de listas de alumnos (`.xlsx`).
- **reporte.service.js** — genera el buffer del reporte de desempeño en PDF (pdfkit) y Excel (xlsx).
- **publicacion.service.js** — determina si una actividad programada ya es visible al alumno
  (a nivel de condición SQL, no solo en memoria — ver [API.md](./API.md#actividades)).
- **usuarios.service.js** — datos extendidos de profesor/alumno que complementan a `usuario`.
- **email.service.js** — correo saliente por SMTP con nodemailer, **opcional**: sin `SMTP_HOST`
  no envía nada y ningún flujo se rompe. Envía el enlace de recuperación de contraseña y el
  correo de bienvenida con enlace de activación; nunca registra cuerpos, enlaces ni tokens
  (`EMAIL_DRY_RUN=true` solo registra destinatario y asunto).

## Modelo de datos (16 tablas)

DDL completo en `server/db/schema.sql`. Relación principal:

```
usuario (1) ── (1) profesor ── (N) materia ── (N) equipo ── (N) equipo_alumno ── (N) alumno ── (1) usuario
                                    │                │
                                    │                └── (N) actividad (dirigida a un id_equipo
                                    │                     o a todos_los_equipos de un tipo)
                                    │                          │
                                    ├── (N) materia_alumno      ├── (N) archivo_actividad
                                    │        └── (N) alumno     ├── (N) entrega ── (N) archivo_entrega
                                    │                            └── (N) calificacion
                                    └── (N) aviso (id_materia NULL = global) ── (N) archivo_aviso
                                                                              └── (N) aviso_leido
```

| Tabla | Rol |
|---|---|
| `usuario` | Autenticación y rol; `correo_alterno`/`notificaciones_email` para notificaciones por correo |
| `profesor` / `alumno` | Extienden `usuario` (1:1) con datos propios del rol |
| `semestre` | Período académico |
| `materia` | Unidad de aprendizaje por semestre y profesor; borrado lógico vía `estatus` |
| `materia_alumno` | Inscripción alumno–materia. Baja lógica con `activo` (Sesión 14): reinscribir reactiva la misma fila |
| `equipo` / `equipo_alumno` | Equipo de 3 integrantes por tipo (Practica/Tarea/Proyecto) y sus miembros |
| `actividad` | En clase/Practica/Tarea/Proyecto; dirigida a un equipo o a todos los de un tipo |
| `archivo_actividad` | Adjuntos del profesor a la actividad |
| `entrega` / `archivo_entrega` | Entrega del alumno y sus adjuntos |
| `calificacion` | Nota por alumno/actividad, grupal por defecto |
| `aviso` / `archivo_aviso` / `aviso_leido` | Tablón de avisos y su seguimiento de lectura |

## Reglas de negocio críticas

- **Equipos de 3.** Cada equipo tiene exactamente 3 integrantes (validado en Joi:
  `integrantesSchema.length(3)` y de nuevo en el controlador antes del INSERT).
- **Sin repetir compañeros por tipo.** Un alumno no puede tener dos equipos activos del mismo
  tipo (Practica/Tarea/Proyecto) en la misma materia. `Practica` y `Tarea` son **espejo**: comparten
  integrantes por diseño (`tiposEspejo()` en `asignacion.service.js`); `Proyecto` es independiente.
  Las actividades de tipo `En clase` también se asignan a los equipos de tipo `Tarea` de la materia.
- **`entrega_por_equipo`.** Si `TRUE`, la primera entrega de cualquier integrante marca
  automáticamente a todo el equipo como entregado (una transacción SQL); si `FALSE`, cada
  integrante debe subir su propio archivo y los demás quedan `Pendiente` hasta que lo hagan.
- **Calificaciones grupales por defecto.** Registrar una nota aplica la misma calificación a
  los 3 integrantes del equipo (`individual = FALSE`); el profesor puede ajustar una fila
  puntual con `PATCH /calificaciones/:id/individual`, que la marca `individual = TRUE` sin tocar
  al resto del equipo.
- **Visibilidad de actividades programadas.** Una actividad con `programada = TRUE` es
  invisible para el Alumno hasta `fecha_publicacion` — el filtro vive en el `WHERE` SQL
  (`condicionVisibleAlumnoSQL` en `publicacion.service.js`), tanto en el listado como en el
  acceso directo por id (404, no 403, para no confirmar su existencia).
- **Aviso global.** Un aviso con `id_materia = NULL` llega a todos los alumnos inscritos en
  cualquier materia **activa** (`estatus != 'Cerrada'`) del profesor que lo publica — la
  visibilidad se evalúa en cada lectura, no se congela al momento de publicar.
- **Borrado lógico siempre.** `activo = FALSE` en la mayoría de las tablas; `materia` usa
  `estatus = 'Cerrada'` en su lugar. Nunca `DELETE` físico desde la aplicación.
- **Dominios de correo institucional.** Alumno → `@alumno.ipn.mx`; Profesor/Administrador →
  cualquier otro dominio de `ALLOWED_EMAIL_DOMAINS` (`escom.ipn.mx`, `ipn.mx`). Validado en
  login, alta de usuario e importación de Excel.
- **Propiedad de recursos, siempre server-side.** Ningún endpoint de listado/detalle confía en
  un `id_profesor`/`id_alumno` que venga del cliente: siempre se resuelve desde
  `req.user.id_usuario` (payload del JWT verificado) hacia el `id_profesor`/`id_alumno` propio,
  y ese valor ancla el `WHERE` de la consulta. Ver el detalle de esta verificación por endpoint
  en [SECURITY.md](./SECURITY.md#2-filtrado-por-propiedad-del-recurso).

## Descarga de archivos adjuntos (Sesión 13)

`archivo_actividad`, `archivo_entrega` y `archivo_aviso` guardan en `ruta_archivo` el nombre que
multer generó al subir y los binarios se persisten en `UPLOAD_DIR`. Se sirven únicamente por
`GET /api/archivos/:tipo/:id` (`archivos.controller.js`), que comprueba la propiedad del recurso
antes de abrir el archivo — no hay `express.static` sobre la carpeta de uploads. Detalle de
permisos y cabeceras en [API.md](./API.md#archivos).

## Acceso de los alumnos (Sesión 13)

El alta manual, la importación Excel y "Restablecer acceso" generan una contraseña temporal que
el profesor ve una sola vez y entrega al alumno; la cuenta queda con
`usuario.debe_cambiar_contrasena = TRUE` hasta que el alumno la cambia (el frontend lo lleva a
`/perfil` y la API rechaza todo salvo `/api/auth/*`). El correo de activación es un complemento
opcional: el acceso nunca depende de que haya SMTP configurado.
