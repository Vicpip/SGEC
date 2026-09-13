-- ============================================================================
-- Seed: actividades (los 4 tipos, incluyendo programada, todos_los_equipos
-- y entrega_por_equipo)
-- ============================================================================

INSERT INTO actividad (id_materia, id_equipo, todos_los_equipos, entrega_por_equipo, titulo, descripcion, tipo, fecha_limite, programada, fecha_publicacion, activo)
VALUES
  (
    (SELECT id_materia FROM materia WHERE clave = 'BD2026'),
    NULL, TRUE, FALSE,
    'Repaso de Modelo Entidad-Relación',
    'Actividad en clase sobre diseño de diagramas ER.',
    'En clase', '2026-02-12 20:00:00', FALSE, NULL, TRUE
  ),
  (
    (SELECT id_materia FROM materia WHERE clave = 'BD2026'),
    (SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'BD2026') AND nombre = 'Equipo 1' AND tipo = 'Practica'),
    FALSE, FALSE,
    'Práctica 1: Diagrama ER de biblioteca',
    'Modelar un sistema de biblioteca escolar con diagrama entidad-relación.',
    'Practica', '2026-03-06 23:59:00', FALSE, NULL, TRUE
  ),
  (
    (SELECT id_materia FROM materia WHERE clave = 'BD2026'),
    NULL, TRUE, FALSE,
    'Tarea: Normalización de tablas',
    'Llevar un esquema relacional a 3FN.',
    'Tarea', '2026-03-20 23:59:00', FALSE, NULL, TRUE
  ),
  (
    (SELECT id_materia FROM materia WHERE clave = 'ISW2026'),
    (SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'ISW2026') AND nombre = 'Proyecto 1' AND tipo = 'Proyecto'),
    FALSE, TRUE,
    'Proyecto Final: Sistema de gestión escolar',
    'Proyecto integrador del semestre, entrega única por equipo.',
    'Proyecto', '2026-05-15 23:59:00', FALSE, NULL, TRUE
  ),
  (
    (SELECT id_materia FROM materia WHERE clave = 'ISW2026'),
    NULL, TRUE, FALSE,
    'Tarea: Diagramas UML de casos de uso',
    'Actividad programada, visible hasta la fecha de publicación.',
    'Tarea', '2026-10-01 23:59:00', TRUE, '2026-10-01 00:00:00', TRUE
  ),
  (
    (SELECT id_materia FROM materia WHERE clave = 'PWEB2026'),
    (SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'PWEB2026') AND nombre = 'Equipo 1' AND tipo = 'Practica'),
    FALSE, FALSE,
    'Práctica: API REST con Express',
    'Construir un CRUD básico usando Express y MySQL.',
    'Practica', '2026-04-10 23:59:00', FALSE, NULL, TRUE
  ),
  (
    (SELECT id_materia FROM materia WHERE clave = 'PWEB2026'),
    NULL, TRUE, FALSE,
    'Repaso: Consumo de APIs con fetch',
    'Actividad en clase sobre consumo de APIs REST desde el navegador.',
    'En clase', '2026-04-25 23:59:00', FALSE, NULL, TRUE
  );
