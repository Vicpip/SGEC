// Tarjeta de estadística del dashboard (.stat-card).
export default function StatCard({ icon: Icon, iconBg, iconColor, value, valueColor, label, sub, subColor }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: iconBg }}>
        <Icon className="icon-lg" style={{ color: iconColor }} />
      </div>
      <div className="stat-value" style={valueColor ? { color: valueColor } : undefined}>
        {value}
      </div>
      <div className="stat-label">{label}</div>
      {sub && (
        <div className="stat-sub" style={subColor ? { color: subColor } : undefined}>
          {sub}
        </div>
      )}
    </div>
  )
}
