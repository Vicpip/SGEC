// Etiqueta de estatus/tipo. `variant` debe coincidir con una clase .badge-* de index.css
// (green | blue | yellow | orange | red | gray | navy | unread).
export default function Badge({ variant = 'gray', children, style, className = '', ...props }) {
  return (
    <span className={`badge badge-${variant} ${className}`.trim()} style={style} {...props}>
      {children}
    </span>
  )
}
