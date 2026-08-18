# SGEC — Sistema de Gestión de Equipos Colaborativos

> **Servicio Social · ESCOM IPN · 2026**  
> Escuela Superior de Cómputo — Instituto Politécnico Nacional

Sistema web para que los profesores de ESCOM gestionen equipos colaborativos dentro de sus unidades de aprendizaje: conformación de equipos, registro de calificaciones, publicación de actividades y generación de reportes académicos.

---

## Índice

- [Descripción](#descripción)
- [Características](#características)
- [Roles de usuario](#roles-de-usuario)
- [Stack tecnológico](#stack-tecnológico)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Instalación](#instalación)
- [Variables de entorno](#variables-de-entorno)
- [Base de datos](#base-de-datos)
- [Pantallas del sistema](#pantallas-del-sistema)
- [Reglas de negocio](#reglas-de-negocio)
- [Créditos](#créditos)

---

## Descripción

El SGEC centraliza la administración de equipos de trabajo dentro de las materias impartidas en ESCOM. Resuelve el problema de gestión manual en hojas de cálculo, eliminando asignaciones repetitivas, pérdida de datos y falta de reportes consolidados.

El sistema permite:

- Crear semestres, materias y grupos académicos.
- Formar equipos de 3 integrantes con asignación aleatoria sin repetición.
- Importar listas de alumnos desde Excel (`.xlsx`).
- Publicar actividades con fecha límite y publicación programada.
- Registrar calificaciones grupales o individuales por actividad.
- Generar reportes de desempeño exportables a PDF y Excel.
- Publicar avisos en un Tablón de Avisos por materia o para todos los grupos.

---

## Características

- Autenticación con cuenta institucional (`@escom.ipn.mx` / `@alumno.ipn.mx`) y JWT.
- Tres roles con vistas y permisos diferenciados.
- Asignación aleatoria de integrantes con restricción de no repetición entre tipos de equipo.
- Calificaciones grupales con opción de ajuste individual por alumno.
- Publicación programada de actividades (visibles al alumno solo desde la fecha configurada).
- Borrado lógico: los registros no se eliminan físicamente, conservando el historial.
- Importación masiva de alumnos con validación de errores fila por fila.
- Tablón de avisos con seguimiento de lectura por alumno.
- Exportación de reportes a PDF y Excel.

---

## Roles de usuario

| Rol | Descripción |
|---|---|
| **Administrador** | Gestiona profesores, semestres y materias a nivel institucional. Acceso total al sistema. |
| **Profesor** | Crea materias, forma equipos, publica actividades, registra calificaciones y genera reportes. |
| **Alumno** | Consulta sus equipos, actividades y calificaciones. Puede entregar actividades. Vista de solo lectura en reportes. |

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Base de datos | MySQL |
| Autenticación | JWT + bcrypt |
| Importación Excel | `xlsx` (SheetJS) |
| Exportación PDF | `pdfkit` o similar |

---

## Estructura del proyecto

```
sgec/
├── client/                         # Frontend React
│   ├── public/
│   ├── src/
│   │   ├── assets/                 # Logos, íconos SVG
│   │   ├── components/             # Componentes reutilizables
│   │   │   ├── ui/                 # Botones, tablas, badges, modales
│   │   │   ├── layout/             # Sidebar, Header, PageWrapper
│   │   │   └── forms/              # Formularios genéricos
│   │   ├── pages/                  # Páginas por módulo
│   │   │   ├── auth/               # Login
│   │   │   ├── dashboard/          # Dashboard profesor y alumno
│   │   │   ├── materias/           # Lista y formulario de materias
│   │   │   ├── equipos/            # Lista, crear, detalle de equipo
│   │   │   ├── alumnos/            # Lista de alumnos, importar Excel
│   │   │   ├── actividades/        # Publicar, detalle, bandeja de entregas
│   │   │   ├── reportes/           # Generador de reportes
│   │   │   ├── tablon/             # Tablón de avisos (profesor y alumno)
│   │   │   ├── admin/              # Gestión de profesores (Admin)
│   │   │   └── perfil/             # Perfil y configuración de cuenta
│   │   ├── hooks/                  # Custom hooks (useAuth, useFetch, etc.)
│   │   ├── context/                # AuthContext, SemestreContext
│   │   ├── services/               # Llamadas a la API REST
│   │   ├── utils/                  # Helpers (formatDate, calcPromedios, etc.)
│   │   ├── router/                 # React Router, rutas protegidas por rol
│   │   └── main.jsx
│   ├── .env
│   └── package.json
│
├── server/                         # Backend Node.js + Express
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js               # Conexión MySQL (pool)
│   │   │   └── env.js              # Variables de entorno validadas
│   │   ├── controllers/            # Lógica de cada módulo
│   │   │   ├── auth.controller.js
│   │   │   ├── usuarios.controller.js
│   │   │   ├── semestres.controller.js
│   │   │   ├── materias.controller.js
│   │   │   ├── alumnos.controller.js
│   │   │   ├── equipos.controller.js
│   │   │   ├── actividades.controller.js
│   │   │   ├── entregas.controller.js
│   │   │   ├── calificaciones.controller.js
│   │   │   ├── avisos.controller.js
│   │   │   └── reportes.controller.js
│   │   ├── routes/                 # Express routers
│   │   │   ├── auth.routes.js
│   │   │   ├── usuarios.routes.js
│   │   │   ├── semestres.routes.js
│   │   │   ├── materias.routes.js
│   │   │   ├── alumnos.routes.js
│   │   │   ├── equipos.routes.js
│   │   │   ├── actividades.routes.js
│   │   │   ├── entregas.routes.js
│   │   │   ├── calificaciones.routes.js
│   │   │   ├── avisos.routes.js
│   │   │   └── reportes.routes.js
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.js   # Verificar JWT
│   │   │   ├── role.middleware.js   # Verificar rol (admin, profesor, alumno)
│   │   │   └── validate.middleware.js
│   │   ├── services/               # Lógica de negocio reutilizable
│   │   │   ├── asignacion.service.js   # Algoritmo aleatorio sin repetición
│   │   │   ├── excel.service.js        # Parseo de archivos xlsx
│   │   │   ├── reporte.service.js      # Generación PDF/Excel
│   │   │   └── publicacion.service.js  # Scheduler publicación programada
│   │   └── app.js                  # Express app + middlewares globales
│   ├── db/
│   │   ├── schema.sql              # DDL completo de las 16 tablas
│   │   ├── seeds/                  # Datos de prueba
│   │   │   ├── 01_semestres.sql
│   │   │   ├── 02_usuarios.sql
│   │   │   ├── 03_materias.sql
│   │   │   └── 04_equipos.sql
│   │   └── migrations/             # Migraciones incrementales
│   ├── uploads/                    # Archivos subidos (actividades, entregas, avisos)
│   ├── .env
│   ├── server.js                   # Entry point
│   └── package.json
│
├── .gitignore
├── README.md
└── CLAUDE.md                       # Contexto para Claude Code
```

---

## Instalación

### Requisitos previos

- Node.js >= 18
- MySQL >= 8.0
- npm >= 9

### 1. Clonar el repositorio

```bash
git clone https://github.com/<tu-usuario>/sgec.git
cd sgec
```

### 2. Instalar dependencias

```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### 3. Configurar variables de entorno

```bash
# En server/
cp .env.example .env
# Editar server/.env con tus credenciales de MySQL y clave JWT

# En client/
cp .env.example .env
# Editar client/.env con la URL del backend
```

### 4. Crear la base de datos y correr el schema

```bash
mysql -u root -p -e "CREATE DATABASE sgec CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p sgec < server/db/schema.sql
```

### 5. (Opcional) Cargar datos de prueba

```bash
mysql -u root -p sgec < server/db/seeds/01_semestres.sql
mysql -u root -p sgec < server/db/seeds/02_usuarios.sql
mysql -u root -p sgec < server/db/seeds/03_materias.sql
mysql -u root -p sgec < server/db/seeds/04_equipos.sql
```

### 6. Levantar en desarrollo

```bash
# Backend (desde server/)
npm run dev       # nodemon en puerto 3001

# Frontend (desde client/)
npm run dev       # Vite en puerto 5173
```

---

## Variables de entorno

### `server/.env.example`

```env
# Servidor
PORT=3001
NODE_ENV=development

# Base de datos
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=sgec

# JWT
JWT_SECRET=cambia_este_secreto_en_produccion
JWT_EXPIRES_IN=8h

# Archivos subidos
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=20

# Correos institucionales permitidos (separados por coma)
ALLOWED_EMAIL_DOMAINS=escom.ipn.mx,alumno.ipn.mx,ipn.mx
```

### `client/.env.example`

```env
VITE_API_URL=http://localhost:3001/api
```

---

## Base de datos

El modelo relacional está compuesto por **16 tablas**:

| Tabla | Descripción |
|---|---|
| `usuario` | Autenticación y rol (Administrador, Profesor, Alumno) |
| `profesor` | Extiende `usuario`: no_empleado, departamento |
| `alumno` | Extiende `usuario`: boleta, grupo, carrera |
| `semestre` | Período académico (ej. 2026/1) |
| `materia` | Unidad de aprendizaje por semestre y profesor |
| `materia_alumno` | Inscripción alumno–materia |
| `equipo` | Grupo colaborativo por tipo de actividad |
| `equipo_alumno` | Integrantes del equipo |
| `actividad` | Tarea/práctica/proyecto publicado por el profesor |
| `archivo_actividad` | Archivos adjuntos del profesor a la actividad |
| `entrega` | Entrega del alumno por actividad |
| `archivo_entrega` | Archivos adjuntos de la entrega del alumno |
| `calificacion` | Nota por alumno/actividad (grupal o individual) |
| `aviso` | Comunicado del Tablón de Avisos |
| `archivo_aviso` | Archivos adjuntos del aviso |
| `aviso_leido` | Registro de lectura de avisos por alumno |

El schema completo se encuentra en `server/db/schema.sql`.

---

## Pantallas del sistema

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

---

## Reglas de negocio

- Cada equipo tiene exactamente **3 integrantes**.
- Un alumno **no puede repetir** equipo por tipo (Práctica, Tarea, Proyecto) dentro de la misma materia.
- Los equipos `En clase` y `Tarea` **comparten los mismos integrantes**; la diferencia es solo lógica al asignar actividades.
- Las calificaciones son **grupales por defecto**; el profesor puede ajustarlas individualmente (flag `individual = TRUE` en `calificacion`).
- Las actividades con `programada = TRUE` son invisibles al alumno hasta que se alcanza `fecha_publicacion`.
- Un aviso con `id_materia = NULL` se dirige a **todos los alumnos de todas las materias activas** del profesor.
- El borrado es **lógico** (campo `activo`): los registros se desactivan, no se eliminan, para conservar el historial de semestres anteriores.
- El acceso requiere **correo institucional** válido (`@escom.ipn.mx` o `@alumno.ipn.mx`).

---

## Créditos

Desarrollado como **Servicio Social** en la Escuela Superior de Cómputo (ESCOM) del Instituto Politécnico Nacional.

**Autores:**
- Caballero Paredes Victor
- Carbajal Martínez Itzel Aurora

**Período:** 17 de marzo – 16 de octubre de 2026  
**Institución:** ESCOM · IPN · México
