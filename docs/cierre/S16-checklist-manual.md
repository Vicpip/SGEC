# Sesiones 13 a 17 y E1 a E3 — Checklist manual para el servidor de producción

> **Alcance (20 de octubre de 2026).** El archivo conserva su nombre porque otros documentos lo
> referencian. Cubre el redeploy de las sesiones 13 a 17 (`main`) y, en la rama
> `feature/equipos-configurables` (sesiones E1 a E3), además la migración 008. Los pasos o
> comprobaciones que solo valen para esa rama están marcados como "(rama de equipos)". Si la
> VPS ya tiene la base de `main` y solo falta esta rama, ve a la sección "Caso: la VPS ya tiene
> S13 a S17" al final.

Lo ejecuta una persona con acceso al servidor. Nada de esto lo hizo Claude: las sesiones 16 y 17
no tocaron el servidor ni enviaron una sola petición al dominio. Revisado en la Sesión 17
(correcciones de la revisión de S16: puertos, respaldo, deriva de esquema, limitadores, cuentas
de demostración y URL de la API dentro del frontend).

Antes de empezar:

- Ten a la mano tu acceso SSH. **No escribas la dirección del servidor, contraseñas ni secretos
  en ningún archivo del repositorio** (es público).
- Hazlo en un momento sin clases en curso: entre el paso 2 y el paso 3 la aplicación responde
  con error a quien ya tenga la sesión abierta.
- Marca cada casilla al terminar. Si un paso falla, detente y revisa `docker compose logs server`.
- Ten a la mano un teléfono con datos móviles: sirve para comprobar el paso 6 desde fuera y por
  si el paso 8 te bloquea.

Todos los comandos se ejecutan dentro del servidor, en `/var/www/sgec`. Los que hablan con MySQL
usan `$MYSQL_ROOT_PASSWORD`, una variable que **ya existe dentro del contenedor `db`** (el
compose la llena con `DB_PASSWORD`). Van entre comillas simples a propósito: así la variable se
lee dentro del contenedor y la contraseña no aparece en tu terminal ni en el historial.

---

## 0. Respaldo (antes de tocar nada)

- [ ] Anotar el commit desplegado hoy, por si hay que volver atrás:

  ```bash
  cd /var/www/sgec
  git rev-parse --short HEAD          # anótalo: ______________
  ```

- [ ] Respaldar la base de datos. `-T` es obligatorio: sin él, `exec` abre una terminal virtual
  y el archivo queda corrupto (saltos de línea alterados y mensajes mezclados con el volcado):

  ```bash
  RESPALDO=~/sgec-respaldo-$(date +%F-%H%M).sql
  docker compose exec -T db sh -c 'mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines sgec' > "$RESPALDO"
  ls -lh "$RESPALDO"                  # debe pesar más de unos KB
  tail -n 1 "$RESPALDO"               # debe decir: -- Dump completed on <fecha>
  ```

  Si la última línea no es `-- Dump completed`, el respaldo está incompleto: **no sigas**. (El
  aviso "Using a password on the command line interface can be insecure" sale en pantalla, no en
  el archivo, y es normal: la contraseña nunca se escribió en tu terminal.)

- [ ] Probar que el respaldo se puede restaurar, en una base temporal. Primero confirma que el
  archivo **no** trae `USE` ni `CREATE DATABASE` (si los trajera, restaurarlo escribiría sobre
  `sgec`); el comando de arriba no los genera, pero compruébalo:

  ```bash
  grep -c -E '^(USE|CREATE DATABASE)' "$RESPALDO"      # debe imprimir 0. Si no es 0, NO restaures
  docker compose exec -T db sh -c 'mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "CREATE DATABASE sgec_restore_test"'
  docker compose exec -T db sh -c 'mysql -u root -p"$MYSQL_ROOT_PASSWORD" sgec_restore_test' < "$RESPALDO"
  docker compose exec -T db sh -c 'mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "SELECT (SELECT COUNT(*) FROM sgec.usuario) AS usuarios_sgec, (SELECT COUNT(*) FROM sgec_restore_test.usuario) AS usuarios_restaurados"'
  docker compose exec -T db sh -c 'mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "DROP DATABASE sgec_restore_test"'
  ```

  Los dos conteos deben ser iguales.

- [ ] Respaldar los archivos subidos (adjuntos de actividades, entregas y avisos). Viven en un
  volumen de Docker; su nombre real lleva delante el nombre del proyecto:

  ```bash
  docker volume ls | grep uploads     # p. ej. sgec_sgec_uploads; usa el nombre que salga
  VOL=sgec_sgec_uploads
  docker run --rm -v "$VOL":/datos:ro -v "$HOME":/respaldo alpine \
    tar czf /respaldo/sgec-uploads-$(date +%F-%H%M).tar.gz -C /datos .
  ls -lh ~/sgec-uploads-*.tar.gz
  tar tzf ~/sgec-uploads-*.tar.gz | head     # lista algunos archivos (o solo ./ si no hay)
  ```

- [ ] Copiar ambos respaldos fuera del servidor (por ejemplo con `scp` desde tu computadora).

## 1. Decidir la ruta: migrar (A) o recrear la base (B)

La base de producción se creó en agosto y no se ha migrado desde entonces. Si solo contiene datos
de ejemplo, es más seguro **recrearla** desde el `schema.sql` nuevo que migrarla.

- [ ] Contar lo que hay:

  ```bash
  docker compose exec -T db sh -c 'mysql -u root -p"$MYSQL_ROOT_PASSWORD" sgec -e "
    SELECT rol, COUNT(*) AS cuentas FROM usuario GROUP BY rol;
    SELECT correo_institucional, rol FROM usuario ORDER BY rol, correo_institucional;
    SELECT (SELECT COUNT(*) FROM materia) AS materias, (SELECT COUNT(*) FROM materia_alumno) AS inscripciones,
           (SELECT COUNT(*) FROM equipo) AS equipos, (SELECT COUNT(*) FROM actividad) AS actividades,
           (SELECT COUNT(*) FROM entrega) AS entregas, (SELECT COUNT(*) FROM calificacion) AS calificaciones,
           (SELECT COUNT(*) FROM aviso) AS avisos;"'
  ```

- [ ] Decidir:
  - **Ruta B (recrear)** solo si TODAS las cuentas son las de ejemplo (`admin@ipn.mx`,
    `mgarcia@ipn.mx`, `s.ramirez@alumno.ipn.mx` y las demás de `server/db/seeds/`) y no hay
    materias, actividades ni entregas que alguien vaya a extrañar. Sigue la sección
    "Ruta B" al final y vuelve al paso 6.
  - **Ruta A (migrar)** en cualquier otro caso, o si tienes la menor duda. Sigue en el paso 2.

## 2. Revisar el Nginx del host, actualizar el código y reconstruir

- [ ] Ver a dónde apunta hoy Nginx: `grep -n proxy_pass /etc/nginx/sites-enabled/*`
  - `/api` debe ir a `http://127.0.0.1:3001` y `/` a `http://127.0.0.1:4000`.
  - Si dice `localhost` en lugar de `127.0.0.1`, cámbialo: los contenedores ahora solo escuchan
    en `127.0.0.1` (IPv4) y `localhost` puede resolverse a IPv6.
- [ ] Comprobar que el bloque de `/api` tiene estas dos líneas (compáralo con la plantilla
  `deploy/nginx-vps.conf` del repositorio):

  ```nginx
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  client_max_body_size 200m;
  ```

  Sin la primera, todos los usuarios comparten el mismo límite de inicios de sesión. Sin la
  segunda, subir un archivo de más de 1 MB responde 413.
- [ ] Si cambiaste algo: `nginx -t && systemctl reload nginx`
- [ ] Revisar el `.env` del servidor contra `.env.production.example` (sin imprimirlo en un
  chat). Dos líneas importan especialmente:
  - `VITE_API_URL=/api` — **crítico.** Se hornea en el frontend al construir. Si vale
    `http://localhost:3001/api` o cualquier cosa con `localhost`, el sitio carga pero el inicio
    de sesión falla en todos los navegadores. Si la línea no existe, el compose usa `/api`.
    También vale `https://<tu-dominio>/api`.
  - `CLIENT_URL=https://<tu-dominio>` — exacto, sin `/` final: es el único origen que acepta
    CORS.

  Para revisarlas sin mostrar el resto: `grep -E '^(VITE_API_URL|CLIENT_URL)=' .env`
  (`TRUST_PROXY` no hace falta: vale 1 por defecto).
- [ ] Actualizar y reconstruir (el servicio del frontend se llama `client`):

  ```bash
  cd /var/www/sgec && git pull && docker compose up -d --build
  docker compose ps        # sgec_db, sgec_server y sgec_client en "Up"
  docker compose ps --format '{{.Name}} {{.Ports}}'
  ```

  En la última línea, el cliente debe decir `127.0.0.1:4000->80/tcp` y el servidor
  `127.0.0.1:3001->3001/tcp`; ninguno `0.0.0.0`. La base, sin puertos publicados.

  Si `git pull` se queja de cambios locales en `docker-compose.yml` (en el servidor se habían
  agregado los puertos a mano), descártalos: el archivo del repositorio ya trae los puertos de
  producción. `git checkout -- docker-compose.yml && git pull`.

## 3. Ruta A: aplicar las migraciones 002 a 005 y 008 — de inmediato

Regla: **aplica todas las migraciones presentes en `server/db/migrations/` que falten, en orden
numérico.** Cada `aplicar_00X.js` es independiente e idempotente y dice "no se hizo nada" si ya
estaba aplicada, así que correr de más no daña. (Las 006 y 007 pertenecen a la rama
`feature/pwa-avisos`; si esa rama también se despliega, aplícalas en su lugar numérico.)

Hasta que se aplique la 005, **toda** ruta autenticada responde 500 (se puede iniciar sesión,
pero nada más funciona). Sin la 002 fallan el alta de alumnos y el cambio de contraseña.
(Rama de equipos) Sin la 008 el inicio de sesión, el dashboard, las entregas y las
calificaciones sí funcionan, pero responden 500 todo `/api/materias` salvo desactivar (listar,
obtener, crear y editar materias), las rutas que resuelven la materia por clave (lista,
importación, alta y baja de alumnos; listado de equipos; actividades de una materia) y el alta,
la edición y la asignación automática de equipos: leen las columnas nuevas de `materia`.

- [ ] En orden. Cada script es idempotente y no borra nada:

  ```bash
  docker compose exec server node db/migrations/aplicar_002.js
  docker compose exec server node db/migrations/aplicar_003.js
  docker compose exec server node db/migrations/aplicar_004.js
  docker compose exec server node db/migrations/aplicar_005.js
  docker compose exec server node db/migrations/aplicar_008.js    # rama de equipos
  ```

- [ ] **Leer la salida de `aplicar_004`.** Lista los equipos de Práctica/Tarea que quedaron sin
  espejo y los pares con integrantes distintos. Si hay datos reales, revísalos antes de seguir
  (ver `docs/LIMITACIONES.md` §4).
- [ ] **Comparar el esquema migrado contra uno nuevo.** Las sesiones 14 a 16 probaron las
  migraciones partiendo de esquemas del repositorio, no del real de producción. Se crea una base
  `sgec_check` con el `schema.sql` del repositorio, se da al usuario de la aplicación permiso de
  solo lectura sobre ella, y se comparan. El `schema.sql` de la rama de equipos ya incluye la
  008: si la omitiste, la comparación reporta sus 7 columnas de `materia` además de las de las
  migraciones 002 a 005 (sobre el volcado de septiembre sin migrar: 14 diferencias en total, 7 más
  7). Con todas aplicadas debe dar cero:

  ```bash
  docker compose exec -T db sh -c 'mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "CREATE DATABASE sgec_check CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"'
  docker compose exec -T db sh -c 'mysql -u root -p"$MYSQL_ROOT_PASSWORD" sgec_check' < server/db/schema.sql
  docker compose exec -T db sh -c 'mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "GRANT SELECT ON sgec_check.* TO \`$MYSQL_USER\`@\`%\`"'
  docker compose exec server node db/comparar_esquema.js sgec sgec_check
  echo "código de salida: $?"
  ```

  - `Sin diferencias: los esquemas coinciden.` y código 0 → sigue.
  - Cualquier diferencia (código 1) → **NO continúes**. Guarda la salida y revísala: la base real
    no quedó como espera el código. El respaldo del paso 0 sigue siendo válido.
  - Código 2 → no pudo comparar (por ejemplo, falta el permiso del `GRANT`); revisa el mensaje.

  Al terminar, limpia:

  ```bash
  docker compose exec -T db sh -c 'mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "REVOKE SELECT ON sgec_check.* FROM \`$MYSQL_USER\`@\`%\`; DROP DATABASE sgec_check"'
  ```

- [ ] `docker compose logs server --tail 30` no muestra errores, y la línea del arranque dice
  `TZ=America/Mexico_City, trust proxy=1`.

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
  `DB_PASSWORD` en el `.env` y `docker compose up -d`. (En la ruta B esto ya quedó hecho.)
- [ ] Si alguna vez se subió al servidor una contraseña SMTP, verificar que no esté en el
  repositorio y cambiarla si lo estuvo.

## 5. Cuentas: administrador real, cuentas de demostración y retiro de las de ejemplo

- [ ] Crear el Administrador real (la contraseña no queda en el historial de la terminal; mínimo
  12 caracteres con mayúscula, minúscula y número):

  ```bash
  read -s -p "Contraseña del administrador: " ADMIN_PASSWORD; echo
  docker compose exec -e ADMIN_EMAIL=<correo>@ipn.mx -e ADMIN_PASSWORD="$ADMIN_PASSWORD" server node db/create_admin.js
  unset ADMIN_PASSWORD
  ```

- [ ] Entrar al dominio con esa cuenta y comprobar que abre Gestión de Profesores.
- [ ] **Antes de desactivar las cuentas de ejemplo**, crear cuentas de demostración propias, con
  contraseñas fuertes que no estén en ningún archivo, para poder enseñar el sistema:
  - Profesor: como Administrador, en Gestión de Profesores → alta de un profesor de
    demostración (`@ipn.mx`) con una contraseña fuerte.
  - Alumno: los alumnos los da de alta un Profesor. Entra con el profesor de demostración, crea
    una materia en el semestre activo (si no hay semestre, créalo antes como Administrador en
    Semestres) y en Alumnos da de alta un alumno de demostración (`@alumno.ipn.mx`). La pantalla
    muestra **una sola vez** su contraseña temporal: entra con ella y cámbiala por una fuerte en
    Perfil (el sistema lo exige).
  - Guarda esas contraseñas en un gestor de contraseñas, no en el repositorio.
- [ ] Ver qué cuentas de ejemplo existen en producción (`admin@ipn.mx`, `mgarcia@ipn.mx`,
  `s.ramirez@alumno.ipn.mx` — sus contraseñas están publicadas):

  ```bash
  docker compose exec -T db sh -c 'mysql -u root -p"$MYSQL_ROOT_PASSWORD" sgec -e "SELECT id_usuario, correo_institucional, rol, activo FROM usuario WHERE correo_institucional IN (\"admin@ipn.mx\",\"mgarcia@ipn.mx\",\"s.ramirez@alumno.ipn.mx\")"'
  ```

- [ ] Para cada una, decidir:
  - **Es de ejemplo y no se usa:** desactivarla (baja lógica; no se borra nada y deja de poder
    entrar en ese instante, incluso con una sesión abierta):

    ```bash
    docker compose exec -T db sh -c 'mysql -u root -p"$MYSQL_ROOT_PASSWORD" sgec -e "UPDATE usuario SET activo = FALSE WHERE correo_institucional IN (\"admin@ipn.mx\",\"mgarcia@ipn.mx\",\"s.ramirez@alumno.ipn.mx\")"'
    ```

    Quita de la lista las que sí se usen.
  - **Se está usando de verdad:** cambiarle la contraseña desde Perfil. Para `admin@ipn.mx`
    también sirve `create_admin.js` con `ADMIN_EMAIL=admin@ipn.mx` y `ADMIN_ACTUALIZAR=true`.
- [ ] Confirmar que `admin@ipn.mx` con la contraseña publicada ya **no** entra.

## 6. Red

- [ ] Cerrar los puertos 3001 y 4000 en el cortafuegos (`ufw deny 3001 && ufw deny 4000`, o en el
  panel del proveedor). Docker no pasa por `ufw`, así que la protección real es que Compose ya
  los publica solo en `127.0.0.1`; esto es una segunda barrera.
- [ ] Comprobarlo **desde otra máquina** (tu computadora o el teléfono con datos, no el servidor).
  Ambos deben agotar el tiempo o ser rechazados:

  ```bash
  curl -m 5 http://<tu-dominio>:3001/api/health
  curl -m 5 http://<tu-dominio>:4000/
  ```

- [ ] Desde el servidor sí responden: `curl http://127.0.0.1:3001/api/health` →
  `{"status":"ok"}` y `curl -sI http://127.0.0.1:4000/ | head -1` → `HTTP/1.1 200 OK`.

## 7. Verificación funcional en el dominio

- [ ] **La API se llama en el dominio, no en `localhost`.** Abre `https://<tu-dominio>` con las
  herramientas del navegador abiertas (F12), pestaña **Red**, e inicia sesión. La petición
  `login` debe ir a `https://<tu-dominio>/api/auth/login` y responder 200. Si va a
  `localhost:3001`, el frontend se construyó con un `VITE_API_URL` equivocado: corrige el `.env`
  (paso 2) y reconstruye **solo el cliente**: `docker compose up -d --build client`.
- [ ] `/api/dashboard` responde 200: entra como Profesor y abre el Dashboard (carga con datos, sin
  mensaje de error). En la pestaña Red, la petición `dashboard` devuelve 200.
- [ ] Recorrer los tres roles con `docs/PRUEBAS-MANUALES.md` (como mínimo):
  - **Administrador:** Gestión de Profesores, Semestres, Materias, Accesos de alumnos.
  - **Profesor:** Dashboard, Materias, Alumnos, Equipos, Actividades, Bandeja de Entregas,
    Reportes (descargar PDF y Excel), Tablón.
  - **Alumno:** Mi Panel, Mis Equipos, Mis Actividades, entregar una actividad con un archivo de
    más de 1 MB, Mis Calificaciones, Tablón, Perfil.
- [ ] (Rama de equipos) Recorrer el bloque E de `docs/PRUEBAS-MANUALES.md` (E1 a E13): formulario
  de configuración de la materia, equipos de otro tamaño, regla de repetición, bloqueo con
  equipos activos, lo que ve el alumno y el diálogo de desactivar equipo. El recorrido de interfaz
  ya hecho con datos de demostración está en `docs/cierre/E-recorrido.md`; esto lo repite en el
  servidor real. Si Materias o Equipos responden 500, falta la 008.
- [ ] Zona horaria: publicar una actividad programada para dentro de 5 minutos y comprobar, con
  una cuenta de alumno, que no aparece antes y sí después. La hora de una entrega recién hecha
  coincide con la del reloj.
- [ ] Si había actividades reales creadas antes de este redeploy, revisar su fecha límite en
  pantalla: las horas se guardan tal como se escribieron y no deberían cambiar. Lo que puede
  cambiar (corregirse) es la hora mostrada de las entregas y avisos anteriores: si los
  contenedores corrían en UTC, antes se veían 6 horas adelantadas. Esto no se pudo comprobar
  sin acceso al servidor; anota lo que observes.

## 8. Límite de inicios de sesión con la IP real — hazlo al final

Este paso bloquea, durante 15 minutos y **desde tu IP**, el correo con el que lo pruebes. Usa un
correo inventado (no el de una cuenta real) y déjalo para el final. Si algo sale distinto de lo
esperado y te quedas sin poder entrar, usa el teléfono con datos móviles (otra IP) mientras pasa
la ventana.

- [ ] Desde tu computadora, intentar entrar **6 veces seguidas con el MISMO correo inventado**
  (por ejemplo `prueba-limite@ipn.mx`, rol Profesor) y cualquier contraseña. Los cinco primeros
  dicen "Correo o contraseña incorrectos"; el sexto, "Demasiados intentos de inicio de sesión".
- [ ] Inmediatamente después, desde la misma computadora, entrar con tu cuenta real: **debe
  funcionar**. El límite es por IP + correo, así que bloquear un correo no bloquea a los demás
  usuarios que salen por la misma IP (un salón de ESCOM, por ejemplo).
- [ ] En el servidor: `docker compose logs server | grep rate-limit`. La línea debe mostrar **tu
  IP pública**, no una `172.x.x.x` (la red interna de Docker) ni `127.0.0.1`:

  ```
  [rate-limit] login: límite alcanzado para la IP <tu IP pública> (correo @ipn.mx)
  ```

- [ ] Si en el log aparece `172.x.x.x` o `127.0.0.1`, a Nginx le falta la cabecera
  `X-Forwarded-For` del paso 2. Si aparece una dirección que no es la tuya, revisa si hay otro
  proxy delante (por ejemplo, un CDN): entonces `TRUST_PROXY` debe ser 2.

Valores de referencia (ventanas de 15 minutos): inicio de sesión, 5 fallos por IP + correo y 50
fallos por IP; "olvidé mi contraseña", 3 solicitudes por IP + correo y 30 por IP; resto de la
API, 600 peticiones por usuario (o por IP sin sesión).

## 9. Certificado

- [ ] `certbot certificates` muestra la fecha de vencimiento del certificado del dominio.
- [ ] `certbot renew --dry-run` termina sin errores (la renovación automática funciona).
- [ ] **Renovar antes del 16 de noviembre de 2026.** Si la renovación automática no está activa:
  `certbot renew && systemctl reload nginx`. Deja un recordatorio en el calendario.

## 10. Al terminar

- [ ] Valorar pasar el repositorio de GitHub a **privado** (Settings → General → Danger Zone →
  Change visibility). Aun así los secretos anteriores ya se rotaron en el paso 4, que es lo que
  de verdad protege.
- [ ] Guardar los respaldos del paso 0 fuera del servidor.
- [ ] Anotar aquí la fecha, la ruta elegida (A o B) y quién ejecutó el checklist:
  ________________________________

---

## Ruta B: recrear la base desde cero (solo si el paso 1 lo permite)

Sustituye los pasos 2 (solo la parte de reconstruir), 3 y la rotación de la contraseña de MySQL
del paso 4. Se elimina **únicamente el volumen de la base de datos**; el de archivos subidos no
se toca (sus archivos de ejemplo quedan huérfanos, sin efecto). El respaldo del paso 0 es la
forma de volver atrás.

- [ ] Haz primero la revisión de Nginx y del `.env` del paso 2 (sin reconstruir todavía).
- [ ] En el `.env`, pon desde ya un `DB_PASSWORD` nuevo (`openssl rand -base64 24`) y un
  `JWT_SECRET` nuevo (`openssl rand -base64 48`): el volumen nuevo se inicializa con esa
  contraseña, así que no hará falta el `ALTER USER` del paso 4. `chmod 600 .env`.
- [ ] Actualizar el código y confirmar que el compose monta el esquema en la inicialización:

  ```bash
  git pull
  docker compose config | grep docker-entrypoint-initdb.d
  # debe mostrar: target: /docker-entrypoint-initdb.d/01_schema.sql
  ```

- [ ] Ver el nombre exacto del volumen de la base y eliminarlo:

  ```bash
  docker volume ls | grep db_data     # p. ej. sgec_sgec_db_data
  docker compose down                 # detiene y quita los contenedores; NO borra volúmenes
  docker volume rm sgec_sgec_db_data  # usa el nombre que salió arriba; NO el de uploads
  docker compose up -d --build
  docker compose ps                   # esperar a que sgec_db diga "healthy"
  ```

  Nunca uses `docker compose down -v`: borraría también el volumen de archivos subidos.
- [ ] La base nueva ya tiene el esquema completo (migraciones incluidas). Comprobarlo:
  `docker compose exec -T db sh -c 'mysql -u root -p"$MYSQL_ROOT_PASSWORD" sgec -e "SHOW TABLES"'`
  lista 16 tablas, y `aplicar_005.js` y `aplicar_008.js` (`docker compose exec server node
  db/migrations/aplicar_00X.js`) dicen que las columnas ya existen.
- [ ] Revisar los puertos como en el paso 2 (`docker compose ps --format ...`).
- [ ] Crear el Administrador real con `create_admin.js` (paso 5) y las cuentas de demostración.
  No hay cuentas de ejemplo que desactivar.
- [ ] Sigue en el paso 6.

---

## Caso: la VPS ya tiene S13 a S17 y solo falta la rama de equipos

La base ya tiene las migraciones 002 a 005. El orden mínimo (los pasos de arriba tienen los
comandos completos; aquí no se repiten secretos ni cuentas):

- [ ] Paso 0: anotar el commit actual y respaldar base y archivos subidos.
- [ ] Paso 2: `cd /var/www/sgec && git pull && docker compose up -d --build` (revisa
  `docker compose ps`). La rama de equipos queda en el código; hasta el siguiente punto, Materias
  y Equipos responden 500.
- [ ] `docker compose exec server node db/migrations/aplicar_008.js` (si el commit trae
  alguna migración más, aplícala también, en orden numérico).
- [ ] Paso 3: comparar el esquema contra `sgec_check` (cero diferencias) y limpiar.
- [ ] Paso 7: `/api/dashboard` en 200, Materias y Equipos cargan, y el bloque E de
  `docs/PRUEBAS-MANUALES.md`.

---

## Si algo sale mal

- **Todo responde 500 después de iniciar sesión:** falta la migración 005 (paso 3).
- **Entro bien, pero Materias, Alumnos de una materia, Equipos o Actividades dan 500 (el
  Dashboard y las entregas sí cargan):** falta la migración 008 de la rama de equipos. Aplica
  `docker compose exec server node db/migrations/aplicar_008.js` y repite la comparación de
  esquema del paso 3.
- **El inicio de sesión falla en todos los navegadores y la pestaña Red muestra `localhost`:**
  `VITE_API_URL` equivocado; corrige el `.env` y `docker compose up -d --build client` (paso 7).
- **`sgec_server` se reinicia sin parar:** `docker compose logs server --tail 20`. Lo habitual es
  un `JWT_SECRET` de menos de 32 caracteres o una variable faltante en el `.env`.
- **502 en el dominio:** Nginx no alcanza los contenedores. Revisa el paso 2 (`127.0.0.1`, no
  `localhost`) y `docker compose ps`.
- **Volver atrás:** `git checkout <commit anotado en el paso 0> && docker compose up -d --build`.
  Las migraciones solo agregan columnas, así que el código anterior sigue funcionando con la
  base ya migrada. Los datos no se tocan; el respaldo del paso 0 es la última red. Antes del
  siguiente `git pull`, regresa a la rama que sigue el servidor (p. ej. `git checkout main`) (con un commit suelto, `git pull`
  falla).
- **Restaurar el respaldo** (último recurso; reemplaza los datos actuales de `sgec`):
  `docker compose exec -T db sh -c 'mysql -u root -p"$MYSQL_ROOT_PASSWORD" sgec' < ~/sgec-respaldo-<fecha>.sql`
