# SGEC — Despliegue

Dos caminos: desarrollo local (sin Docker, dos procesos + MySQL local) y producción con Docker
Compose detrás de Nginx. Ambos se verificaron contra lo que hay realmente en el repo en la
Sesión 12 — no contra el README original.

## Requisitos

- Node.js 20+ y npm (nodemailer 10 ya no soporta Node 18)
- MySQL 8
- Para producción: Docker + Docker Compose, un dominio con DNS apuntando al servidor, Nginx y
  Certbot en el host (fuera de los contenedores)

## Desarrollo local

```bash
# 1. Base de datos (una sola vez)
mysql -u root -p -e "CREATE DATABASE sgec CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p sgec < server/db/schema.sql
node server/db/seeds/run_seeds.js   # requiere que server/.env ya exista (paso 2)

# 2. Backend
cd server
npm install
cp .env.example .env       # editar credenciales de MySQL y JWT_SECRET
npm run dev                 # nodemon, puerto 3001

# 3. Frontend (otra terminal)
cd client
npm install
cp .env.example .env        # VITE_API_URL=http://localhost:3001/api
npm run dev                 # Vite, puerto 5173
```

Vite hace proxy de `/api` hacia el backend (`client/vite.config.js`), así que el frontend llama
rutas relativas `/api/...` en desarrollo sin problemas de CORS. Verifica que el backend levantó
con `curl http://localhost:3001/api/health` → `{"status":"ok"}`.

### Variables de entorno — servidor (`server/.env`)

| Variable | Requerida | Notas |
|---|---|---|
| `PORT` | Sí | Puerto HTTP del backend |
| `NODE_ENV` | No (default `development`) | En `production`, activa el check de `JWT_SECRET` fuerte (ver abajo) y oculta detalles de errores 500 |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_NAME` | Sí | `DB_PASSWORD` es opcional (vacío en dev con root sin contraseña) |
| `JWT_SECRET` | Sí | En producción: mínimo 32 caracteres y distinto del placeholder de `.env.example`, o el proceso no arranca (`server/src/config/env.js`) |
| `JWT_EXPIRES_IN` | Sí | Ej. `8h` |
| `UPLOAD_DIR` | Sí | Carpeta de adjuntos de actividad/entrega/aviso |
| `MAX_FILE_SIZE_MB` | Sí | Límite de multer en las 4 rutas que reciben archivos |
| `ALLOWED_EMAIL_DOMAINS` | Sí | Lista separada por comas; el sufijo que contiene `alumno.` es el único válido para el rol Alumno |
| `TRUST_PROXY` | No (default `1`) | Proxies inversos delante de Node. `1` = detrás del Nginx del host: `req.ip` (con la que cuentan los límites de peticiones) es la IP real del cliente, tomada de `X-Forwarded-For`. `0` = sin proxy (desarrollo local, o `docker-compose.local.yml`). `true` no se acepta |
| `TZ` | No (default `America/Mexico_City`) | Zona horaria del proceso. El sistema trabaja en la hora del centro de México (UTC-06:00); cada conexión a MySQL fija además `time_zone = '-06:00'`. Con otro valor el servidor avisa al arrancar: las fechas de publicación y de entrega se compararían mal |
| `CLIENT_URL` | No (default `http://localhost:5173`) | Origen permitido por CORS y usado para armar el enlace de `/restablecer-password`. **En producción debe ser el dominio público real** — si se omite, el backend solo acepta CORS desde `localhost:5173` y bloquea al frontend real |

Correo saliente (todas opcionales; ver "Correo saliente (SMTP)" más abajo):

| Variable | Notas |
|---|---|
| `SMTP_HOST` | Servidor SMTP. **Vacío = el sistema no envía ningún correo** y funciona igual |
| `SMTP_PORT` | Default `587` |
| `SMTP_SECURE` | `true` para TLS implícito (puerto 465); `false` para STARTTLS (587) |
| `SMTP_USER`, `SMTP_PASS` | Credenciales del buzón. Solo en el `.env` del servidor, nunca en el repositorio |
| `EMAIL_FROM` | Remitente, ej. `SGEC <no-reply@tu-dominio>`. Default: `SMTP_USER` |
| `EMAIL_DRY_RUN` | `true` = no envía nada; registra en consola solo destinatario y asunto. Usar en pruebas |

Genera un `JWT_SECRET` seguro con:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Variables de entorno — cliente (`client/.env`)

| Variable | Notas |
|---|---|
| `VITE_API_URL` | URL base de la API. En dev, `http://localhost:3001/api`; en el build de producción, la URL pública real (`https://<tu-dominio>/api`) — se hornea en el bundle en tiempo de build, no se puede cambiar después sin rebuild |

## Producción (Docker Compose + Nginx del host)

El repo trae `docker-compose.yml`, `server/Dockerfile`, `client/Dockerfile`,
`client/nginx-spa.conf`, la plantilla `deploy/nginx-vps.conf` y la plantilla de variables
`.env.production.example`. El contenedor `client` sirve el build estático de Vite con un Nginx
interno (SPA — todas las rutas caen a `index.html`); el Nginx del **host** es el que termina TLS
y hace reverse proxy hacia los contenedores. La guía paso a paso está en
[DEPLOY.md](../DEPLOY.md); aquí va el resumen.

`docker-compose.yml` es el archivo de **producción**:

| Servicio | Puerto en el host | Notas |
|---|---|---|
| `client` | `4000` | El Nginx del host hace proxy de `/` hacia aquí |
| `server` | `127.0.0.1:3001` | Solo alcanzable desde el propio servidor (Nginx del host → `/api`). Nunca publicado hacia internet |
| `db` | — | Sin puertos publicados. Arranca con `--default-time-zone=-06:00` |

```bash
# 1. En el servidor
git clone <url-del-repo> sgec
cd sgec

# 2. Variables de entorno de producción
cp .env.production.example .env
nano .env
#   - DB_PASSWORD  → openssl rand -base64 24
#   - JWT_SECRET   → openssl rand -base64 48
#   - CLIENT_URL   → https://<tu-dominio>
#   - VITE_API_URL → https://<tu-dominio>/api

# 3. Levantar los contenedores
docker compose up -d --build
docker compose ps                         # sgec_db, sgec_server, sgec_client → Up
curl http://127.0.0.1:3001/api/health     # {"status":"ok"}

# 4. Administrador inicial (la base arranca vacía; ver "Datos iniciales")
read -s -p "Contraseña del administrador: " ADMIN_PASSWORD; echo
docker compose exec -e ADMIN_EMAIL=<correo>@ipn.mx -e ADMIN_PASSWORD="$ADMIN_PASSWORD" server node db/create_admin.js
unset ADMIN_PASSWORD

# 5. Nginx del host + TLS (fuera de Docker)
cp deploy/nginx-vps.conf /etc/nginx/sites-available/sgec     # sustituir <tu-dominio>
ln -s /etc/nginx/sites-available/sgec /etc/nginx/sites-enabled/sgec
nginx -t && systemctl reload nginx
apt install certbot python3-certbot-nginx -y
certbot --nginx -d <tu-dominio>
certbot renew --dry-run
```

### Datos iniciales

Una instalación de producción arranca **vacía**: Compose solo carga `schema.sql`. Los seeds de
`server/db/seeds/` crean cuentas con contraseñas publicadas en el repositorio (`Admin1234!`,
`Profesor1234!`, `Alumno1234!`) y son solo para desarrollo o demostración.

- **Administrador real:** `server/db/create_admin.js`, a partir de `ADMIN_EMAIL` y
  `ADMIN_PASSWORD` (mínimo 12 caracteres con mayúscula, minúscula y número; el correo debe ser
  de un dominio permitido para Administrador). No imprime la contraseña. Si la cuenta ya
  existe no la toca, salvo con `ADMIN_ACTUALIZAR=true`, que le cambia la contraseña, la reactiva
  y cierra sus sesiones abiertas.
- **Seeds de demo:** con `NODE_ENV=production` (el valor del contenedor) `run_seeds.js` se
  niega a correr salvo que se pida con `SEED_DEMO=true`:
  `docker compose exec -e SEED_DEMO=true server node db/seeds/run_seeds.js`. En desarrollo
  local (`NODE_ENV=development`) funciona como siempre.

### Docker en tu máquina

Los puertos de desarrollo (`80` para el frontend y `3001` abierto para la API) viven en
`docker-compose.local.yml`, que se usa junto con el archivo base y **de forma explícita**:

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
```

No se llama `docker-compose.override.yml` porque Compose aplica ese nombre automáticamente y
entonces esos puertos también se abrirían en el servidor. El archivo local fija además
`TRUST_PROXY=0` (no hay Nginx delante).

Actualizar tras cambios en el código:

```bash
git pull
docker compose up -d --build
```

### Migraciones de base de datos

`schema.sql` solo se carga cuando el volumen de MySQL se crea por primera vez. Una base que ya
existía necesita las migraciones de `server/db/migrations/` aplicadas a mano, **antes** de
levantar el código nuevo:

| Migración | Sesión | Qué agrega | Cómo aplicarla |
|---|---|---|---|
| `002_debe_cambiar_contrasena.sql` | 13 | `usuario.debe_cambiar_contrasena` | `node server/db/migrations/aplicar_002.js` (idempotente: revisa `information_schema` y no hace nada si la columna ya existe) |
| `003_tipo_evaluacion_y_baja_alumno.sql` | 14 | `actividad.tipo_evaluacion` y `materia_alumno.activo` | `node server/db/migrations/aplicar_003.js` (idempotente columna por columna) |
| `004_equipo_espejo.sql` | 15 | `equipo.id_equipo_espejo` (columna, índice y llave foránea) y el emparejamiento de los equipos Práctica/Tarea existentes | `node server/db/migrations/aplicar_004.js` (idempotente paso por paso; al terminar lista los equipos que quedaron sin espejo y los pares con integrantes distintos, para revisarlos a mano) |
| `005_contrasena_cambiada_en.sql` | 16 | `usuario.contrasena_cambiada_en` (momento del último cambio de contraseña; los tokens anteriores se rechazan) | `node server/db/migrations/aplicar_005.js` (idempotente) |

Con Docker, desde la carpeta del repo en el servidor:

```bash
docker compose exec server node db/migrations/aplicar_002.js
docker compose exec server node db/migrations/aplicar_003.js
docker compose exec server node db/migrations/aplicar_004.js
docker compose exec server node db/migrations/aplicar_005.js
```

Si se despliega el código de la Sesión 13 sin esta migración, el alta/importación de alumnos, el
cambio de contraseña y el restablecimiento por enlace fallan con error 500 (columna inexistente).
Sin la 003, el código de la Sesión 14 responde 500 en casi todo lo que usa el alumno y el profesor
(listados de alumnos, actividades, avisos, entregas, equipos y dashboard), porque todas esas
consultas filtran por `materia_alumno.activo` o leen `actividad.tipo_evaluacion`. Las migraciones
se aplican en orden (002, 003 y 004). Sin la 004, el código de la Sesión 15 responde 500 en equipos,
reportes y el panel del alumno (leen `equipo.id_equipo_espejo`). La 004 no borra nada: agrega la columna y
enlaza entre sí las filas de Práctica y Tarea que tengan la misma materia y el mismo nombre y estén activas;
un nombre repetido dentro de la misma materia y tipo se deja sin enlazar y el script lo reporta.
Sin la 005, el código de la Sesión 16 responde 500 en **todas** las rutas autenticadas: el
middleware de autenticación lee `usuario.contrasena_cambiada_en` en cada petición. El inicio de
sesión sí funciona, así que el síntoma es "entro y todo da error": hay que aplicarla
inmediatamente después de levantar el código nuevo.

### Correo saliente (SMTP)

Es opcional. Sin `SMTP_HOST` el sistema no intenta enviar nada: los alumnos entran con la
contraseña temporal que el profesor ve al darlos de alta. Con SMTP configurado, además:
"Olvidé mi contraseña" envía el enlace real (vigente 24 h) y el alta/importación de alumnos
envía un correo de bienvenida con un enlace de activación (nunca la contraseña temporal).

1. Agregar `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` y `EMAIL_FROM` al
   `.env` del servidor (el `docker-compose.yml` ya las pasa al contenedor `server`).
2. `CLIENT_URL` debe ser el dominio público real: con él se arman los enlaces de los correos.
3. `docker compose up -d` para que el contenedor tome las variables.
4. Probar con "Olvidé mi contraseña" sobre una cuenta propia. Si el envío falla, el log muestra
   solo `[email.service] No se pudo enviar el correo (<código>)` — nunca el enlace ni el token.

Para ensayar sin enviar nada, `EMAIL_DRY_RUN=true`: el log muestra destinatario y asunto de cada
correo que se habría enviado.

Comandos útiles: `docker compose logs <server|client|db> -f`, `docker compose restart <servicio>`,
`docker compose down` (agregar `-v` solo si de verdad quieres borrar el volumen de MySQL).

### Antes de exponer el sitio al público

1. `NODE_ENV=production` (el `docker-compose.yml` ya lo fija: activa el check de `JWT_SECRET`
   fuerte y oculta mensajes internos en errores 500 — ver [SECURITY.md](./SECURITY.md)).
2. `CLIENT_URL` apuntando al dominio real, no a `localhost`.
3. `JWT_SECRET` generado con `openssl rand -base64 48`, nunca el valor de `.env.example`.
4. Certificado TLS activo y renovación automática verificada (`certbot renew --dry-run`).
5. Revisar que ningún archivo con secretos reales (`.env`, `.env.production` ya rellenado) se
   suba al repositorio — ambos están en `.gitignore`.
6. Ninguna cuenta de los seeds de demo activa: sus contraseñas son públicas. El Administrador
   se crea con `create_admin.js`.
7. El backend no responde desde fuera en el puerto 3001 (probar desde otra máquina), y el Nginx
   del host envía `X-Forwarded-For` (plantilla `deploy/nginx-vps.conf`): sin esa cabecera todos
   los usuarios comparten el mismo límite de inicios de sesión.

El repositorio es público. Lo que alguna vez estuvo en su historial (direcciones, contraseñas de
los seeds, valores de ejemplo de `JWT_SECRET`) debe considerarse conocido por terceros aunque ya
no esté en los archivos: lo que protege la instalación es **rotar** esos valores, no borrarlos.
