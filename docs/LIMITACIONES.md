# Limitaciones conocidas — SGEC

Documento iniciado en la Sesión 14 del plan de cierre (`PLAN-CIERRE.md`), actualizado en las
Sesiones 15 y 16 y completado en la Sesión 17 (14 de octubre de 2026). Cada punto se contrastó
con el código de esa fecha. Las secciones 1 a 6 vienen de pruebas reales de esas sesiones; de la
7 en adelante se indica en cada una cómo se comprobó.

Resumen:

| # | Limitación | Tipo |
|---|---|---|
| 1 | Una clave de materia reutilizada en otro semestre tapa a la anterior | Funcional (decisión 6) |
| 2 | Accesos de alumnos: buscador acotado y contraseñas temporales sin caducidad | Funcional / seguridad |
| 3 | Los adjuntos de una actividad no se editan después de publicarla | Funcional |
| 4 | Equipos de Práctica/Tarea anteriores a la Sesión 15 sin espejo | Datos heredados |
| 5 | Dar de baja a un alumno que está en un equipo exige rehacer el equipo | Funcional |
| 6 | Reporte: sobrantes, porcentaje sin tardías y promedio solo de lo calificado | Funcional (decisión 5) |
| 7 | Regla de integrantes: requerimiento ambiguo, pendiente de confirmar con el asesor | Requerimiento (decisión 1) |
| 8 | Arquitectura de equipos fija y sin validación de grupos en el Excel | Trabajo futuro (decisión 7) |
| 9 | Sin pruebas automatizadas | Calidad |
| 10 | Cliente sin configuración de ESLint | Calidad |
| 11 | `xlsx` (SheetJS) con CVEs sin corrección en npm | Seguridad (aceptado) |
| 12 | Bundle del frontend sin code-splitting | Rendimiento |
| 13 | Dependencias instaladas sin uso | Mantenimiento |
| 14 | Límites de peticiones en memoria de un solo proceso | Operación |
| 15 | Correo saliente nunca probado contra un servidor SMTP real | Operación |

## 1. Una clave de materia reutilizada en otro semestre tapa a la anterior

**Estado tras la Sesión 16.** El caso grave quedó corregido: un mismo profesor ya no puede tener
dos materias con la misma clave en el mismo semestre (`POST` y `PUT /api/materias` responden 409
con el mensaje "Ya tienes una materia con esa clave en este semestre; usa una clave distinta para
el otro grupo (por ejemplo, agregando el grupo al final)"). Profesores distintos sí pueden usar la
misma clave: cada uno alcanza solo la suya y sus alumnos la correcta (comprobado con sesiones de
los tres roles; ver `docs/cierre/S16.md`). Toda búsqueda por clave pasa por
`server/src/services/materias.service.js`, que la acota a quien llama.

**Qué sigue pasando.** Las pantallas de alumnos, equipos y actividades identifican la materia por
su `clave` (`/alumnos?materia=BD2026`, `/equipos?materia=…`, `/actividades?materia=…`, y el campo
`materia` del alta manual, la importación Excel y la baja de alumnos). Si un profesor **reutiliza
una clave en otro semestre** (por ejemplo, vuelve a dar de alta `BD2026` en 2026/2), esas
pantallas operan sobre la materia más reciente y la del semestre anterior deja de ser alcanzable
desde ellas (sus alumnos, equipos y actividades siguen en la base de datos; no importa el
estatus: una materia `Cerrada` más reciente también tapa a la anterior). Las rutas que reciben el
id (`/api/materias/:id`, `/api/actividades/:id`, `/api/equipos/:id`) y los reportes (que tienen
filtro por semestre) no tienen este problema.

Lo mismo aplica a los datos anteriores a la corrección: si en una base ya existían dos materias
del mismo profesor con la misma clave en el mismo semestre (era posible entre la Sesión 15 y la
16), gana la más reciente hasta que el profesor le cambie la clave a una de las dos. Editarla sin
cambiar la clave responde 409 precisamente para forzar ese cambio.

**Por qué no se corrigió del todo.** El arreglo completo es que los selectores y las URL del
cliente usen `id_materia` en lugar de la clave (unas ocho pantallas). La decisión 6 del plan de
cierre deja ese rediseño fuera del alcance. El servidor ya está preparado: todas las rutas por
clave aceptan los parámetros opcionales `semestre` e `id_materia` para elegir la materia exacta
(`docs/API.md`), pero el cliente todavía no los envía. El filtro por semestre de los selectores
(Sesión 15) solo filtra la lista que se muestra.

**Qué hacer mientras tanto.** No reutilizar una clave de un semestre a otro: incluir el periodo en
la clave (por ejemplo `BD-2026-2`), y si se imparte la misma unidad de aprendizaje a dos grupos,
agregar el grupo al final (`BD-2026-2-4CM1`).

**Qué no es una limitación.** Un alumno inscrito en dos materias con la misma clave (de dos
profesores) ve las actividades y avisos de ambas; cada fila indica su grupo. Ninguna pantalla del
alumno resuelve una materia por clave.

## 2. Accesos de alumnos: buscador acotado y contraseñas temporales sin caducidad

El Administrador ya tiene la pantalla **Accesos de alumnos** (`/admin/accesos`): busca por correo
institucional o boleta y restablece el acceso con una contraseña temporal. Lo que sigue siendo una
limitación: el buscador devuelve como máximo 10 resultados y exige al menos 3 caracteres (no es un
listado de alumnos).

**Las contraseñas temporales no caducan.** La que se genera en el alta manual, la importación o
"Restablecer acceso" sirve hasta que el alumno la cambia: no hay fecha de vencimiento (en
`usuario` solo existe el indicador `debe_cambiar_contrasena`; el login no compara fechas). Mientras
no la cambie, esa cuenta solo puede usar `/api/auth/*` y Perfil, pero quien tenga la contraseña
temporal puede activarla. Mitigación: entregar la contraseña en persona, pedir que se cambie el
mismo día y, si se filtró, restablecer el acceso de nuevo (la anterior deja de servir y sus
sesiones se cierran). Comprobado leyendo `auth.controller.js` y `schema.sql`.

## 3. Los adjuntos de una actividad no se editan después de publicarla

`PUT /api/actividades/:id` no recibe archivos. En el formulario de edición los documentos de
referencia se muestran en solo lectura. Para cambiarlos hay que desactivar la actividad y
publicarla de nuevo (lo que solo es razonable si todavía no tiene entregas).

## 4. Equipos de Práctica/Tarea creados antes de la Sesión 15 que quedaron sin espejo

Desde la Sesión 15 los equipos de Práctica y de Tarea están enlazados por `equipo.id_equipo_espejo`
y crear, editar o desactivar uno opera sobre los dos. La migración 004 enlaza los equipos que ya
existían cuando hay exactamente uno de Práctica y uno de Tarea activos con el mismo nombre en la
materia. Quedan **sin enlazar** (y el script `aplicar_004.js` los lista):

- los equipos creados con el alta manual anterior, que solo generaba una fila (un equipo de
  Práctica sin su Tarea, o al revés);
- los nombres repetidos dentro de la misma materia y tipo.

Un equipo sin espejo sigue funcionando, pero solo recibe las actividades de su propio tipo, se edita
y desactiva solo, y en el reporte aparece como una fila "Práctica" o "Tarea" por separado. La
aplicación no ofrece una acción para crearle el espejo: hay que desactivarlo y volver a crearlo
(lo razonable solo si todavía no tiene entregas).

Además, la migración enlaza por nombre sin comparar integrantes. Si las dos filas de un par tenían
integrantes distintos, `aplicar_004.js` lo reporta; al editar ese equipo ambas filas quedan con los
integrantes que se guarden.

## 5. Dar de baja a un alumno que está en un equipo exige rehacer el equipo

La baja de un alumno responde 409 si pertenece a un equipo activo de la materia. Como los equipos
tienen como mínimo 3 integrantes, el profesor debe sustituirlo por otro alumno o desactivar el
equipo antes de darlo de baja. Desde la Sesión 15 la edición manual admite 3 o 4 integrantes: un
equipo de 4 puede quedarse en 3 sin sustituir a nadie.

## 6. El reporte por tipo y los equipos de 4 integrantes

- La asignación automática siempre forma equipos de exactamente 3; los 1–2 alumnos que sobran no se
  reparten solos: el sistema muestra sus nombres y el profesor los agrega a mano a un equipo.
- El porcentaje de "actividades realizadas" del reporte se calcula por integrante (entregas o
  calificaciones recibidas entre actividades publicadas × integrantes). No distingue entregas
  tardías de entregas a tiempo.
- El promedio del reporte solo considera las actividades calificadas (decisión 5 del plan).

## 7. Regla de integrantes: requerimiento ambiguo, pendiente de confirmar (decisión 1)

**Requerimiento original** (documento del servicio social, punto 5), literal: "Elegir
aleatoriamente 3 integrantes por equipo sin que se repitan, es decir, si se eligieron 3 alumnos
para prácticas ya no pueden repetir en los otros 2 equipos."

La frase es **ambigua**: admite dos lecturas y ninguna de las dos se puede dar por oficial
mientras el asesor no lo confirme.

- **Lectura A — no repetir entre tipos.** Un alumno colocado en un equipo de Prácticas no aparece
  en los equipos de los otros dos tipos (Tarea y Proyecto).
- **Lectura B — no repetir dentro del mismo tipo.** Un alumno no aparece en dos equipos del mismo
  tipo; "los otros 2 equipos" serían los demás equipos que se forman. Es la que implementa el
  sistema hoy.

**Lo que hace el sistema hoy** (contrastado con `asignacion.service.js`,
`equipos.controller.js` y `schema.sql`, 14 de octubre de 2026):

- **Única restricción:** un alumno no puede estar en dos equipos **activos** del mismo tipo dentro
  de la misma materia, y Práctica y Tarea cuentan como un solo tipo (`tiposEspejo()`). Lo
  comprueba `idsAlumnosConEquipoDeTipo()` en el alta manual y en la edición (409 "El alumno con id
  … ya tiene un equipo de tipo … en esta materia") y la generación automática deja fuera a quien ya
  tiene equipo de ese tipo. Es una validación de la aplicación: en la base solo existe
  `UNIQUE (id_equipo, id_alumno)` (nadie repetido dentro de un mismo equipo).
- **Práctica y Tarea son el mismo equipo por diseño:** cada equipo existe como dos filas de
  `equipo` (una por tipo, mismos integrantes) enlazadas por `id_equipo_espejo`; se crean, editan y
  desactivan juntas. Las actividades En clase van a esos mismos equipos (los de Tarea).
- **Proyecto se forma aparte** y solo se valida contra otros equipos de Proyecto: un mismo alumno
  **sí puede** estar a la vez en un equipo de Práctica/Tarea y en uno de Proyecto, y nada impide
  que en Proyecto le toquen los mismos compañeros (la generación es aleatoria y no mira los equipos
  de Práctica/Tarea).
- Los equipos desactivados no cuentan, y entre materias distintas no hay restricción.

**Relación con las dos lecturas:** el sistema sigue la lectura B, con una decisión de diseño
añadida (Práctica y Tarea comparten integrantes y cuentan como un solo tipo). Con la lectura A,
quien está en un equipo de Prácticas no estaría en ningún equipo de Tarea ni de Proyecto; en el
sistema, todo alumno de un equipo de Práctica está en el equipo de Tarea gemelo y puede estar
también en uno de Proyecto, incluso con los mismos compañeros.

La decisión 1 del plan de cierre conservó el diseño actual y solo corrigió su consistencia
técnica; **queda pendiente confirmar con el asesor cuál de las dos lecturas aplica**.

**Solución propuesta (trabajo futuro):** una configuración por materia en la que el profesor
defina los tipos de equipo, el número de integrantes, si el trabajo es individual y la regla de
repetición (lectura A, lectura B u otra). Así el sistema no tendría que fijar una sola
interpretación. Exige rediseñar el modelo de datos (ver §8).

Mientras tanto, cambiar a la lectura A u otra regla fija no es menor. Tocaría, como mínimo
(lista contrastada con el código):

- `asignacion.service.js` (`tiposEspejo()`, `tipoEspejoDe()`) y, en `equipos.controller.js`, el
  alta manual, la edición, la desactivación y la generación automática.
- La migración 004 (`004_equipo_espejo.sql`, `aplicar_004.js`), que enlaza los equipos existentes,
  y los datos de demostración (`seeds/06_equipos.sql`).
- El reporte (`reportes.controller.js`, que presenta el par Práctica/Tarea como una sola fila).
- `tipoEquipoParaActividad()`, repetida en `actividades`, `entregas`, `calificaciones` y
  `alumnos.controller.js` y en `PublicarActividad.jsx` (a qué equipos va cada tipo de actividad).
- El panel del alumno (`dashboard.controller.js`) y las pantallas `ListaEquipos.jsx` y
  `DetalleEquipo.jsx` (avisos y tarjetas del espejo).

## 8. Arquitectura de equipos fija y sin validación de grupos en el Excel (decisión 7)

Fuera del alcance del cierre, documentado como trabajo futuro:

- **Tipos de equipo fijos.** Los tipos (`Practica`, `Tarea`, `Proyecto`) son un `ENUM` del
  esquema, igual para todas las materias; qué tipos comparten integrantes está fijo en el código
  (`tiposEspejo()` en `asignacion.service.js`). Una versión configurable por materia (tipos,
  cuáles comparten integrantes, trabajo individual y la regla de repetición de §7) se está
  haciendo por etapas en la rama `feature/equipos-configurables` (sin fusionar a `main`):
  - **Hecho en E1 (migración 008):** el **tamaño** es configurable por materia
    (`materia.equipo_tamano_auto`, `equipo_min`, `equipo_max`, de 1 a 10; por defecto 3 en la
    asignación automática y 3 o 4 en la manual, como antes). Solo se cambia sin equipos activos;
    el máximo también se puede ampliar con equipos activos.
  - **Guardado, sin efecto todavía:** `materia.regla_repeticion` (`B` por defecto = la regla
    actual; `A` = no repetir entre bloques) y `usa_practica`, `usa_tarea`, `usa_proyecto` (los
    tres TRUE). El formulario de materias los muestra deshabilitados ("próximamente"); el sistema
    sigue aplicando la regla B y los tres tipos en todas las materias.
  - **Pendiente:** aplicar la regla A (Etapa 1b), los tipos activos (Etapa 2) y el trabajo
    individual (Etapa 3). La lectura A "estricta" (que Práctica y Tarea tampoco compartan
    alumnos) obligaría a dejar de crear el equipo espejo y no está planeada.
- **El grupo del Excel no se valida contra la materia.** `excel.service.js` exige que la columna
  `grupo` venga llena, pero no comprueba que coincida con el grupo de la materia a la que se
  importa: un alumno de 4CM2 puede quedar inscrito en una materia de 4CM1 si así viene en el
  archivo. Comprobado leyendo `excel.service.js`.

## 9. Sin pruebas automatizadas

No hay pruebas unitarias, de integración ni de extremo a extremo: ningún `package.json` tiene un
script `test` y no hay archivos de prueba en el repositorio (comprobado con `git ls-files`). La
verificación de cada sesión se hizo con peticiones HTTP reales contra bases temporales (sus
resúmenes están en `docs/cierre/`) y la de la interfaz queda a cargo de personas con
`docs/PRUEBAS-MANUALES.md`. Cualquier cambio futuro debe volver a probarse a mano.

## 10. Cliente sin configuración de ESLint

`client/package.json` declara el script `lint` y las dependencias de ESLint 8, pero no existe un
archivo de configuración: `npm run lint` termina con "ESLint couldn't find a configuration file"
(comprobado en la Sesión 17). El servidor no tiene linter. No se agregó una configuración al
cierre porque mostraría avisos que nadie alcanzaría a revisar.

## 11. `xlsx` (SheetJS) con CVEs sin corrección en npm

`npm audit` reporta `xlsx` con severidad alta (contaminación de prototipos y ReDoS) en servidor y
cliente; npm no publica una versión corregida. Aceptado: en el servidor solo procesa archivos que
sube un Profesor autenticado, con límite de tamaño y filtro de tipo; en el cliente solo genera la
plantilla de importación (no lee archivos). La salida es migrar al paquete oficial que SheetJS
distribuye fuera de npm (cdn.sheetjs.com). Detalle y cifras: `docs/SECURITY.md`, "Sesión 17 —
estado final de `npm audit`".

## 12. Bundle del frontend sin code-splitting

`vite build` produce un único archivo JavaScript de unos 750 KB (sin comprimir) con todas las
pantallas de los tres roles, y Vite avisa que supera los 500 KB (comprobado en la Sesión 17). El
primer acceso descarga todo aunque el usuario solo use su rol. Con Nginx sirviéndolo comprimido y
en caché el efecto es tolerable; la mejora sería cargar las páginas con `React.lazy` por ruta.

## 13. Dependencias instaladas sin uso

`@tanstack/react-query` (solo se monta su `QueryClientProvider` en `main.jsx`; ninguna pantalla
usa `useQuery`) y `recharts` (ninguna importación) siguen en `client/package.json`. No afectan el
funcionamiento; se dejaron para no tocar dependencias al cierre.

## 14. Límites de peticiones en memoria de un solo proceso

Los limitadores (`utils/limitePeticiones.js`) usan el almacén en memoria por defecto de
`express-rate-limit`: los contadores se pierden al reiniciar el contenedor `server` y no se
comparten si algún día hubiera más de una instancia. Con una sola instancia, que es el despliegue
actual, es suficiente. Los valores (5 fallos de inicio de sesión por IP + correo, 50 por IP, 600
peticiones por usuario en 15 minutos) se eligieron sin datos reales de uso; si un grupo grande los
alcanza, se ajustan en ese archivo.

## 15. Correo saliente nunca probado contra un servidor SMTP real

El envío por SMTP (nodemailer) está implementado y es opcional. Se probó sin `SMTP_HOST`, con
`EMAIL_DRY_RUN=true` y con un host inválido (el flujo no se rompe ni se cuelga), pero nunca contra
un buzón real: las credenciales se configuran después en el servidor. Hasta entonces, el acceso
de los alumnos depende de la contraseña temporal que entrega el profesor.
