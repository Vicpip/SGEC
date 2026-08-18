const SIZE_CLASS = { xs: 'avatar-xs', sm: 'avatar-sm', lg: 'avatar-lg' }

// Círculo con iniciales. `bg` acepta cualquier color CSS y sobreescribe el azul por defecto.
export default function Avatar({ initials, size = 'sm', bg, style, ...props }) {
  return (
    <div
      className={SIZE_CLASS[size] ?? 'avatar-sm'}
      style={{ ...(bg ? { background: bg } : {}), ...style }}
      {...props}
    >
      {initials}
    </div>
  )
}
