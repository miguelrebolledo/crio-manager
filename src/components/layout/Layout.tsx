// src/components/layout/Layout.tsx
import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/index'

const NAV_ITEMS = [
  { to: '/sponsor',          icon: 'ti-building',         label: 'Mi portal',     sponsorOnly: true  },
  { to: '/',                 icon: 'ti-layout-dashboard', label: 'Dashboard',     hideForSponsor: true },
  { to: '/proyectos',        icon: 'ti-folder',           label: 'Proyectos',     hideForSponsor: true },
  { section: 'Operaciones',  hideForSponsor: true },
  { to: '/monitoreo',        icon: 'ti-eye',              label: 'Monitoreo',     hideForSponsor: true },
  { to: '/muestras',         icon: 'ti-test-pipe',        label: 'Muestras',      hideForSponsor: true },
  { to: '/efectos-adversos', icon: 'ti-alert-triangle',   label: 'Ef. adversos',  hideForSponsor: true },
  { section: 'Gestión',      hideForSponsor: true },
  { to: '/monitoreo-qa',     icon: 'ti-shield-check',     label: 'Calidad (QA)',  hideForSponsor: true },
  { to: '/clientes',         icon: 'ti-building',         label: 'Clientes',      hideForSponsor: true },
  { to: '/finanzas',         icon: 'ti-cash',             label: 'Finanzas',      hideForSponsor: true },
  { to: '/usuarios',         icon: 'ti-users',            label: 'Usuarios',      hideForSponsor: true },
  { to: '/configuracion',    icon: 'ti-settings',         label: 'Configuración', hideForSponsor: true },
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
  QA:               'Calidad (QA)',
}

const C = {
  navy:        '#0A2E5C',
  cyan:        '#00BFFF',
  teal:        '#00CBA5',
  white:       '#FFFFFF',
  whiteAlpha6: 'rgba(255,255,255,0.6)',
  whiteAlpha4: 'rgba(255,255,255,0.4)',
  whiteAlpha1: 'rgba(255,255,255,0.08)',
  whiteAlpha2: 'rgba(255,255,255,0.12)',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)

  const isSponsor = user?.role === 'SPONSOR'

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

  // Filtrar items según rol
  const visibleItems = NAV_ITEMS.filter(item => {
    if (isSponsor) {
      // Sponsor solo ve su portal
      if ('sponsorOnly' in item) return true
      if ('hideForSponsor' in item) return false
      return false
    }
    // Resto de roles no ven el portal del sponsor
    if ('sponsorOnly' in item) return false
    return true
  })

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F5F4F0' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: 210, flexShrink: 0,
        background: C.navy,
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0,
        zIndex: 40,
      }}>

        {/* Logo */}
        <div style={{
          padding: '18px 16px 16px',
          borderBottom: `1px solid ${C.whiteAlpha1}`,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: C.cyan,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <i className="ti ti-dna" style={{ fontSize: 17, color: C.navy }} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.white, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
              CRIO Manager
            </div>
            <div style={{ fontSize: 10, color: C.whiteAlpha4, marginTop: 2 }}>
              {isSponsor ? 'Portal del Sponsor' : 'Centro IMPACT'}
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
          {visibleItems.map((item, i) => {
            if ('section' in item) {
              return (
                <div key={i} style={{
                  fontSize: 10, color: C.whiteAlpha4,
                  padding: '12px 10px 4px',
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  fontWeight: 500,
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
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '7px 10px',
                  borderRadius: 8,
                  marginBottom: 2,
                  fontSize: 13,
                  color: isActive ? C.navy : C.whiteAlpha6,
                  background: isActive ? C.cyan : 'transparent',
                  fontWeight: isActive ? 600 : 400,
                  textDecoration: 'none',
                  transition: 'background 0.1s, color 0.1s',
                })}
                onMouseEnter={e => {
                  const el = e.currentTarget
                  if (!el.classList.contains('active')) {
                    el.style.background = C.whiteAlpha2
                    el.style.color = C.white
                  }
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget
                  if (!el.classList.contains('active')) {
                    el.style.background = 'transparent'
                    el.style.color = C.whiteAlpha6
                  }
                }}
              >
                {({ isActive }) => (
                  <>
                    <i className={`ti ${item.icon}`} style={{
                      fontSize: 16, flexShrink: 0,
                      color: isActive ? C.navy : 'inherit',
                    }} />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* User footer */}
        <div style={{
          padding: '12px 14px',
          borderTop: `1px solid ${C.whiteAlpha1}`,
          display: 'flex', alignItems: 'center', gap: 9,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: C.teal,
            color: C.navy,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 12, fontWeight: 500, color: C.white,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {user?.full_name}
            </div>
            <div style={{ fontSize: 10, color: C.whiteAlpha4, marginTop: 1 }}>
              {ROLE_LABELS[user?.role ?? ''] ?? user?.role}
            </div>
          </div>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            title="Cerrar sesión"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: C.whiteAlpha4, fontSize: 17, padding: 2, flexShrink: 0,
              transition: 'color 0.1s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = C.white)}
            onMouseLeave={e => (e.currentTarget.style.color = C.whiteAlpha4)}
          >
            <i className="ti ti-logout" />
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main style={{ flex: 1, marginLeft: 210, minWidth: 0 }}>
        {children}
      </main>
    </div>
  )
}
