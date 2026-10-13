-- ============================================================================
-- Migración 005 — Invalidación de sesiones al cambiar la contraseña (Sesión 16)
-- Agrega usuario.contrasena_cambiada_en sobre bases de datos creadas antes de
-- esta migración. Las instalaciones nuevas ya la obtienen desde
-- server/db/schema.sql.
--
-- Guarda el momento del último cambio de contraseña (change-password,
-- reset-password o "Restablecer acceso"). auth.middleware.js rechaza con 401
-- todo token JWT emitido antes de ese momento. Las cuentas existentes quedan en
-- NULL: sus sesiones actuales siguen siendo válidas hasta que cambien la
-- contraseña.
--
-- Este ALTER no es idempotente (falla si la columna ya existe). Para aplicarlo
-- con comprobación previa contra information_schema:
--   node server/db/migrations/aplicar_005.js
-- ============================================================================

ALTER TABLE usuario
  ADD COLUMN contrasena_cambiada_en DATETIME NULL AFTER debe_cambiar_contrasena;
