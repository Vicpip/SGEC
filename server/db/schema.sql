-- ============================================================================
-- SGEC — Sistema de Gestión de Equipos Colaborativos
-- Servicio Social · ESCOM · IPN · México
-- DDL completo — 16 tablas
--
-- Convenciones:
--   - Todas las PK son INT AUTO_INCREMENT.
--   - snake_case en todos los nombres de tabla y columna.
--   - Borrado lógico, nunca DELETE físico, en: usuario, equipo, actividad,
--     aviso (campo `activo`) y materia (campo `estatus = 'Cerrada'`).
--   - contrasena_hash almacena el hash bcrypt, nunca la contraseña en claro.
--   - correo_institucional es único y debe pertenecer a un dominio permitido
--     (ver ALLOWED_EMAIL_DOMAINS en server/.env).
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ── 1. usuario ───────────────────────────────────────────────────────────
-- Autenticación y rol base de toda cuenta del sistema.
CREATE TABLE usuario (
  id_usuario            INT AUTO_INCREMENT PRIMARY KEY,
  correo_institucional  VARCHAR(150) NOT NULL UNIQUE,
  contrasena_hash       VARCHAR(255) NOT NULL,
  rol                   ENUM('Administrador', 'Profesor', 'Alumno') NOT NULL,
  nombre                VARCHAR(100) NOT NULL,
  apellido_paterno      VARCHAR(100) NOT NULL,
  apellido_materno      VARCHAR(100) NULL,
  activo                BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  correo_alterno        VARCHAR(150) NULL,
  notificaciones_email  BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2. profesor ──────────────────────────────────────────────────────────
-- Extiende usuario con datos propios del rol Profesor.
CREATE TABLE profesor (
  id_profesor  INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario   INT NOT NULL UNIQUE,
  no_empleado  VARCHAR(20) NOT NULL UNIQUE,
  departamento VARCHAR(100) NULL,
  CONSTRAINT fk_profesor_usuario FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 3. alumno ────────────────────────────────────────────────────────────
-- Extiende usuario con datos propios del rol Alumno.
CREATE TABLE alumno (
  id_alumno  INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL UNIQUE,
  boleta     VARCHAR(15) NOT NULL UNIQUE,
  grupo      VARCHAR(10) NOT NULL,
  carrera    VARCHAR(100) NULL,
  CONSTRAINT fk_alumno_usuario FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 4. semestre ──────────────────────────────────────────────────────────
-- Período académico (ej. 2026/1).
CREATE TABLE semestre (
  id_semestre  INT AUTO_INCREMENT PRIMARY KEY,
  clave        VARCHAR(10) NOT NULL UNIQUE,
  fecha_inicio DATE NOT NULL,
  fecha_fin    DATE NOT NULL,
  activo       BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 5. materia ───────────────────────────────────────────────────────────
-- Unidad de aprendizaje impartida por un profesor en un semestre.
-- El borrado lógico de materia se maneja con `estatus = 'Cerrada'`, no con
-- un campo `activo`.
CREATE TABLE materia (
  id_materia   INT AUTO_INCREMENT PRIMARY KEY,
  clave        VARCHAR(20) NOT NULL,
  nombre       VARCHAR(150) NOT NULL,
  grupo        VARCHAR(10) NOT NULL,
  id_semestre  INT NOT NULL,
  id_profesor  INT NOT NULL,
  estatus      ENUM('Activa', 'En curso', 'Cerrada') NOT NULL DEFAULT 'Activa',
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_materia_semestre FOREIGN KEY (id_semestre) REFERENCES semestre(id_semestre),
  CONSTRAINT fk_materia_profesor FOREIGN KEY (id_profesor) REFERENCES profesor(id_profesor),
  UNIQUE KEY uk_materia_clave_grupo_semestre (clave, grupo, id_semestre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 6. materia_alumno ────────────────────────────────────────────────────
-- Inscripción de un alumno a una materia.
CREATE TABLE materia_alumno (
  id_materia_alumno  INT AUTO_INCREMENT PRIMARY KEY,
  id_materia         INT NOT NULL,
  id_alumno          INT NOT NULL,
  fecha_inscripcion  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_materia_alumno_materia FOREIGN KEY (id_materia) REFERENCES materia(id_materia),
  CONSTRAINT fk_materia_alumno_alumno FOREIGN KEY (id_alumno) REFERENCES alumno(id_alumno),
  UNIQUE KEY uk_materia_alumno (id_materia, id_alumno)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 7. equipo ────────────────────────────────────────────────────────────
-- Equipo colaborativo de 3 integrantes por tipo dentro de una materia.
-- Los equipos de tipo 'Practica' y 'Tarea' comparten integrantes; la
-- diferencia es solo lógica al asignar actividades (ver README).
CREATE TABLE equipo (
  id_equipo   INT AUTO_INCREMENT PRIMARY KEY,
  id_materia  INT NOT NULL,
  nombre      VARCHAR(100) NOT NULL,
  tipo        ENUM('Practica', 'Tarea', 'Proyecto') NOT NULL,
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_equipo_materia FOREIGN KEY (id_materia) REFERENCES materia(id_materia)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 8. equipo_alumno ─────────────────────────────────────────────────────
-- Integrantes de un equipo (exactamente 3 por equipo, validado en backend).
CREATE TABLE equipo_alumno (
  id_equipo_alumno  INT AUTO_INCREMENT PRIMARY KEY,
  id_equipo         INT NOT NULL,
  id_alumno         INT NOT NULL,
  CONSTRAINT fk_equipo_alumno_equipo FOREIGN KEY (id_equipo) REFERENCES equipo(id_equipo),
  CONSTRAINT fk_equipo_alumno_alumno FOREIGN KEY (id_alumno) REFERENCES alumno(id_alumno),
  UNIQUE KEY uk_equipo_alumno (id_equipo, id_alumno)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 9. actividad ─────────────────────────────────────────────────────────
-- Tarea/práctica/proyecto publicado por el profesor dentro de una materia.
-- Si programada = TRUE, es invisible al alumno hasta fecha_publicacion.
-- Si todos_los_equipos = TRUE, la actividad se dirige a todos los equipos
-- del tipo indicado en esa materia (id_equipo puede ser NULL). Si
-- todos_los_equipos = FALSE, va dirigida al equipo específico en id_equipo.
CREATE TABLE actividad (
  id_actividad      INT AUTO_INCREMENT PRIMARY KEY,
  id_materia        INT NOT NULL,
  id_equipo         INT NULL,
  todos_los_equipos BOOLEAN NOT NULL DEFAULT FALSE,
  entrega_por_equipo BOOLEAN NOT NULL DEFAULT FALSE,
  -- FALSE = cada integrante debe entregar individualmente
  -- TRUE = con que un integrante del equipo entregue, todos quedan como completados
  titulo            VARCHAR(150) NOT NULL,
  descripcion       TEXT NULL,
  tipo              ENUM('En clase', 'Practica', 'Tarea', 'Proyecto') NOT NULL,
  fecha_limite      DATETIME NOT NULL,
  programada        BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_publicacion DATETIME NULL,
  activo            BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_actividad_materia FOREIGN KEY (id_materia) REFERENCES materia(id_materia),
  CONSTRAINT fk_actividad_equipo FOREIGN KEY (id_equipo) REFERENCES equipo(id_equipo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 10. archivo_actividad ────────────────────────────────────────────────
-- Archivos adjuntos publicados por el profesor junto con la actividad.
CREATE TABLE archivo_actividad (
  id_archivo_actividad  INT AUTO_INCREMENT PRIMARY KEY,
  id_actividad          INT NOT NULL,
  nombre_archivo        VARCHAR(255) NOT NULL,
  ruta_archivo          VARCHAR(500) NOT NULL,
  fecha_subida          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_archivo_actividad_actividad FOREIGN KEY (id_actividad) REFERENCES actividad(id_actividad)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 11. entrega ──────────────────────────────────────────────────────────
-- Entrega de un alumno (o de su equipo) para una actividad.
CREATE TABLE entrega (
  id_entrega     INT AUTO_INCREMENT PRIMARY KEY,
  id_actividad   INT NOT NULL,
  id_alumno      INT NOT NULL,
  id_equipo      INT NULL,
  comentario     TEXT NULL,
  estatus        ENUM('Pendiente', 'En revision', 'Calificada') NOT NULL DEFAULT 'Pendiente',
  fecha_entrega  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_entrega_actividad FOREIGN KEY (id_actividad) REFERENCES actividad(id_actividad),
  CONSTRAINT fk_entrega_alumno FOREIGN KEY (id_alumno) REFERENCES alumno(id_alumno),
  CONSTRAINT fk_entrega_equipo FOREIGN KEY (id_equipo) REFERENCES equipo(id_equipo),
  UNIQUE KEY uk_entrega_actividad_alumno (id_actividad, id_alumno)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 12. archivo_entrega ──────────────────────────────────────────────────
-- Archivos adjuntos que el alumno sube en su entrega.
CREATE TABLE archivo_entrega (
  id_archivo_entrega  INT AUTO_INCREMENT PRIMARY KEY,
  id_entrega          INT NOT NULL,
  nombre_archivo      VARCHAR(255) NOT NULL,
  ruta_archivo        VARCHAR(500) NOT NULL,
  fecha_subida        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_archivo_entrega_entrega FOREIGN KEY (id_entrega) REFERENCES entrega(id_entrega)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 13. calificacion ─────────────────────────────────────────────────────
-- Nota por alumno/actividad. Grupal por defecto (individual = FALSE); el
-- profesor puede ajustarla por alumno marcando individual = TRUE.
CREATE TABLE calificacion (
  id_calificacion     INT AUTO_INCREMENT PRIMARY KEY,
  id_actividad        INT NOT NULL,
  id_alumno           INT NOT NULL,
  nota                DECIMAL(5,2) NOT NULL,
  individual          BOOLEAN NOT NULL DEFAULT FALSE,
  comentario           TEXT NULL,
  fecha_calificacion  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_calificacion_actividad FOREIGN KEY (id_actividad) REFERENCES actividad(id_actividad),
  CONSTRAINT fk_calificacion_alumno FOREIGN KEY (id_alumno) REFERENCES alumno(id_alumno),
  UNIQUE KEY uk_calificacion_actividad_alumno (id_actividad, id_alumno)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 14. aviso ────────────────────────────────────────────────────────────
-- Comunicado del Tablón de Avisos. id_materia = NULL dirige el aviso a
-- todos los alumnos de todas las materias activas del profesor.
CREATE TABLE aviso (
  id_aviso           INT AUTO_INCREMENT PRIMARY KEY,
  id_profesor        INT NOT NULL,
  id_materia         INT NULL,
  titulo             VARCHAR(150) NOT NULL,
  contenido          TEXT NOT NULL,
  activo             BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_publicacion  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_aviso_profesor FOREIGN KEY (id_profesor) REFERENCES profesor(id_profesor),
  CONSTRAINT fk_aviso_materia FOREIGN KEY (id_materia) REFERENCES materia(id_materia)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 15. archivo_aviso ────────────────────────────────────────────────────
-- Archivos adjuntos al aviso.
CREATE TABLE archivo_aviso (
  id_archivo_aviso  INT AUTO_INCREMENT PRIMARY KEY,
  id_aviso          INT NOT NULL,
  nombre_archivo    VARCHAR(255) NOT NULL,
  ruta_archivo      VARCHAR(500) NOT NULL,
  fecha_subida      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_archivo_aviso_aviso FOREIGN KEY (id_aviso) REFERENCES aviso(id_aviso)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 16. aviso_leido ──────────────────────────────────────────────────────
-- Registro de lectura de un aviso por parte de un alumno.
CREATE TABLE aviso_leido (
  id_aviso_leido  INT AUTO_INCREMENT PRIMARY KEY,
  id_aviso        INT NOT NULL,
  id_alumno       INT NOT NULL,
  fecha_lectura   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_aviso_leido_aviso FOREIGN KEY (id_aviso) REFERENCES aviso(id_aviso),
  CONSTRAINT fk_aviso_leido_alumno FOREIGN KEY (id_alumno) REFERENCES alumno(id_alumno),
  UNIQUE KEY uk_aviso_leido (id_aviso, id_alumno)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
