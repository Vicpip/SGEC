# Sesión 16 — Checklist manual para el servidor de producción

Lo ejecuta una persona con acceso al servidor. Nada de esto lo hizo Claude: la Sesión 16 no tocó
el servidor ni envió una sola petición al dominio.

Antes de empezar:

- Ten a la mano tu acceso SSH. **No escribas la dirección del servidor, contraseñas ni secretos
  en ningún archivo del repositorio** (es público).
- Hazlo en un momento sin clases en curso: entre el paso 2 y el paso 3 la aplicación responde
  con error a quien ya tenga la sesión abierta.
- Marca cada casilla al terminar. Si un paso falla, detente y revisa `docker compose logs server`.

Todos los comandos se ejecutan dentro del servidor, en `/var/www/sgec`.

---

## 0. Respaldo (antes de tocar nada)

- [ ] Respaldar la base de datos (pide la contraseña de MySQL; el archivo queda fuera del repo):

  ```bash
  cd /var/www/sgec
  docker compose exec db sh -c 'mysqldump -u root -p --single-transaction sgec' > ~/sgec-respaldo-$(date +%F).sql
  ls -lh ~/sgec-respaldo-*.sql      # debe pesar más de unos KB
  ```

- [ ] Anotar el commit que está desplegado hoy, por si hay que volver atrás: `git rev-parse --short HEAD`

## 1. Revisar la configuración actual del Nginx del host

El archivo base de Compose cambia cómo se publican los puertos. Antes de actualizar:

- [ ] Ver a dónde apunta hoy Nginx: `grep -n proxy_pass /etc/nginx/sites-enabled/*`
  - `/api` debe ir a `http://127.0.0.1:3001` y `/` a `http://127.0.0.1:4000`.
  - Si dice `localhost` en lugar de `127.0.0.1`, cámbialo: el backend ahora solo escucha en
    `127.0.0.1` (IPv4) y `localhost` puede resolverse también a IPv6.
- [ ] Comprobar que el bloque de `/api` tiene estas dos líneas (compáralo con la plantilla
  `deploy/nginx-vps.conf` del repositorio):

  ```nginx
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  client_max_body_size 200m;
  ```

  Sin la primera, todos los usuarios comparten el mismo límite de inicios de sesión. Sin la
  segunda, subir un archivo de más de 1 MB responde 413.
- [ ] Si cambiaste algo: `nginx -t && systemctl reload nginx`

## 2. Actualizar el código y reconstruir

- [ ] Revisar que el `.env` del servidor tiene las variables de `.env.production.example` (no
  hace falta agregar `TRUST_PROXY`: vale 1 por defecto).
- [ ] Actualizar y reconstruir (el servicio del frontend se llama `client`):

  ```bash
  cd /var/www/sgec && git pull && docker compose up -d --build
  docker compose ps        # sgec_db, sgec_server y sgec_client en "Up"
  ```

  Si `git pull` se queja de cambios locales en `docker-compose.yml` (en el servidor se habían
  agregado los puertos a mano), descártalos: el archivo del repositorio ya trae los puertos de
  producción. `git checkout -- docker-compose.yml && git pull`.

## 3. Aplicar las migraciones 002 a 005 — de inmediato

Hasta que se aplique la 005, **toda** ruta autenticada responde 500 (se puede iniciar sesión,
pero nada más funciona). Sin la 002 fallan el alta de alumnos y el cambio de contraseña.

- [ ] En orden. Cada script es idempotente y no borra nada:

  ```bash
  docker compose exec server node db/migrations/aplicar_002.js
  docker compose exec server node db/migrations/aplicar_003.js
  docker compose exec server node db/migrations/aplicar_004.js
  docker compose exec server node db/migrations/aplicar_005.js
  ```

- [ ] **Leer la salida de `aplicar_004`.** Lista los equipos de Práctica/Tarea que quedaron sin
  espejo y los pares con integrantes distintos. Si hay datos reales en producción, revísalos
  antes de seguir (ver `docs/LIMITACIONES.md` §4).
- [ ] `docker compose logs server --tail 30` no muestra errores, y la primera línea del arranque
  dice `TZ=America/Mexico_City, trust proxy=1`.

## 4. Rotar los secretos

El repositorio es público y en su historial estuvieron la dirección del servidor, las
contraseñas de las cuentas de ejemplo y valores de ejemplo del `JWT_SECRET`. Se consideran
conocidos por terceros: borrarlos de los archivos no basta.

- [ ] Generar un `JWT_SECRET` nuevo y ponerlo en el `.env` (no lo pegues en ningún chat ni archivo
  del repositorio):

  ```bash
  openssl rand -base64 48
  nano /var/www/sgec/.env          # sustituir el valor de JWT_SECRET
  docker compose up -d             # recrea el contenedor con el secreto nuevo
  ```

  Efecto: todas las sesiones abiertas se cierran y cada usuario vuelve a iniciar sesión.
- [ ] `chmod 600 /var/www/sgec/.env`
- [ ] Si la contraseña de MySQL del `.env` es débil o es la de algún ejemplo, cámbiala. Hay que
  hacerlo en MySQL **y** en el `.env` (el volumen ya existe, así que cambiar solo el `.env` no
  cambia la contraseña real): dentro de `docker compose exec db mysql -u root -p`, ejecutar
  `ALTER USER` para `root` y para el usuario de la aplicación, y después actualizar
  `DB_PASSWORD` en el `.env` y `docker compose up -d`.
- [ ] Si alguna vez se subió al servidor una contraseña SMTP, verificar que no esté en el
  repositorio y cambiarla si lo estuvo.

## 5. Cuentas: crear el administrador real y retirar las de ejemplo

- [ ] Crear el Administrador real (la contraseña no queda en el historial de la terminal; mínimo
  12 caracteres con mayúscula, minúscula y número):

  ```bash
  read -s -p "Contraseña del administrador: " ADMIN_PASSWORD; echo
  docker compose exec -e ADMIN_EMAIL=<correo>@ipn.mx -e ADMIN_PASSWORD="$ADMIN_PASSWORD" server node db/create_admin.js
  unset ADMIN_PASSWORD
  ```

- [ ] Entrar al dominio con esa cuenta y comprobar que abre Gestión de Profesores.
- [ ] Ver qué cuentas de ejemplo existen en producción (`admin@ipn.mx`, `mgarcia@ipn.mx`,
  `s.ramirez@alumno.ipn.mx` — sus contraseñas están publicadas):

  ```bash
  docker compose exec db mysql -u root -p sgec -e "SELECT id_usuario, correo_institucional, rol, activo FROM usuario WHERE correo_institucional IN ('admin@ipn.mx','mgarcia@ipn.mx','s.ramirez@alumno.ipn.mx');"
  ```

- [ ] Para cada una, decidir:
  - **Es de ejemplo y no se usa:** desactivarla (baja lógica; no se borra nada y deja de poder
    entrar en ese instante):

    ```bash
    docker compose exec db mysql -u root -p sgec -e "UPDATE usuario SET activo = FALSE WHERE correo_institucional IN ('admin@ipn.mx','mgarcia@ipn.mx','s.ramirez@alumno.ipn.mx');"
    ```

    Quita de la lista las que sí se usen.
  - **Se está usando de verdad:** cambiarle la contraseña desde Perfil. Para `admin@ipn.mx`
    también sirve `create_admin.js` con `ADMIN_EMAIL=admin@ipn.mx` y `ADMIN_ACTUALIZAR=true`.
- [ ] Confirmar que `admin@ipn.mx` con la contraseña publicada ya **no** entra.

## 6. Red

- [ ] Cerrar el puerto 3001 en el cortafuegos (`ufw deny 3001`, o en el panel del proveedor).
  Docker no pasa por `ufw`, así que la protección real es que Compose ya lo publica solo en
  `127.0.0.1`; esto es una segunda barrera.
- [ ] Comprobarlo **desde otra máquina** (tu computadora, no el servidor):
  `curl -m 5 http://<tu-dominio>:3001/api/health` debe agotar el tiempo o ser rechazado.
- [ ] Desde el servidor sí responde: `curl http://127.0.0.1:3001/api/health` → `{"status":"ok"}`

## 7. Verificación funcional en el dominio

- [ ] `/api/dashboard` responde 200: entra como Profesor y abre el Dashboard (carga con datos, sin
  mensaje de error). En las herramientas del navegador, pestaña Red, la petición `dashboard`
  devuelve 200.
- [ ] Recorrer los tres roles:
  - **Administrador:** Gestión de Profesores, Semestres, Materias, Accesos de alumnos.
  - **Profesor:** Dashboard, Materias, Alumnos, Equipos, Actividades, Bandeja de Entregas,
    Reportes (descargar PDF y Excel), Tablón.
  - **Alumno:** Mi Panel, Mis Equipos, Mis Actividades, entregar una actividad con un archivo de
    más de 1 MB, Mis Calificaciones, Tablón, Perfil.
- [ ] Zona horaria: publicar una actividad programada para dentro de 5 minutos y comprobar, con
  una cuenta de alumno, que no aparece antes y sí después. La hora de una entrega recién hecha
  coincide con la del reloj.
- [ ] Si había actividades reales creadas antes de este redeploy, revisar su fecha límite en
  pantalla: las horas se guardan tal como se escribieron y no deberían cambiar. Lo que puede
  cambiar (corregirse) es la hora mostrada de las entregas y avisos anteriores: si los
  contenedores corrían en UTC, antes se veían 6 horas adelantadas. Esto no se pudo comprobar
  sin acceso al servidor; anota lo que observes.

## 8. Límite de inicios de sesión con la IP real

- [ ] Desde tu computadora, intentar entrar 6 veces seguidas con una contraseña incorrecta. El
  sexto intento debe decir "Demasiados intentos de inicio de sesión".
- [ ] En el servidor: `docker compose logs server | grep rate-limit`. La línea debe mostrar **tu
  IP pública**, no una `172.x.x.x` (la red interna de Docker) ni `127.0.0.1`:

  ```
  [rate-limit] login: límite alcanzado para la IP <tu IP pública>
  ```

- [ ] Mientras tu IP está bloqueada, otra persona en otra red (o tu teléfono con datos móviles)
  sí puede iniciar sesión. Si también queda bloqueada, a Nginx le falta la cabecera
  `X-Forwarded-For` del paso 1. Si en el log aparece una dirección que no es la tuya,
  revisa si hay otro proxy delante (por ejemplo, un CDN): entonces `TRUST_PROXY` debe ser 2.

## 9. Certificado

- [ ] `certbot certificates` muestra la fecha de vencimiento del certificado del dominio.
- [ ] `certbot renew --dry-run` termina sin errores (la renovación automática funciona).
- [ ] **Renovar antes del 16 de noviembre de 2026.** Si la renovación automática no está activa:
  `certbot renew && systemctl reload nginx`. Deja un recordatorio en el calendario.

## 10. Al terminar

- [ ] Valorar pasar el repositorio de GitHub a **privado** (Settings → General → Danger Zone →
  Change visibility). Aun así los secretos anteriores ya se rotaron en el paso 4, que es lo que
  de verdad protege.
- [ ] Guardar el respaldo del paso 0 fuera del servidor.
- [ ] Anotar aquí la fecha y quién ejecutó el checklist: ________________________________

---

## Si algo sale mal

- **Todo responde 500 después de iniciar sesión:** falta la migración 005 (paso 3).
- **`sgec_server` se reinicia sin parar:** `docker compose logs server --tail 20`. Lo habitual es
  un `JWT_SECRET` de menos de 32 caracteres o una variable faltante en el `.env`.
- **502 en el dominio:** Nginx no alcanza los contenedores. Revisa el paso 1 (`127.0.0.1`, no
  `localhost`) y `docker compose ps`.
- **Volver atrás:** `git checkout <commit anotado en el paso 0> && docker compose up -d --build`.
  Las migraciones solo agregan columnas, así que el código anterior sigue funcionando con la
  base ya migrada. Los datos no se tocan; el respaldo del paso 0 es la última red.
