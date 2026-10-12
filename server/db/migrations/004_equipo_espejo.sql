-- ============================================================================
-- Migración 004 — Equipo espejo Práctica/Tarea (Sesión 15)
-- Para bases de datos creadas antes de esta migración. Las instalaciones nuevas
-- ya obtienen la columna desde server/db/schema.sql.
--
-- Los equipos de Práctica y de Tarea comparten integrantes: cada equipo existe
-- como dos filas de `equipo` (una por tipo). Hasta ahora esas dos filas se
-- emparejaban por tener el mismo nombre; equipo.id_equipo_espejo lo hace
-- explícito: cada fila apunta a su gemela (NULL en los equipos de Proyecto y en
-- los que no tienen gemela).
--
-- 1. Columna id_equipo_espejo (auto-referencia a equipo.id_equipo).
-- 2. Índice sobre la columna.
-- 3. Llave foránea.
-- 4. Backfill: empareja las filas existentes con la misma lógica que usaba el
--    código (misma materia, mismo nombre, una de tipo Practica y otra de tipo
--    Tarea, ambas activas). Solo se emparejan los casos sin ambigüedad: si en
--    una materia hay más de un equipo activo de Práctica (o de Tarea) con el
--    mismo nombre, ese nombre se deja sin emparejar para revisarlo a mano. El
--    UPDATE solo toca filas que todavía no tienen espejo, así que repetirlo no
--    cambia nada.
--
-- Los ALTER no son idempotentes (fallan si la columna, el índice o la llave ya
-- existen). Para aplicarlos con comprobación previa contra information_schema,
-- paso por paso:
--   node server/db/migrations/aplicar_004.js
-- ============================================================================

ALTER TABLE equipo
  ADD COLUMN id_equipo_espejo INT NULL AFTER tipo;

ALTER TABLE equipo
  ADD INDEX idx_equipo_espejo (id_equipo_espejo);

ALTER TABLE equipo
  ADD CONSTRAINT fk_equipo_espejo FOREIGN KEY (id_equipo_espejo) REFERENCES equipo(id_equipo);

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
