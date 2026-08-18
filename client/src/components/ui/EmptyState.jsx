import { Inbox } from 'lucide-react'

// Estado vacío genérico para tablas/listas sin datos.
export default function EmptyState({ icon: Icon = Inbox, title = 'Sin resultados', description }) {
  return (
    <div style={{ padding: '48px 24px', textAlign: 'center' }}>
      <Icon className="icon-xl" style={{ color: 'var(--gray-200)', marginBottom: 12 }} />
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-600)', marginBottom: 4 }}>{title}</div>
      {description && <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>{description}</div>}
    </div>
  )
}
