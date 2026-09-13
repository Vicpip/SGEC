-- ============================================================================
-- Migración 001 — Recuperación de contraseña
-- Agrega las columnas de reset_token a `usuario` sobre bases de datos creadas
-- antes de esta migración. Las instalaciones nuevas ya las obtienen desde
-- server/db/schema.sql.
-- ============================================================================

ALTER TABLE usuario
  ADD COLUMN reset_token_hash   VARCHAR(255) NULL AFTER notificaciones_email,
  ADD COLUMN reset_token_expira DATETIME     NULL AFTER reset_token_hash;
