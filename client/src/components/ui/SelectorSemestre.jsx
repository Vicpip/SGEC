// Filtro por semestre que acompaña a los selectores de materia. `value` es la clave del
// semestre ('' = todos); `semestres` viene de GET /api/semestres.
export default function SelectorSemestre({ semestres, value, onChange, className = 'select-input', id }) {
  return (
    <select id={id} className={className} value={value} onChange={(e) => onChange(e.target.value)} aria-label="Semestre">
      <option value="">Todos los semestres</option>
      {semestres.map((s) => (
        <option key={s.id_semestre} value={s.clave}>
          {s.clave}
          {s.activo ? '' : ' (inactivo)'}
        </option>
      ))}
    </select>
  )
}
