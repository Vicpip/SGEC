# CLAUDE.md — SGEC

Guía de referencia para futuras sesiones de Claude Code trabajando en este repositorio.
Actualizada en la Sesión 17 (cierre documental, 14 de octubre de 2026). Ante cualquier conflicto
entre este archivo y el código, manda el código.

## Qué es este proyecto

**SGEC (Sistema de Gestión de Equipos Colaborativos)** es un sistema web desarrollado como
**Servicio Social** en la **Escuela Superior de Cómputo (ESCOM)**, **Instituto Politécnico
Nacional (IPN)**, México — período 17 de marzo al 16 de octubre de 2026.

Autores: Caballero Paredes Victor · Carbajal Martínez Itzel Aurora.

Resuelve la gestión manual (hojas de cálculo) de equipos colaborativos dentro de las unidades
de aprendizaje de ESCOM: conformación de equipos de 3 integrantes, publicación de actividades,
registro de calificaciones y generación de reportes de desempeño.

El contexto funcional (descripción, características, roles, reglas de negocio) vive en
`README.md`, en la raíz de este repositorio. La documentación técnica está en `docs/`:
`ARQUITECTURA.md`, `API.md`, `SECURITY.md`, `DEPLOYMENT.md`, `LIMITACIONES.md`,
`PRUEBAS-MANUALES.md` e `historial-sesiones.md`; los resúmenes de las sesiones de cierre, en
`docs/cierre/`. La guía de instalación en un servidor es `DEPLOY.md` (raíz).

## Stack y versiones

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite 5 |
| Ruteo | react-router-dom **7** |
| HTTP | axios (`client/src/services/api.js`) |
| Íconos | lucide-react (sin emojis en toda la UI) |
| Instaladas sin uso | `@tanstack/react-query` 5 (solo su `QueryClientProvider` en `main.jsx`) y `recharts` (ninguna importación). Ver `docs/LIMITACIONES.md` §13 |
| Backend | Node.js 20 · Express 4 · helmet · cors · express-rate-limit 8 |
| Validación | Joi (`server/src/validators/`) |
| Base de datos | MySQL 8 (mysql2/promise) |
| Autenticación | JWT (jsonwebtoken) + bcryptjs |
| Import/Export | xlsx (SheetJS) para importar alumnos y exportar reportes a Excel; pdfkit para PDF |
| Uploads | multer |
| Correo | nodemailer (opcional: solo con variables `SMTP_*`) |

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
cp .env.example .env        # VITE_API_URL=http://localhost:3001/api (o /api: pasa por el proxy)
npm run dev                 # Vite, puerto 5173 (client/vite.config.js)

# Base de datos (una sola vez)
mysql -u root -p -e "CREATE DATABASE sgec CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p sgec < server/db/schema.sql
node server/db/seeds/run_seeds.js     # datos de demo (contraseñas publicadas; nunca en producción)
```

La API queda expuesta en `http://localhost:3001/api`; Vite hace proxy de `/api` hacia el backend.
En producción el frontend llama a la ruta relativa `/api` (horneada al construir) y el Nginx del
host la reparte; ver `DEPLOY.md` y `docs/DEPLOYMENT.md`. Para probar el servidor sin pisar otro
proceso ni la base `sgec`, se levanta con `PORT=<otro>` y `DB_NAME=<base temporal>` en el
entorno (tienen prioridad sobre `server/.env`).

## Estructura de carpetas

```
sgec/
├── client/                  Frontend React
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── ui/             ArchivoLink, Badge, ConfirmDialog, CredencialesTemporales,
│   │   │   │                    SelectorSemestre, StatCard, etc.
│   │   │   └── layout/         Sidebar, PageWrapper — el shell de toda pantalla autenticada
│   │   ├── pages/              Una carpeta por módulo, un componente por pantalla:
│   │   │                        auth, dashboard (Profesor y Alumno), materias, equipos, alumnos,
│   │   │                        actividades (incluye EntregarActividad.jsx, pantalla 17),
│   │   │                        reportes, tablon, admin, alumno (MisEquipos, MisActividades,
│   │   │                        MisCalificaciones), perfil
│   │   ├── hooks/              useAuth, useSelectorMateria
│   │   ├── context/            AuthContext
│   │   ├── services/           api.js (axios) + un *.service.js por módulo
│   │   ├── utils/              roleRoutes.js (pantalla de inicio por rol)
│   │   ├── router/             React Router — todas las rutas y su protección por rol
│   │   └── main.jsx
│   ├── Dockerfile, nginx-spa.conf   Imagen de producción (Nginx interno: solo estáticos)
│   └── vite.config.js
│
├── server/                  Backend Node.js + Express
│   ├── src/
│   │   ├── config/             db.js (pool MySQL2, sesión en -06:00), env.js (valida variables),
│   │   │                        zonaHoraria.js
│   │   ├── controllers/        Uno por entidad: actividades, alumnos, archivos, auth, avisos,
│   │   │                        calificaciones, dashboard, entregas, equipos, materias,
│   │   │                        reportes, semestres, usuarios
│   │   ├── routes/              Express routers, montados en /api/<recurso> desde app.js
│   │   ├── middlewares/        auth.middleware (JWT + cuenta activa + contraseña cambiada),
│   │   │                        role.middleware (requireRole), validate.middleware (Joi)
│   │   ├── validators/         Un *.validators.js por módulo (esquemas Joi)
│   │   ├── services/           Lógica de negocio reutilizable (ver más abajo)
│   │   ├── utils/              asyncHandler, correoInstitucional, credenciales,
│   │   │                        limitePeticiones (limitadores de peticiones)
│   │   └── app.js              Express app + middlewares globales + montaje de rutas
│   ├── db/
│   │   ├── schema.sql          DDL completo de las 16 tablas — fuente de verdad del modelo
│   │   ├── seeds/              Datos de demo (00 a 11) y run_seeds.js, que los carga en orden
│   │   ├── migrations/         002 a 005 (.sql) y su aplicar_00X.js idempotente
│   │   ├── create_admin.js     Crea el Administrador inicial de producción
│   │   └── comparar_esquema.js Compara el esquema de dos bases (solo lectura)
│   ├── uploads/                Archivos subidos — no versionar
│   ├── Dockerfile
│   └── server.js               Entry point
│
├── deploy/nginx-vps.conf     Plantilla del Nginx del host
├── docker-compose.yml        PRODUCCIÓN (puertos solo en 127.0.0.1)
├── docker-compose.local.yml  Pruebas locales con Docker (se usa junto con el base, explícito)
├── .env.production.example   Plantilla de variables de producción
├── DEPLOY.md                 Guía de instalación en un servidor
├── docs/                     Documentación técnica y de cierre
├── README.md
└── CLAUDE.md                 Este archivo
```

Rutas de la API montadas en `app.js`: `/api/auth`, `/api/usuarios`, `/api/semestres`,
`/api/materias`, `/api/alumnos`, `/api/equipos`, `/api/actividades`, `/api/entregas`,
`/api/calificaciones`, `/api/avisos`, `/api/reportes`, `/api/dashboard`, `/api/archivos` y
`/api/health`. Referencia completa: `docs/API.md`.

Servicios de negocio en `server/src/services/`:

- `asignacion.service.js` — asignación aleatoria de integrantes a equipos de 3 entre los alumnos
  que aún no tienen equipo activo de ese tipo en la materia (Práctica y Tarea cuentan como uno).
- `excel.service.js` — parseo y validación fila por fila de listas de alumnos (`.xlsx`).
- `reporte.service.js` — reportes de desempeño en PDF y Excel.
- `publicacion.service.js` — condición SQL de visibilidad de actividades programadas.
- `materias.service.js` — única puerta para buscar una materia por clave, acotada a quien llama.
- `avisos.service.js`, `semestres.service.js`, `usuarios.service.js` — consultas compartidas.
- `email.service.js` — correo saliente por SMTP, opcional (`EMAIL_DRY_RUN=true` en pruebas).

## Convenciones de código

- **Base de datos y rutas de API**: `snake_case` (`correo_institucional`, `/api/semestres`).
- **JavaScript/JSX**: `camelCase` para variables y funciones.
- **Archivos de página**: `PascalCase.jsx` (ej. `ListaEquipos.jsx`), un componente por archivo.
- **Archivos de servicio**: `modulo.service.js` (frontend en `client/src/services/`, backend en
  `server/src/services/`).
- **Rutas de API**: en plural, en español, alineadas a las tablas principales.
- Sin emojis en código, comentarios ni UI — solo íconos SVG vía `lucide-react`.
- Borrado lógico siempre (`activo = FALSE`), nunca `DELETE` físico en las tablas que lo soportan.
- Todo endpoint de listado/detalle filtra por propiedad del recurso desde el JWT
  (`req.user.id_usuario`), nunca desde parámetros del cliente.
- Todo query usa placeholders `?` de mysql2, nunca concatenación de strings.
- No hay pruebas automatizadas ni configuración de ESLint (`docs/LIMITACIONES.md` §9 y §10):
  verificar con peticiones reales contra una base temporal y con `vite build`.

## Modelo de datos (16 tablas)

Ver DDL completo en `server/db/schema.sql`.

| Tabla | Descripción |
|---|---|
| `usuario` | Autenticación y rol (Administrador, Profesor, Alumno). Incluye `correo_alterno` (opcional), `notificaciones_email`, `debe_cambiar_contrasena` (contraseña temporal pendiente de cambio) y `contrasena_cambiada_en` (los JWT anteriores a esa fecha se rechazan) |
| `profesor` | Extiende `usuario`: no_empleado, departamento |
| `alumno` | Extiende `usuario`: boleta, grupo, carrera (`carrera` es nullable) |
| `semestre` | Período académico (ej. 2026/1) |
| `materia` | Unidad de aprendizaje por semestre y profesor. Borrado lógico vía `estatus ENUM('Activa','En curso','Cerrada')` — no tiene campo `activo` |
| `materia_alumno` | Inscripción alumno–materia. Baja lógica con `activo` (reinscribir reactiva la misma fila). Toda consulta de "está inscrito" exige `activo = TRUE` |
| `equipo` | Grupo colaborativo por tipo (`Practica`, `Tarea`, `Proyecto`). `id_equipo_espejo INT NULL` (auto-FK) enlaza la fila de Práctica con su gemela de Tarea; NULL en Proyecto |
| `equipo_alumno` | Integrantes del equipo |
| `actividad` | Tipo `En clase`/`Practica`/`Tarea`/`Proyecto`. `id_equipo` (nullable) y `todos_los_equipos` definen el destino. `entrega_por_equipo` — si TRUE, una entrega de un integrante cuenta para todo el equipo. `tipo_evaluacion VARCHAR(60) NULL` — texto libre (Ejercicio, Mapa mental…) |
| `archivo_actividad` | Archivos adjuntos del profesor a la actividad |
| `entrega` | Entrega del alumno. `estatus ENUM('Pendiente','En revision','Calificada')`: una entrega recién creada queda **'En revision'** (no existe 'Entregado'); al calificar pasa a 'Calificada' |
| `archivo_entrega` | Archivos adjuntos de la entrega |
| `calificacion` | Nota por alumno/actividad (`individual` FALSE = grupal) |
| `aviso` | Comunicado del Tablón de Avisos (`id_materia` NULL = global) |
| `archivo_aviso` | Archivos adjuntos del aviso |
| `aviso_leido` | Registro de lectura de avisos por alumno |

## Reglas de negocio críticas

- La asignación automática forma equipos de exactamente **3 integrantes** y reporta a los 1–2
  sobrantes (`sin_asignar`); el alta y la edición manual admiten **3 o 4**.
- Un alumno **no puede estar en dos equipos activos del mismo tipo** dentro de la misma materia,
  y Práctica y Tarea cuentan como un solo tipo (`tiposEspejo()`). Proyecto se valida aparte: un
  alumno sí puede tener equipo de Práctica/Tarea y de Proyecto a la vez, incluso con los mismos
  compañeros. Difiere de la lectura literal del requerimiento 5 (`docs/LIMITACIONES.md` §7).
- Los equipos `Practica` y `Tarea` **comparten los mismos integrantes**: cada equipo son dos filas
  de `equipo` enlazadas por `id_equipo_espejo`; crear, editar y desactivar opera siempre sobre
  ambas en una transacción (nunca emparejar por nombre). Las actividades `En clase` se asignan a
  los equipos de `Tarea` (`tipoEquipoParaActividad()` en `actividades.controller.js`), es decir,
  a los mismos integrantes. Esta regla está pendiente de confirmar con el asesor
  (`docs/LIMITACIONES.md` §7).
- Si `todos_los_equipos = TRUE`, la actividad va a todos los equipos del tipo correspondiente en
  esa materia; si es `FALSE`, al equipo de `id_equipo`.
- Las calificaciones son **grupales por defecto**; el profesor puede ajustarlas individualmente
  (`individual = TRUE`).
- `entrega_por_equipo = TRUE`: la entrega de un integrante crea la de todo el equipo con estatus
  'En revision' en una transacción. `FALSE`: cada integrante entrega lo suyo; sin entrega cuenta
  como 'Pendiente'. Las entregas tardías se aceptan y se marcan.
- Las actividades con `programada = TRUE` son invisibles al alumno hasta `fecha_publicacion`
  (filtro en el `WHERE`, `publicacion.service.js`).
- Un aviso con `id_materia = NULL` se dirige a todos los alumnos de todas las materias activas
  del profesor que lo publica.
- Borrado **lógico**: `activo = FALSE` en la mayoría de las tablas; `materia` usa
  `estatus = 'Cerrada'`.
- Correo institucional obligatorio (`ALLOWED_EMAIL_DOMAINS`): `@alumno.ipn.mx` para alumnos;
  `@ipn.mx` o `@escom.ipn.mx` para profesores y administradores.
- Alta e importación de alumnos generan una **contraseña temporal** (mostrada una vez) con cambio
  obligatorio en el primer inicio de sesión. El correo (SMTP) es un complemento opcional.

## Pantallas

Las 19 pantallas oficiales:

| # | Pantalla | Rol | URL | Archivo |
|---|---|---|---|---|
| 01 | Inicio de Sesión | Todos | `/login` | `pages/auth/LoginPage.jsx` |
| 02 | Dashboard | Profesor | `/dashboard` | `pages/dashboard/DashboardProfesor.jsx` |
| 03 | Lista de Materias | Profesor / Admin | `/materias` | `pages/materias/ListaMaterias.jsx` |
| 04 | Lista de Equipos | Profesor | `/equipos?materia=:clave` | `pages/equipos/ListaEquipos.jsx` |
| 05 | Crear Equipo | Profesor | `/equipos/nuevo` | `pages/equipos/CrearEquipo.jsx` |
| 06 | Detalle del Equipo | Profesor | `/equipos/:id` | `pages/equipos/DetalleEquipo.jsx` |
| 07 | Lista de Alumnos del Grupo | Profesor | `/alumnos?materia=:clave` | `pages/alumnos/ListaAlumnos.jsx` |
| 08 | Importar Alumnos desde Excel | Profesor | `/alumnos/importar` | `pages/alumnos/ImportarAlumnos.jsx` |
| 09 | Ver Actividades del Alumno | Profesor | `/alumnos/:id/actividades` | `pages/alumnos/ActividadesAlumno.jsx` |
| 10 | Detalle de Actividad | Profesor | `/actividades/:id` | `pages/actividades/DetalleActividad.jsx` |
| 11 | Gestión de Profesores | Administrador | `/admin/profesores` | `pages/admin/GestionProfesores.jsx` |
| 12 | Panel del Alumno | Alumno | `/alumno/dashboard` | `pages/dashboard/DashboardAlumno.jsx` |
| 13 | Perfil y Configuración | Todos | `/perfil` | `pages/perfil/Perfil.jsx` |
| 14 | Generador de Reportes | Profesor | `/reportes` | `pages/reportes/GeneradorReportes.jsx` |
| 15 | Publicar Actividad | Profesor | `/actividades/nueva` | `pages/actividades/PublicarActividad.jsx` |
| 16 | Bandeja de Entregas | Profesor | `/actividades/:id/entregas` | `pages/actividades/BandejaEntregas.jsx` |
| 17 | Entregar Actividad | Alumno | `/alumno/actividades/:id` | `pages/actividades/EntregarActividad.jsx` |
| 18 | Tablón de Avisos | Profesor | `/tablon` | `pages/tablon/TablonProfesor.jsx` |
| 19 | Tablón de Avisos | Alumno | `/alumno/tablon` | `pages/tablon/TablonAlumno.jsx` |

Rutas adicionales (no forman parte de las 19 oficiales):

| URL | Rol | Archivo | Para qué |
|---|---|---|---|
| `/recuperar-password` | Público | `pages/auth/RecuperarContrasena.jsx` | Pedir enlace de recuperación |
| `/restablecer-password` | Público | `pages/auth/RestablecerContrasena.jsx` | Fijar contraseña con el enlace |
| `/admin/semestres` | Administrador | `pages/admin/GestionSemestres.jsx` | Alta y edición de semestres |
| `/admin/accesos` | Administrador | `pages/admin/AccesosAlumnos.jsx` | Buscar alumno y restablecer acceso |
| `/actividades` | Profesor | `pages/actividades/ListaActividades.jsx` | Destino del ítem "Actividades" del sidebar |
| `/actividades/:id/editar` | Profesor | `pages/actividades/PublicarActividad.jsx` | Pantalla 15 en modo edición |
| `/alumno/equipos` | Alumno | `pages/alumno/MisEquipos.jsx` | Mis equipos |
| `/alumno/actividades` | Alumno | `pages/alumno/MisActividades.jsx` | Mis actividades |
| `/alumno/calificaciones` | Alumno | `pages/alumno/MisCalificaciones.jsx` | Mis calificaciones |

Pantalla de inicio por rol (`utils/roleRoutes.js`): Administrador → `/admin/profesores`,
Profesor → `/dashboard`, Alumno → `/alumno/dashboard`. Todas las pantallas están conectadas a la
API; ninguna es un placeholder.

## Paleta de colores y tokens de diseño

Fuente de verdad visual: `SGEC Mockup v2.html` y `sgec-v2.css` (raíz del repositorio padre,
fuera de `sgec/`). Los tokens están portados a `client/src/index.css`.

| Token | Valor | Uso |
|---|---|---|
| `--navy` | `#1F3864` | Sidebar, encabezados de tabla, badge Tarea |
| `--blue` | `#2E75B6` | Botón primario, acentos, badge Práctica |
| `--blue-light` | `#EBF0FA` | Fondos suaves, filas alternas, badges |
| `--gray-50` | `#F8F9FC` | Fondo general de la app |
| `--gray-800` | `#1A202C` | Texto principal |
| `--green` | `#27AE60` | Estatus Calificada |
| `--orange` | `#E07B2A` | Badge Proyecto |
| `--yellow` | `#D97706` | Estatus En revisión |
| `--red` | `#E53E3E` | Estatus Pendiente, acciones destructivas |

Badges de tipo de equipo/actividad: **Práctica** = azul (`badge-blue`), **Tarea** = azul marino
(`badge-navy`), **Proyecto** = naranja (`badge-orange`), **En clase** = gris (`badge-gray`, solo
actividades). Badges de estatus de entrega: **Calificada** = verde, **En revisión** = amarillo,
**Pendiente** = rojo.

Tipografía: Inter (o sans-serif del sistema). Tarjetas con sombra suave (`--shadow`) y
`border-radius: 16px` (`--r-card`). Botón primario: fondo `--blue`, texto blanco, hover a `--navy`.

## Notas de seguridad

- Contraseñas solo como `contrasena_hash` (bcrypt). Contraseñas temporales: aleatorias, mostradas
  una vez, sin caducidad (`docs/LIMITACIONES.md` §2).
- Toda ruta protegida exige `Authorization: Bearer <token>`. `auth.middleware.js` consulta la
  cuenta en cada petición: 401 si está inactiva o si el token es anterior a
  `usuario.contrasena_cambiada_en`. Todo cambio de contraseña actualiza esa columna con
  `ahoraSinMilisegundos()` (`utils/credenciales.js`).
- Autorización por rol vía `requireRole(...)`; el rol siempre sale del JWT verificado.
- `PUT /api/usuarios/:id` es solo de Administrador; el usuario edita lo suyo con
  `PATCH /api/usuarios/me` (lista blanca).
- Una materia nunca se busca por clave con una consulta propia: se usa `materias.service.js`.
  Un mismo profesor no puede repetir clave en un semestre (409).
- Límites de peticiones (`utils/limitePeticiones.js`, ventanas de 15 min): login solo cuenta
  fallos, 5 por IP + correo y 50 por IP; forgot-password 3 por IP + correo y 30 por IP; general
  600 por usuario autenticado (por IP sin token válido). `TRUST_PROXY=1` detrás del Nginx del
  host.
- Zona horaria única UTC-06:00: `config/zonaHoraria.js` (Node) y `config/db.js` (sesión MySQL).
  Las fechas son hora de pared de México; no introducir conversiones a UTC.
- `JWT_SECRET` y credenciales viven solo en `.env` (nunca versionado); `env.js` valida al arrancar.
  En producción, `JWT_SECRET` de al menos 32 caracteres.
- Archivos subidos: límite `MAX_FILE_SIZE_MB`, guardados en `server/uploads/` (volumen en Docker),
  servidos solo por `GET /api/archivos/:tipo/:id` con comprobación de propiedad.
- `docker-compose.yml` es el de producción: cliente en `127.0.0.1:4000`, servidor en
  `127.0.0.1:3001`, base sin puertos. Los puertos locales van en `docker-compose.local.yml`
  (nunca un `docker-compose.override.yml`). `VITE_API_URL` en producción es `/api`, nunca
  `localhost`. Producción arranca sin seeds: `server/db/create_admin.js` crea el Administrador y
  los seeds exigen `SEED_DEMO=true`.
- `npm audit` (14 de octubre): servidor 4 altas (`xlsx`, `nodemon`/`chokidar`/`braces` de
  desarrollo); cliente 2 altas y 1 moderada (`xlsx`, `vite`/`esbuild` de desarrollo). Todas
  aceptadas con su justificación en `docs/SECURITY.md`.
- El repositorio es público: nunca IPs, contraseñas ni secretos en archivos versionados.

## Estado actual del proyecto

**Sprint backend (septiembre 2026)** — 12 sesiones completadas (S1 a S12). Detalle, commits e
instrucciones originales en `docs/historial-sesiones.md`.

**Plan de cierre (octubre 2026)** — sesiones 13 a 17. Resumen de cada una en
`docs/cierre/S<N>.md`.

| Sesión | Tema | Estado | Commit | Correcciones de revisión |
|--------|------|--------|--------|--------------------------|
| S13 | Adjuntos y acceso de alumnos | ✅ Completa | 9dfcbf5 | a12f23a |
| S14 | ABC completo y tipo de evaluación | ✅ Completa | 91c096d | — |
| S15 | Equipos espejo, reporte y panel del alumno | ✅ Completa | 08a032d | b8b195c |
| S16 | Hardening de producción | ✅ Completa | 7d6a40f | f1ed059 |
| S17 | Cierre documental | ✅ Completa | ee0b5d2 | — |

Migraciones: `002` (S13), `003` (S14), `004` (S15) y `005` (S16) se aplican, en ese orden, en
toda base existente al desplegar (sin la 005 toda ruta autenticada responde 500). Después se
compara el esquema con `server/db/comparar_esquema.js`. Todo está en
`docs/cierre/S16-checklist-manual.md`.

**Pendientes (no los puede hacer Claude):**

- Ejecutar `docs/cierre/S16-checklist-manual.md` en el servidor (respaldo, migraciones o
  recreación de la base, rotación de secretos, cuentas, red, verificación). Ninguna sesión tocó
  producción.
- Recorrer `docs/PRUEBAS-MANUALES.md` en el dominio con los tres roles.
- Confirmar con el asesor la regla de integrantes (`docs/LIMITACIONES.md` §7).
- Configurar el SMTP real en el `.env` del servidor (opcional).
- Borrar las bases temporales de MySQL local (el entorno de Claude bloquea `DROP`). Según
  `SHOW DATABASES` del 14 de octubre quedan nueve: de S16, `sgec_s16_tmp`, `sgec_s16_tmp2`,
  `sgec_s16_tmp3` y `sgec_s16_tmp4`; de S17, `sgec_s17_tmp`, `sgec_s17_esq_a`, `sgec_s17_esq_b`,
  `sgec_s17_sep` y `sgec_s17_restore`. Las de S13 a S15 ya no existen. La base `sgec` no se borra.

Funcionalidades nuevas planeadas después del cierre (S18 PWA y notificaciones push, S19 avisos
de alumnos): se trabajan en la rama `feature/pwa-avisos` según `PLAN-CIERRE.md` y solo se
fusionan si pasan su propio checklist.

Limitaciones conocidas: `docs/LIMITACIONES.md` (15 puntos, con resumen al inicio).
