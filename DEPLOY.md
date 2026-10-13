# SGEC — Guía de despliegue en un servidor (VPS)

Guía paso a paso para una instalación nueva en un servidor Ubuntu con Docker, Docker Compose
(2.24 o posterior) y Nginx. La referencia completa de variables, migraciones y correo saliente
está en [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

Este repositorio es público: **ningún dato del servidor real va aquí** (ni su IP, ni
contraseñas, ni secretos). Usa tu propio acceso SSH y sustituye `<tu-dominio>` por el dominio
real en cada paso.

> Si lo que vas a hacer es **actualizar** una instalación que ya existe, no sigas esta guía:
> usa la sección "Actualizar una instalación existente" al final y, para el redeploy de las
> sesiones 13 a 16, el checklist `docs/cierre/S16-checklist-manual.md`.

---

## Paso 1 — Clonar el repositorio

Dentro del servidor:

```bash
cd /var/www
git clone https://github.com/Vicpip/SGEC.git sgec
cd sgec
```

El repositorio ya trae `docker-compose.yml`, `server/Dockerfile`, `client/Dockerfile`,
`client/nginx-spa.conf` y la plantilla `deploy/nginx-vps.conf`. No hay que copiar nada a mano.

---

## Paso 2 — Crear el archivo `.env`

```bash
cd /var/www/sgec
cp .env.production.example .env
nano .env
```

Rellena al menos:

| Variable | Valor |
|---|---|
| `DB_PASSWORD` | Una contraseña larga y aleatoria: `openssl rand -base64 24` |
| `JWT_SECRET` | `openssl rand -base64 48` (con menos de 32 caracteres el servidor no arranca) |
| `CLIENT_URL` | `https://<tu-dominio>` |
| `VITE_API_URL` | `https://<tu-dominio>/api` |

`chmod 600 .env` para que solo tu usuario pueda leerlo. Ese archivo no se sube nunca al
repositorio.

---

## Paso 3 — Levantar los contenedores

```bash
docker compose up -d --build
docker compose ps
```

Deben quedar `sgec_db`, `sgec_server` y `sgec_client` con estado `Up`. Los puertos del archivo
base ya son los de producción:

- `client` en el puerto **4000** del host (el Nginx del host le hace proxy);
- `server` en **127.0.0.1:3001** — alcanzable desde el Nginx del host, no desde internet;
- `db` sin puertos publicados.

Comprueba el backend desde el propio servidor:

```bash
curl http://127.0.0.1:3001/api/health
# {"status":"ok"}
```

---

## Paso 4 — Crear el Administrador

La base arranca **vacía**: solo el esquema, sin cuentas. Los datos de ejemplo del repositorio
(`server/db/seeds/`) traen contraseñas publicadas y no se cargan en producción.

```bash
read -s -p "Contraseña del administrador: " ADMIN_PASSWORD; echo
docker compose exec -e ADMIN_EMAIL=<correo>@ipn.mx -e ADMIN_PASSWORD="$ADMIN_PASSWORD" \
  server node db/create_admin.js
unset ADMIN_PASSWORD
```

La contraseña debe tener al menos 12 caracteres con mayúscula, minúscula y número. `read -s`
evita que quede escrita en el historial de la terminal. El script no la imprime.

Con esa cuenta, desde la aplicación: crea el semestre (Semestres) y da de alta a los profesores
(Gestión de Profesores). Los profesores crean sus materias e importan a sus alumnos.

**Solo para una demostración** (nunca en la instalación real), los datos de ejemplo se cargan
de forma explícita:

```bash
docker compose exec -e SEED_DEMO=true server node db/seeds/run_seeds.js
```

---

## Paso 5 — Nginx del host

```bash
cp /var/www/sgec/deploy/nginx-vps.conf /etc/nginx/sites-available/sgec
nano /etc/nginx/sites-available/sgec        # sustituir <tu-dominio>
ln -s /etc/nginx/sites-available/sgec /etc/nginx/sites-enabled/sgec
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

La plantilla envía `/api/` a `127.0.0.1:3001` y todo lo demás a `127.0.0.1:4000`, agrega la
cabecera `X-Forwarded-For` (el backend la necesita para limitar los intentos de inicio de sesión
por usuario y no para todos a la vez) y sube `client_max_body_size` para los archivos adjuntos.

---

## Paso 6 — Certificado TLS

```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d <tu-dominio>
certbot renew --dry-run
```

Certbot agrega al archivo de Nginx el bloque HTTPS y la redirección desde HTTP.

---

## Paso 7 — Cortafuegos y verificación

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw deny 3001
ufw deny 4000
ufw enable
ufw status
```

Ojo: Docker publica sus puertos con reglas propias de `iptables` que **no pasan por `ufw`**. Por
eso el backend se publica solo en `127.0.0.1:3001` (inalcanzable desde fuera con o sin
cortafuegos). El puerto 4000 sí queda abierto en todas las interfaces: sirve únicamente el
frontend estático, sin datos. Para cerrarlo también, hazlo en el cortafuegos del proveedor del
servidor, o cambia en `docker-compose.yml` `"4000:80"` por `"127.0.0.1:4000:80"`.

Compruébalo desde **otra** máquina: `curl -m 5 http://<tu-dominio>:3001/api/health` no debe
responder.

Abre `https://<tu-dominio>`: debe mostrar el inicio de sesión con el candado de HTTPS. Entra
con el Administrador creado en el paso 4.

---

## Actualizar una instalación existente

```bash
cd /var/www/sgec
git pull
docker compose up -d --build
```

Si la actualización trae migraciones de base de datos, se aplican justo después, en orden
(cada script es idempotente y no borra nada):

```bash
docker compose exec server node db/migrations/aplicar_002.js
docker compose exec server node db/migrations/aplicar_003.js
docker compose exec server node db/migrations/aplicar_004.js
docker compose exec server node db/migrations/aplicar_005.js
```

Qué agrega cada una y qué falla si falta: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## Probar la pila en Docker en tu máquina

Los puertos de desarrollo (80 y 3001 abiertos, sin Nginx delante) están en un archivo aparte
que se usa de forma explícita:

```bash
cp .env.production.example .env      # CLIENT_URL=http://localhost  VITE_API_URL=http://localhost:3001/api
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
docker compose -f docker-compose.yml -f docker-compose.local.yml exec -e SEED_DEMO=true server node db/seeds/run_seeds.js
```

Ese archivo no se llama `docker-compose.override.yml` a propósito: Compose aplica ese nombre de
forma automática, y entonces los puertos de desarrollo también se abrirían en el servidor.

---

## Comandos útiles

```bash
docker compose logs server -f      # backend
docker compose logs client -f      # frontend
docker compose logs db -f          # base de datos
docker compose restart server
docker compose down                # detiene los contenedores; los datos se conservan
```

`docker compose down -v` borra además los volúmenes: **elimina la base de datos y los archivos
subidos**. No lo uses en producción.
