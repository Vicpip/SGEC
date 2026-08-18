import { Routes, Route, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { rutaDashboardPorRol } from '../utils/roleRoutes'

import LoginPage from '../pages/auth/LoginPage'
import DashboardProfesor from '../pages/dashboard/DashboardProfesor'
import DashboardAlumno from '../pages/dashboard/DashboardAlumno'
import ListaMaterias from '../pages/materias/ListaMaterias'
import ListaEquipos from '../pages/equipos/ListaEquipos'
import CrearEquipo from '../pages/equipos/CrearEquipo'
import DetalleEquipo from '../pages/equipos/DetalleEquipo'
import ListaAlumnos from '../pages/alumnos/ListaAlumnos'
import ImportarAlumnos from '../pages/alumnos/ImportarAlumnos'
import ActividadesAlumno from '../pages/alumnos/ActividadesAlumno'
import ListaActividades from '../pages/actividades/ListaActividades'
import DetalleActividad from '../pages/actividades/DetalleActividad'
import PublicarActividad from '../pages/actividades/PublicarActividad'
import BandejaEntregas from '../pages/actividades/BandejaEntregas'
import EntregarActividad from '../pages/actividades/EntregarActividad'
import GeneradorReportes from '../pages/reportes/GeneradorReportes'
import TablonProfesor from '../pages/tablon/TablonProfesor'
import TablonAlumno from '../pages/tablon/TablonAlumno'
import GestionProfesores from '../pages/admin/GestionProfesores'
import Configuracion from '../pages/admin/Configuracion'
import MisEquipos from '../pages/alumno/MisEquipos'
import MisActividades from '../pages/alumno/MisActividades'
import MisCalificaciones from '../pages/alumno/MisCalificaciones'
import Perfil from '../pages/perfil/Perfil'

// Spinner de pantalla completa mientras AuthContext rehidrata la sesión (GET /auth/me).
function FullScreenSpinner() {
  return (
    <div className="app" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 className="icon-xl spin" style={{ color: 'var(--blue)' }} />
    </div>
  )
}

// Valida que el usuario esté autenticado y, si se especifican, tenga uno de los roles
// permitidos. Cada página arma su propio layout con PageWrapper (título, acciones del
// topbar) en lugar de recibir uno genérico aquí.
function ProtectedRoute({ roles, children }) {
  const { isAuthenticated, rol, loading } = useAuth()

  if (loading) {
    return <FullScreenSpinner />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (roles && !roles.includes(rol)) {
    return <Navigate to={rutaDashboardPorRol(rol)} replace />
  }

  return children
}

export default function AppRouter() {
  const { isAuthenticated, rol, loading } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={loading ? <FullScreenSpinner /> : <LoginPage />} />

      <Route
        path="/dashboard"
        element={<ProtectedRoute roles={['Profesor']}><DashboardProfesor /></ProtectedRoute>}
      />
      <Route
        path="/materias"
        element={<ProtectedRoute roles={['Profesor', 'Administrador']}><ListaMaterias /></ProtectedRoute>}
      />
      <Route
        path="/equipos"
        element={<ProtectedRoute roles={['Profesor']}><ListaEquipos /></ProtectedRoute>}
      />
      <Route
        path="/equipos/nuevo"
        element={<ProtectedRoute roles={['Profesor']}><CrearEquipo /></ProtectedRoute>}
      />
      <Route
        path="/equipos/:id"
        element={<ProtectedRoute roles={['Profesor']}><DetalleEquipo /></ProtectedRoute>}
      />
      <Route
        path="/alumnos"
        element={<ProtectedRoute roles={['Profesor']}><ListaAlumnos /></ProtectedRoute>}
      />
      <Route
        path="/alumnos/importar"
        element={<ProtectedRoute roles={['Profesor']}><ImportarAlumnos /></ProtectedRoute>}
      />
      <Route
        path="/alumnos/:id/actividades"
        element={<ProtectedRoute roles={['Profesor']}><ActividadesAlumno /></ProtectedRoute>}
      />
      <Route
        path="/actividades"
        element={<ProtectedRoute roles={['Profesor']}><ListaActividades /></ProtectedRoute>}
      />
      <Route
        path="/actividades/:id"
        element={<ProtectedRoute roles={['Profesor']}><DetalleActividad /></ProtectedRoute>}
      />
      <Route
        path="/actividades/nueva"
        element={<ProtectedRoute roles={['Profesor']}><PublicarActividad /></ProtectedRoute>}
      />
      <Route
        path="/actividades/:id/entregas"
        element={<ProtectedRoute roles={['Profesor']}><BandejaEntregas /></ProtectedRoute>}
      />
      <Route
        path="/reportes"
        element={<ProtectedRoute roles={['Profesor']}><GeneradorReportes /></ProtectedRoute>}
      />
      <Route
        path="/tablon"
        element={<ProtectedRoute roles={['Profesor']}><TablonProfesor /></ProtectedRoute>}
      />
      <Route
        path="/admin/profesores"
        element={<ProtectedRoute roles={['Administrador']}><GestionProfesores /></ProtectedRoute>}
      />
      <Route
        path="/admin/configuracion"
        element={<ProtectedRoute roles={['Administrador']}><Configuracion /></ProtectedRoute>}
      />

      <Route
        path="/alumno/dashboard"
        element={<ProtectedRoute roles={['Alumno']}><DashboardAlumno /></ProtectedRoute>}
      />
      <Route
        path="/alumno/equipos"
        element={<ProtectedRoute roles={['Alumno']}><MisEquipos /></ProtectedRoute>}
      />
      <Route
        path="/alumno/actividades"
        element={<ProtectedRoute roles={['Alumno']}><MisActividades /></ProtectedRoute>}
      />
      <Route
        path="/alumno/actividades/:id"
        element={<ProtectedRoute roles={['Alumno']}><EntregarActividad /></ProtectedRoute>}
      />
      <Route
        path="/alumno/calificaciones"
        element={<ProtectedRoute roles={['Alumno']}><MisCalificaciones /></ProtectedRoute>}
      />
      <Route
        path="/alumno/tablon"
        element={<ProtectedRoute roles={['Alumno']}><TablonAlumno /></ProtectedRoute>}
      />

      <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />

      <Route
        path="/"
        element={
          loading ? (
            <FullScreenSpinner />
          ) : (
            <Navigate to={isAuthenticated ? rutaDashboardPorRol(rol) : '/login'} replace />
          )
        }
      />
      <Route
        path="*"
        element={
          loading ? (
            <FullScreenSpinner />
          ) : (
            <Navigate to={isAuthenticated ? rutaDashboardPorRol(rol) : '/login'} replace />
          )
        }
      />
    </Routes>
  )
}
