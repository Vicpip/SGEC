-- ============================================================================
-- Seed: usuario Profesor de prueba
-- Contraseña en claro (solo desarrollo): Profesor1234!
-- ============================================================================

INSERT INTO usuario (correo_institucional, contrasena_hash, rol, nombre, apellido_paterno, apellido_materno, activo)
VALUES (
  'mgarcia@ipn.mx',
  '$2a$10$Ss2mkGVt5AGgyyFM1RnhveIWW1k61nfjpJtaoL8wvqR6/9BTDB9HW',
  'Profesor',
  'Miguel Ángel',
  'García',
  'Ruiz',
  TRUE
);

INSERT INTO profesor (id_usuario, no_empleado, departamento)
VALUES (
  LAST_INSERT_ID(),
  'IPN-2018-04291',
  'Ciencias de la Computación'
);
