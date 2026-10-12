SET NAMES utf8mb4;

-- ============================================================================
-- Seed: equipos (Practica/Tarea/Proyecto) e integrantes
-- Practica y Tarea comparten integrantes (una fila por tipo, mismos alumnos);
-- Proyecto usa una reasignación distinta de integrantes dentro de la materia.
-- ============================================================================

-- ── BD2026 ───────────────────────────────────────────────────────────────
INSERT INTO equipo (id_materia, nombre, tipo)
VALUES
  ((SELECT id_materia FROM materia WHERE clave = 'BD2026'), 'Equipo 1', 'Practica'),
  ((SELECT id_materia FROM materia WHERE clave = 'BD2026'), 'Equipo 1', 'Tarea'),
  ((SELECT id_materia FROM materia WHERE clave = 'BD2026'), 'Equipo 2', 'Practica'),
  ((SELECT id_materia FROM materia WHERE clave = 'BD2026'), 'Equipo 2', 'Tarea'),
  ((SELECT id_materia FROM materia WHERE clave = 'BD2026'), 'Proyecto 1', 'Proyecto'),
  ((SELECT id_materia FROM materia WHERE clave = 'BD2026'), 'Proyecto 2', 'Proyecto');

-- ── ISW2026 ──────────────────────────────────────────────────────────────
INSERT INTO equipo (id_materia, nombre, tipo)
VALUES
  ((SELECT id_materia FROM materia WHERE clave = 'ISW2026'), 'Equipo 1', 'Practica'),
  ((SELECT id_materia FROM materia WHERE clave = 'ISW2026'), 'Equipo 1', 'Tarea'),
  ((SELECT id_materia FROM materia WHERE clave = 'ISW2026'), 'Equipo 2', 'Practica'),
  ((SELECT id_materia FROM materia WHERE clave = 'ISW2026'), 'Equipo 2', 'Tarea'),
  ((SELECT id_materia FROM materia WHERE clave = 'ISW2026'), 'Proyecto 1', 'Proyecto'),
  ((SELECT id_materia FROM materia WHERE clave = 'ISW2026'), 'Proyecto 2', 'Proyecto');

-- ── PWEB2026 ─────────────────────────────────────────────────────────────
INSERT INTO equipo (id_materia, nombre, tipo)
VALUES
  ((SELECT id_materia FROM materia WHERE clave = 'PWEB2026'), 'Equipo 1', 'Practica'),
  ((SELECT id_materia FROM materia WHERE clave = 'PWEB2026'), 'Equipo 1', 'Tarea'),
  ((SELECT id_materia FROM materia WHERE clave = 'PWEB2026'), 'Equipo 2', 'Practica'),
  ((SELECT id_materia FROM materia WHERE clave = 'PWEB2026'), 'Equipo 2', 'Tarea'),
  ((SELECT id_materia FROM materia WHERE clave = 'PWEB2026'), 'Proyecto 1', 'Proyecto'),
  ((SELECT id_materia FROM materia WHERE clave = 'PWEB2026'), 'Proyecto 2', 'Proyecto');

-- ── Integrantes: BD2026 ──────────────────────────────────────────────────
-- Equipo 1 (Practica + Tarea): Sofía(045), 046, 047
INSERT INTO equipo_alumno (id_equipo, id_alumno)
VALUES
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'BD2026') AND nombre = 'Equipo 1' AND tipo = 'Practica'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630045')),
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'BD2026') AND nombre = 'Equipo 1' AND tipo = 'Practica'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630046')),
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'BD2026') AND nombre = 'Equipo 1' AND tipo = 'Practica'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630047')),
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'BD2026') AND nombre = 'Equipo 1' AND tipo = 'Tarea'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630045')),
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'BD2026') AND nombre = 'Equipo 1' AND tipo = 'Tarea'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630046')),
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'BD2026') AND nombre = 'Equipo 1' AND tipo = 'Tarea'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630047')),
  -- Equipo 2 (Practica + Tarea): 048, 049, 050
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'BD2026') AND nombre = 'Equipo 2' AND tipo = 'Practica'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630048')),
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'BD2026') AND nombre = 'Equipo 2' AND tipo = 'Practica'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630049')),
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'BD2026') AND nombre = 'Equipo 2' AND tipo = 'Practica'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630050')),
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'BD2026') AND nombre = 'Equipo 2' AND tipo = 'Tarea'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630048')),
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'BD2026') AND nombre = 'Equipo 2' AND tipo = 'Tarea'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630049')),
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'BD2026') AND nombre = 'Equipo 2' AND tipo = 'Tarea'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630050')),
  -- Proyecto 1: Sofía(045), 048, 050
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'BD2026') AND nombre = 'Proyecto 1' AND tipo = 'Proyecto'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630045')),
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'BD2026') AND nombre = 'Proyecto 1' AND tipo = 'Proyecto'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630048')),
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'BD2026') AND nombre = 'Proyecto 1' AND tipo = 'Proyecto'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630050')),
  -- Proyecto 2: 046, 047, 049
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'BD2026') AND nombre = 'Proyecto 2' AND tipo = 'Proyecto'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630046')),
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'BD2026') AND nombre = 'Proyecto 2' AND tipo = 'Proyecto'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630047')),
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'BD2026') AND nombre = 'Proyecto 2' AND tipo = 'Proyecto'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630049'));

-- ── Integrantes: ISW2026 ─────────────────────────────────────────────────
-- Equipo 1 (Practica + Tarea): 050, 051, 052
INSERT INTO equipo_alumno (id_equipo, id_alumno)
VALUES
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'ISW2026') AND nombre = 'Equipo 1' AND tipo = 'Practica'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630050')),
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'ISW2026') AND nombre = 'Equipo 1' AND tipo = 'Practica'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630051')),
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'ISW2026') AND nombre = 'Equipo 1' AND tipo = 'Practica'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630052')),
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'ISW2026') AND nombre = 'Equipo 1' AND tipo = 'Tarea'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630050')),
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'ISW2026') AND nombre = 'Equipo 1' AND tipo = 'Tarea'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630051')),
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'ISW2026') AND nombre = 'Equipo 1' AND tipo = 'Tarea'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630052')),
  -- Equipo 2 (Practica + Tarea): 053, 054, 055
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'ISW2026') AND nombre = 'Equipo 2' AND tipo = 'Practica'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630053')),
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'ISW2026') AND nombre = 'Equipo 2' AND tipo = 'Practica'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630054')),
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'ISW2026') AND nombre = 'Equipo 2' AND tipo = 'Practica'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630055')),
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'ISW2026') AND nombre = 'Equipo 2' AND tipo = 'Tarea'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630053')),
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'ISW2026') AND nombre = 'Equipo 2' AND tipo = 'Tarea'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630054')),
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'ISW2026') AND nombre = 'Equipo 2' AND tipo = 'Tarea'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630055')),
  -- Proyecto 1: 050, 052, 054
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'ISW2026') AND nombre = 'Proyecto 1' AND tipo = 'Proyecto'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630050')),
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'ISW2026') AND nombre = 'Proyecto 1' AND tipo = 'Proyecto'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630052')),
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'ISW2026') AND nombre = 'Proyecto 1' AND tipo = 'Proyecto'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630054')),
  -- Proyecto 2: 051, 053, 055
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'ISW2026') AND nombre = 'Proyecto 2' AND tipo = 'Proyecto'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630051')),
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'ISW2026') AND nombre = 'Proyecto 2' AND tipo = 'Proyecto'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630053')),
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'ISW2026') AND nombre = 'Proyecto 2' AND tipo = 'Proyecto'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630055'));

-- ── Integrantes: PWEB2026 ────────────────────────────────────────────────
-- Equipo 1 (Practica + Tarea): 048, 049, 054
INSERT INTO equipo_alumno (id_equipo, id_alumno)
VALUES
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'PWEB2026') AND nombre = 'Equipo 1' AND tipo = 'Practica'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630048')),
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'PWEB2026') AND nombre = 'Equipo 1' AND tipo = 'Practica'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630049')),
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'PWEB2026') AND nombre = 'Equipo 1' AND tipo = 'Practica'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630054')),
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'PWEB2026') AND nombre = 'Equipo 1' AND tipo = 'Tarea'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630048')),
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'PWEB2026') AND nombre = 'Equipo 1' AND tipo = 'Tarea'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630049')),
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'PWEB2026') AND nombre = 'Equipo 1' AND tipo = 'Tarea'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630054')),
  -- Equipo 2 (Practica + Tarea): 055, 056, 057
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'PWEB2026') AND nombre = 'Equipo 2' AND tipo = 'Practica'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630055')),
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'PWEB2026') AND nombre = 'Equipo 2' AND tipo = 'Practica'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630056')),
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'PWEB2026') AND nombre = 'Equipo 2' AND tipo = 'Practica'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630057')),
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'PWEB2026') AND nombre = 'Equipo 2' AND tipo = 'Tarea'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630055')),
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'PWEB2026') AND nombre = 'Equipo 2' AND tipo = 'Tarea'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630056')),
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'PWEB2026') AND nombre = 'Equipo 2' AND tipo = 'Tarea'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630057')),
  -- Proyecto 1: 048, 054, 056
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'PWEB2026') AND nombre = 'Proyecto 1' AND tipo = 'Proyecto'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630048')),
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'PWEB2026') AND nombre = 'Proyecto 1' AND tipo = 'Proyecto'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630054')),
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'PWEB2026') AND nombre = 'Proyecto 1' AND tipo = 'Proyecto'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630056')),
  -- Proyecto 2: 049, 055, 057
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'PWEB2026') AND nombre = 'Proyecto 2' AND tipo = 'Proyecto'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630049')),
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'PWEB2026') AND nombre = 'Proyecto 2' AND tipo = 'Proyecto'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630055')),
  ((SELECT id_equipo FROM equipo WHERE id_materia = (SELECT id_materia FROM materia WHERE clave = 'PWEB2026') AND nombre = 'Proyecto 2' AND tipo = 'Proyecto'), (SELECT id_alumno FROM alumno WHERE boleta = '2023630057'));

-- ── Espejo Practica/Tarea ────────────────────────────────────────────────
-- Enlaza cada equipo de Práctica con su gemelo de Tarea (misma materia y mismo
-- nombre) mediante id_equipo_espejo. Es la misma sentencia del backfill de la
-- migración 004.
UPDATE equipo e
JOIN (
  SELECT id_materia, nombre,
         MIN(CASE WHEN tipo = 'Practica' THEN id_equipo END) AS id_practica,
         MIN(CASE WHEN tipo = 'Tarea' THEN id_equipo END) AS id_tarea
  FROM equipo
  WHERE activo = TRUE AND tipo IN ('Practica', 'Tarea') AND id_equipo_espejo IS NULL
  GROUP BY id_materia, nombre
  HAVING SUM(tipo = 'Practica') = 1 AND SUM(tipo = 'Tarea') = 1
) par ON e.id_equipo IN (par.id_practica, par.id_tarea)
SET e.id_equipo_espejo = IF(e.id_equipo = par.id_practica, par.id_tarea, par.id_practica);
