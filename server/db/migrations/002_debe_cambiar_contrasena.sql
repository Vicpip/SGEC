-- ============================================================================
-- Migración 002 — Cambio obligatorio de contraseña (Sesión 13)
-- Agrega usuario.debe_cambiar_contrasena sobre bases de datos creadas antes de
-- esta migración. Las instalaciones nuevas ya la obtienen desde
-- server/db/schema.sql.
--
-- TRUE = la cuenta tiene una contraseña temporal generada por el sistema (alta
-- manual, importación Excel o "Restablecer acceso") y debe cambiarla en su
-- primer inicio de sesión. Las cuentas existentes quedan en FALSE.
--
-- Este ALTER no es idempotente (falla si la columna ya existe). Para aplicarlo
-- con comprobación previa contra information_schema:
--   node server/db/migrations/aplicar_002.js
-- ============================================================================

ALTER TABLE usuario
  ADD COLUMN debe_cambiar_contrasena BOOLEAN NOT NULL DEFAULT FALSE AFTER reset_token_expira;
