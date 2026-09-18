SET NAMES utf8mb4;

-- ============================================================================
-- Seed: avisos (uno por materia específica, uno global para el profesor
-- con múltiples materias activas)
-- ============================================================================

INSERT INTO aviso (id_profesor, id_materia, titulo, contenido, activo)
VALUES
  (
    (SELECT id_profesor FROM profesor WHERE no_empleado = 'IPN-2018-04291'),
    (SELECT id_materia FROM materia WHERE clave = 'BD2026'),
    'Cambio de fecha: Práctica 1',
    'La fecha límite de la Práctica 1 (Diagrama ER de biblioteca) se recorre al 6 de marzo.',
    TRUE
  ),
  (
    (SELECT id_profesor FROM profesor WHERE no_empleado = 'IPN-2018-04291'),
    NULL,
    'Recordatorio: revisión de equipos antes del parcial',
    'Verifiquen que la integración de su equipo sea correcta antes del examen parcial, en cualquiera de mis unidades de aprendizaje.',
    TRUE
  );
