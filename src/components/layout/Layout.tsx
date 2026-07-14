// src/components/layout/Layout.tsx
import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/index'

const NAV_ITEMS = [
  { to: '/',                icon: 'ti-layout-dashboard', label: 'Dashboard' },
  { to: '/proyectos',       icon: 'ti-folder',            label: 'Proyectos' },
  { section: 'Operaciones' },
  { to: '/monitoreo',       icon: 'ti-eye',               label: 'Monitoreo' },
  { to: '/muestras',        icon: 'ti-test-pipe',         label: 'Muestras' },
  { to: '/efectos-adversos',icon: 'ti-alert-triangle',    label: 'Ef. adversos' },
  { section: 'Gestión' },
  { to: '/clientes',        icon: 'ti-building',          label: 'Clientes' },
  { to: '/usuarios',        icon: 'ti-users',             label: 'Usuarios' },
  { to: '/configuracion',   icon: 'ti-settings',          label: 'Configuración' },
  { to: '/monitoreo-qa',    icon: 'ti-shield-check',    label: 'Calidad (QA)' },

]

const ROLE_LABELS: Record<string, string> = {
  ADMIN:            'Administrador',
  PM_CRIO:          'PM / Gestor CRO',
  INVESTIGATOR:     'Investigador',
  COORDINATOR:      'Coordinadora',
  SPONSOR:          'Sponsor',
  EXTERNAL_MONITOR: 'Monitor Externo',
  FINANCE:          'Finanzas',
  LAB:              'Laboratorio',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)

  const initials = user?.full_name
    ?.split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('') ?? 'U'

  const handleSignOut = async () => {
    setSigningOut(true)
    await signOut()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F5F4F0' }}>
      {/* ── Sidebar ── */}
      <aside style={{
        width: 200, flexShrink: 0,
        background: '#ffffff',
        borderRight: '0.5px solid #E8E6DE',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0,
        zIndex: 40,
      }}>
        {/* Logo */}
        <div style={{ padding: '18px 16px 14px', borderBottom: '0.5px solid #E8E6DE' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#185FA5', letterSpacing: '-0.01em' }}>
            CRIO Manager
          </div>
          <div style={{ fontSize: 11, color: '#9C9A92', marginTop: 2 }}>Centro IMPACT</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
          {NAV_ITEMS.map((item, i) => {
            if ('section' in item) {
              return (
                <div key={i} style={{
                  fontSize: 10, color: '#B4B2A9', padding: '10px 16px 3px',
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                }}>
                  {item.section}
                </div>
              )
            }
            return (
              <NavLink
                key={item.to}
                to={item.to!}
                end={item.to === '/'}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 16px',
                  fontSize: 13,
                  color: isActive ? '#185FA5' : '#73726C',
                  background: isActive ? '#EBF4FF' : 'transparent',
                  borderLeft: isActive ? '2px solid #185FA5' : '2px solid transparent',
                  fontWeight: isActive ? 500 : 400,
                  textDecoration: 'none',
                  transition: 'all 0.1s',
                })}
              >
                <i className={`ti ${item.icon}`} style={{ fontSize: 16, flexShrink: 0 }} />
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        {/* User footer */}
        <div style={{
          padding: '12px 16px',
          borderTop: '0.5px solid #E8E6DE',
          display: 'flex', alignItems: 'center', gap: 9,
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: '#185FA5', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 600, flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 12, fontWeight: 500, color: '#3D3D3A',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {user?.full_name}
            </div>
            <div style={{ fontSize: 11, color: '#9C9A92' }}>
              {ROLE_LABELS[user?.role ?? ''] ?? user?.role}
            </div>
          </div>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            title="Cerrar sesión"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#B4B2A9', fontSize: 16, padding: 2, flexShrink: 0,
            }}
          >
            <i className="ti ti-logout" />
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main style={{ flex: 1, marginLeft: 200, minWidth: 0 }}>
        {children}
      </main>
    </div>
  )
}
