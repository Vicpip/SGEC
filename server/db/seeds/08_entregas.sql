SET NAMES utf8mb4;

-- ============================================================================
-- Seed: entregas (mezcla de Calificada / En revision / Pendiente).
-- La ausencia de fila también representa "Pendiente" (aún no entregado);
-- solo se insertan un par de filas Pendiente explícitas para cubrir ese caso.
-- ============================================================================

INSERT INTO entrega (id_actividad, id_alumno, id_equipo, comentario, estatus)
VALUES
  -- Actividad: Repaso de Modelo Entidad-Relación (BD2026, En clase, todos_los_equipos)
  (
    (SELECT id_actividad FROM actividad WHERE titulo = 'Repaso de Modelo Entidad-Relación'),
    (SELECT id_alumno FROM alumno WHERE boleta = '2023630045'), NULL,
    'Notas de la sesión de repaso.', 'Calificada'
  ),
  (
    (SELECT id_actividad FROM actividad WHERE titulo = 'Repaso de Modelo Entidad-Relación'),
    (SELECT id_alumno FROM alumno WHERE boleta = '2023630046'), NULL,
    NULL, 'En revision'
  ),
  (
    (SELECT id_actividad FROM actividad WHERE titulo = 'Repaso de Modelo Entidad-Relación'),
    (SELECT id_alumno FROM alumno WHERE boleta = '2023630050'), NULL,
    NULL, 'Pendiente'
  ),

  -- Actividad: Práctica 1: Diagrama ER de biblioteca (BD2026, equipo específico)
  (
    (SELECT id_actividad FROM actividad WHERE titulo = 'Práctica 1: Diagrama ER de biblioteca'),
    (SELECT id_alumno FROM alumno WHERE boleta = '2023630045'),
    (SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'BD2026') AND nombre = 'Equipo 1' AND tipo = 'Practica'),
    'Diagrama entregado en PDF.', 'Calificada'
  ),
  (
    (SELECT id_actividad FROM actividad WHERE titulo = 'Práctica 1: Diagrama ER de biblioteca'),
    (SELECT id_alumno FROM alumno WHERE boleta = '2023630046'),
    (SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'BD2026') AND nombre = 'Equipo 1' AND tipo = 'Practica'),
    'Diagrama entregado en PDF.', 'Calificada'
  ),

  -- Actividad: Tarea: Normalización de tablas (BD2026, todos_los_equipos)
  (
    (SELECT id_actividad FROM actividad WHERE titulo = 'Tarea: Normalización de tablas'),
    (SELECT id_alumno FROM alumno WHERE boleta = '2023630049'), NULL,
    NULL, 'En revision'
  ),
  (
    (SELECT id_actividad FROM actividad WHERE titulo = 'Tarea: Normalización de tablas'),
    (SELECT id_alumno FROM alumno WHERE boleta = '2023630050'), NULL,
    NULL, 'Calificada'
  ),

  -- Actividad: Proyecto Final (ISW2026, entrega_por_equipo = TRUE, equipo Proyecto 1)
  (
    (SELECT id_actividad FROM actividad WHERE titulo = 'Proyecto Final: Sistema de gestión escolar'),
    (SELECT id_alumno FROM alumno WHERE boleta = '2023630050'),
    (SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'ISW2026') AND nombre = 'Proyecto 1' AND tipo = 'Proyecto'),
    'Entrega única del equipo, repositorio y documentación adjuntos.', 'Calificada'
  ),
  (
    (SELECT id_actividad FROM actividad WHERE titulo = 'Proyecto Final: Sistema de gestión escolar'),
    (SELECT id_alumno FROM alumno WHERE boleta = '2023630052'),
    (SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'ISW2026') AND nombre = 'Proyecto 1' AND tipo = 'Proyecto'),
    'Marcado automáticamente por entrega_por_equipo.', 'Calificada'
  ),
  (
    (SELECT id_actividad FROM actividad WHERE titulo = 'Proyecto Final: Sistema de gestión escolar'),
    (SELECT id_alumno FROM alumno WHERE boleta = '2023630054'),
    (SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'ISW2026') AND nombre = 'Proyecto 1' AND tipo = 'Proyecto'),
    'Marcado automáticamente por entrega_por_equipo.', 'Calificada'
  ),

  -- Nota: "Tarea: Diagramas UML de casos de uso" es programada a futuro (fecha_publicacion
  -- 2026-10-01), aún no visible al alumno — intencionalmente sin entregas.

  -- Actividad: Práctica: API REST con Express (PWEB2026, equipo específico)
  (
    (SELECT id_actividad FROM actividad WHERE titulo = 'Práctica: API REST con Express'),
    (SELECT id_alumno FROM alumno WHERE boleta = '2023630048'),
    (SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'PWEB2026') AND nombre = 'Equipo 1' AND tipo = 'Practica'),
    'Repositorio con el CRUD funcionando.', 'Calificada'
  ),
  (
    (SELECT id_actividad FROM actividad WHERE titulo = 'Práctica: API REST con Express'),
    (SELECT id_alumno FROM alumno WHERE boleta = '2023630049'),
    (SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'PWEB2026') AND nombre = 'Equipo 1' AND tipo = 'Practica'),
    NULL, 'Pendiente'
  ),

  -- Actividad: Repaso: Consumo de APIs con fetch (PWEB2026, todos_los_equipos)
  (
    (SELECT id_actividad FROM actividad WHERE titulo = 'Repaso: Consumo de APIs con fetch'),
    (SELECT id_alumno FROM alumno WHERE boleta = '2023630056'), NULL,
    NULL, 'En revision'
  ),
  (
    (SELECT id_actividad FROM actividad WHERE titulo = 'Repaso: Consumo de APIs con fetch'),
    (SELECT id_alumno FROM alumno WHERE boleta = '2023630057'), NULL,
    NULL, 'Calificada'
  );
