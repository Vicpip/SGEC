import { useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  BookOpen,
  Users,
  GraduationCap,
  ClipboardList,
  Megaphone,
  BarChart2,
  UserCog,
  Settings,
  Award,
  LogOut,
  X,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

// Ítems de navegación por rol. `match` define el prefijo de ruta que activa el ítem
// cuando difiere de `to` (ej. "Actividades" enlaza a /actividades — pantalla intermedia,
// ver ListaActividades.jsx — pero también debe verse activo en /actividades/nueva,
// /actividades/:id y /actividades/:id/entregas).
const PROFESOR_ITEMS = [
  { key: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', to: '/dashboard' },
  { key: 'materias', icon: BookOpen, label: 'Materias', to: '/materias' },
  { key: 'equipos', icon: Users, label: 'Equipos', to: '/equipos' },
  { key: 'alumnos', icon: GraduationCap, label: 'Alumnos', to: '/alumnos' },
  { key: 'actividades', icon: ClipboardList, label: 'Actividades', to: '/actividades', match: '/actividades' },
  { key: 'tablon', icon: Megaphone, label: 'Tablón de Avisos', to: '/tablon' },
]

const ALUMNO_ITEMS = [
  { key: 'dashboard', icon: LayoutDashboard, label: 'Mi Panel', to: '/alumno/dashboard' },
  { key: 'equipos', icon: Users, label: 'Mis Equipos', to: '/alumno/equipos' },
  { key: 'actividades', icon: ClipboardList, label: 'Mis Actividades', to: '/alumno/actividades' },
  { key: 'calificaciones', icon: Award, label: 'Mis Calificaciones', to: '/alumno/calificaciones' },
  { key: 'tablon', icon: Megaphone, label: 'Tablón de Avisos', to: '/alumno/tablon' },
]

const AVATAR_BG_POR_ROL = {
  Alumno: '#27AE60',
  Administrador: '#E53E3E',
}

function esRutaActiva(pathname, { to, match }) {
  const base = match ?? to
  return pathname === base || pathname.startsWith(`${base}/`)
}

function iniciales(user) {
  if (!user) return ''
  const a = user.nombre?.[0] ?? ''
  const b = user.apellido_paterno?.[0] ?? ''
  return `${a}${b}`.toUpperCase()
}

function NavItem({ icon: Icon, label, to, match, onNavigate, pathname }) {
  return (
    <div
      className={`nav-item${esRutaActiva(pathname, { to, match }) ? ' active' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => onNavigate(to)}
      onKeyDown={(e) => e.key === 'Enter' && onNavigate(to)}
    >
      <Icon className="icon" />
      {label}
    </div>
  )
}

export default function Sidebar({ open = false, onClose }) {
  const { user, rol, logout } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const items = rol === 'Alumno' ? ALUMNO_ITEMS : PROFESOR_ITEMS
  const mostrarReportes = rol === 'Profesor' || rol === 'Administrador'
  const mostrarAdmin = rol === 'Administrador'

  const handleNavigate = (to) => {
    navigate(to)
    onClose?.()
  }

  return (
    <nav className={`sidebar${open ? ' sidebar-open' : ''}`}>
      <div className="sidebar-logo">
        <div className="logo-row">
          <div className="logo-mark">SC</div>
          <div className="logo-text">
            <strong>SGEC</strong>
            <small>ESCOM · IPN</small>
          </div>
        </div>
        <button type="button" className="sidebar-close-btn" aria-label="Cerrar menú" onClick={onClose}>
          <X className="icon" />
        </button>
      </div>

      <div className="sidebar-section">
        <div className="sbl">Principal</div>
        {items.map(({ key, ...item }) => (
          <NavItem key={key} {...item} onNavigate={handleNavigate} pathname={pathname} />
        ))}
      </div>

      {mostrarReportes && (
        <div className="sidebar-section">
          <div className="sbl">Reportes</div>
          <NavItem icon={BarChart2} label="Reportes" to="/reportes" onNavigate={handleNavigate} pathname={pathname} />
        </div>
      )}

      {mostrarAdmin && (
        <div className="sidebar-section">
          <div className="sbl">Administración</div>
          <NavItem icon={UserCog} label="Profesores" to="/admin/profesores" onNavigate={handleNavigate} pathname={pathname} />
          <NavItem icon={Settings} label="Configuración" to="/admin/configuracion" onNavigate={handleNavigate} pathname={pathname} />
        </div>
      )}

      <div className="sidebar-footer">
        <div
          className="sidebar-footer-user"
          role="button"
          tabIndex={0}
          style={{ cursor: 'pointer' }}
          onClick={() => handleNavigate('/perfil')}
          onKeyDown={(e) => e.key === 'Enter' && handleNavigate('/perfil')}
        >
          <div className="avatar-sm" style={AVATAR_BG_POR_ROL[rol] ? { background: AVATAR_BG_POR_ROL[rol] } : undefined}>
            {iniciales(user)}
          </div>
          <div className="sidebar-user">
            <strong>{user ? `${user.nombre} ${user.apellido_paterno}` : ''}</strong>
            <span>{rol}</span>
          </div>
        </div>
        <button type="button" className="sidebar-logout" onClick={logout}>
          <LogOut />
          Cerrar sesión
        </button>
      </div>
    </nav>
  )
}
