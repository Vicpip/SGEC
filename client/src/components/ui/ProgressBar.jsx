// Barra de progreso de las tarjetas de equipo. `percent` es 0-100.
export default function ProgressBar({ percent, color, width }) {
  return (
    <div className="progress-bar" style={width ? { width } : undefined}>
      <div
        className="progress-fill"
        style={{ width: `${percent}%`, ...(color ? { background: color } : {}) }}
      />
    </div>
  )
}
