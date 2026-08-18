import Sidebar from './Sidebar'
import { useAuth } from '../../context/AuthContext'

const AVATAR_BG_POR_ROL = {
  Alumno: '#27AE60',
  Administrador: '#E53E3E',
}

function iniciales(user) {
  if (!user) return ''
  const a = user.nombre?.[0] ?? ''
  const b = user.apellido_paterno?.[0] ?? ''
  return `${a}${b}`.toUpperCase()
}

// Layout general de toda pantalla autenticada: sidebar izquierdo fijo + topbar + contenido.
// `title` puede ser texto o JSX (títulos con sufijo en gris, ej. "Equipos · 4BM1").
// `actions` reemplaza el badge de semestre por defecto del lado derecho del topbar —
// úsalo para botones específicos de la pantalla (Volver, Cancelar, Guardar, campana, etc.).
export default function PageWrapper({ title, actions, children }) {
  const { user, rol } = useAuth()
  const semestre = user?.semestre_activo ?? '2026/1'

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <header className="topbar">
          <div className="topbar-title">{title}</div>
          <div className="topbar-right">
            {actions ?? <div className="topbar-semester">{semestre}</div>}
            <div
              className="avatar-sm"
              style={AVATAR_BG_POR_ROL[rol] ? { background: AVATAR_BG_POR_ROL[rol] } : undefined}
            >
              {iniciales(user)}
            </div>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  )
}
