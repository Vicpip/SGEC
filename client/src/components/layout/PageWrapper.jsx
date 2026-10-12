import { useEffect, useState } from 'react'
import { Menu } from 'lucide-react'
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

// Badge con el semestre activo real: lo entrega la API en /auth/login y /auth/me
// (`usuario.semestre_activo`, el semestre activo con fecha de inicio más reciente). Las
// pantallas que pasan sus propias `actions` al topbar lo incluyen con este componente en
// lugar de escribir un semestre fijo.
export function SemestreActivo() {
  const { user } = useAuth()
  return <div className="topbar-semester">{user?.semestre_activo ?? 'Sin semestre activo'}</div>
}

// Layout general de toda pantalla autenticada: sidebar izquierdo fijo + topbar + contenido.
// `title` puede ser texto o JSX (títulos con sufijo en gris, ej. "Equipos · 4BM1").
// `actions` reemplaza el badge de semestre por defecto del lado derecho del topbar —
// úsalo para botones específicos de la pantalla (Volver, Cancelar, Guardar, etc.).
export default function PageWrapper({ title, actions, children }) {
  const { user, rol } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  return (
    <div className="app">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`} onClick={() => setSidebarOpen(false)} />
      <div className="main">
        <header className="topbar">
          <button
            type="button"
            className="hamburger-btn"
            aria-label="Abrir menú"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="icon" />
          </button>
          <div className="topbar-title">{title}</div>
          <div className="topbar-right">
            {actions ?? <SemestreActivo />}
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
