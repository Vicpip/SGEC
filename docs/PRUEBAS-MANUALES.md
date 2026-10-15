# Pruebas manuales — recorrido por los tres roles

Checklist para que **Victor e Itzel** lo ejecuten en el **dominio de producción**, después de
`docs/cierre/S16-checklist-manual.md`. Claude no puede usar la interfaz en un navegador: todo lo
que se probó en las sesiones 13 a 17 fue por la API, contra bases temporales. Este recorrido es
la única verificación de las pantallas en el entorno real.

## Antes de empezar

- [ ] Dos navegadores (o uno normal y otro en ventana privada) para tener dos sesiones a la vez,
  y un teléfono para la prueba en pantalla pequeña.
- [ ] Herramientas del navegador abiertas (F12) en la pestaña **Red** durante todo el recorrido:
  ninguna petición debe ir a `localhost` y ninguna debe responder 500.
- [ ] Cuentas: el Administrador real (creado con `create_admin.js`), el profesor y el alumno de
  demostración del paso 5 del checklist del servidor, y un segundo profesor de prueba (se crea en
  A2). No uses las cuentas de ejemplo del repositorio (`admin@ipn.mx`, `mgarcia@ipn.mx`,
  `s.ramirez@alumno.ipn.mx`): deben estar desactivadas.
- [ ] Dos archivos de prueba: un PDF de más de 1 MB y una imagen. Y la plantilla de Excel que se
  descarga desde Alumnos (B4).
- [ ] Al terminar, llenar la tabla de resultados del final. Si algo falla, anotar pantalla, paso,
  hora y lo que se vio; con eso se busca en el log del servidor
  (`docker compose logs server --since 30m`).

Convención: cada casilla dice qué hacer y, después de la flecha, qué debe pasar.

---

## A. Administrador

- [ ] **A1. Inicio de sesión.** Entrar con el Administrador real → abre Gestión de Profesores
  (`/admin/profesores`). En Red, `login` va a `https://<dominio>/api/auth/login` y responde 200.
- [ ] **A2. Alta de profesor.** Gestión de Profesores → alta de un segundo profesor de prueba con
  correo `@ipn.mx` y contraseña fuerte → aparece en la lista. Con un correo `@gmail.com` → error
  claro, no se crea.
- [ ] **A3. Baja y reactivación.** Dar de baja a ese profesor (pide confirmación) → queda
  inactivo. En el otro navegador, intentar entrar con él → "Esta cuenta se encuentra inactiva".
  Reactivarlo → vuelve a entrar.
- [ ] **A4. Semestres.** Semestres → existe el semestre actual y está activo. Crear uno de prueba
  y editarlo → los cambios se guardan.
- [ ] **A5. Materias.** Materias → ve las materias de todos los profesores. Intentar crear una
  materia en un semestre inactivo → error claro (422).
- [ ] **A6. Accesos de alumnos.** Accesos de alumnos → buscar con menos de 3 caracteres → pide
  más. Buscar por la boleta o el correo del alumno de demostración → aparece. (No restablecerlo
  aquí si ya lo usan; se prueba en B5.)
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
- [ ] **B3. Alta manual de alumno.** Alumnos → elegir la materia de prueba → alta manual con boleta,
  nombre, correo `@alumno.ipn.mx`, grupo y carrera → muestra **una sola vez** la contraseña
  temporal, con "Copiar" y "Descargar CSV" y el aviso de que no se volverá a mostrar.
- [ ] **B4. Importación desde Excel.** Descargar la plantilla, llenar 4 alumnos nuevos y una fila
  con error (correo `@gmail.com` o sin grupo) → importa los válidos, reporta la fila con error por
  número, y muestra las contraseñas temporales de los nuevos. Volver a importar el mismo archivo
  → no duplica a nadie ni cambia sus contraseñas.
- [ ] **B5. Restablecer acceso.** En la lista, "Restablecer acceso" de un alumno que **aún no**
  activó su cuenta → nueva contraseña temporal. De uno que ya la activó → 409 que indica usar
  "Olvidé mi contraseña" o pedirlo al Administrador.
- [ ] **B6. Equipos automáticos.** Equipos → materia de prueba → asignación aleatoria masiva de
  tipo Práctica → se forman equipos de 3; si sobran 1 o 2 alumnos, aparece un aviso con sus
  nombres. En la lista, cada equipo de Práctica tiene su gemelo de Tarea con los mismos
  integrantes.
- [ ] **B7. Equipo manual.** Crear equipo con 2 integrantes → no lo permite. Con 4 → sí (sirve para
  absorber a un sobrante). Agregar a un alumno que ya tiene equipo de ese tipo → no lo permite.
- [ ] **B8. Editar y desactivar equipo.** Detalle del equipo → cambiar un integrante → el gemelo
  (Práctica/Tarea) cambia igual. Desactivarlo (pide confirmación) → desaparecen ambos.
- [ ] **B9. Publicar actividad.** Actividades → publicar una de tipo Tarea para todos los equipos,
  con tipo de evaluación (sugerencias: Ejercicio, Mapa mental…), fecha límite mañana, un PDF
  adjunto y "entrega por equipo" activada → aparece en la lista con su tipo de evaluación.
- [ ] **B10. Actividad programada.** Publicar otra programada para dentro de 5 minutos → el
  alumno no la ve antes de la hora (C4) y sí después.
- [ ] **B11. Editar actividad.** Editar la de B9 antes de que tenga entregas → se puede cambiar
  todo salvo los adjuntos (se muestran en solo lectura). Después de que haya entregas (C5),
  intentar cambiar el tipo o el destino → 409 con mensaje claro.
- [ ] **B12. Bandeja de entregas.** Tras C5 → la entrega aparece en la bandeja con su archivo;
  abrir el archivo → se descarga o se abre (PDF/imagen) correctamente. Calificar con nota y
  comentario → el estatus pasa a Calificada para todo el equipo. Ajustar la nota de un solo
  integrante → solo cambia la suya.
- [ ] **B13. Actividades del alumno.** Alumnos → ver actividades de un alumno → solo aparecen las
  de las materias de este profesor.
- [ ] **B14. Baja de alumno.** Dar de baja de la materia a un alumno que está en un equipo → 409
  que lista sus equipos. A uno sin equipo → baja correcta; deja de aparecer en la lista.
- [ ] **B15. Reportes.** Reportes → semestre, materia y tipo → vista previa con Profesor, Unidad de
  aprendizaje, Equipo, Integrantes, Promedio y % de actividades realizadas / no realizadas, y la
  nota de que el promedio considera solo actividades calificadas. Descargar PDF y Excel → se abren;
  la tabla del PDF no se corta ni se encima.
- [ ] **B16. Tablón.** Publicar un aviso con adjunto para la materia de prueba y otro para "Todas
  mis materias" → ambos aparecen.
- [ ] **B17. Aislamiento entre profesores.** Entrar con el **segundo** profesor (A2) → no ve la
  materia, los alumnos, equipos ni actividades del primero. Pegar en su barra de direcciones la URL
  de una actividad del primero (`/actividades/<id>`) → error o "no encontrado", nunca los datos.
- [ ] **B18. Cerrar materia.** Al final, cerrar la materia de prueba (pide confirmación) → queda
  como Cerrada.

## C. Alumno

Con el alumno de demostración y con uno importado en B4.

- [ ] **C1. Primer inicio de sesión.** Entrar con un alumno de B4 y su contraseña temporal → lo
  lleva a Perfil a cambiar la contraseña y no deja usar otra pantalla antes. Cambiarla → ya navega.
  Cerrar sesión y entrar con la nueva → funciona; con la temporal → ya no.
- [ ] **C2. Olvidé mi contraseña.** En el inicio de sesión → "Olvidé mi contraseña" con su correo
  → mensaje genérico (no dice si el correo existe). Sin SMTP configurado no llega correo: es lo
  esperado.
- [ ] **C3. Mi Panel.** Muestra próximas actividades, pendientes, últimas calificaciones, avisos sin
  leer y sus equipos con datos reales.
- [ ] **C4. Mis Actividades.** Ve la Tarea de B9 con su tipo de evaluación; **no** ve la programada
  de B10 antes de su hora; sí la ve después.
- [ ] **C5. Entregar.** Abrir la Tarea → descargar el adjunto del profesor → subir el PDF de más de
  1 MB y un comentario → queda "En revisión" (o "Entregado"). Un compañero de equipo ve la
  actividad como entregada (es entrega por equipo).
- [ ] **C6. Privacidad entre compañeros.** El compañero ve el estatus del equipo, pero **no** la
  nota ni el comentario del profesor para los demás.
- [ ] **C7. Mis Calificaciones.** Tras B12 → aparece la nota (la individual si se ajustó).
- [ ] **C8. Mis Equipos.** Ve sus equipos de Práctica/Tarea y Proyecto con sus integrantes.
- [ ] **C9. Tablón.** Ve los dos avisos de B16, abre el adjunto, y al leerlos baja el contador de
  no leídos.
- [ ] **C10. Rutas de otro rol.** Escribir a mano `/dashboard`, `/reportes` y `/admin/profesores`
  → regresa a Mi Panel.
- [ ] **C11. Alumno dado de baja.** Con el alumno de B14 → ya no ve la materia de prueba ni sus
  actividades.

## D. Transversales

- [ ] **D1. Sesión cerrada por el servidor.** Con el alumno de C1 con sesión abierta en un
  navegador, restablecerle el acceso como Administrador (A6) → en su siguiente clic, la sesión se
  cierra y vuelve al inicio de sesión.
- [ ] **D2. Cuenta desactivada con sesión abierta.** Repetir A3 mientras el profesor de prueba
  tiene sesión abierta → en su siguiente clic sale al inicio de sesión.
- [ ] **D3. Teléfono.** En el teléfono, entrar como Alumno → Mi Panel, Mis Actividades y entregar
  un archivo desde el teléfono funcionan y se leen sin desbordarse.
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
