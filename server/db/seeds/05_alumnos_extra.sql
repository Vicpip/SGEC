SET NAMES utf8mb4;

-- ============================================================================
-- Seed: 12 alumnos adicionales + inscripción a materias
-- Contraseña en claro (solo desarrollo): Alumno1234!
-- ============================================================================

INSERT INTO usuario (correo_institucional, contrasena_hash, rol, nombre, apellido_paterno, apellido_materno, activo)
VALUES (
  'd.hernandez@alumno.ipn.mx',
  '$2a$10$6EZYzD4IDBxlYEVBlw6Zj.Uc3geuOSw8tFKvuHVvVULTthbjuRxi6',
  'Alumno', 'Diego Alejandro', 'Hernández', 'Morales', TRUE
);
INSERT INTO alumno (id_usuario, boleta, grupo, carrera)
VALUES (LAST_INSERT_ID(), '2023630046', '4CM1', 'Ingeniería en Sistemas Computacionales');

INSERT INTO usuario (correo_institucional, contrasena_hash, rol, nombre, apellido_paterno, apellido_materno, activo)
VALUES (
  'm.lopez@alumno.ipn.mx',
  '$2a$10$6EZYzD4IDBxlYEVBlw6Zj.Uc3geuOSw8tFKvuHVvVULTthbjuRxi6',
  'Alumno', 'María Fernanda', 'López', 'Castillo', TRUE
);
INSERT INTO alumno (id_usuario, boleta, grupo, carrera)
VALUES (LAST_INSERT_ID(), '2023630047', '4CM1', 'Ingeniería en Sistemas Computacionales');

INSERT INTO usuario (correo_institucional, contrasena_hash, rol, nombre, apellido_paterno, apellido_materno, activo)
VALUES (
  'c.martinez@alumno.ipn.mx',
  '$2a$10$6EZYzD4IDBxlYEVBlw6Zj.Uc3geuOSw8tFKvuHVvVULTthbjuRxi6',
  'Alumno', 'Carlos Eduardo', 'Martínez', 'Sánchez', TRUE
);
INSERT INTO alumno (id_usuario, boleta, grupo, carrera)
VALUES (LAST_INSERT_ID(), '2023630048', '4CM1', 'Licenciatura en Ciencia de Datos');

INSERT INTO usuario (correo_institucional, contrasena_hash, rol, nombre, apellido_paterno, apellido_materno, activo)
VALUES (
  'a.jimenez@alumno.ipn.mx',
  '$2a$10$6EZYzD4IDBxlYEVBlw6Zj.Uc3geuOSw8tFKvuHVvVULTthbjuRxi6',
  'Alumno', 'Ana Karen', 'Jiménez', 'Flores', TRUE
);
INSERT INTO alumno (id_usuario, boleta, grupo, carrera)
VALUES (LAST_INSERT_ID(), '2023630049', '4CM1', 'Ingeniería en Sistemas Computacionales');

INSERT INTO usuario (correo_institucional, contrasena_hash, rol, nombre, apellido_paterno, apellido_materno, activo)
VALUES (
  'l.gomez@alumno.ipn.mx',
  '$2a$10$6EZYzD4IDBxlYEVBlw6Zj.Uc3geuOSw8tFKvuHVvVULTthbjuRxi6',
  'Alumno', 'Luis Fernando', 'Gómez', 'Rivera', TRUE
);
INSERT INTO alumno (id_usuario, boleta, grupo, carrera)
VALUES (LAST_INSERT_ID(), '2023630050', '4CM2', 'Ingeniería en Sistemas Computacionales');

INSERT INTO usuario (correo_institucional, contrasena_hash, rol, nombre, apellido_paterno, apellido_materno, activo)
VALUES (
  'p.torres@alumno.ipn.mx',
  '$2a$10$6EZYzD4IDBxlYEVBlw6Zj.Uc3geuOSw8tFKvuHVvVULTthbjuRxi6',
  'Alumno', 'Paulina Guadalupe', 'Torres', 'Vázquez', TRUE
);
INSERT INTO alumno (id_usuario, boleta, grupo, carrera)
VALUES (LAST_INSERT_ID(), '2023630051', '4CM2', NULL);

INSERT INTO usuario (correo_institucional, contrasena_hash, rol, nombre, apellido_paterno, apellido_materno, activo)
VALUES (
  'j.cruz@alumno.ipn.mx',
  '$2a$10$6EZYzD4IDBxlYEVBlw6Zj.Uc3geuOSw8tFKvuHVvVULTthbjuRxi6',
  'Alumno', 'José Manuel', 'Cruz', 'Ortiz', TRUE
);
INSERT INTO alumno (id_usuario, boleta, grupo, carrera)
VALUES (LAST_INSERT_ID(), '2023630052', '4CM2', 'Ingeniería en Sistemas Computacionales');

INSERT INTO usuario (correo_institucional, contrasena_hash, rol, nombre, apellido_paterno, apellido_materno, activo)
VALUES (
  'd.reyes@alumno.ipn.mx',
  '$2a$10$6EZYzD4IDBxlYEVBlw6Zj.Uc3geuOSw8tFKvuHVvVULTthbjuRxi6',
  'Alumno', 'Daniela Itzel', 'Reyes', 'Domínguez', TRUE
);
INSERT INTO alumno (id_usuario, boleta, grupo, carrera)
VALUES (LAST_INSERT_ID(), '2023630053', '4CM2', 'Ingeniería en Sistemas Computacionales');

INSERT INTO usuario (correo_institucional, contrasena_hash, rol, nombre, apellido_paterno, apellido_materno, activo)
VALUES (
  'f.mendoza@alumno.ipn.mx',
  '$2a$10$6EZYzD4IDBxlYEVBlw6Zj.Uc3geuOSw8tFKvuHVvVULTthbjuRxi6',
  'Alumno', 'Fernando Iván', 'Mendoza', 'Aguilar', TRUE
);
INSERT INTO alumno (id_usuario, boleta, grupo, carrera)
VALUES (LAST_INSERT_ID(), '2023630054', '4CM2', 'Ingeniería en Sistemas Computacionales');

INSERT INTO usuario (correo_institucional, contrasena_hash, rol, nombre, apellido_paterno, apellido_materno, activo)
VALUES (
  'v.castro@alumno.ipn.mx',
  '$2a$10$6EZYzD4IDBxlYEVBlw6Zj.Uc3geuOSw8tFKvuHVvVULTthbjuRxi6',
  'Alumno', 'Valeria Montserrat', 'Castro', 'Ramos', TRUE
);
INSERT INTO alumno (id_usuario, boleta, grupo, carrera)
VALUES (LAST_INSERT_ID(), '2023630055', '5CM1', 'Ingeniería en Sistemas Computacionales');

INSERT INTO usuario (correo_institucional, contrasena_hash, rol, nombre, apellido_paterno, apellido_materno, activo)
VALUES (
  'r.vargas@alumno.ipn.mx',
  '$2a$10$6EZYzD4IDBxlYEVBlw6Zj.Uc3geuOSw8tFKvuHVvVULTthbjuRxi6',
  'Alumno', 'Ricardo Alonso', 'Vargas', 'Medina', TRUE
);
INSERT INTO alumno (id_usuario, boleta, grupo, carrera)
VALUES (LAST_INSERT_ID(), '2023630056', '5CM1', 'Ingeniería en Sistemas Computacionales');

INSERT INTO usuario (correo_institucional, contrasena_hash, rol, nombre, apellido_paterno, apellido_materno, activo)
VALUES (
  'c.ortega@alumno.ipn.mx',
  '$2a$10$6EZYzD4IDBxlYEVBlw6Zj.Uc3geuOSw8tFKvuHVvVULTthbjuRxi6',
  'Alumno', 'Camila Ximena', 'Ortega', 'Salazar', TRUE
);
INSERT INTO alumno (id_usuario, boleta, grupo, carrera)
VALUES (LAST_INSERT_ID(), '2023630057', '5CM1', 'Ingeniería en Sistemas Computacionales');

-- ── Inscripciones (materia_alumno) ──────────────────────────────────────────

INSERT INTO materia_alumno (id_materia, id_alumno)
VALUES
  -- BD2026: Sofía (existente) + 046..050
  ((SELECT id_materia FROM materia WHERE clave = 'BD2026'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630045')),
  ((SELECT id_materia FROM materia WHERE clave = 'BD2026'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630046')),
  ((SELECT id_materia FROM materia WHERE clave = 'BD2026'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630047')),
  ((SELECT id_materia FROM materia WHERE clave = 'BD2026'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630048')),
  ((SELECT id_materia FROM materia WHERE clave = 'BD2026'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630049')),
  ((SELECT id_materia FROM materia WHERE clave = 'BD2026'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630050')),
  -- ISW2026: 050..055
  ((SELECT id_materia FROM materia WHERE clave = 'ISW2026'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630050')),
  ((SELECT id_materia FROM materia WHERE clave = 'ISW2026'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630051')),
  ((SELECT id_materia FROM materia WHERE clave = 'ISW2026'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630052')),
  ((SELECT id_materia FROM materia WHERE clave = 'ISW2026'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630053')),
  ((SELECT id_materia FROM materia WHERE clave = 'ISW2026'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630054')),
  ((SELECT id_materia FROM materia WHERE clave = 'ISW2026'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630055')),
  -- PWEB2026: 048,049,054,055,056,057
  ((SELECT id_materia FROM materia WHERE clave = 'PWEB2026'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630048')),
  ((SELECT id_materia FROM materia WHERE clave = 'PWEB2026'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630049')),
  ((SELECT id_materia FROM materia WHERE clave = 'PWEB2026'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630054')),
  ((SELECT id_materia FROM materia WHERE clave = 'PWEB2026'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630055')),
  ((SELECT id_materia FROM materia WHERE clave = 'PWEB2026'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630056')),
  ((SELECT id_materia FROM materia WHERE clave = 'PWEB2026'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630057'));
