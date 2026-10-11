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

El repo trae `docker-compose.yml`, `server/Dockerfile`, `client/Dockerfile` y
`client/nginx-spa.conf` ya listos. El contenedor `client` sirve el build estático de Vite con un
Nginx interno (SPA — todas las rutas caen a `index.html`); el Nginx del **host** es el que
termina TLS y hace reverse proxy hacia los contenedores.

```bash
# 1. En el servidor
git clone <url-del-repo> sgec
cd sgec

# 2. Variables de entorno de producción
cp .env.production .env
nano .env
#   - DB_PASSWORD  → contraseña real
#   - JWT_SECRET   → node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
#   - CLIENT_URL   → https://<tu-dominio>
#   - VITE_API_URL → https://<tu-dominio>/api

# 3. Levantar los contenedores
docker compose up -d --build
docker compose ps            # sgec_db, sgec_server, sgec_client → Up
curl http://localhost:3001/api/health   # {"status":"ok"} (si expusiste el puerto del server)

# 4. Nginx del host + TLS (fuera de Docker)
#    - server{} propio del host que hace proxy_pass a los contenedores
#      (backend en el puerto que hayas expuesto para `server`,
#      frontend en el puerto que hayas expuesto para `client`)
apt install certbot python3-certbot-nginx -y
certbot --nginx -d <tu-dominio>
certbot renew --dry-run
```

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

Con Docker, desde la carpeta del repo en el servidor:

```bash
docker compose exec server node db/migrations/aplicar_002.js
```

Si se despliega el código de la Sesión 13 sin esta migración, el alta/importación de alumnos, el
cambio de contraseña y el restablecimiento por enlace fallan con error 500 (columna inexistente).

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

1. `NODE_ENV=production` en el `.env` del servidor (activa el check de `JWT_SECRET` fuerte y
   oculta mensajes internos en errores 500 — ver [SECURITY.md](./SECURITY.md)).
2. `CLIENT_URL` apuntando al dominio real, no a `localhost`.
3. `JWT_SECRET` generado con el comando de arriba, nunca el valor de `.env.example`.
4. Certificado TLS activo y renovación automática verificada (`certbot renew --dry-run`).
5. Revisar que ningún archivo con secretos reales (`.env`, `.env.production` ya rellenado) se
   suba al repositorio — ambos están en `.gitignore`.
