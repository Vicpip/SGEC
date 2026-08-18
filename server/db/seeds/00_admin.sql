-- ============================================================================
-- Seed: usuario Administrador de prueba
-- Contraseña en claro (solo desarrollo): Admin1234!
-- ============================================================================

INSERT INTO usuario (correo_institucional, contrasena_hash, rol, nombre, apellido_paterno, activo)
VALUES (
  'admin@ipn.mx',
  '$2a$10$an4BakNWUPS48aMOr94VPetZTpF.xw8Lka1hhECustAVgk5Ftoms6',
  'Administrador',
  'Admin',
  'ESCOM',
  TRUE
);
