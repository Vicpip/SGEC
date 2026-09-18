SET NAMES utf8mb4;

-- ============================================================================
-- Seed: profesor adicional + materias de prueba
-- Contraseña en claro (solo desarrollo): Profesor1234!
-- ============================================================================

INSERT INTO usuario (correo_institucional, contrasena_hash, rol, nombre, apellido_paterno, apellido_materno, activo)
VALUES (
  'jlopez@ipn.mx',
  '$2a$10$Ss2mkGVt5AGgyyFM1RnhveIWW1k61nfjpJtaoL8wvqR6/9BTDB9HW',
  'Profesor',
  'Jorge Alberto',
  'López',
  'Hernández',
  TRUE
);

INSERT INTO profesor (id_usuario, no_empleado, departamento)
VALUES (
  LAST_INSERT_ID(),
  'IPN-2015-03187',
  'Ingeniería de Software'
);

INSERT INTO materia (clave, nombre, grupo, id_semestre, id_profesor, estatus)
VALUES
  (
    'BD2026', 'Bases de Datos', '4CM1',
    (SELECT id_semestre FROM semestre WHERE clave = '2026/1'),
    (SELECT id_profesor FROM profesor WHERE no_empleado = 'IPN-2018-04291'),
    'Activa'
  ),
  (
    'ISW2026', 'Ingeniería de Software', '4CM2',
    (SELECT id_semestre FROM semestre WHERE clave = '2026/1'),
    (SELECT id_profesor FROM profesor WHERE no_empleado = 'IPN-2018-04291'),
    'Activa'
  ),
  (
    'PWEB2026', 'Programación Web', '5CM1',
    (SELECT id_semestre FROM semestre WHERE clave = '2026/1'),
    (SELECT id_profesor FROM profesor WHERE no_empleado = 'IPN-2015-03187'),
    'Activa'
  );
