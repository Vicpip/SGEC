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
| Backend | Node.js 18+ · Express 4 |
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

**Sprint 4 (julio 2026)** — estructura base generada: monorepo `client/` + `server/`,
schema de base de datos completo, rutas/controladores/servicios como placeholders,
router y layout (Sidebar + Header + PageWrapper) funcionales, y las 19 pantallas creadas
como componentes placeholder. Implementación de módulos en curso, módulo por módulo,
en sesiones siguientes.
