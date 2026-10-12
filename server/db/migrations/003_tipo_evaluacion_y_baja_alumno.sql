-- ============================================================================
-- Migración 003 — Tipo de evaluación y baja lógica de inscripciones (Sesión 14)
-- Para bases de datos creadas antes de esta migración. Las instalaciones nuevas
-- ya obtienen ambas columnas desde server/db/schema.sql.
--
-- 1. actividad.tipo_evaluacion: tipo de actividad a evaluar (Ejercicio, Mapa
--    mental, Cuestionario, Reporte, Exposición…). Texto libre de hasta 60
--    caracteres; no cambia el ENUM `tipo`. Las actividades existentes quedan
--    en NULL.
-- 2. materia_alumno.activo: baja lógica de un alumno en una materia. FALSE =
--    desinscrito (se conserva el historial); reinscribirlo vuelve a ponerlo en
--    TRUE en lugar de insertar otra fila. Las inscripciones existentes quedan
--    en TRUE.
--
-- Estos ALTER no son idempotentes (fallan si la columna ya existe). Para
-- aplicarlos con comprobación previa contra information_schema, columna por
-- columna:
--   node server/db/migrations/aplicar_003.js
-- ============================================================================

ALTER TABLE actividad
  ADD COLUMN tipo_evaluacion VARCHAR(60) NULL AFTER tipo;

ALTER TABLE materia_alumno
  ADD COLUMN activo BOOLEAN NOT NULL DEFAULT TRUE AFTER id_alumno;
