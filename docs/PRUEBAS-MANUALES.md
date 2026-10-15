# Pruebas manuales — recorrido por los tres roles

Checklist para que **Victor e Itzel** lo ejecuten en el **dominio de producción**, después de
`docs/cierre/S16-checklist-manual.md`. Casi todo lo de las sesiones 13 a 17 se probó por la API,
contra bases temporales. Las sesiones 13 a 16 revisaron además en Chrome, **en local** (Vite
contra un servidor y una base de prueba, con la sesión abierta escribiendo el token en
`localStorage`), algunas pantallas: lista de alumnos y restablecimiento de acceso, cambio
obligatorio de contraseña, adjuntos en Mis Actividades y Bandeja de Entregas (S13); alta, edición
y baja de alumnos y edición de una actividad con entregas (S14); panel del alumno, lista, alta,
edición y desactivación de equipos con su espejo, y reportes (S15); Perfil del alumno, cierre de
sesión tras un restablecimiento y Dashboard del profesor (S16). La S17 no abrió el navegador.
Nada se vio en el dominio real, y la pantalla de inicio de sesión no se usó nunca en el
navegador. Este recorrido es la única verificación de las pantallas en el entorno real.

## Antes de empezar

- [ ] Dos navegadores (o uno normal y otro en ventana privada) para tener dos sesiones a la vez,
  y un teléfono para la prueba en pantalla pequeña.
- [ ] Herramientas del navegador abiertas (F12) en la pestaña **Red** durante todo el recorrido:
  ninguna petición debe ir a `localhost` y ninguna debe responder 500.
- [ ] Cuentas: el Administrador real (creado con `create_admin.js`), el profesor de demostración
  del paso 5 del checklist del servidor, un segundo profesor de prueba (se crea en A2) y los
  alumnos que se dan de alta en B3 y B4 (ver el inicio del bloque C). No uses las cuentas de
  ejemplo del repositorio (`admin@ipn.mx`, `mgarcia@ipn.mx`, `s.ramirez@alumno.ipn.mx`): deben
  estar desactivadas.
- [ ] Dos archivos de prueba: un PDF de más de 1 MB y una imagen. Y la plantilla de Excel que se
  descarga desde Alumnos (B4).
- [ ] **Orden de ejecución.** Algunos pasos dependen de otros de un bloque posterior, así que no
  se recorren de corrido: A1–A8 → B1–B4 → B6 → B5 (primera parte) → B7–B10 → C1–C6 → B5
  (segunda parte) → B11–B17 → C7–C11 → D1–D6 → la desactivación de B8 → B18 (al final de todo:
  la materia de prueba ya no se usa después de cerrarla).
- [ ] Al terminar, llenar la tabla de resultados del final. Si algo falla, anotar pantalla, paso,
  hora y lo que se vio; con eso se busca en el log del servidor
  (`docker compose logs server --since 30m`).

Convención: cada casilla dice qué hacer y, después de la flecha, qué debe pasar.

---

## A. Administrador

- [ ] **A1. Inicio de sesión.** Entrar con el Administrador real → abre Gestión de Profesores
  (`/admin/profesores`). En Red, `login` va a `https://<dominio>/api/auth/login` y responde 200.
- [ ] **A2. Alta de profesor.** Gestión de Profesores → alta de un segundo profesor de prueba con
  correo `@ipn.mx`, número de empleado y contraseña fuerte → aparece en la lista. Con un correo
  `@gmail.com` → error de dominio, no se crea.
- [ ] **A3. Baja y reactivación.** Dar de baja a ese profesor (pide confirmación) → queda
  inactivo. En el otro navegador, intentar entrar con él → "Esta cuenta se encuentra inactiva".
  Reactivarlo → vuelve a entrar.
- [ ] **A4. Semestres.** Semestres → existe el semestre actual y está activo. Crear uno de prueba
  y editarlo → los cambios se guardan. Dejarlo **inactivo** (se usa en A5).
- [ ] **A5. Materias.** Materias → ve las materias de todos los profesores. Crear una materia
  (el Administrador elige el profesor) en el semestre inactivo de A4 → 422 "El semestre <clave>
  está inactivo: no se pueden crear materias en él"; no se crea.
- [ ] **A6. Accesos de alumnos.** Accesos de alumnos → buscar con menos de 3 caracteres → pide
  más. Buscar por la boleta o el correo del alumno de demostración → aparece. (No restablecerlo
  aquí si ya lo usan; el restablecimiento por el Administrador se prueba en D1.)
- [ ] **A7. Rutas de otro rol.** Escribir a mano `/dashboard` y luego `/alumno/dashboard` en la
  barra de direcciones → regresa a su pantalla de inicio, no muestra datos de otro rol.
- [ ] **A8. Perfil.** Perfil → cambiar correo alterno y preferencia de notificaciones → se guarda.
  El nombre no se puede editar.

## B. Profesor

Con el profesor de demostración, salvo que se diga otra cosa.

- [ ] **B1. Dashboard.** Entrar → abre Dashboard con datos, sin mensaje de error. El encabezado
  muestra el semestre activo real (no un "2026/1" fijo si el activo es otro). En Red,
  `dashboard` responde 200.
- [ ] **B2. Materias.** Materias → crear una materia de prueba (clave con el periodo, por ejemplo
  `PRB-2026-2`) → aparece. Crear otra con la **misma clave** en el mismo semestre → 409 con el
  mensaje "Ya tienes una materia con esa clave en este semestre…". Editar la materia → se guarda.
- [ ] **B3. Alta manual de alumno.** Alumnos → elegir la materia de prueba → alta manual con boleta
  (10 dígitos), nombre, apellido paterno, correo `@alumno.ipn.mx` y grupo (apellido materno y
  carrera son opcionales) → muestra **una sola vez** la contraseña temporal, con "Copiar" y
  "Descargar CSV" y el aviso de que no se volverá a mostrar. Descarga el CSV: se usa en el
  bloque C.
- [ ] **B4. Importación desde Excel.** Descargar la plantilla, llenar 4 alumnos nuevos y una fila
  con error (correo `@gmail.com` o sin grupo) → importa los válidos, reporta la fila con error por
  número, y muestra las contraseñas temporales de los nuevos (descarga el CSV). Volver a importar
  el mismo archivo → no duplica a nadie ni cambia sus contraseñas: los cuenta como ya inscritos y
  no muestra contraseñas nuevas.
- [ ] **B5. Restablecer acceso.** Hazlo después de B6, con el alumno que quedó sin equipo y que
  no se usa en B8. En la lista, "Restablecer acceso" de ese alumno (**aún no** activó su cuenta)
  → nueva contraseña temporal (la anterior deja de servir). **Después de C1**, de uno que ya la
  activó (el alumno 1) → el botón aparece deshabilitado; si la API se llamara igual, responde 409 "El alumno ya activó su cuenta y eligió su contraseña. Debe usar
  'Olvidé mi contraseña' o pedir el restablecimiento al Administrador".
- [ ] **B6. Equipos automáticos.** Equipos → materia de prueba → asignación aleatoria masiva de
  tipo Práctica → con los 5 alumnos de B3 y B4 se forma 1 equipo de 3 y aparece un aviso con los
  nombres de los 2 que sobran. En la lista, el equipo de Práctica tiene su gemelo de Tarea con los
  mismos integrantes.
- [ ] **B7. Equipo manual.** Crear equipo con 2 integrantes → no lo permite (mínimo 3). Crear un
  equipo de **Proyecto** con 4 integrantes: los 3 del equipo de B6 y el sobrante que se agregará
  en B8 → sí (Proyecto se forma aparte: un alumno puede tener equipo de Práctica/Tarea y de
  Proyecto). Crear un equipo de Práctica que incluya a alguien del equipo de B6 → 409 "El alumno
  con id … ya tiene un equipo de tipo Practica en esta materia".
- [ ] **B8. Editar y desactivar equipo.** Detalle del equipo de Práctica de B6 → agregar a uno de
  los sobrantes (queda con 4: así se absorbe a un sobrante) → el gemelo de Tarea cambia igual.
  **La desactivación va al final del recorrido** (ver el orden): desactivar ese equipo (pide
  confirmación) → desaparecen ambas filas (Práctica y Tarea).
- [ ] **B9. Publicar actividad.** Actividades → publicar una de tipo Tarea para todos los equipos,
  con tipo de evaluación (sugerencias: Ejercicio, Mapa mental…), fecha límite mañana, un PDF
  adjunto y "entrega por equipo" activada → aparece en la lista con su tipo de evaluación.
- [ ] **B10. Actividad programada.** Publicar otra programada para dentro de 5 minutos → el
  alumno no la ve antes de la hora (C4) y sí después.
- [ ] **B11. Editar actividad.** Editar la de B9 antes de que tenga entregas → se puede cambiar
  todo salvo los adjuntos (se muestran en solo lectura). **Después de C5** (ya con entregas),
  intentar cambiar el tipo, la modalidad de entrega o el destino → 409 "La actividad ya tiene
  entregas o calificaciones: no se puede cambiar su tipo, la modalidad de entrega ni el equipo al
  que va dirigida".
- [ ] **B12. Bandeja de entregas.** Hazlo después de C5 → la entrega aparece en la bandeja como
  "En revisión", con su archivo; abrir el archivo → se descarga o se abre (PDF/imagen)
  correctamente. Calificar con nota y comentario → el estatus pasa a Calificada para todo el
  equipo. Ajustar la nota de un solo integrante → solo cambia la suya.
- [ ] **B13. Actividades del alumno.** Alumnos → ver actividades de un alumno → solo aparecen las
  de las materias de este profesor.
- [ ] **B14. Baja de alumno.** Dar de baja de la materia a un alumno que está en un equipo → 409
  "El alumno pertenece a equipos activos de esta materia: … Edita o desactiva esos equipos antes
  de darlo de baja", con la lista de sus equipos. Al alumno 5 (sin ningún equipo) → baja
  correcta; deja de aparecer en la lista.
- [ ] **B15. Reportes.** Reportes → semestre, materia y tipo → vista previa con Profesor, Unidad de
  aprendizaje, Equipo, Integrantes, Promedio y % de actividades realizadas / no realizadas, y la
  nota de que el promedio considera solo actividades calificadas. Descargar PDF y Excel → se abren;
  la tabla del PDF no se corta ni se encima.
- [ ] **B16. Tablón.** Publicar un aviso con adjunto para la materia de prueba y otro para "Todas
  mis materias" → ambos aparecen.
- [ ] **B17. Aislamiento entre profesores.** Entrar con el **segundo** profesor (A2) → no ve la
  materia, los alumnos, equipos ni actividades del primero. Pegar en su barra de direcciones la URL
  de una actividad del primero (`/actividades/<id>`) → error o "no encontrado", nunca los datos.
- [ ] **B18. Cerrar materia.** Al final de todo, cerrar la materia de prueba (pide confirmación)
  → queda como Cerrada.

## C. Alumno

Alumnos de este bloque: los 5 dados de alta en B3 y B4, inscritos en la materia de prueba de B2,
con el equipo formado en B6 (Detalle del equipo muestra quiénes quedaron).

- **Alumno 1** y **alumno 2**: dos integrantes del equipo de B6 (compañeros entre sí).
- **Alumno 5**: el sobrante que no se agregó en B8 (sin ningún equipo; es el de B5 y B14).
- Sus contraseñas temporales son las de los CSV de B3 y B4 (la del alumno 5, la nueva de B5).

El alumno de demostración del paso 5 del checklist del servidor está inscrito solo en la materia
de demostración de ese paso, **no** en la de prueba: no tiene equipo ahí ni ve la actividad de B9.
Si se quiere usar aquí, el profesor lo inscribe con una alta manual (B3) con **su misma boleta y
correo**: solo lo inscribe, sin cambiar su contraseña ni mostrar una nueva (con eso serían 6
alumnos y B6 formaría 2 equipos sin sobrantes).

- [ ] **C1. Primer inicio de sesión.** Entrar con el alumno 1 y su contraseña temporal → lo
  lleva a Perfil a cambiar la contraseña y no deja usar otra pantalla antes. Cambiarla → ya navega.
  Cerrar sesión y entrar con la nueva → funciona; con la temporal → ya no. Hacer lo mismo con el
  alumno 2.
- [ ] **C2. Olvidé mi contraseña.** En el inicio de sesión → "Olvidé mi contraseña" con su correo
  → mensaje genérico (no dice si el correo existe). Sin SMTP configurado no llega correo: es lo
  esperado.
- [ ] **C3. Mi Panel.** Muestra próximas actividades, pendientes, últimas calificaciones, avisos sin
  leer y sus equipos con datos reales.
- [ ] **C4. Mis Actividades.** Ve la Tarea de B9 con su tipo de evaluación; **no** ve la programada
  de B10 antes de su hora; sí la ve después.
- [ ] **C5. Entregar.** Con el alumno 1: abrir la Tarea → descargar el adjunto del profesor →
  subir el PDF de más de 1 MB y un comentario → su entrega aparece con la etiqueta "Entregado"
  (amarilla); en la base y en la Bandeja del profesor el estatus es "En revisión". El alumno 2 ve
  la actividad como entregada: su propia entrega y la del alumno 1 aparecen como "Entregado" (es
  entrega por equipo), y en lugar del formulario de entrega ve la tarjeta "Tu entrega": no puede
  entregar de nuevo (la API respondería 409 "Ya registraste una entrega para esta actividad").
- [ ] **C6. Privacidad entre compañeros.** El alumno 2 ve el estatus del equipo, pero **no** la
  nota ni el comentario del profesor para los demás.
- [ ] **C7. Mis Calificaciones.** Tras B12 → aparece la nota (la individual si se ajustó).
- [ ] **C8. Mis Equipos.** El alumno 1 ve su equipo de Práctica/Tarea y el de Proyecto de B7, con
  sus integrantes.
- [ ] **C9. Tablón.** Ve los dos avisos de B16, abre el adjunto, y al leerlos baja el contador de
  no leídos.
- [ ] **C10. Rutas de otro rol.** Escribir a mano `/dashboard`, `/reportes` y `/admin/profesores`
  → regresa a Mi Panel.
- [ ] **C11. Alumno dado de baja.** Con el alumno 5 (dado de baja en B14) → ya no ve la materia de
  prueba ni sus actividades.

## D. Transversales

- [ ] **D1. Sesión cerrada por el servidor.** Con el alumno 1 con sesión abierta en un
  navegador, restablecerle el acceso como Administrador (Accesos de alumnos, A6; el Administrador
  sí puede aunque la cuenta ya esté activada) → en su siguiente clic, la sesión se cierra y vuelve
  al inicio de sesión.
- [ ] **D2. Cuenta desactivada con sesión abierta.** Repetir A3 mientras el profesor de prueba
  tiene sesión abierta → en su siguiente clic sale al inicio de sesión.
- [ ] **D3. Teléfono.** En el teléfono, entrar como Alumno (el alumno 2) → Mi Panel, Mis
  Actividades y entregar un archivo en la actividad de B10 (la de B9 ya tiene entrega del equipo)
  funcionan y se leen sin desbordarse.
- [ ] **D4. Hora.** La hora de la entrega de C5 coincide con el reloj (hora del centro de México).
- [ ] **D5. HTTPS.** El candado aparece en todas las pantallas; `http://<dominio>` redirige a
  `https://`.
- [ ] **D6. Errores.** En ningún momento apareció un error 500 ni una pantalla en blanco.

---

## Resultados

| Bloque | Ejecutó | Fecha | Resultado (OK / falla) | Notas |
|---|---|---|---|---|
| A. Administrador | | | | |
| B. Profesor | | | | |
| C. Alumno | | | | |
| D. Transversales | | | | |

Las limitaciones ya conocidas (por ejemplo, que los adjuntos de una actividad no se editan o que
las contraseñas temporales no caducan) están en `docs/LIMITACIONES.md`: no son fallas de esta
prueba.

Al terminar, desactivar o dejar documentadas las cuentas de prueba creadas aquí.
