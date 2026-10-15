# SGEC — Auditoría de seguridad final (Sesión 12)

Fecha: 2026-09-17. Alcance: todo el código implementado en las Sesiones 1–11 (auth, semestres,
materias, alumnos, equipos, actividades, entregas, calificaciones, avisos, reportes) más la
configuración de despliegue (`docker-compose.yml`, `.env.production`, `DEPLOY.md`). No se
agregaron features nuevas — solo fixes de seguridad, hardening y una decisión de alcance sobre
`/admin/configuracion`.

Un apartado por punto del checklist de `CLAUDE.md` (Sesión 12), con lo que realmente se
encontró, el fix aplicado (si lo hubo) y la decisión final.

## 1. Repetir el checklist de seguridad de la auditoría inicial

Repasado contra el código real (no contra lo que decían las sesiones anteriores que habían
hecho). Resultado por control:

| Control | Estado encontrado |
|---|---|
| Contraseñas con bcrypt (`RONDAS_BCRYPT = 10`), nunca en claro | Cumple — `auth.controller.js`, `usuarios.controller.js`, `alumnos.controller.js` |
| JWT verificado en toda ruta protegida (`auth.middleware.js`) | Cumple — ninguna ruta bajo `/api/*` (salvo login/forgot-password/reset-password/health) omite `authMiddleware` |
| Autorización por rol vía `requireRole(...)`, rol siempre del JWT | Cumple — `role.middleware.js` lee `req.user.rol`, nunca `req.body.rol`/`req.query.rol` para autorizar |
| Validación de dominio de correo antes de emitir token | Cumple — `dominioValido()` se evalúa antes de tocar la base de datos en `login` |
| `JWT_SECRET` y credenciales de BD solo en `.env`, nunca versionado | Cumple — `.env` y `.env.production` están en `.gitignore`; solo `.env.example` está en git y trae placeholders |
| Multer con `limits`/`fileFilter` en las 4 rutas de archivos | Cumple (ver §3) |
| Manejador de errores global no filtra detalles en producción | Cumple (ver §4) |
| SQL parametrizado (`?` de mysql2), nunca concatenación | Cumple — se revisaron los ~130 `pool.query`/`conexion.query` de los 10 controladores; todos usan placeholders, incluyendo los `IN (?)` con arrays |
| Borrado lógico (`activo = FALSE`), nunca `DELETE` físico, salvo `materia.estatus` | Cumple en el código de la aplicación. (El único `DELETE FROM equipo_alumno` real es en `equipos.controller.js:actualizar`, y es sobre la tabla puente `equipo_alumno` al reemplazar integrantes — no sobre una entidad con historial, así que no aplica la regla de borrado lógico) |

Hallazgos nuevos de esta repetición: la contraseña de recuperación se registra en texto plano
en el log del servidor (§ "Hallazgos adicionales" más abajo), y la configuración de Docker no
pasaba todas las variables requeridas al contenedor del backend (§6).

## 2. Filtrado por propiedad del recurso

Revisado endpoint por endpoint (es, según el propio plan, "el hallazgo más importante de todo
el plan"). Patrón usado consistentemente en los 10 controladores: cada uno resuelve
`id_profesor`/`id_alumno` propio a partir de `req.user.id_usuario` (nunca de un parámetro del
cliente) y lo usa para anclar el `WHERE`, o compara el `id_profesor`/`id_alumno` del recurso ya
cargado contra ese valor propio antes de devolver 200.

| Módulo | Verificado |
|---|---|
| `materias.controller.js` | `listar`, `obtener`, `actualizar`, `desactivar` comparan `materia.id_profesor` contra el propio |
| `alumnos.controller.js` | `listar` ancla por `id_profesor` en el `WHERE`; `obtener`/`actividadesDeAlumno` exigen una materia compartida (`JOIN materia_alumno + materia WHERE m.id_profesor = ?`) |
| `equipos.controller.js` | Profesor: compara `id_profesor` del equipo/materia; Alumno: `equipo_alumno.id_alumno = propio` en listado y `SELECT 1 ... WHERE id_equipo = ? AND id_alumno = ?` en detalle |
| `actividades.controller.js` | Profesor: `id_profesor`; Alumno: inscripción en la materia + `esVisibleParaAlumno()` + pertenencia al equipo objetivo, los tres antes de responder 200 |
| `entregas.controller.js` | Profesor: `id_profesor` de la materia de la actividad; Alumno: `entrega.id_alumno = propio` en `obtener`, roster acotado a `soloIdEquipo` (nunca el roster completo de otros equipos) en `listarPorActividad` |
| `calificaciones.controller.js` | Alumno: `id_alumno = propio`; Profesor: `id_equipo` recibido se valida contra `equipo.id_profesor` antes de listar/registrar/ajustar |
| `avisos.controller.js` | Profesor: `id_profesor` propio; Alumno: subconsulta de materias inscritas + subconsulta de profesores con materia activa compartida, evaluada en cada lectura |
| `reportes.controller.js` | El primer `AND` del `WHERE` de materias es siempre `m.id_profesor = ?` resuelto server-side; los query params `?semestre=`/`?materia=` solo agregan filtros, nunca reemplazan esa condición |
| `usuarios.controller.js` | `esPropioOAdministrador()` en `obtener`/`actualizar`; `no_empleado` exige explícitamente rol Administrador |
| `semestres.controller.js` | Sin noción de propiedad (catálogo global) — correcto, no aplica |

No se encontró ningún endpoint que use un id del cliente sin verificar contra el usuario
autenticado. Verificado también en vivo (§7) con tokens reales de distintos profesores/roles.

## 3. Multer — limits y fileFilter en las 4 rutas de archivos

Las 4 rutas que reciben archivos (`alumnos.routes.js`, `actividades.routes.js`,
`entregas.routes.js`, `avisos.routes.js`) ya traían, desde las Sesiones 5/7/8/10, `limits:
{fileSize: MAX_FILE_SIZE_MB, files: N}` y un `fileFilter` por extensión + MIME. Se confirmó que
sigue así en las 4:

| Ruta | Storage | Límite de archivos | Extensiones permitidas |
|---|---|---|---|
| `POST /alumnos/importar` | memoria (nunca toca disco) | 1 | `.xlsx`, `.xls` |
| `POST /actividades` | disco, nombre aleatorio (`crypto.randomBytes`) | 10 | pdf, doc(x), ppt(x), zip, png, jpg |
| `POST /entregas` | disco, nombre aleatorio | 5 | pdf, doc(x), ppt(x), zip, rar, png, jpg + extensiones de código fuente (py/js/ts/java/c/cpp/sql/etc., el alumno entrega tareas) |
| `POST /avisos` | disco, nombre aleatorio | 5 | pdf, doc(x), ppt(x), zip, png, jpg |

Punto adicional verificado: el nombre de archivo en disco siempre se genera con
`crypto.randomBytes(8)` + timestamp (nunca el `originalname` del cliente), lo que además de
evitar colisiones elimina cualquier vector de path traversal vía nombre de archivo.

El hallazgo de npm audit de multer (severidad alta, DoS) que motivó estos límites en la Sesión 5
ya no aplica: `server/package.json` fija `multer@^2.4.0` (mayor reescritura posterior al
advisory) y `npm audit` (§5) no reporta nada sobre multer.

**Decisión:** sin cambios — el control ya estaba bien implementado.

## 4. Manejador de errores global — sin fuga de detalles en producción

`server/src/app.js` (líneas finales):

```js
app.use((err, req, res, next) => {
  console.error(err)
  const status = err.status || 500
  const message =
    status === 500 && env.nodeEnv === 'production'
      ? 'Error interno del servidor'
      : err.message || 'Error interno del servidor'
  res.status(status).json({ error: message })
})
```

Verificado por inspección y en vivo (servidor local en `NODE_ENV=development`):

- Errores 4xx (validación Joi, `res.status(4xx)` explícitos en los controladores) siempre
  devuelven su mensaje — es la intención: son mensajes controlados por la propia aplicación, no
  fugas de MySQL/stack traces.
- Un 500 real (excepción no controlada) solo se enmascara cuando `NODE_ENV=production`; en
  desarrollo se ve el mensaje real para depurar. `console.error(err)` deja el detalle completo
  en el log del servidor en ambos casos (correcto: el log no es la respuesta HTTP).
- No se logró forzar un 500 genuino con entradas maliciosas durante la prueba manual (ids fuera
  de rango, JSON malformado) — las validaciones de Joi y los `WHERE` parametrizados absorben los
  casos más obvios antes de llegar a una consulta que pudiera fallar. Buena señal, no un hueco.

**Decisión:** sin cambios — el gating es correcto tal como está.

## 5. npm audit — server y client

### server

Antes del fix:

| Paquete | Severidad | Vía | Fix disponible |
|---|---|---|---|
| `qs` | moderate (2 CVEs: bypass de array-limit, DoS por `isBuffer`) | dependencia transitiva de `express`/`body-parser` | Sí, sin breaking change |
| `body-parser` | moderate | depende de `qs` vulnerable | Sí |
| `express` | moderate | depende de `qs` vulnerable | Sí (4.22.2 → 4.22.3, dentro del rango `^4.19.2`) |
| `xlsx` (SheetJS) | **high** (prototype pollution + ReDoS) | dependencia directa | No hay fix publicado en npm |

**Acción:** `npm audit fix` (sin `--force`) resolvió las 3 vulnerabilidades moderate — bump de
parche, sin cambios de comportamiento. `xlsx` se mantiene en la decisión ya documentada
previamente en `CLAUDE.md`: es la librería que exige el README para importar Excel, no tiene fix
publicado; el uso en `excel.service.js` solo lee datos (`XLSX.read`/`sheet_to_json`) desde un
archivo subido por un Profesor autenticado, sin exponer el resultado a ejecución de fórmulas ni
a un tercero no autenticado — riesgo aceptado. Si se vuelve bloqueante, evaluar migrar al paquete
oficial servido desde cdn.sheetjs.com.

Después del fix: `1 high severity vulnerability` (solo `xlsx`, aceptado).

### client

Antes del fix:

| Paquete | Severidad | Vía | Fix disponible |
|---|---|---|---|
| `js-yaml` | **high** (CPU sin límite en merge keys) | dependencia transitiva de `eslint` (devDependency) | Sí, sin breaking change |
| `esbuild` / `vite` | moderate (el dev server acepta requests/responses de cualquier sitio) | dependencia directa de build | Solo con `--force` (Vite 8, breaking) |

**Acción:** `npm audit fix` (sin `--force`) resolvió `js-yaml` (4.3.1 → 4.3.2). Es dependencia de
`eslint`, nunca se empaqueta en el build de producción (`npm run build`) — el riesgo real era
nulo incluso antes del bump, pero el fix es gratis y sin downside.

`esbuild`/`vite` se mantiene en la decisión ya documentada en `CLAUDE.md`: el hallazgo solo
afecta al servidor de desarrollo local (`vite dev`), no al build de producción servido por Nginx
(`client/Dockerfile` construye con `npm run build` y sirve el `dist/` estático — el dev server de
Vite/esbuild no corre en el contenedor). El fix requiere saltar a Vite 8 (breaking, fuera de
alcance de un hardening sin features nuevas). Riesgo aceptado.

Después del fix: `1 moderate vulnerability` (solo `esbuild`/`vite`, aceptado, dev-only).

## 6. Variables de entorno del VPS

Tres hallazgos reales al revisar `docker-compose.yml` y `.env.production` contra lo que
`server/src/config/env.js` exige:

1. **`JWT_SECRET` sin verificación de fuerza.** `validateEnv()` solo comprobaba que la variable
   existiera, no que fuera segura — un despliegue con el placeholder de `.env.example`
   (`cambia_este_secreto_en_produccion`) arrancaría sin avisar. **Fix:** en `env.js`, si
   `NODE_ENV=production`, se rechaza el arranque (`throw`) cuando `JWT_SECRET` es exactamente
   ese placeholder o tiene menos de 32 caracteres, con un mensaje que indica cómo generar uno
   bueno. En desarrollo no se aplica (no bloquea el flujo local con secretos cortos de prueba).

2. **`docker-compose.yml` no pasaba `UPLOAD_DIR`, `MAX_FILE_SIZE_MB` ni `CLIENT_URL` al
   contenedor del backend.** Los dos primeros son variables **requeridas** por `env.js` — sin
   ellas, `validateEnv()` lanza en el arranque y el contenedor `sgec_server` nunca queda `Up`
   (crash-loop). `CLIENT_URL` es opcional pero crítica en producción: si falta, `cors({origin})`
   cae al default de desarrollo (`http://localhost:5173`) y bloquea por CORS cualquier petición
   real del dominio público — el backend "funciona" pero el frontend real no puede hablarle.
   **Fix:** se agregaron las tres variables al bloque `environment:` del servicio `server` en
   `docker-compose.yml` (`UPLOAD_DIR`/`MAX_FILE_SIZE_MB` con defaults sensatos vía
   `${VAR:-default}`, `CLIENT_URL` sin default para forzar a definirlo).

3. **`.env.production` (plantilla local, no versionada) no incluía esas mismas tres variables.**
   **Fix:** se agregaron con su documentación inline, incluyendo la advertencia de que
   `CLIENT_URL` debe ser el dominio público real.

Con estos dos fixes, `NODE_ENV=production` en `docker-compose.yml` (ya estaba correcto) más
`CLIENT_URL`/`JWT_SECRET` bien configurados dejan CORS apuntando solo al dominio real y el
backend rechazando secretos débiles — los tres puntos que pedía este ítem del checklist.

**Nota aparte (no es del alcance de `env.js`, es un archivo de runbook):** en la Sesión 12
`DEPLOY.md` incluía la dirección del VPS y las credenciales de las cuentas semilla en texto
plano. **Corregido en la Sesión 16:** `DEPLOY.md` ya no contiene ninguna dirección ni
credencial. Como el repositorio es público y esos datos siguen en su historial, se consideran
filtrados: la medida real es rotarlos (ver "Sesión 16" más abajo y
`docs/cierre/S16-checklist-manual.md`).

## 7. Prueba de penetración manual básica

Se levantó el backend localmente contra la base de datos `sgec` con seeds reales (sin modificar
datos existentes — un caso usó un registro temporal insertado y borrado en la misma prueba, ver
abajo) y se autenticó con las 3 cuentas semilla documentadas en `server/db/seeds/*.sql`
(`admin@ipn.mx`, `mgarcia@ipn.mx`, `s.ramirez@alumno.ipn.mx`) para obtener un JWT válido de cada
rol.

**Cruce de rol (token válido de un rol contra un endpoint de otro):**

| Intento | Resultado |
|---|---|
| Alumno → `GET /api/materias` (Profesor/Admin) | 403 |
| Alumno → `GET /api/alumnos?materia=X` (Profesor) | 403 |
| Alumno → `GET /api/reportes` (Profesor) | 403 |
| Alumno → `GET /api/usuarios` (Admin) | 403 |
| Profesor → `GET /api/usuarios` (Admin) | 403 |
| Profesor → `POST /api/usuarios` (Admin) | 403 |
| Administrador → `GET /api/alumnos?materia=X` (Profesor) | 403 |
| Sin token → `GET /api/materias` | 401 |
| Token inválido (`Bearer abc.def.ghi`) → `GET /api/materias` | 401 |

**IDOR (token válido del rol correcto, id de un recurso ajeno):**

| Intento | Resultado |
|---|---|
| Profesor A (`mgarcia`, `id_profesor=1`) → `GET /api/materias/3` (materia de `jlopez`, `id_profesor=2`) | 403 `"No tienes permiso para ver esta materia"` |
| Profesor A → `PATCH /api/materias/3/desactivar` (de otro profesor) | 403 |
| Profesor A → `GET /api/alumnos/999` (id inexistente) | 404, sin fuga de información |
| Alumno → `GET /api/usuarios/2` (perfil de `mgarcia`) | 403 |

**Visibilidad de actividad programada (bypass por acceso directo):** se insertó una actividad
de prueba en una materia donde el alumno semilla sí está inscrito, con `programada = TRUE` y
`fecha_publicacion` en el futuro, y se borró al terminar la prueba (no queda en el estado final
de la base):

| Intento | Resultado |
|---|---|
| Alumno → `GET /api/actividades?materia=<su materia>` | La actividad programada **no aparece** en la lista |
| Alumno → `GET /api/actividades/<id de la programada>` | 404 (no 403 — no revela que existe) |

**Manejador de errores:** JSON malformado en un POST devuelve 400 con el mensaje del parser
(esperado, es un 4xx controlado); no se logró disparar un 500 genuino con entradas hostiles
razonables (ids fuera de rango de `INT`, ids inexistentes) — las validaciones y los `WHERE`
parametrizados lo absorben antes de tocar una consulta que pudiera fallar.

**Cabeceras de seguridad (helmet):** confirmadas presentes en toda respuesta —
`Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`,
`X-Frame-Options: SAMEORIGIN`, `X-DNS-Prefetch-Control: off`.

**Resultado:** ningún caso probado permitió cruzar de rol ni acceder a un recurso ajeno. No se
encontraron vulnerabilidades de autorización en esta prueba.

**Limitación de la prueba:** solo existen credenciales en texto plano para 3 cuentas semilla (una
por rol); no se probó IDOR entre dos alumnos distintos por falta de una segunda cuenta de alumno
con contraseña conocida. Mitigante: el código de `entregas.controller.js`/`calificaciones.controller.js`
usa el mismo patrón de `id_alumno = propio` verificado exhaustivamente en el resto de módulos
(§2), así que el riesgo residual es bajo, pero queda como seguimiento si se agregan más cuentas
semilla con contraseña documentada.

## 8. `/admin/configuracion`

Se revisó su historial: existe desde que se armó el shell de navegación, nunca tuvo un endpoint
de backend propio ni se le definió alcance en ninguna de las 12 sesiones — el componente era
literalmente `<p>Módulo en construcción</p>`.

**Decisión: se retiró.** No es una de las 19 pantallas oficiales, no tiene alcance definido, y
esta sesión no agrega features nuevas — dejarla como enlace muerto en el Sidebar del
Administrador era peor que quitarla. Cambios:

- `client/src/pages/admin/Configuracion.jsx` — eliminado.
- `client/src/router/index.jsx` — eliminada la ruta `/admin/configuracion` y su import.
- `client/src/components/layout/Sidebar.jsx` — eliminado el ítem "Configuración" de la sección
  Administración (y el import de su ícono, ya sin uso).

Si en el futuro se define un alcance real (ej. gestión de `ALLOWED_EMAIL_DOMAINS` desde la UI,
parámetros de notificaciones), se vuelve a dar de alta como una pantalla nueva con su propio
endpoint y controles de rol — no como un placeholder heredado.

## Hallazgos adicionales (fuera del checklist, encontrados durante la auditoría)

> **Actualización — Sesión 13 (octubre 2026):** los dos hallazgos de esta sección quedaron
> resueltos. `email.service.js` usa nodemailer y ya no registra enlaces, tokens ni contraseñas
> (ver "Sesión 13" al final de este documento); la descarga de adjuntos existe en
> `GET /api/archivos/:tipo/:id` con verificación de propiedad. El texto original se conserva
> como registro de la auditoría de la Sesión 12.

- **`email.service.js` registra el token de recuperación de contraseña en texto plano en el log
  del servidor** (`console.log`). Es un stub reconocido en su propio comentario (no hay proveedor
  SMTP integrado en el alcance del Servicio Social); en desarrollo es el comportamiento esperado
  para poder probar el flujo. **Riesgo real solo si se despliega a producción tal cual**: quien
  tenga acceso a los logs del contenedor podría tomar el token y resetear la contraseña de
  cualquier cuenta dentro de la ventana de 1 hora de vigencia. No se cambió en esta sesión
  (integrar un proveedor SMTP real es una feature nueva, fuera de alcance), pero **no debe
  desplegarse a producción sin reemplazar `enviarCorreoRecuperacion()` por una integración real**
  (nodemailer, SES, etc.) — documentado aquí para que quede explícito antes del cierre del
  16 de octubre de 2026.
- **No hay endpoint de descarga de archivos adjuntos** (`archivo_actividad`/`archivo_entrega`/
  `archivo_aviso` se insertan con `ruta_archivo`, pero nada los sirve de vuelta). No es un
  hallazgo de seguridad — es una limitación funcional documentada en
  [ARQUITECTURA.md](./ARQUITECTURA.md#limitación-conocida-sin-descarga-de-archivos-adjuntos) —
  pero se anota aquí porque cualquier futura implementación de esa ruta debe replicar el mismo
  patrón de verificación de propiedad que el resto del sistema (el Profesor solo descarga
  adjuntos de sus propias materias; el Alumno, de actividades/entregas/avisos visibles para él).

## Resumen de cambios de esta sesión

| Archivo | Cambio |
|---|---|
| `server/package.json` / `package-lock.json` | `npm audit fix` — `qs`, `body-parser`, `express` a versiones sin CVE conocido |
| `client/package-lock.json` | `npm audit fix` — `js-yaml` a versión sin CVE conocido |
| `server/src/config/env.js` | Rechaza el arranque en `NODE_ENV=production` si `JWT_SECRET` es el placeholder o mide menos de 32 caracteres |
| `docker-compose.yml` | Agrega `UPLOAD_DIR`, `MAX_FILE_SIZE_MB`, `CLIENT_URL` al servicio `server` |
| `.env.production` (local, no versionado) | Agrega las mismas tres variables con su documentación |
| `client/src/pages/admin/Configuracion.jsx` | Eliminado |
| `client/src/router/index.jsx`, `client/src/components/layout/Sidebar.jsx` | Retirada la ruta y el enlace a `/admin/configuracion` |

## Sesión 13 — Adjuntos y acceso de alumnos

Cambios con impacto de seguridad. La evidencia de las pruebas (qué se ejecutó de verdad y qué
solo se leyó) está en [cierre/S13.md](./cierre/S13.md).

**Descarga de adjuntos (`archivos.controller.js`).**
- Autorización por recurso resuelta desde el JWT para los tres tipos (actividad, entrega, aviso);
  el Administrador no tiene acceso. Para el Alumno, el adjunto de una actividad usa la misma
  condición de visibilidad que el listado (`condicionVisibleAlumnoSQL`): una actividad programada
  aún no publicada responde 404 también por esta ruta.
- El cliente solo envía `tipo` (lista cerrada) e `id` (entero). El archivo se abre por el nombre
  almacenado en la base de datos, y la ruta resultante se valida contra `UPLOAD_DIR` con
  `path.resolve` + `path.relative`; un valor almacenado con `..`, ruta absoluta u otra unidad
  responde 404.
- `X-Content-Type-Options: nosniff`; solo PDF/PNG/JPG se sirven `inline` con su tipo real, todo lo
  demás como `application/octet-stream` + `attachment`. El nombre original (dato del usuario) va
  codificado en `Content-Disposition` (RFC 5987), sin comillas ni caracteres de control.
- Registro sin archivo en disco: 404 genérico, sin rutas del servidor.

**Contraseñas temporales.**
- Aleatorias con `crypto.randomInt` (12 caracteres de un alfabeto de 56, ~69 bits), guardadas solo
  como hash bcrypt. El texto claro sale una vez en la respuesta HTTP (`Cache-Control: no-store`) y
  no se escribe en logs ni en correos.
- Cambio obligatorio aplicado **en el servidor**, no solo en la interfaz: el JWT de una cuenta con
  contraseña temporal solo sirve para `/api/auth/*` (403 `CAMBIO_CONTRASENA_REQUERIDO` en lo demás).
- `restablecer-acceso` exige que el alumno esté inscrito en una materia **no cerrada** del profesor
  que lo pide **y que todavía no haya activado su cuenta** (`debe_cambiar_contrasena = TRUE`); en
  otro caso responde 409. El Administrador puede restablecer a cualquier alumno. Invalida los
  enlaces de recuperación pendientes y deja una línea en el log del servidor (quién, a qué alumno,
  cuándo; sin contraseñas ni correos).
- El alta de un alumno que ya existe exige que coincidan boleta **y** correo; solo lo inscribe y
  nunca sobrescribe datos de la cuenta. Boleta con otro correo (o al revés): 409.
- El transporte SMTP tiene límites de DNS, conexión, saludo y socket (10–20 s): un servidor de
  correo caído o mal configurado no deja envíos colgados. Los envíos van sin `await`, así que no
  retrasan ni tumban el alta, la importación ni "olvidé mi contraseña".

**Riesgos aceptados / a tener presentes.**
- **Corregido en la Sesión 14.** Antes, un profesor podía restablecer el acceso de cualquier
  alumno con solo inscribirlo en una materia propia. Ahora solo procede si el alumno aún no
  activó su cuenta; queda un riesgo residual acotado: mientras la cuenta siga sin activar, un
  profesor que la tenga inscrita puede regenerar la temporal (es el mecanismo previsto para
  entregar el acceso) y el restablecimiento queda en el log.
- El Administrador puede restablecer a cualquier alumno, pero **no hay pantalla para ello**: solo
  existe el endpoint. Hasta que se agregue, el camino normal de un alumno ya activado es "Olvidé
  mi contraseña", que depende de que el correo SMTP esté configurado.
- ~~Los JWT son sin estado: tras `restablecer-acceso`, un token normal que el alumno ya tuviera
  sigue siendo válido hasta expirar.~~ **Resuelto en la Sesión 16** (ver más abajo):
  `auth.middleware.js` consulta la cuenta en cada petición y rechaza los tokens anteriores al
  último cambio de contraseña.
- `nodemailer` se fijó en `10.0.10` (sin advisories en `npm audit` a la fecha; las versiones
  `<= 10.0.5` sí los tienen). Requiere Node.js 20 o superior — la imagen Docker ya usa `node:20`.

## Sesión 16 — Hardening de producción

Resumen de lo que cambió en materia de seguridad. El detalle de las pruebas está en
`docs/cierre/S16.md`; lo que debe ejecutarse en el servidor, en
`docs/cierre/S16-checklist-manual.md`.

### Sesiones y cuentas

- **Estado de la cuenta en cada petición.** `auth.middleware.js` lee la fila del usuario por su
  llave primaria en cada petición autenticada. Responde 401 si la cuenta está inactiva o ya no
  existe (`CUENTA_INACTIVA`): un usuario dado de baja pierde el acceso en ese momento, no cuando
  vence su token (hasta 8 h después).
- **Cambiar la contraseña cierra las sesiones anteriores.** La migración 005 agrega
  `usuario.contrasena_cambiada_en`; la actualizan `change-password`, `reset-password`,
  "Restablecer acceso" y `create_admin.js`. El middleware rechaza (401 `SESION_INVALIDADA`) todo
  token cuyo `iat` sea anterior. Cierra el hueco que dejó la Sesión 13 (el token de un alumno
  seguía vivo tras restablecer su acceso). Límite conocido: la comparación es por segundo, así
  que un token emitido en el mismo segundo que el cambio sigue siendo válido.
- **Nadie cambia su propio nombre por la API.** `PUT /api/usuarios/:id` es solo para
  Administrador; el usuario edita sus preferencias de notificación con `PATCH /api/usuarios/me`,
  que valida contra una lista blanca (`correo_alterno`, `notificaciones_email`).
- **Privacidad entre compañeros de equipo.** El roster que recibe un alumno ya no incluye la
  nota, los comentarios, la fecha ni los archivos de sus compañeros: solo el estatus.

### Red y límites de peticiones

- **`trust proxy`.** Antes no estaba configurado: detrás de Nginx, `req.ip` era la dirección del
  proxy, de modo que **todos los usuarios compartían el mismo contador** (5 inicios de sesión
  cada 15 minutos para todo el sistema, y cualquiera podía bloquear el acceso de los demás con
  cinco intentos fallidos). Ahora `TRUST_PROXY` (por defecto `1`) hace que el límite cuente por
  la IP real, tomada de la última dirección de `X-Forwarded-For` (la que agrega el Nginx del
  host, no una que el cliente pueda anteponer). `TRUST_PROXY=true` se rechaza al arrancar.
- **El backend ya no se publica hacia internet.** `docker-compose.yml` publica el puerto 3001
  solo en `127.0.0.1`. Docker abre sus puertos sin pasar por `ufw`, así que publicarlo en todas
  las interfaces lo dejaba alcanzable aunque el cortafuegos dijera lo contrario.

Ajustes de la revisión de S16 (commit "fix: sesión 16 - correcciones de revisión"):

- **El frontend tampoco.** El contenedor `client` se publicaba como `4000:80` en todas las
  interfaces: el sitio quedaba accesible por HTTP, sin TLS, en el puerto 4000 de la IP pública.
  Ahora es `127.0.0.1:4000:80`. El servicio `db` no publica ningún puerto.
- **Limitadores pensados para una IP compartida.** Con `trust proxy` el límite pasó a ser por IP
  pública, pero en ESCOM muchos alumnos salen por la misma IP: cinco fallos de una persona
  bloqueaban el inicio de sesión de todo el grupo. Ahora el login cuenta solo intentos
  fallidos, con clave IP + correo normalizado (5 por 15 min) y un tope por IP de 50 fallos;
  "olvidé mi contraseña" cuenta toda solicitud (su respuesta no distingue éxito de fallo) con 3
  por IP + correo y 30 por IP; y el límite general de `/api` pasó de 300 por IP a 600 por
  usuario autenticado (por IP solo sin token válido; la clave se toma del JWT con firma
  verificada, así que un token inventado cae en el contador de su IP). El log registra la IP y
  solo el dominio del correo. Verificado con 26 peticiones de prueba con `X-Forwarded-For`
  (ver `docs/cierre/S17.md`).
- **URL de la API horneada en el bundle.** `docker-compose.yml`, `client/Dockerfile` y
  `services/api.js` usan por defecto la ruta relativa `/api`. Un bundle con `localhost` hacía
  que cada navegador buscara la API en su propia máquina. CORS sigue siendo de origen único
  (`CLIENT_URL`): el servidor responde siempre con ese origen, así que el navegador rechaza
  cualquier otro.
- **Zona horaria única (UTC-06:00).** Node (`TZ=America/Mexico_City`) y cada sesión de MySQL
  (`SET time_zone = '-06:00'`) leen las fechas igual. Con los contenedores en UTC, una actividad
  programada se publicaba 6 horas antes de lo indicado y las entregas se marcaban como tardías
  6 horas antes de la fecha límite.

### Datos y secretos

- **Sin cuentas de demostración en producción.** Compose ya no carga los seeds; `run_seeds.js`
  se niega a correr con `NODE_ENV=production` salvo `SEED_DEMO=true`. El Administrador se crea
  con `server/db/create_admin.js` (contraseña de al menos 12 caracteres, nunca impresa).
- **Imágenes sin secretos.** Se agregaron `.dockerignore` en la raíz, `server/` y `client/`:
  antes, `COPY . .` metía en la imagen del servidor cualquier `server/.env`, los `node_modules`
  locales y los archivos subidos.
- **`DEPLOY.md` sin datos del servidor.** Se quitaron la dirección del VPS y las contraseñas de
  las cuentas semilla. El repositorio es público: lo que ya estuvo en el historial se considera
  conocido, y borrarlo del archivo no lo protege. Hay que **rotar**: `JWT_SECRET` nuevo,
  contraseña de la base de datos nueva y cuentas semilla desactivadas o con otra contraseña.
  Recomendación: valorar si el repositorio debe pasar a privado.

### `npm audit` (13 de octubre de 2026)

`npm audit fix` sin `--force` en ambos proyectos.

| Proyecto | Antes | Después |
|---|---|---|
| `server/` | 7 (1 crítica, 5 altas, 1 moderada) | 4 (4 altas) |
| `client/` | 6 (5 altas, 1 moderada) | 3 (2 altas, 1 moderada) |

Resueltos: en el servidor, `proxy-addr` 2.0.7 → 2.0.8 (**crítica**: falsificación de IP con
subredes de confianza IPv4 mapeadas en IPv6 — es la librería que usa `trust proxy`),
`ip-address` y `brace-expansion`; en el cliente, `axios` (contaminación de prototipos),
`brace-expansion` y `source-map-js`.

Hallazgos que quedan, con la decisión tomada:

| Paquete | Dónde | Severidad | Decisión |
|---|---|---|---|
| `xlsx` (SheetJS) | servidor y cliente | Alta (contaminación de prototipos, ReDoS) | **Aceptado.** No hay versión corregida en npm. En el servidor solo procesa archivos que sube un Profesor autenticado, limitados por tamaño y tipo. La alternativa es el paquete oficial distribuido fuera de npm (cdn.sheetjs.com); queda como trabajo futuro |
| `nodemon` → `chokidar` → `braces` | servidor, solo desarrollo | Alta (agotamiento de pila) | **Aceptado.** Es una dependencia de desarrollo: la imagen de producción instala con `npm ci --omit=dev` y no la incluye. La corrección que ofrece npm es bajar a `nodemon@1.14.10`, un cambio incompatible |
| `vite` / `esbuild` | cliente, solo desarrollo | Alta / moderada | **Aceptado.** Afectan al servidor de desarrollo de Vite, que no se usa en producción (se sirve el build estático con Nginx). La corrección exige saltar a Vite 8, un cambio incompatible que no se hace a tres días de la entrega |
