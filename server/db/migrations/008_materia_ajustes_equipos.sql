-- ============================================================================
-- Migración 008 — Ajustes de equipos por materia (rama feature/equipos-configurables, E1)
-- Agrega a `materia` la configuración de equipos que define el profesor, sobre bases de
-- datos creadas antes de esta migración. Las instalaciones nuevas ya la obtienen desde
-- server/db/schema.sql.
--
-- Los valores por defecto reproducen el comportamiento anterior, así que las materias
-- existentes no cambian:
--   equipo_tamano_auto  3     asignación automática de 3 en 3
--   equipo_min/max      3/4   alta y edición manual con 3 o 4 integrantes
--   regla_repeticion    'B'   no repetir dentro del mismo tipo (Práctica y Tarea cuentan
--                             como uno). 'A' = no repetir entre bloques de equipos. En E1
--                             solo se guarda; todavía no cambia la validación.
--   usa_practica/tarea/proyecto TRUE  la materia usa los tres tipos. En E1 solo se guardan.
--
-- Solo agrega columnas: no toca datos ni otras tablas. No depende de las migraciones 006 y
-- 007 (rama feature/pwa-avisos), que tocan otras tablas.
--
-- Estos ALTER no son idempotentes (fallan si la columna ya existe). Para aplicarlos con
-- comprobación previa contra information_schema, columna por columna:
--   node server/db/migrations/aplicar_008.js
-- ============================================================================

ALTER TABLE materia
  ADD COLUMN equipo_tamano_auto TINYINT UNSIGNED NOT NULL DEFAULT 3;

ALTER TABLE materia
  ADD COLUMN equipo_min TINYINT UNSIGNED NOT NULL DEFAULT 3;

ALTER TABLE materia
  ADD COLUMN equipo_max TINYINT UNSIGNED NOT NULL DEFAULT 4;

ALTER TABLE materia
  ADD COLUMN regla_repeticion ENUM('B', 'A') NOT NULL DEFAULT 'B';

ALTER TABLE materia
  ADD COLUMN usa_practica BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE materia
  ADD COLUMN usa_tarea BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE materia
  ADD COLUMN usa_proyecto BOOLEAN NOT NULL DEFAULT TRUE;
