import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/index'
import LoginPage     from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ProjectsPage from './pages/ProjectsPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import UsersPage from './pages/UsersPage'
import AdverseEventsPage from './pages/AdverseEventsPage'
import MonitoringPage from './pages/MonitoringPage'
import SamplesPage from './pages/SamplesPage'
import ClientsPage from './pages/ClientsPage'
import SettingsPage from './pages/SettingsPage'


function PrivateRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', fontSize:13, color:'#9C9A92' }}>
      Cargando...
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

// Placeholder temporal para páginas no construidas aún
function ComingSoon({ name }: { name: string }) {
  return (
    <div style={{ padding: 32 }}>
      <div style={{ fontSize: 17, fontWeight: 500, color: '#3D3D3A', marginBottom: 6 }}>{name}</div>
      <div style={{ fontSize: 13, color: '#9C9A92' }}>Este módulo está en construcción.</div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/"                  element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
      <Route path="/proyectos"         element={<PrivateRoute><ProjectsPage /></PrivateRoute>} />
      <Route path="/proyectos/:id"     element={<PrivateRoute><ProjectDetailPage /></PrivateRoute>} />
      <Route path="/monitoreo"         element={<PrivateRoute><MonitoringPage /></PrivateRoute>} />
      <Route path="/muestras"          element={<PrivateRoute><SamplesPage /></PrivateRoute>} />
      <Route path="/efectos-adversos"  element={<PrivateRoute><AdverseEventsPage /></PrivateRoute>} />
      <Route path="/clientes"          element={<PrivateRoute><ClientsPage /></PrivateRoute>} />
      <Route path="/usuarios"          element={<PrivateRoute><UsersPage /></PrivateRoute>} />
      <Route path="/configuracion"     element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
      <Route path="*"                  element={<Navigate to="/" replace />} />
    </Routes>
  )
}
