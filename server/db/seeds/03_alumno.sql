-- ============================================================================
-- Seed: usuario Alumno de prueba
-- Contraseña en claro (solo desarrollo): Alumno1234!
-- ============================================================================

INSERT INTO usuario (correo_institucional, contrasena_hash, rol, nombre, apellido_paterno, apellido_materno, activo)
VALUES (
  's.ramirez@alumno.ipn.mx',
  '$2a$10$6EZYzD4IDBxlYEVBlw6Zj.Uc3geuOSw8tFKvuHVvVULTthbjuRxi6',
  'Alumno',
  'Sofía Valentina',
  'Ramírez',
  'Torres',
  TRUE
);

INSERT INTO alumno (id_usuario, boleta, grupo, carrera)
VALUES (
  LAST_INSERT_ID(),
  '2023630045',
  '4BM1',
  'Ingeniería en Sistemas Computacionales'
);
