SET NAMES utf8mb4;

-- ============================================================================
-- Seed: segundo semestre de prueba (2026/2), activo y sin materias.
-- Sirve para probar el semestre activo del topbar (se muestra el activo con la
-- fecha de inicio más reciente) y el filtro por semestre de los selectores de
-- materia: las materias de ejemplo pertenecen todas a 2026/1.
-- ============================================================================

INSERT INTO semestre (clave, fecha_inicio, fecha_fin, activo)
VALUES ('2026/2', '2026-08-17', '2026-12-18', TRUE);
