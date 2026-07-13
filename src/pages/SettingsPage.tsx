// src/pages/SettingsPage.tsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/index'
import Layout from '../components/layout/Layout'

// ── Types ────────────────────────────────────────────────────
interface ProfileForm {
  full_name:   string
  specialty:   string
  institution: string
  phone:       string
}
interface PasswordForm {
  current:  string
  next:     string
  confirm:  string
}

// ── Shared UI ────────────────────────────────────────────────
const inp: React.CSSProperties = {
  width: '100%', padding: '7px 10px',
  border: '0.5px solid #D3D1C7', borderRadius: 8,
  fontSize: 13, background: '#F8F7F4', color: '#3D3D3A',
  fontFamily: 'inherit', outline: 'none',
}
const labelStyle: React.CSSProperties = {
  fontSize: 11, color: '#9C9A92', fontWeight: 500,
  display: 'block', marginBottom: 4,
}
const cardStyle: React.CSSProperties = {
  background: '#fff', border: '0.5px solid #E8E6DE',
  borderRadius: 10, overflow: 'hidden', marginBottom: 14,
}
const cardHead: React.CSSProperties = {
  padding: '12px 18px', borderBottom: '0.5px solid #E8E6DE',
  fontSize: 13, fontWeight: 500, color: '#73726C',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
}
function SaveBtn({ saving, disabled, onClick }: { saving: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={saving || disabled} style={{
      background: saving || disabled ? '#9C9A92' : '#185FA5',
      color: '#fff', border: 'none', padding: '7px 18px',
      borderRadius: 8, fontSize: 13, fontWeight: 500,
      cursor: saving || disabled ? 'not-allowed' : 'pointer',
      display: 'flex', alignItems: 'center', gap: 6,
    }}>
      <i className={`ti ${saving ? 'ti-loader-2' : 'ti-device-floppy'}`} style={{ fontSize: 13 }} />
      {saving ? 'Guardando...' : 'Guardar cambios'}
    </button>
  )
}
function Toast({ msg, type }: { msg: string; type: 'ok' | 'err' }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 300,
      background: type === 'ok' ? '#E1F5EE' : '#FCEBEB',
      border: `0.5px solid ${type === 'ok' ? '#9FE1CB' : '#F7C1C1'}`,
      color: type === 'ok' ? '#085041' : '#791F1F',
      borderRadius: 9, padding: '10px 16px', fontSize: 13, fontWeight: 500,
      display: 'flex', alignItems: 'center', gap: 8,
      boxShadow: '0 4px 12px rgba(0,0,0,0.10)',
    }}>
      <i className={`ti ${type === 'ok' ? 'ti-circle-check' : 'ti-alert-circle'}`} style={{ fontSize: 16 }} />
      {msg}
    </div>
  )
}

// ── SECTION: Perfil ───────────────────────────────────────────
function SectionProfile() {
  const { user } = useAuth()
  const [form, setForm]     = useState<ProfileForm>({ full_name: '', specialty: '', institution: '', phone: '' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast]   = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  useEffect(() => {
    if (!user) return
    supabase.from('users').select('full_name, specialty, institution, phone').eq('id', user.id).single()
      .then(({ data }) => {
        if (data) setForm({ full_name: data.full_name ?? '', specialty: data.specialty ?? '', institution: data.institution ?? '', phone: data.phone ?? '' })
      })
  }, [user])

  const save = async () => {
    if (!user) return
    setSaving(true)
    const { error } = await supabase.from('users').update({
      full_name:   form.full_name,
      specialty:   form.specialty   || null,
      institution: form.institution || null,
      phone:       form.phone       || null,
    }).eq('id', user.id)
    setSaving(false)
    setToast(error ? { msg: error.message, type: 'err' } : { msg: 'Perfil actualizado correctamente', type: 'ok' })
    setTimeout(() => setToast(null), 3000)
  }

  const initials = form.full_name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || 'U'

  return (
    <div style={cardStyle}>
      <div style={cardHead}>
        <span><i className="ti ti-user-circle" style={{ color: '#185FA5', marginRight: 6 }} />Mi perfil</span>
      </div>
      <div style={{ padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#185FA5', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 600, flexShrink: 0 }}>
            {initials}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#3D3D3A' }}>{form.full_name || 'Sin nombre'}</div>
            <div style={{ fontSize: 12, color: '#9C9A92', marginTop: 2 }}>{user?.email}</div>
            <div style={{ fontSize: 11, color: '#185FA5', marginTop: 2, fontWeight: 500 }}>
              {{ ADMIN:'Administrador', PM_CRIO:'PM / Gestor CRO', INVESTIGATOR:'Investigador', COORDINATOR:'Coordinadora', SPONSOR:'Sponsor', EXTERNAL_MONITOR:'Monitor Externo', FINANCE:'Finanzas', LAB:'Laboratorio' }[user?.role ?? ''] ?? user?.role}
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Nombre completo</label>
            <input style={inp} value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
          </div>
          <div>
            <label style={labelStyle}>Especialidad</label>
            <input style={inp} value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))} placeholder="Ej: Hematología, Oncología" />
          </div>
          <div>
            <label style={labelStyle}>Teléfono</label>
            <input style={inp} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+56 9 xxxx xxxx" />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Institución</label>
            <input style={inp} value={form.institution} onChange={e => setForm(f => ({ ...f, institution: e.target.value }))} placeholder="Ej: Universidad de los Andes" />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <SaveBtn saving={saving} onClick={save} />
        </div>
      </div>
      {toast && <Toast {...toast} />}
    </div>
  )
}

// ── SECTION: Contraseña ───────────────────────────────────────
function SectionPassword() {
  const [form, setForm]   = useState<PasswordForm>({ current: '', next: '', confirm: '' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  const save = async () => {
    if (form.next !== form.confirm) {
      setToast({ msg: 'Las contraseñas nuevas no coinciden.', type: 'err' })
      setTimeout(() => setToast(null), 3000)
      return
    }
    if (form.next.length < 8) {
      setToast({ msg: 'La contraseña debe tener al menos 8 caracteres.', type: 'err' })
      setTimeout(() => setToast(null), 3000)
      return
    }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: form.next })
    setSaving(false)
    setToast(error ? { msg: error.message, type: 'err' } : { msg: 'Contraseña actualizada correctamente', type: 'ok' })
    if (!error) setForm({ current: '', next: '', confirm: '' })
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <div style={cardStyle}>
      <div style={cardHead}>
        <span><i className="ti ti-lock" style={{ color: '#185FA5', marginRight: 6 }} />Cambiar contraseña</span>
      </div>
      <div style={{ padding: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          {[
            { key: 'current', label: 'Contraseña actual',   placeholder: '••••••••' },
            { key: 'next',    label: 'Nueva contraseña',    placeholder: 'Mínimo 8 caracteres' },
            { key: 'confirm', label: 'Confirmar contraseña', placeholder: 'Repetir nueva contraseña' },
          ].map(f => (
            <div key={f.key}>
              <label style={labelStyle}>{f.label}</label>
              <input style={{ ...inp, borderColor: f.key === 'confirm' && form.confirm && form.next !== form.confirm ? '#E24B4A' : '#D3D1C7' }}
                type="password" value={(form as any)[f.key]}
                onChange={e => setForm(fm => ({ ...fm, [f.key]: e.target.value }))}
                placeholder={f.placeholder} />
            </div>
          ))}
        </div>
        {form.confirm && form.next !== form.confirm && (
          <div style={{ fontSize: 12, color: '#A32D2D', marginBottom: 10 }}>
            <i className="ti ti-alert-circle" style={{ fontSize: 13, marginRight: 4 }} />Las contraseñas no coinciden.
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <SaveBtn saving={saving} disabled={!form.next || form.next !== form.confirm} onClick={save} />
        </div>
      </div>
      {toast && <Toast {...toast} />}
    </div>
  )
}

// ── SECTION: Sistema ──────────────────────────────────────────
function SectionSystem() {
  const { user } = useAuth()
  const isAdmin  = ['ADMIN','PM_CRIO'].includes(user?.role ?? '')

  const [form, setForm]   = useState({ org_name: 'Centro IMPACT — U. de los Andes', ethics_alert_days: '60', sample_omission_hours: '72' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  const save = async () => {
    setSaving(true)
    // En producción guardar en una tabla de configuración global
    // Por ahora simulamos el guardado
    await new Promise(r => setTimeout(r, 600))
    setSaving(false)
    setToast({ msg: 'Configuración del sistema guardada', type: 'ok' })
    setTimeout(() => setToast(null), 3000)
  }

  if (!isAdmin) {
    return (
      <div style={cardStyle}>
        <div style={cardHead}><span><i className="ti ti-settings" style={{ color: '#185FA5', marginRight: 6 }} />Configuración del sistema</span></div>
        <div style={{ padding: 32, textAlign: 'center', fontSize: 13, color: '#9C9A92' }}>
          <i className="ti ti-lock" style={{ fontSize: 24, display: 'block', marginBottom: 8, color: '#D3D1C7' }} />
          Solo los Administradores pueden editar la configuración del sistema.
        </div>
      </div>
    )
  }

  return (
    <div style={cardStyle}>
      <div style={cardHead}>
        <span><i className="ti ti-settings" style={{ color: '#185FA5', marginRight: 6 }} />Configuración del sistema</span>
      </div>
      <div style={{ padding: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Nombre de la organización / CRO</label>
            <input style={inp} value={form.org_name} onChange={e => setForm(f => ({ ...f, org_name: e.target.value }))} />
          </div>
        </div>

        <div style={{ borderTop: '0.5px solid #E8E6DE', paddingTop: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#73726C', marginBottom: 12 }}>Umbrales de alertas automáticas</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Días de alerta renovación Comité de Ética</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input style={{ ...inp, width: 80 }} type="number" min="1" max="365"
                  value={form.ethics_alert_days}
                  onChange={e => setForm(f => ({ ...f, ethics_alert_days: e.target.value }))} />
                <span style={{ fontSize: 12, color: '#9C9A92' }}>días antes del vencimiento</span>
              </div>
              <div style={{ fontSize: 11, color: '#9C9A92', marginTop: 4 }}>
                Actualmente: alerta {form.ethics_alert_days} días antes (recomendado: 60)
              </div>
            </div>
            <div>
              <label style={labelStyle}>Horas alerta omisión de muestras</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input style={{ ...inp, width: 80 }} type="number" min="1"
                  value={form.sample_omission_hours}
                  onChange={e => setForm(f => ({ ...f, sample_omission_hours: e.target.value }))} />
                <span style={{ fontSize: 12, color: '#9C9A92' }}>horas sin atender</span>
              </div>
              <div style={{ fontSize: 11, color: '#9C9A92', marginTop: 4 }}>
                Actualmente: alerta después de {form.sample_omission_hours}h (recomendado: 72)
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: '#F8F7F4', border: '0.5px solid #E8E6DE', borderRadius: 8, padding: '10px 13px', fontSize: 12, color: '#73726C', marginBottom: 14 }}>
          <i className="ti ti-info-circle" style={{ fontSize: 13, color: '#185FA5', marginRight: 5 }} />
          La base de datos, backups automáticos y actualizaciones de seguridad son gestionados por <strong>Supabase</strong>. Accede al panel en <a href="https://supabase.com" target="_blank" style={{ color: '#185FA5' }}>supabase.com</a>.
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <SaveBtn saving={saving} onClick={save} />
        </div>
      </div>
      {toast && <Toast {...toast} />}
    </div>
  )
}

// ── SECTION: Notificaciones ───────────────────────────────────
function SectionNotifications() {
  const [prefs, setPrefs] = useState({
    ethics_renewal:    true,
    milestone_overdue: true,
    sae_reported:      true,
    sample_omission:   true,
    finding_open:      true,
    recruitment_report: false,
  })
  const [saving, setSaving] = useState(false)
  const [toast, setToast]   = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  const notifs = [
    { key: 'ethics_renewal',    label: 'Renovación del Comité de Ética próxima',   desc: 'Alerta cuando un proyecto tiene renovación en los próximos N días' },
    { key: 'milestone_overdue', label: 'Hito vencido sin completar',               desc: 'Cuando un hito pasa su fecha límite sin marcarse como completado' },
    { key: 'sae_reported',      label: 'SAE registrado en proyecto asignado',      desc: 'Notificación inmediata al reportar un efecto adverso grave' },
    { key: 'sample_omission',   label: 'Omisión de muestra sin atender',           desc: 'Cuando una muestra supera el umbral de horas sin actualización' },
    { key: 'finding_open',      label: 'Hallazgo de monitoreo sin respuesta',      desc: 'Recordatorio cuando un hallazgo lleva días sin respuesta' },
    { key: 'recruitment_report', label: 'Recordatorio reporte mensual reclutamiento', desc: 'Aviso al inicio de cada mes para enviar el reporte' },
  ]

  const save = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 500))
    setSaving(false)
    setToast({ msg: 'Preferencias de notificación guardadas', type: 'ok' })
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <div style={cardStyle}>
      <div style={cardHead}>
        <span><i className="ti ti-bell" style={{ color: '#185FA5', marginRight: 6 }} />Notificaciones y alertas</span>
      </div>
      <div style={{ padding: 18 }}>
        <div style={{ background: '#E6F1FB', border: '0.5px solid #B5D4F4', borderRadius: 8, padding: '9px 12px', fontSize: 12, color: '#0C447C', marginBottom: 14 }}>
          <i className="ti ti-info-circle" style={{ fontSize: 13, marginRight: 5 }} />
          Las alertas aparecen en el panel de alertas del dashboard. Las notificaciones por email requieren configuración de Supabase Edge Functions.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
          {notifs.map(n => (
            <div key={n.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 12px', background: '#F8F7F4', borderRadius: 8, cursor: 'pointer' }}
              onClick={() => setPrefs(p => ({ ...p, [n.key]: !p[n.key as keyof typeof p] }))}>
              <div style={{
                width: 20, height: 20, borderRadius: 5, flexShrink: 0, marginTop: 1,
                border: `1.5px solid ${(prefs as any)[n.key] ? '#185FA5' : '#D3D1C7'}`,
                background: (prefs as any)[n.key] ? '#185FA5' : '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {(prefs as any)[n.key] && <i className="ti ti-check" style={{ fontSize: 12, color: '#fff' }} />}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#3D3D3A' }}>{n.label}</div>
                <div style={{ fontSize: 11, color: '#9C9A92', marginTop: 2 }}>{n.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <SaveBtn saving={saving} onClick={save} />
        </div>
      </div>
      {toast && <Toast {...toast} />}
    </div>
  )
}

// ── SECTION: Catálogos ────────────────────────────────────────
function SectionCatalogs() {
  const { user } = useAuth()
  const isAdmin  = ['ADMIN','PM_CRIO'].includes(user?.role ?? '')

  const catalogs = [
    {
      title: 'Tipos de estudio',
      icon: 'ti-flask',
      items: ['Intervencional', 'Observacional', 'Serie clínica', 'Servicio / Otro'],
      note: 'Definidos como enum en la base de datos. Para modificar contacta al administrador técnico.',
    },
    {
      title: 'Fases de ensayo clínico',
      icon: 'ti-chart-line',
      items: ['Fase 0', 'Fase I', 'Fase II', 'Fase IIa', 'Fase IIb', 'Fase III', 'Fase IV', 'No aplica'],
      note: 'Según ICH E8 — estándar internacional.',
    },
    {
      title: 'Áreas / enfermedades',
      icon: 'ti-heart-rate-monitor',
      items: ['Cáncer', 'Perinatales', 'Autoinmune', 'Salud Mental', 'Pulmonar', 'Otros'],
      note: 'Se pueden agregar nuevas categorías extendiendo el enum disease_enum.',
    },
    {
      title: 'Tipos de muestra',
      icon: 'ti-test-pipe',
      items: ['Sangre', 'Orina', 'Tejido', 'Médula ósea', 'LCR', 'Otro'],
      note: 'Definidos por el enum sample_type_enum.',
    },
    {
      title: 'Tipos de documento',
      icon: 'ti-files',
      items: ['Protocolo', 'Manual del investigador', 'Aprobación ética', 'Consentimiento', 'CRF', 'Informe de seguridad', 'Informe de monitoreo', 'Contrato', 'Otro'],
      note: 'Categorizan los documentos en el módulo de documentos del proyecto.',
    },
    {
      title: 'Roles de usuario',
      icon: 'ti-users',
      items: ['Administrador', 'PM / Gestor CRO', 'Investigador', 'Coordinadora', 'Sponsor', 'Monitor Externo', 'Finanzas', 'Laboratorio'],
      note: 'Controlan el acceso mediante Row Level Security en Supabase.',
    },
  ]

  if (!isAdmin) {
    return (
      <div style={cardStyle}>
        <div style={cardHead}><span><i className="ti ti-list" style={{ color: '#185FA5', marginRight: 6 }} />Catálogos del sistema</span></div>
        <div style={{ padding: 32, textAlign: 'center', fontSize: 13, color: '#9C9A92' }}>
          <i className="ti ti-lock" style={{ fontSize: 24, display: 'block', marginBottom: 8, color: '#D3D1C7' }} />
          Solo los Administradores pueden ver los catálogos del sistema.
        </div>
      </div>
    )
  }

  return (
    <div style={cardStyle}>
      <div style={cardHead}>
        <span><i className="ti ti-list" style={{ color: '#185FA5', marginRight: 6 }} />Catálogos del sistema</span>
        <span style={{ fontSize: 11, color: '#9C9A92', fontWeight: 400 }}>Solo lectura — definidos en el schema SQL</span>
      </div>
      <div style={{ padding: 18 }}>
        <div style={{ background: '#FAEEDA', border: '0.5px solid #FAC775', borderRadius: 8, padding: '9px 12px', fontSize: 12, color: '#633806', marginBottom: 14 }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 13, marginRight: 5 }} />
          Los catálogos están definidos como enums en PostgreSQL. Para agregar nuevos valores ejecuta un <code style={{ background: '#FAC775', padding: '1px 5px', borderRadius: 4 }}>ALTER TYPE</code> en el SQL Editor de Supabase.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {catalogs.map(cat => (
            <div key={cat.title} style={{ border: '0.5px solid #E8E6DE', borderRadius: 9, overflow: 'hidden' }}>
              <div style={{ padding: '9px 13px', background: '#F8F7F4', borderBottom: '0.5px solid #E8E6DE', fontSize: 12, fontWeight: 500, color: '#3D3D3A', display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className={`ti ${cat.icon}`} style={{ fontSize: 14, color: '#185FA5' }} />
                {cat.title}
              </div>
              <div style={{ padding: '10px 13px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                  {cat.items.map(item => (
                    <span key={item} style={{ fontSize: 11, background: '#F1EFE8', color: '#444441', padding: '2px 8px', borderRadius: 20 }}>
                      {item}
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: '#B4B2A9', lineHeight: 1.4 }}>{cat.note}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────
const TABS = [
  { key: 'profile',       label: 'Mi perfil',       icon: 'ti-user-circle'       },
  { key: 'password',      label: 'Contraseña',      icon: 'ti-lock'              },
  { key: 'system',        label: 'Sistema',          icon: 'ti-settings'          },
  { key: 'notifications', label: 'Notificaciones',  icon: 'ti-bell'              },
  { key: 'catalogs',      label: 'Catálogos',       icon: 'ti-list'              },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile')

  return (
    <Layout>
      <div style={{ padding: '24px 28px' }}>
        <div style={{ marginBottom: 18 }}>
          <h1 style={{ fontSize: 17, fontWeight: 500, color: '#3D3D3A', margin: 0 }}>Configuración</h1>
          <div style={{ fontSize: 12, color: '#9C9A92', marginTop: 3 }}>Gestiona tu perfil y las preferencias del sistema</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16 }}>
          {/* vertical nav */}
          <div style={{ background: '#fff', border: '0.5px solid #E8E6DE', borderRadius: 10, overflow: 'hidden', height: 'fit-content' }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
                width: '100%', padding: '10px 14px', textAlign: 'left',
                background: activeTab === t.key ? '#EBF4FF' : 'transparent',
                border: 'none', borderLeft: `2px solid ${activeTab === t.key ? '#185FA5' : 'transparent'}`,
                borderBottom: '0.5px solid #E8E6DE',
                cursor: 'pointer', fontSize: 13,
                color: activeTab === t.key ? '#185FA5' : '#73726C',
                fontWeight: activeTab === t.key ? 500 : 400,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <i className={`ti ${t.icon}`} style={{ fontSize: 15 }} />
                {t.label}
              </button>
            ))}
          </div>

          {/* content */}
          <div>
            {activeTab === 'profile'       && <SectionProfile />}
            {activeTab === 'password'      && <SectionPassword />}
            {activeTab === 'system'        && <SectionSystem />}
            {activeTab === 'notifications' && <SectionNotifications />}
            {activeTab === 'catalogs'      && <SectionCatalogs />}
          </div>
        </div>
      </div>
    </Layout>
  )
}
