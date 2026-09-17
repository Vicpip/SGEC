# SGEC — Despliegue

Dos caminos: desarrollo local (sin Docker, dos procesos + MySQL local) y producción con Docker
Compose detrás de Nginx. Ambos se verificaron contra lo que hay realmente en el repo en la
Sesión 12 — no contra el README original.

## Requisitos

- Node.js 18+ y npm
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
