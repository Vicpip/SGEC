-- ============================================================================
-- Seed: calificaciones (grupales por defecto, con un ajuste individual)
-- Solo se califican las entregas con estatus 'Calificada'.
-- ============================================================================

INSERT INTO calificacion (id_actividad, id_alumno, nota, individual, comentario)
VALUES
  (
    (SELECT id_actividad FROM actividad WHERE titulo = 'Repaso de Modelo Entidad-Relación'),
    (SELECT id_alumno FROM alumno WHERE boleta = '2023630045'),
    8.50, FALSE, NULL
  ),
  (
    (SELECT id_actividad FROM actividad WHERE titulo = 'Práctica 1: Diagrama ER de biblioteca'),
    (SELECT id_alumno FROM alumno WHERE boleta = '2023630045'),
    9.00, FALSE, NULL
  ),
  (
    (SELECT id_actividad FROM actividad WHERE titulo = 'Práctica 1: Diagrama ER de biblioteca'),
    (SELECT id_alumno FROM alumno WHERE boleta = '2023630046'),
    9.00, FALSE, NULL
  ),
  (
    (SELECT id_actividad FROM actividad WHERE titulo = 'Tarea: Normalización de tablas'),
    (SELECT id_alumno FROM alumno WHERE boleta = '2023630050'),
    8.00, FALSE, NULL
  ),
  (
    (SELECT id_actividad FROM actividad WHERE titulo = 'Proyecto Final: Sistema de gestión escolar'),
    (SELECT id_alumno FROM alumno WHERE boleta = '2023630050'),
    9.50, FALSE, NULL
  ),
  (
    (SELECT id_actividad FROM actividad WHERE titulo = 'Proyecto Final: Sistema de gestión escolar'),
    (SELECT id_alumno FROM alumno WHERE boleta = '2023630052'),
    10.00, TRUE, 'Participación adicional en la presentación final.'
  ),
  (
    (SELECT id_actividad FROM actividad WHERE titulo = 'Proyecto Final: Sistema de gestión escolar'),
    (SELECT id_alumno FROM alumno WHERE boleta = '2023630054'),
    9.50, FALSE, NULL
  ),
  (
    (SELECT id_actividad FROM actividad WHERE titulo = 'Práctica: API REST con Express'),
    (SELECT id_alumno FROM alumno WHERE boleta = '2023630048'),
    7.50, FALSE, NULL
  ),
  (
    (SELECT id_actividad FROM actividad WHERE titulo = 'Repaso: Consumo de APIs con fetch'),
    (SELECT id_alumno FROM alumno WHERE boleta = '2023630057'),
    9.20, FALSE, NULL
  );
