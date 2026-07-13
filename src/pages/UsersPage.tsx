// src/pages/UsersPage.tsx
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/index'
import Layout from '../components/layout/Layout'

// ── Types ────────────────────────────────────────────────────
interface AppUser {
  id: string
  full_name: string
  email: string
  role: string
  specialty: string | null
  institution: string | null
  phone: string | null
  is_active: boolean
  created_at: string
}

// ── Label maps ───────────────────────────────────────────────
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

const ROLE_STYLE: Record<string, { bg: string; color: string }> = {
  ADMIN:            { bg: '#FCEBEB', color: '#791F1F' },
  PM_CRIO:          { bg: '#E6F1FB', color: '#0C447C' },
  INVESTIGATOR:     { bg: '#E1F5EE', color: '#085041' },
  COORDINATOR:      { bg: '#FAEEDA', color: '#633806' },
  SPONSOR:          { bg: '#EEEDFE', color: '#26215C' },
  EXTERNAL_MONITOR: { bg: '#F1EFE8', color: '#444441' },
  FINANCE:          { bg: '#E1F5EE', color: '#085041' },
  LAB:              { bg: '#E6F1FB', color: '#0C447C' },
}

const AVATAR_COLORS = [
  '#185FA5','#0F6E56','#633806','#26215C',
  '#444441','#854F0B','#791F1F','#0C447C',
]

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

function Avatar({ name, index }: { name: string; index: number }) {
  return (
    <div style={{
      width: 34, height: 34, borderRadius: '50%',
      background: AVATAR_COLORS[index % AVATAR_COLORS.length],
      color: '#fff', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0,
    }}>
      {initials(name)}
    </div>
  )
}

// ── Modal: Invite / Edit user ─────────────────────────────────
interface UserModalProps {
  mode: 'invite' | 'edit'
  editUser?: AppUser
  onClose: () => void
  onDone: () => void
}

function UserModal({ mode, editUser, onClose, onDone }: UserModalProps) {
  const [form, setForm] = useState({
    email:       editUser?.email       ?? '',
    full_name:   editUser?.full_name   ?? '',
    role:        editUser?.role        ?? 'COORDINATOR',
    specialty:   editUser?.specialty   ?? '',
    institution: editUser?.institution ?? '',
    phone:       editUser?.phone       ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const inp: React.CSSProperties = {
    width: '100%', padding: '7px 10px',
    border: '0.5px solid #D3D1C7', borderRadius: 8,
    fontSize: 13, background: '#F8F7F4', color: '#3D3D3A',
    fontFamily: 'inherit', outline: 'none',
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (mode === 'invite') {
      // 1. Invitar via Supabase Auth (envía email)
      const { data, error: invErr } = await supabase.auth.admin.inviteUserByEmail(
        form.email,
        { data: { full_name: form.full_name, role: form.role } }
      )

      if (invErr) {
        // Si no tenemos acceso admin, usar signUp con password temporal
        // y luego actualizar el perfil
        const tempPassword = Math.random().toString(36).slice(-10) + 'A1!'
        const { data: signData, error: signErr } = await supabase.auth.signUp({
          email:    form.email,
          password: tempPassword,
          options:  { data: { full_name: form.full_name, role: form.role } },
        })

        if (signErr) { setError(signErr.message); setLoading(false); return }

        // Confirmar email manualmente y actualizar perfil
        if (signData.user) {
          await supabase.from('users').upsert({
            id:          signData.user.id,
            email:       form.email,
            full_name:   form.full_name,
            role:        form.role,
            specialty:   form.specialty   || null,
            institution: form.institution || null,
            phone:       form.phone       || null,
          }, { onConflict: 'id' })

          // Confirmar email via SQL (requiere ejecutar manualmente si falla)
          try {
            await supabase.rpc('confirm_user_email', { user_id: signData.user.id })
            } catch {}
        }
      } else if (data.user) {
        await supabase.from('users').upsert({
          id:          data.user.id,
          email:       form.email,
          full_name:   form.full_name,
          role:        form.role,
          specialty:   form.specialty   || null,
          institution: form.institution || null,
          phone:       form.phone       || null,
        }, { onConflict: 'id' })
      }

      setSuccess(true)
    } else if (editUser) {
      // Editar usuario existente
      const { error: updErr } = await supabase
        .from('users')
        .update({
          full_name:   form.full_name,
          role:        form.role,
          specialty:   form.specialty   || null,
          institution: form.institution || null,
          phone:       form.phone       || null,
        })
        .eq('id', editUser.id)

      if (updErr) { setError(updErr.message); setLoading(false); return }
      onDone()
      onClose()
    }

    setLoading(false)
  }

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
    zIndex: 200, display: 'flex', alignItems: 'center',
    justifyContent: 'center', padding: 16,
  }

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: '#fff', borderRadius: 12, width: '100%', maxWidth: 480,
        maxHeight: '88vh', overflowY: 'auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '0.5px solid #E8E6DE' }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: '#3D3D3A' }}>
            <i className={`ti ${mode === 'invite' ? 'ti-user-plus' : 'ti-user-edit'}`}
              style={{ color: '#185FA5', marginRight: 8, fontSize: 16, verticalAlign: -2 }} />
            {mode === 'invite' ? 'Agregar usuario' : 'Editar usuario'}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9C9A92', fontSize: 18 }}>
            <i className="ti ti-x" />
          </button>
        </div>

        {success ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <i className="ti ti-circle-check" style={{ fontSize: 36, color: '#0F6E56', display: 'block', marginBottom: 12 }} />
            <div style={{ fontSize: 15, fontWeight: 500, color: '#3D3D3A', marginBottom: 6 }}>Usuario creado</div>
            <div style={{ fontSize: 13, color: '#9C9A92', marginBottom: 20 }}>
              El usuario fue creado. Para que pueda iniciar sesión, ejecuta esto en el SQL Editor de Supabase:
            </div>
            <div style={{ background: '#F8F7F4', border: '0.5px solid #E8E6DE', borderRadius: 8, padding: '10px 14px', fontSize: 12, fontFamily: 'monospace', textAlign: 'left', color: '#3D3D3A', marginBottom: 20 }}>
              UPDATE auth.users SET email_confirmed_at = NOW() WHERE email = '{form.email}';
            </div>
            <button onClick={() => { onDone(); onClose() }} style={{ background: '#185FA5', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              Listo
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 13 }}>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: '#9C9A92', fontWeight: 500, display: 'block', marginBottom: 3 }}>
                    Nombre completo <span style={{ color: '#A32D2D' }}>*</span>
                  </label>
                  <input style={inp} value={form.full_name}
                    onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                    placeholder="Ej: Dra. Carmen Vega" required />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#9C9A92', fontWeight: 500, display: 'block', marginBottom: 3 }}>
                    Email {mode === 'invite' && <span style={{ color: '#A32D2D' }}>*</span>}
                  </label>
                  <input style={{ ...inp, background: mode === 'edit' ? '#F1EFE8' : '#F8F7F4' }}
                    value={form.email} type="email"
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="correo@institucion.cl"
                    disabled={mode === 'edit'}
                    required={mode === 'invite'} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, color: '#9C9A92', fontWeight: 500, display: 'block', marginBottom: 3 }}>
                  Rol en el sistema <span style={{ color: '#A32D2D' }}>*</span>
                </label>
                <select style={inp} value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))} required>
                  {Object.entries(ROLE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>

                {/* descripción del rol seleccionado */}
                <div style={{ fontSize: 11, color: '#9C9A92', marginTop: 5 }}>
                  {{
                    ADMIN:            '✦ Acceso total al sistema. Gestiona usuarios, catálogos y configuración.',
                    PM_CRIO:          '✦ CRUD de proyectos, tareas, reclutamiento, ética y desviaciones.',
                    INVESTIGATOR:     '✦ Ve y edita proyectos asignados. Puede actualizar notas y reclutamiento.',
                    COORDINATOR:      '✦ Actualiza reclutamiento, reporta EA/SAE, responde hallazgos del monitor.',
                    SPONSOR:          '✦ Solo lectura de sus proyectos: estado, hitos y documentos permitidos.',
                    EXTERNAL_MONITOR: '✦ Agenda y registra visitas, registra hallazgos y aprueba respuestas.',
                    FINANCE:          '✦ Acceso a presupuestos, cotizaciones y gastos.',
                    LAB:              '✦ Gestión de muestras y resultados de laboratorio.',
                  }[form.role]}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: '#9C9A92', fontWeight: 500, display: 'block', marginBottom: 3 }}>Especialidad</label>
                  <input style={inp} value={form.specialty}
                    onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}
                    placeholder="Ej: Hematología, Oncología" />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#9C9A92', fontWeight: 500, display: 'block', marginBottom: 3 }}>Teléfono</label>
                  <input style={inp} value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+56 9 xxxx xxxx" />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, color: '#9C9A92', fontWeight: 500, display: 'block', marginBottom: 3 }}>Institución</label>
                <input style={inp} value={form.institution}
                  onChange={e => setForm(f => ({ ...f, institution: e.target.value }))}
                  placeholder="Ej: Universidad de los Andes, Clínica Las Condes" />
              </div>

              {error && (
                <div style={{ background: '#FCEBEB', border: '0.5px solid #F7C1C1', borderRadius: 8, padding: '9px 12px', fontSize: 12, color: '#791F1F' }}>
                  <i className="ti ti-alert-circle" style={{ fontSize: 13, verticalAlign: -1, marginRight: 5 }} />
                  {error}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 20px', borderTop: '0.5px solid #E8E6DE' }}>
              <button type="button" onClick={onClose} style={{ background: 'transparent', border: '0.5px solid #D3D1C7', color: '#73726C', padding: '7px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button type="submit" disabled={loading} style={{ background: loading ? '#9C9A92' : '#185FA5', color: '#fff', border: 'none', padding: '7px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className={`ti ${mode === 'invite' ? 'ti-user-plus' : 'ti-device-floppy'}`} style={{ fontSize: 13 }} />
                {loading ? 'Guardando...' : mode === 'invite' ? 'Crear usuario' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────
export default function UsersPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers]       = useState<AppUser[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [fRole, setFRole]       = useState('')
  const [modal, setModal]       = useState<'invite' | 'edit' | null>(null)
  const [editTarget, setEditTarget] = useState<AppUser | undefined>()

  const isAdmin = ['ADMIN', 'PM_CRIO'].includes(currentUser?.role ?? '')

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('users')
      .select('*')
      .order('full_name')

    if (fRole)  q = q.eq('role', fRole)
    if (search) q = q.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)

    const { data } = await q
    setUsers((data ?? []) as AppUser[])
    setLoading(false)
  }, [search, fRole])

  useEffect(() => { load() }, [load])

  const toggleActive = async (u: AppUser) => {
    await supabase.from('users').update({ is_active: !u.is_active }).eq('id', u.id)
    load()
  }

  const openEdit = (u: AppUser) => {
    setEditTarget(u)
    setModal('edit')
  }

  // stats por rol
  const byRole = users.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  const selStyle: React.CSSProperties = {
    padding: '6px 10px', border: '0.5px solid #D3D1C7', borderRadius: 8,
    fontSize: 13, background: '#fff', color: '#3D3D3A', cursor: 'pointer',
  }

  return (
    <Layout>
      <div style={{ padding: '24px 28px' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <h1 style={{ fontSize: 17, fontWeight: 500, color: '#3D3D3A', margin: 0 }}>Usuarios</h1>
            <div style={{ fontSize: 12, color: '#9C9A92', marginTop: 3 }}>
              {loading ? 'Cargando...' : `${users.length} usuario${users.length !== 1 ? 's' : ''} registrados`}
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={() => { setEditTarget(undefined); setModal('invite') }}
              style={{ background: '#185FA5', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <i className="ti ti-user-plus" style={{ fontSize: 15 }} />
              Agregar usuario
            </button>
          )}
        </div>

        {/* ── Role stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 18 }}>
          {Object.entries(ROLE_LABELS).slice(0, 4).map(([role, label]) => (
            <div key={role} style={{
              background: '#fff', border: '0.5px solid #E8E6DE',
              borderRadius: 9, padding: '11px 14px',
              cursor: 'pointer',
              borderLeft: fRole === role ? `3px solid ${ROLE_STYLE[role]?.color}` : '0.5px solid #E8E6DE',
            }}
              onClick={() => setFRole(fRole === role ? '' : role)}
            >
              <div style={{ fontSize: 10, color: '#9C9A92', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: ROLE_STYLE[role]?.color ?? '#3D3D3A' }}>
                {byRole[role] ?? 0}
              </div>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div style={{ background: '#fff', border: '0.5px solid #E8E6DE', borderRadius: 10, padding: '11px 14px', marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 160 }}>
            <i className="ti ti-search" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#9C9A92', fontSize: 14, pointerEvents: 'none' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Nombre o email..."
              style={{ ...selStyle, paddingLeft: 30, width: '100%' }} />
          </div>
          <select value={fRole} onChange={e => setFRole(e.target.value)} style={selStyle}>
            <option value="">Todos los roles</option>
            {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {(search || fRole) && (
            <button onClick={() => { setSearch(''); setFRole('') }} style={{ background: '#E6F1FB', color: '#0C447C', border: 'none', padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <i className="ti ti-x" style={{ fontSize: 12 }} /> Limpiar
            </button>
          )}
        </div>

        {/* ── Users list ── */}
        <div style={{ background: '#fff', border: '0.5px solid #E8E6DE', borderRadius: 10, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', fontSize: 13, color: '#9C9A92' }}>Cargando usuarios...</div>
          ) : users.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <i className="ti ti-users-off" style={{ fontSize: 28, color: '#D3D1C7', display: 'block', marginBottom: 10 }} />
              <div style={{ fontSize: 14, color: '#9C9A92' }}>Sin usuarios con los filtros aplicados</div>
            </div>
          ) : users.map((u, i) => {
            const rs = ROLE_STYLE[u.role] ?? { bg: '#F1EFE8', color: '#444441' }
            return (
              <div key={u.id} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '13px 18px',
                borderBottom: i < users.length - 1 ? '0.5px solid #E8E6DE' : 'none',
                opacity: u.is_active ? 1 : 0.5,
              }}>
                <Avatar name={u.full_name} index={i} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#3D3D3A' }}>{u.full_name}</span>
                    {u.id === currentUser?.id && (
                      <span style={{ fontSize: 10, background: '#E6F1FB', color: '#0C447C', padding: '1px 6px', borderRadius: 20 }}>Tú</span>
                    )}
                    {!u.is_active && (
                      <span style={{ fontSize: 10, background: '#F1EFE8', color: '#9C9A92', padding: '1px 6px', borderRadius: 20 }}>Inactivo</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: '#9C9A92' }}>
                    {u.email}
                    {u.specialty && ` · ${u.specialty}`}
                    {u.institution && ` · ${u.institution}`}
                  </div>
                </div>

                <span style={{ ...rs, fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 500, flexShrink: 0 }}>
                  {ROLE_LABELS[u.role] ?? u.role}
                </span>

                {isAdmin && u.id !== currentUser?.id && (
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => openEdit(u)} style={{ padding: '4px 8px', border: '0.5px solid #E8E6DE', borderRadius: 6, background: 'transparent', cursor: 'pointer', color: '#73726C', fontSize: 13 }} title="Editar">
                      <i className="ti ti-edit" />
                    </button>
                    <button onClick={() => toggleActive(u)} style={{ padding: '4px 8px', border: '0.5px solid #E8E6DE', borderRadius: 6, background: 'transparent', cursor: 'pointer', color: u.is_active ? '#854F0B' : '#0F6E56', fontSize: 13 }} title={u.is_active ? 'Desactivar' : 'Activar'}>
                      <i className={`ti ${u.is_active ? 'ti-user-off' : 'ti-user-check'}`} />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── SQL helper note ── */}
        <div style={{ marginTop: 14, background: '#F8F7F4', border: '0.5px solid #E8E6DE', borderRadius: 9, padding: '11px 14px', fontSize: 12, color: '#73726C' }}>
          <i className="ti ti-info-circle" style={{ fontSize: 13, verticalAlign: -1, marginRight: 5, color: '#185FA5' }} />
          Al crear un usuario nuevo, ejecuta este SQL en Supabase para confirmar su email:{' '}
          <code style={{ background: '#E8E6DE', padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>
            UPDATE auth.users SET email_confirmed_at = NOW() WHERE email = 'correo@ejemplo.cl';
          </code>
        </div>
      </div>

      {/* ── Modal ── */}
      {modal && (
        <UserModal
          mode={modal}
          editUser={editTarget}
          onClose={() => { setModal(null); setEditTarget(undefined) }}
          onDone={load}
        />
      )}
    </Layout>
  )
}

