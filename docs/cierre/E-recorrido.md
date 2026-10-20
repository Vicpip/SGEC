# Recorrido de interfaz E1–E12 (equipos configurables)

Fecha: 19 de octubre de 2026. Rama `feature/equipos-configurables`, HEAD `52323ba`. Recorrido en un
navegador real (Chrome, con Claude in Chrome) de las pantallas de las sesiones E1 y E2, que hasta
ahora solo se habían probado por la API. **No se corrigió código**: este documento solo reporta.

Nada de este recorrido tocó producción ni el dominio. No se ejecutó `docker compose`, no se leyó
ni imprimió ningún `.env`, no se hizo push y no se modificaron código, seeds, migraciones ni
documentos de otras sesiones. No se tocaron la base `sgec` ni las temporales de otras sesiones.

## Entorno

- Base nueva `sgec_e2e_tmp`: `schema.sql` + `run_seeds.js` con `SEED_DEMO=true` (los 12 seeds sin
  errores).
- Servidor: `node server.js` en el puerto 3114 con `DB_NAME=sgec_e2e_tmp`, `EMAIL_DRY_RUN=true`,
  `SMTP_HOST` vacío, un `JWT_SECRET` desechable, `UPLOAD_DIR` en el directorio temporal de la
  sesión y `CLIENT_URL=http://localhost:5199` (para CORS). `GET /api/health` → `{"status":"ok"}`
  antes de abrir el navegador.
- Cliente: Vite en el puerto 5199 con `VITE_API_URL=http://localhost:3114/api` en el entorno (el
  proxy de `vite.config.js` apunta fijo a 3001 y no se tocó).
- Al terminar se detuvieron el servidor y Vite (los dos puertos quedaron libres).
- Cuentas: `mgarcia@ipn.mx`, `admin@ipn.mx` (contraseñas de los seeds) y alumnos de prueba nuevos.
  Las contraseñas no se escriben aquí.
- La entrada fue siempre por `/login` (pantalla 01), por primera vez en el navegador. Profesor y
  Administrador entran por la pestaña "Profesor".

### Datos de prueba

| Dato | Cómo se creó |
|---|---|
| `E2EA` "Prueba Regla A", 4/4/5, regla A | **Interfaz**, "Nueva materia" (el camino de creación) |
| 10 alumnos en E2EA (101–110) | 9 por API (`POST /alumnos`) y el 110 por **interfaz** (pantalla de contraseña temporal) |
| Práctica de E2EA | **Interfaz**, "Generar equipos": Equipo 1 y Equipo 2, de 4, con gemelo de Tarea; sobrantes 103 y 104 |
| 3 alumnos inscritos **después** de generar (111, 112, 113) | Por API |
| "Proyecto Alfa" (103, 104, 111, 112) | **Interfaz**, Crear Equipo |
| `E2EB` "Prueba Regla B", 3/3/4, B, 6 alumnos (201–206) | Por API; equipo de Práctica (201–203) por API; "B Proyecto 1" (201–204) por **interfaz** |
| `E2EC` "Prueba Cambio Regla", sin equipos | Por API, en B; el cambio a A por **interfaz** (E8) |
| Actividades de E2EA: Práctica, Proyecto, En clase y Tarea "para todos" y una de Práctica para el Equipo 1 | La primera por **interfaz** (pantalla 15); las demás por API |
| Actividades de E2EB: Práctica y Proyecto "para todos" | Por API |
| Contraseña del 110 | Cambio obligatorio en el primer inicio de sesión, por **interfaz** |
| Contraseñas de 102, 103, 113, 201 y 205 | Cambiadas por API (`PATCH /auth/change-password`) para poder entrar |
| Entrega del 110 y calificación grupal (9) | **Interfaz** (pantalla 17 y Bandeja); entregas del 201 en E2EB, por API |
| Desactivar Equipo 1 de E2EA | **Interfaz**, Detalle del Equipo (ConfirmDialog de React, no un diálogo nativo) |
| BD2026 | Solo se cambió el nombre a "Bases de Datos E2E" (prueba 2) |

## Resultados

Resumen: **27 pasos — 22 OK, 3 fallas, 2 no verificados.**

| Paso | Resultado | Nota |
|---|---|---|
| E1. Formulario de materias | OK | Sección plegada con "(equipos de 3; de 3 a 4 integrantes)"; 3/3/4; regla habilitada en B con texto de ayuda; los tres tipos marcados, deshabilitados y "(próximamente)". El Administrador no ve la sección (comprobado en el DOM). |
| E2. Validación en el formulario | OK | Mínimo 5 con tamaño 3: no se envía nada a la red, la sección se abre y aparece el mensaje. Máximo 11: lo bloquea el navegador ("El valor debe ser menor de o igual a 10"), sin petición. Ver H6. |
| E3. Tamaño 4 y generar | OK | E2EA creada en 4/4/5 (201). "Generar equipos" de Práctica: 2 equipos de 4, cada uno con su gemelo de Tarea; el aviso nombra a los 2 sobrantes y dice "forma equipos de 4 … un equipo admite hasta 5 integrantes". |
| E4. Crear equipo | OK | "(mínimo 4, máximo 5)"; con 3 elegidos el botón queda deshabilitado; "Asignar aleatoriamente" elige 4 (al azar, comprobado en 3 clics); el texto dice "Selecciona 4 o 5…". El límite superior se comprobó en E2EB (máx. 4: no deja marcar un 5.º), porque en E2EA solo había 5 alumnos disponibles. |
| E5. Editar equipo | OK | "Elige 4 o 5 alumnos"; con 3 el botón "Guardar cambios" queda deshabilitado; con 5 se habilita. |
| E5b. "No deja pasar de 5" en Detalle | No verificado | No había un 6.º alumno elegible en el bloque. La misma lógica se vio en Crear Equipo (E4). |
| E6. Cambiar la configuración con equipos | OK | Aviso de equipos activos; tamaño, mínimo y regla deshabilitados. Máximo 5→6: `PUT` 200. Bajarlo a 5: el navegador lo impide ("…mayor de o igual a 6") y no sale ninguna petición. |
| E7. Materias anteriores (BD2026) | OK | 3/3/4/B; con equipos activos tamaño, mínimo y regla deshabilitados y el máximo con `min=4`; la Lista de Equipos se ve igual que antes. |
| E8. Elegir la regla A | OK | E2EC (sin equipos) B→A: `PUT` 200; al reabrir, el resumen termina en "; sin repetir entre bloques" y el selector conserva A (habilitado). |
| E9. Crear equipo con la regla A | OK | En Proyecto no aparecen los 8 alumnos de Práctica/Tarea y se añade el texto de la regla; tras crear Proyecto Alfa, en Práctica y en Tarea tampoco aparecen sus 4 integrantes. Sin nadie disponible, el aviso dice "…todos ya tienen equipo de Práctica/Tarea o de Proyecto, y la regla de la materia no permite estar en ambos." |
| E10. Editar equipo con la regla A | OK | Aparece el aviso de la regla; la lista trae a los integrantes propios y al único libre (113), no a los de Proyecto Alfa ni a los del otro equipo de Práctica. |
| E11. Regla bloqueada con equipos | OK | Selector deshabilitado; el aviso dice "…desactívalos para cambiar el tamaño, el mínimo o la regla de repetición. El máximo solo se puede ampliar." |
| E12. Lo que ve el alumno | OK | Ver pasos 8 a 10. |
| 1. Nueva materia | OK | Igual que E1 y E2. |
| 2. Editar BD2026 con equipos | OK | Campos bloqueados como en E7; cambiar solo el nombre → `PUT` 200, sin 409. |
| 3. Materia 4/4/5 en A y generar | OK | Igual que E3. |
| 4. Crear Equipo manual | OK | El texto dice "(mínimo 4, máximo 5)" y "Selecciona 4 o 5…", como pide E4 (no dice literalmente "entre 4 y 5"). |
| 5. Elegibles según la regla | OK | En A, como E9 y E10. En B (E2EB), Crear Equipo de Proyecto lista a los 6 alumnos, incluidos los 3 de Práctica, y el equipo con 201–204 se creó (201). |
| 6. Texto de ayuda de la regla | Falla | No explica bien la visibilidad. Ver H3. |
| 7. Reportes B y A | Falla | El PDF, el Excel, `GET /api/reportes` y la pantalla coinciden entre sí en las dos materias, pero no con la Bandeja en una actividad calificada. Ver H1. |
| 8. A: cada bloque ve lo suyo | OK | 110 (Práctica/Tarea): panel y Mis actividades con Práctica, En clase, Tarea y la específica, sin la de Proyecto; abrir la de Proyecto por URL → 403 con mensaje en pantalla. 103 (Proyecto): solo la de Proyecto; abrir la de Práctica → 403. Ver H9. |
| 9. Alumno inscrito sin equipo | OK | 113: panel con 0 equipos y 0 actividades, Mis actividades y Mis equipos con estado vacío; sin errores ni pantalla en blanco. Ver H8. |
| 10. Equipo desactivado | OK | 102: 0 actividades en el panel y en el listado; abrir la específica → 403 "No tienes permiso para ver esta actividad" (no puede entregar); "Mis calificaciones" conserva el 9.0. Ver H5. |
| T1. Sin 500 ni errores de consola | OK | Ninguna respuesta 500 en la pestaña de red ni en el log del servidor; ningún error ni advertencia en la consola. Los 403 vistos son los esperados. |
| T2. Ninguna petición a `localhost:3001` | OK | Todas las peticiones fueron a `localhost:3114`. |
| T3. Pantallas a 390 px | Falla | Desborde en Lista de Alumnos y, leve, en Detalle del Equipo. Ver H2 y H4. |
| PDF descargado (vista) | No verificado | Ver "Lo que no se pudo verificar". |

### Cifras del paso 7

Antes de desactivar el Equipo 1 (actividades de E2EA: Práctica, En clase y Tarea "para todos",
Proyecto "para todos" y la específica del Equipo 1 con 1 entrega y nota grupal 9):

| Fuente | E2EA | E2EB |
|---|---|---|
| Pantalla de Reportes | 3 equipos, 13 integrantes, promedio 9, 11 % realizadas; Equipo 1 25 % (4/16), Equipo 2 0 % (0/15), Proyecto Alfa 0 % (0/4) | 2 equipos, 4 integrantes, sin promedio; B Practica 1 33 % (1/3), B Proyecto 1 25 % (1/4), 29 % general |
| `GET /api/reportes` (JSON) | `pares_total` 35, `pares_realizados` 4, 11 % | `pares_total` 7, `pares_realizados` 2, 29 % |
| Excel (hojas Reporte y Actividades) | Igual; "Entregas realizadas" = **4** en "E2E Practica Equipo 1" | Igual; 1 de 3 y 1 de 4 |
| PDF (texto extraído) | Igual; "4 de 4" en la actividad específica; "11% (4 de 35 por integrante)" | Igual; "29% (2 de 7 por integrante)" |
| Bandeja de Entregas | "E2E Practica Equipo 1": **"1 de 4 entregas recibidas · 1 calificadas · 3 pendientes"**, con 9.0 en los 4 integrantes | "1 de 3 entregas recibidas · 0 calificadas · 2 pendientes" y "1 de 4 …": coincide |

Con la regla A, el denominador del reporte respeta la visibilidad: el Equipo 2 suma 3 actividades
por integrante (no la específica del Equipo 1) y Proyecto Alfa 1.

## Hallazgos

| # | Gravedad | Pantalla / paso | Esperado | Visto | Archivo probable | Evidencia |
|---|---|---|---|---|---|---|
| H1 | Media | Bandeja de Entregas (16) frente a Reportes (14), paso 7 | Que las dos pantallas den la misma cifra para la misma actividad | Con una sola entrega y la nota grupal registrada para el equipo, la Bandeja dice "1 de 4 entregas recibidas · **1 calificadas · 3 pendientes**", aunque muestra 9.0 en los 4 integrantes. El reporte (pantalla, PDF y Excel) dice "4 de 4" realizadas, y la columna del Excel se llama "**Entregas** realizadas" con valor 4. Son dos definiciones distintas (la Bandeja cuenta entregas con estatus "Calificada"; el reporte cuenta "entrega recibida o calificación registrada", como dice su nota) y la etiqueta del Excel contradice a la Bandeja. | `client/src/pages/actividades/BandejaEntregas.jsx` (≈200 y 511); `server/src/services/reporte.service.js` (≈235, etiqueta) | `h-bandeja-1-calificada-vs-4-notas.jpg`, `reporte_E2EA.xlsx`, `reporte_E2EA.json` |
| H2 | Media | Lista de Alumnos (07), transversal 390 px | Sin desplazamiento horizontal | Los botones de la barra superior ("Descargar plantilla", "Importar", "+ Alumno") miden hasta 458 px en un ancho útil de 375: la página se desplaza a los lados, "+ Alumno" queda cortado y el título desaparece | `client/src/pages/alumnos/ListaAlumnos.jsx` (acciones de la barra superior) o los estilos de `.topbar-right` en `client/src/index.css` | `h-alumnos-390-desborde.png` |
| H3 | Media | Formulario de materias, texto de ayuda de la regla (paso 6) | Que diga con claridad que con A un alumno solo ve las actividades de su bloque | Dice "…las actividades de Proyecto solo las ven los alumnos con equipo de Proyecto". No dice lo inverso (con A, quien está en Proyecto no ve Práctica, Tarea ni En clase), y lo presenta como efecto de "la segunda opción", aunque esa visibilidad aplica con las dos reglas (E2, cambio 1). Propuesta: "Con la segunda opción cada alumno pertenece a un solo bloque y solo ve las actividades de ese bloque: Práctica, Tarea y En clase, o Proyecto. Con cualquiera de las dos, un alumno sin equipo de un tipo no ve las actividades de ese tipo." | `client/src/pages/materias/ListaMaterias.jsx` (≈313) | `h-texto-ayuda-regla.png` |
| H4 | Baja | Detalle del Equipo (06), 390 px | Sin desborde | La barra superior (Volver, Editar, Desactivar, avatar) mide 389 px en 375: el avatar queda cortado y hay un desplazamiento horizontal de 14 px | `client/src/pages/equipos/DetalleEquipo.jsx` (acciones de la barra superior) | `h-detalle-equipo-390-topbar.png` |
| H5 | Baja | Mis Calificaciones (alumno), paso 10 | La nota conservada, atribuida a su equipo | La nota de la actividad del equipo desactivado aparece agrupada como "**Sin equipo asignado**", aunque se obtuvo en el Equipo 1. El dato se conserva, pero la etiqueta es confusa | `client/src/pages/alumno/MisCalificaciones.jsx:58` (`equipo_nombre ?? 'Sin equipo asignado'`); `equipo_nombre` llega nulo desde `server/src/controllers/calificaciones.controller.js` (≈233) | `h-mis-calificaciones-sin-equipo.jpg` |
| H6 | Baja | Formulario de materias, E2 | Resumen coherente; mensaje que desaparece al corregir | Con valores inválidos el resumen dice "(equipos de 3; **de 5 a 4** integrantes)". El mensaje rojo de configuración sigue visible después de corregir los valores, hasta volver a guardar | `client/src/pages/materias/ListaMaterias.jsx` | — |
| H7 | Baja | Crear Equipo (05) | Explicar por qué no se puede asignar | Con 1 alumno disponible y mínimo 4, "Asignar aleatoriamente" y "Crear equipo" quedan deshabilitados sin ningún mensaje (el de "no hay alumnos" solo sale con 0) | `client/src/pages/equipos/CrearEquipo.jsx` | — |
| H8 | Baja | Mis Actividades (alumno), paso 9 | Un texto que no contradiga lo que hace el sistema | Con actividades publicadas en su materia pero ninguna dirigida a él, el estado vacío dice "Aún no tienes actividades publicadas en tus materias". Mejor: "…dirigidas a tus equipos" | `client/src/pages/alumno/MisActividades.jsx:212` | — |
| H9 | Baja | Entregar Actividad (17), pasos 8 y 10 | Un mismo mensaje para el mismo caso | Al abrir por URL una actividad no dirigida, el mensaje varía entre "No perteneces a un equipo asignado a esta actividad" (110 → Proyecto) y "No tienes permiso para ver esta actividad" (103 → Práctica, 102 → específica). Depende de cuál de las dos peticiones paralelas (`GET /actividades/:id` y `GET /entregas/actividad/:id`, ambas 403) se muestre | `client/src/pages/actividades/EntregarActividad.jsx` | — |
| H10 | Baja | Diálogo "Desactivar equipo" (06 y 04) | Texto exacto para la regla A | Dice que los integrantes "volverán a estar disponibles para otro equipo de ese tipo"; con la regla A también quedan disponibles para el otro bloque | `client/src/pages/equipos/DetalleEquipo.jsx:399`, `ListaEquipos.jsx:317` | — |
| H11 | Baja | Lista de Materias (03) | El mismo número de equipos que en Reportes | La columna "Equipos" cuenta filas: E2EA muestra 5 (2 Práctica + 2 Tarea + 1 Proyecto) y E2EB 3, mientras Reportes dice 3 y 2. Probablemente ya ocurría antes de E1 (BD2026 muestra 6) | Consulta de `GET /materias` en `server/src/controllers/materias.controller.js` | — |
| H12 | Baja | Formulario de materias, 390 px | Opción legible | El selector de regla trunca el texto ("No repetir dentro del mismo tipo (Práctica…"); la opción A es aún más larga. No desborda la página | `client/src/pages/materias/ListaMaterias.jsx` | — |

Observaciones que no cuentan como hallazgo:

- Después de registrar la nota grupal, el encabezado del equipo en la Bandeja sigue en "En revisión"
  (hay 3 integrantes sin entrega). Coherente con la regla de estatus por entrega.
- En la pantalla 17, la entrega recién creada se rotula "Entregado", mientras la base guarda
  'En revision'. Es una etiqueta de la interfaz, no de E1/E2.
- La nota grupal se aplica también a los integrantes que no entregaron (regla de calificación
  grupal por defecto).

## Lo que no se pudo verificar y por qué

- **Vista del PDF.** El navegador del recorrido no abre `file://` ni el visor de PDF de Chrome.
  La descarga desde la pantalla respondió 200 (`application/pdf`); los PDF se volvieron a bajar
  por API y su texto se extrajo con un script (fuentes estándar, sin incrustar): las cifras
  coinciden. **No se vio la maquetación** (cortes de página, columnas, acentos impresos).
- **Excel abierto en una hoja de cálculo.** Se leyó con la biblioteca `xlsx` del propio servidor
  (las dos hojas, todas las filas), no en Excel ni LibreOffice; tampoco se vio el formato.
- **Ancho real de 390 px.** `resize_window` no cambió la ventana (maximizada). Se midió cargando
  cada pantalla en un `iframe` de 390 px del mismo origen (ancho útil 371–390 px según la barra de
  desplazamiento), con datos reales: profesor (Dashboard, Materias con el formulario y la sección
  abiertos, Lista de Equipos, Crear Equipo, Detalle del Equipo, Lista de Alumnos, Actividades,
  Bandeja y Reportes) y alumno (panel, Mis actividades, Mis equipos, Mis calificaciones, Tablón y
  Perfil). No es un dispositivo emulado: el `devicePixelRatio`, el teclado táctil y los
  `select` nativos de un teléfono no se probaron. Las pantallas de alumno se midieron con el
  alumno sin equipo (113), con poco contenido.
- **E5b**: no había un sexto alumno elegible para intentar pasar de 5 en Detalle del Equipo.
- **El 409 de configuración desde la interfaz**: el navegador nunca deja enviar los valores
  bloqueados (E6), así que no se pudo ver cómo muestra la pantalla un 409 real.
- **Cambio obligatorio de contraseña**: se hizo por interfaz solo con el alumno 110; los otros
  cinco se cambiaron por API para ahorrar tiempo.
- Un gestor de contraseñas instalado en Chrome abre un marco sobre el campo de correo y bloquea
  las acciones automáticas. En varios inicios de sesión los campos se llenaron con `form_input` en
  lugar de teclearlos. No afecta al resultado, pero no se probó el tecleo real en todos.

## Capturas (solo en el directorio temporal de la sesión, fuera del repositorio)

`h-bandeja-1-calificada-vs-4-notas.jpg`, `h-alumnos-390-desborde.png`, `h-texto-ayuda-regla.png`,
`h-detalle-equipo-390-topbar.png`, `h-mis-calificaciones-sin-equipo.jpg`, `reporte_E2EA.xlsx`,
`reporte_E2EA.json`. No se grabó GIF.

## Bases temporales para borrado manual

El entorno de Claude bloquea `DROP`. De este recorrido queda **`sgec_e2e_tmp`**. Siguen pendientes
las anteriores: de E1, `sgec_eq_tmp`, `sgec_eq_sep` y `sgec_eq_parcial`; de E2, `sgec_e2_tmp` y
`sgec_e2_old`; y las de S16 y S17 que lista `CLAUDE.md`. La base `sgec` no se borra.

## Correcciones

Fecha: 20 de octubre de 2026. Misma rama, partiendo de `2f10392`. Sin producción, sin dominio, sin
`docker compose`, sin leer `.env`, sin push; no se tocaron migraciones, seeds, la base `sgec` ni las
temporales de otras sesiones.

| Hallazgo | Qué se cambió | Cómo se verificó | Pendiente |
|---|---|---|---|
| H1 | `BandejaEntregas.jsx`: `realizadoIntegrante` (entrega distinta de Pendiente o calificación registrada) y `calificadoIntegrante` (calificación registrada o estatus Calificada) alimentan el resumen ("N de M actividades realizadas · C calificadas · P pendientes"), el badge por integrante, el estatus y el contador de cada equipo ("realizadas") y el filtro de estatus. Quien tiene nota y no entregó muestra además el badge gris "Sin archivo". La tarjeta "Entregas recibidas N / M" no cambia. El estatus de la entrega en la base y la API de calificaciones no cambian. `reporte.service.js`: la columna de la hoja Actividades del Excel "Entregas realizadas" pasa a "Integrantes que la realizaron"; PDF y pantalla siguen en "Realizadas". | Base `sgec_e3_tmp`, servidor real. Dos Tareas "para todos" en BD2026 con nota grupal 9 al Equipo 1: `entrega_por_equipo` TRUE (3 entregas) y FALSE (1 entrega, 2 integrantes calificados sin entrega). Captura de `GET /entregas/actividad/:id`, `GET /reportes` y el Excel antes y después: idénticas (la API no cambió). En el navegador la Bandeja da "3 de 6 actividades realizadas · 3 calificadas · 3 pendientes" en las dos actividades, igual que el reporte (3 de 3 y 0 de 3); con FALSE, los dos integrantes sin entrega salen "Calificada" + "Sin archivo" + "Sin entregar". | Ninguno |
| H2, H4 | `index.css` (≤768 px): `.topbar` con `flex-wrap: wrap`; `.topbar-right` con `flex-wrap`, `justify-content: flex-end`, `max-width: 100%` y `margin-left: auto` (antes `flex-shrink: 0`). Los botones pasan a otra línea, ninguno se oculta. | Iframe de 390 px con datos reales: Lista de Alumnos, Detalle del Equipo, Bandeja, Actividades, Materias, Reportes, Lista de Equipos y Dashboard sin desplazamiento horizontal (`scrollWidth` = `clientWidth`). A 1280 px el topbar de Lista de Alumnos sigue en 56 px. Con 390 px el topbar de Lista de Alumnos crece a 162 px (título, botones y avatar en filas). | Ninguno |
| H3 | `ListaMaterias.jsx`: el texto de ayuda dice que con las dos reglas cada alumno solo ve las actividades de sus equipos activos y que con la segunda además no puede estar en los dos bloques. | Leído del DOM en el formulario de Nueva materia. | Ninguno |
| H5 | `MisCalificaciones.jsx`: "Sin equipo asignado" pasa a "Equipo desactivado". | Alumno con el Equipo 1 desactivado: "Mis calificaciones" agrupa sus 4 notas como "Equipo desactivado". | Ninguno |
| H8 | `MisActividades.jsx`: "Aún no tienes actividades dirigidas a tus equipos." | Mismo alumno: se ve el texto nuevo. | Ninguno |
| H9 | `entregas.controller.js` (GET de entregas de una actividad, alumno): el 403 dice "No tienes permiso para ver esta actividad", como `GET /actividades/:id`. El POST de entregar conserva "No perteneces…". Mismo código de estado. | Por API con el alumno del equipo desactivado: `GET /entregas/actividad/:id` y `GET /actividades/:id` responden 403 con el mismo texto, en las dos actividades. | Ninguno |
| H10 | `DetalleEquipo.jsx` y `ListaEquipos.jsx`: el diálogo de desactivar dice "otro equipo" en lugar de "otro equipo de ese tipo". | Solo leído en el código (no se abrió el diálogo). | Ninguno |
| H6, H7, H11, H12 | No se tocaron: cambian lógica, agregan elementos de interfaz o contratos de la API, o son cosméticos. | — | Ver `LIMITACIONES.md` §16 |

Limitaciones de esta verificación: el "antes" del Excel y del 403 no se capturó con el código
anterior (el proceso de captura cargó parte del código ya modificado); el texto anterior de esas
cadenas consta en el diff de git. La consola y la red se empezaron a leer al final, solo en la
pantalla Mis actividades del alumno (sin errores). No se vio el PDF ni el Excel en una hoja de
cálculo. Prueba hecha por API y navegador en una sola base de demostración.

Base temporal para borrado manual: **`sgec_e3_tmp`** (el `DROP` está bloqueado). Capturas y scripts,
en el directorio temporal de la sesión.

