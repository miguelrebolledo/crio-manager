// src/pages/ClientsPage.tsx
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/index'
import Layout from '../components/layout/Layout'

interface Organization {
  id: string
  name: string
  org_type: string
  sponsor_type: string
  country: string
  city: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  notes: string | null
  is_active: boolean
  created_at: string
}

interface Interaction {
  id: string
  org_id: string
  notes: string
  interaction_date: string
  created_at: string
  author: { full_name: string } | null
}

interface ProjectSummary {
  id: string
  codigo_proyecto: string
  titulo: string
  status: string
}

const ORG_TYPE_LABELS: Record<string,string> = {
  PHARMA:'Farmacéutica', BIOTECH:'Biotecnología', ACADEMIC:'Académica',
  HOSPITAL:'Hospital/Clínica', FOUNDATION:'Fundación',
  GOVERNMENT:'Gobierno', OTHER:'Otro',
}
const SPONSOR_TYPE_STYLE: Record<string,{bg:string;color:string}> = {
  INTERNAL: {bg:'#E6F1FB',color:'#0C447C'},
  EXTERNAL: {bg:'#E1F5EE',color:'#085041'},
}
const STATUS_STYLE: Record<string,{bg:string;color:string}> = {
  ACTIVE:     {bg:'#E1F5EE',color:'#085041'},
  LEAD:       {bg:'#F1EFE8',color:'#444441'},
  PROPOSAL:   {bg:'#EEEDFE',color:'#26215C'},
  CONTRACTED: {bg:'#E6F1FB',color:'#0C447C'},
  PAUSED:     {bg:'#FAEEDA',color:'#633806'},
  CLOSED:     {bg:'#FCEBEB',color:'#791F1F'},
  COMPLETED:  {bg:'#E1F5EE',color:'#085041'},
  CANCELLED:  {bg:'#F1EFE8',color:'#444441'},
}
const STATUS_LABELS: Record<string,string> = {
  ACTIVE:'Activo', LEAD:'Lead', PROPOSAL:'Propuesta', CONTRACTED:'Contratado',
  PAUSED:'En pausa', CLOSED:'Cerrado', COMPLETED:'Completado', CANCELLED:'Cancelado',
}
const AVATAR_COLORS = ['#185FA5','#0F6E56','#633806','#26215C','#854F0B','#791F1F','#444441','#0C447C']

function initials(name: string) {
  return name.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase()
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CL', { day:'2-digit', month:'2-digit', year:'numeric' })
}

// ── Org Modal ─────────────────────────────────────────────────
function OrgModal({ org, onClose, onSaved }: { org?: Organization; onClose: ()=>void; onSaved: ()=>void }) {
  const [form, setForm] = useState({
    name:          org?.name          ?? '',
    org_type:      org?.org_type      ?? 'OTHER',
    sponsor_type:  org?.sponsor_type  ?? 'EXTERNAL',
    country:       org?.country       ?? 'Chile',
    city:          org?.city          ?? '',
    contact_name:  org?.contact_name  ?? '',
    contact_email: org?.contact_email ?? '',
    contact_phone: org?.contact_phone ?? '',
    notes:         org?.notes         ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string|null>(null)

  const inp: React.CSSProperties = {
    width:'100%', padding:'7px 10px', border:'0.5px solid #D3D1C7',
    borderRadius:8, fontSize:13, background:'#F8F7F4',
    color:'#3D3D3A', fontFamily:'inherit', outline:'none',
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name) { setError('El nombre es obligatorio.'); return }
    setSaving(true)
    setError(null)
    const payload = { ...form, city: form.city||null, contact_name: form.contact_name||null, contact_email: form.contact_email||null, contact_phone: form.contact_phone||null, notes: form.notes||null }
    const { error: err } = org
      ? await supabase.from('organizations').update(payload).eq('id', org.id)
      : await supabase.from('organizations').insert(payload)
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
    onClose()
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth:500, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 8px 32px rgba(0,0,0,0.16)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'0.5px solid #E8E6DE' }}>
          <div style={{ fontSize:15, fontWeight:500, color:'#3D3D3A' }}>
            <i className="ti ti-building" style={{ color:'#185FA5', marginRight:8, fontSize:15, verticalAlign:-2 }} />
            {org ? 'Editar cliente' : 'Nuevo cliente'}
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#9C9A92', fontSize:18 }}><i className="ti ti-x" /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ padding:20, display:'flex', flexDirection:'column', gap:13 }}>
            <div>
              <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:4 }}>Nombre <span style={{color:'#A32D2D'}}>*</span></label>
              <input style={inp} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Ej: BioPharma Chile S.A." required />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:4 }}>Tipo de organización</label>
                <select style={inp} value={form.org_type} onChange={e=>setForm(f=>({...f,org_type:e.target.value}))}>
                  {Object.entries(ORG_TYPE_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:4 }}>Tipo de sponsor</label>
                <select style={inp} value={form.sponsor_type} onChange={e=>setForm(f=>({...f,sponsor_type:e.target.value}))}>
                  <option value="EXTERNAL">Externo</option>
                  <option value="INTERNAL">Interno</option>
                </select>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:4 }}>País</label>
                <input style={inp} value={form.country} onChange={e=>setForm(f=>({...f,country:e.target.value}))} />
              </div>
              <div>
                <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:4 }}>Ciudad</label>
                <input style={inp} value={form.city} onChange={e=>setForm(f=>({...f,city:e.target.value}))} placeholder="Ej: Santiago" />
              </div>
            </div>
            <div style={{ borderTop:'0.5px solid #E8E6DE', paddingTop:12 }}>
              <div style={{ fontSize:11, fontWeight:500, color:'#9C9A92', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:10 }}>Contacto principal</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:4 }}>Nombre</label>
                  <input style={inp} value={form.contact_name} onChange={e=>setForm(f=>({...f,contact_name:e.target.value}))} placeholder="Ej: Dra. Patricia Solís" />
                </div>
                <div>
                  <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:4 }}>Email</label>
                  <input style={inp} type="email" value={form.contact_email} onChange={e=>setForm(f=>({...f,contact_email:e.target.value}))} placeholder="contacto@empresa.cl" />
                </div>
                <div>
                  <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:4 }}>Teléfono</label>
                  <input style={inp} value={form.contact_phone} onChange={e=>setForm(f=>({...f,contact_phone:e.target.value}))} placeholder="+56 2 xxxx xxxx" />
                </div>
              </div>
            </div>
            <div>
              <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:4 }}>Notas generales</label>
              <textarea style={{ ...inp, minHeight:56, resize:'vertical' }} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Información adicional sobre el cliente..." />
            </div>
            {error && <div style={{ background:'#FCEBEB', border:'0.5px solid #F7C1C1', borderRadius:8, padding:'9px 12px', fontSize:12, color:'#791F1F' }}><i className="ti ti-alert-circle" style={{ fontSize:13, marginRight:5 }} />{error}</div>}
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', gap:8, padding:'14px 20px', borderTop:'0.5px solid #E8E6DE' }}>
            <button type="button" onClick={onClose} style={{ background:'transparent', border:'0.5px solid #D3D1C7', color:'#73726C', padding:'7px 16px', borderRadius:8, fontSize:13, cursor:'pointer' }}>Cancelar</button>
            <button type="submit" disabled={saving} style={{ background:saving?'#9C9A92':'#185FA5', color:'#fff', border:'none', padding:'7px 18px', borderRadius:8, fontSize:13, fontWeight:500, cursor:saving?'not-allowed':'pointer', display:'flex', alignItems:'center', gap:6 }}>
              <i className="ti ti-device-floppy" style={{ fontSize:13 }} />
              {saving ? 'Guardando...' : org ? 'Guardar cambios' : 'Crear cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Client detail panel ───────────────────────────────────────
function ClientDetail({ org, onUpdate }: { org: Organization; onUpdate: ()=>void }) {
  const { user }  = useAuth()
  const navigate  = useNavigate()
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [projects, setProjects]         = useState<ProjectSummary[]>([])
  const [newNote, setNewNote]   = useState('')
  const [saving, setSaving]     = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview'|'interactions'|'projects'>('overview')

  const canEdit = ['ADMIN','PM_CRIO'].includes(user?.role ?? '')

  useEffect(() => {
    // cargar interacciones
    supabase.from('crm_interactions')
      .select('*, author:users(full_name)')
      .eq('org_id', org.id)
      .order('interaction_date', { ascending: false })
      .then(({ data }) => setInteractions((data ?? []) as Interaction[]))

    // cargar proyectos asociados
    supabase.from('projects')
      .select('id, codigo_proyecto, titulo, status')
      .eq('client_org_id', org.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setProjects((data ?? []) as ProjectSummary[]))
  }, [org.id])

  const addInteraction = async () => {
    if (!newNote.trim()) return
    setSaving(true)
    await supabase.from('crm_interactions').insert({
      org_id:           org.id,
      author_id:        user?.id,
      notes:            newNote.trim(),
      interaction_date: new Date().toISOString().split('T')[0],
    })
    setSaving(false)
    setNewNote('')
    // recargar
    supabase.from('crm_interactions').select('*, author:users(full_name)').eq('org_id', org.id).order('interaction_date', { ascending: false }).then(({ data }) => setInteractions((data ?? []) as Interaction[]))
  }

  const ss = SPONSOR_TYPE_STYLE[org.sponsor_type] ?? { bg:'#F1EFE8', color:'#444441' }

  return (
    <div style={{ flex:1, overflow:'auto', padding:20 }}>
      {/* header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16 }}>
        <div>
          <div style={{ fontSize:16, fontWeight:500, color:'#3D3D3A', marginBottom:5 }}>{org.name}</div>
          <div style={{ display:'flex', gap:7, alignItems:'center', flexWrap:'wrap' }}>
            <span style={{ ...ss, fontSize:11, padding:'2px 9px', borderRadius:20, fontWeight:500 }}>
              {org.sponsor_type === 'INTERNAL' ? 'Interno' : 'Externo'}
            </span>
            <span style={{ fontSize:12, color:'#9C9A92' }}>{ORG_TYPE_LABELS[org.org_type] ?? org.org_type}</span>
            <span style={{ fontSize:12, color:'#9C9A92' }}>{org.city ? `${org.city}, ` : ''}{org.country}</span>
          </div>
        </div>
        {canEdit && (
          <button onClick={() => setEditModal(true)} style={{ background:'none', border:'0.5px solid #D3D1C7', borderRadius:7, padding:'5px 12px', fontSize:12, cursor:'pointer', color:'#73726C', display:'flex', alignItems:'center', gap:5 }}>
            <i className="ti ti-edit" style={{ fontSize:13 }} /> Editar
          </button>
        )}
      </div>

      {/* subtabs */}
      <div style={{ display:'flex', gap:0, marginBottom:14, background:'#F8F7F4', borderRadius:8, padding:3 }}>
        {[
          { key:'overview',      label:'Resumen' },
          { key:'interactions',  label:`Interacciones (${interactions.length})` },
          { key:'projects',      label:`Proyectos (${projects.length})` },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key as any)} style={{
            flex:1, padding:'6px 12px', fontSize:12, cursor:'pointer',
            background: activeTab===t.key ? '#fff' : 'transparent',
            border:'none', borderRadius:6, color: activeTab===t.key ? '#185FA5' : '#73726C',
            fontWeight: activeTab===t.key ? 500 : 400,
            boxShadow: activeTab===t.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab === 'overview' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ background:'#fff', border:'0.5px solid #E8E6DE', borderRadius:10, padding:16 }}>
            <div style={{ fontSize:11, fontWeight:500, color:'#9C9A92', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:12 }}>Contacto principal</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {[
                { label:'Nombre',    value: org.contact_name  },
                { label:'Email',     value: org.contact_email },
                { label:'Teléfono',  value: org.contact_phone },
                { label:'País / ciudad', value: [org.city, org.country].filter(Boolean).join(', ') || '—' },
              ].map(f => (
                <div key={f.label}>
                  <div style={{ fontSize:10, color:'#9C9A92', marginBottom:2 }}>{f.label}</div>
                  <div style={{ fontSize:13, color: f.value ? '#3D3D3A' : '#B4B2A9' }}>{f.value || '—'}</div>
                </div>
              ))}
            </div>
            {org.notes && (
              <div style={{ marginTop:12, paddingTop:12, borderTop:'0.5px solid #E8E6DE' }}>
                <div style={{ fontSize:10, color:'#9C9A92', marginBottom:4 }}>Notas generales</div>
                <div style={{ fontSize:13, color:'#3D3D3A', lineHeight:1.5 }}>{org.notes}</div>
              </div>
            )}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
            {[
              { label:'Proyectos', value: projects.length, color:'#185FA5' },
              { label:'Activos',   value: projects.filter(p=>p.status==='ACTIVE').length, color:'#0F6E56' },
              { label:'Interacciones', value: interactions.length, color:'#3D3D3A' },
            ].map(m => (
              <div key={m.label} style={{ background:'#fff', border:'0.5px solid #E8E6DE', borderRadius:9, padding:'11px 14px', textAlign:'center' }}>
                <div style={{ fontSize:10, color:'#9C9A92', marginBottom:4 }}>{m.label}</div>
                <div style={{ fontSize:20, fontWeight:600, color:m.color }}>{m.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* INTERACTIONS */}
      {activeTab === 'interactions' && (
        <div>
          {canEdit && (
            <div style={{ background:'#fff', border:'0.5px solid #E8E6DE', borderRadius:10, padding:14, marginBottom:12 }}>
              <textarea
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="Registrar nueva interacción — reunión, llamada, email, acuerdo..."
                style={{ width:'100%', padding:'8px 10px', border:'0.5px solid #D3D1C7', borderRadius:8, fontSize:13, background:'#F8F7F4', color:'#3D3D3A', fontFamily:'inherit', outline:'none', resize:'vertical', minHeight:64 }}
              />
              <div style={{ display:'flex', justifyContent:'flex-end', marginTop:8 }}>
                <button onClick={addInteraction} disabled={saving || !newNote.trim()} style={{ background:!newNote.trim()||saving?'#9C9A92':'#185FA5', color:'#fff', border:'none', padding:'6px 14px', borderRadius:7, fontSize:12, fontWeight:500, cursor:!newNote.trim()||saving?'not-allowed':'pointer', display:'flex', alignItems:'center', gap:5 }}>
                  <i className="ti ti-send" style={{ fontSize:13 }} />
                  {saving ? 'Guardando...' : 'Guardar nota'}
                </button>
              </div>
            </div>
          )}
          {interactions.length === 0 ? (
            <div style={{ background:'#fff', border:'0.5px solid #E8E6DE', borderRadius:10, padding:32, textAlign:'center', fontSize:13, color:'#9C9A92' }}>
              Sin interacciones registradas aún.
            </div>
          ) : interactions.map((n, i) => (
            <div key={n.id} style={{ background:'#fff', border:'0.5px solid #E8E6DE', borderRadius:10, padding:14, marginBottom:8, borderLeft:`3px solid ${AVATAR_COLORS[i % AVATAR_COLORS.length]}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                <span style={{ fontSize:12, fontWeight:500, color:'#0C447C' }}>{(n.author as any)?.full_name ?? '—'}</span>
                <span style={{ fontSize:11, color:'#9C9A92' }}>{formatDate(n.interaction_date)}</span>
              </div>
              <div style={{ fontSize:13, color:'#3D3D3A', lineHeight:1.5 }}>{n.notes}</div>
            </div>
          ))}
        </div>
      )}

      {/* PROJECTS */}
      {activeTab === 'projects' && (
        <div>
          {projects.length === 0 ? (
            <div style={{ background:'#fff', border:'0.5px solid #E8E6DE', borderRadius:10, padding:32, textAlign:'center', fontSize:13, color:'#9C9A92' }}>
              Sin proyectos asociados.
            </div>
          ) : projects.map(p => {
            const ps = STATUS_STYLE[p.status] ?? {bg:'#F1EFE8',color:'#444441'}
            return (
              <div key={p.id} onClick={() => navigate(`/proyectos/${p.id}`)}
                style={{ background:'#fff', border:'0.5px solid #E8E6DE', borderRadius:10, padding:'12px 16px', marginBottom:8, cursor:'pointer', display:'flex', alignItems:'center', gap:12 }}
                onMouseEnter={e => (e.currentTarget.style.background='#F8F7F4')}
                onMouseLeave={e => (e.currentTarget.style.background='#fff')}
              >
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:500, color:'#185FA5', marginBottom:3 }}>{p.codigo_proyecto}</div>
                  <div style={{ fontSize:13, color:'#3D3D3A', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.titulo}</div>
                </div>
                <span style={{ ...ps, fontSize:11, padding:'2px 9px', borderRadius:20, fontWeight:500 }}>
                  {STATUS_LABELS[p.status] ?? p.status}
                </span>
                <i className="ti ti-chevron-right" style={{ fontSize:14, color:'#9C9A92', flexShrink:0 }} />
              </div>
            )
          })}
        </div>
      )}

      {editModal && (
        <OrgModal org={org} onClose={() => setEditModal(false)} onSaved={() => { setEditModal(false); onUpdate() }} />
      )}
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────
export default function ClientsPage() {
  const { user }  = useAuth()
  const [orgs, setOrgs]         = useState<Organization[]>([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState<Organization | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch]     = useState('')

  const canCreate = ['ADMIN','PM_CRIO'].includes(user?.role ?? '')

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('organizations').select('*').eq('is_active', true).order('name')
    if (search) q = q.ilike('name', `%${search}%`)
    const { data } = await q
    setOrgs((data ?? []) as Organization[])
    setLoading(false)
  }, [search])

  useEffect(() => { load() }, [load])

  return (
    <Layout>
      <div style={{ display:'flex', height:'calc(100vh - 0px)', overflow:'hidden' }}>

        {/* ── Client list ── */}
        <div style={{ width:280, flexShrink:0, borderRight:'0.5px solid #E8E6DE', display:'flex', flexDirection:'column', background:'#fff', overflow:'hidden' }}>
          {/* header */}
          <div style={{ padding:'18px 16px 12px', borderBottom:'0.5px solid #E8E6DE' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <div style={{ fontSize:15, fontWeight:500, color:'#3D3D3A' }}>Clientes</div>
              {canCreate && (
                <button onClick={() => setShowModal(true)} style={{ background:'#185FA5', color:'#fff', border:'none', padding:'5px 10px', borderRadius:7, fontSize:12, fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                  <i className="ti ti-plus" style={{ fontSize:13 }} />Nuevo
                </button>
              )}
            </div>
            <div style={{ position:'relative' }}>
              <i className="ti ti-search" style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', color:'#9C9A92', fontSize:13, pointerEvents:'none' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente..."
                style={{ width:'100%', padding:'6px 8px 6px 26px', border:'0.5px solid #D3D1C7', borderRadius:8, fontSize:13, background:'#F8F7F4', color:'#3D3D3A', outline:'none' }} />
            </div>
          </div>

          {/* list */}
          <div style={{ flex:1, overflowY:'auto' }}>
            {loading ? (
              <div style={{ padding:24, textAlign:'center', fontSize:13, color:'#9C9A92' }}>Cargando...</div>
            ) : orgs.length === 0 ? (
              <div style={{ padding:24, textAlign:'center', fontSize:13, color:'#9C9A92' }}>
                {search ? 'Sin resultados' : 'Sin clientes registrados'}
              </div>
            ) : orgs.map((org, i) => {
              const isSelected = selected?.id === org.id
              const ss = SPONSOR_TYPE_STYLE[org.sponsor_type] ?? {bg:'#F1EFE8',color:'#444441'}
              return (
                <div key={org.id}
                  onClick={() => setSelected(org)}
                  style={{
                    padding:'12px 16px', cursor:'pointer',
                    background: isSelected ? '#EBF4FF' : 'transparent',
                    borderLeft: isSelected ? '2px solid #185FA5' : '2px solid transparent',
                    borderBottom:'0.5px solid #E8E6DE',
                  }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background='#F8F7F4' }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background='transparent' }}
                >
                  <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:4 }}>
                    <div style={{ width:28, height:28, borderRadius:'50%', background:AVATAR_COLORS[i%AVATAR_COLORS.length], color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, flexShrink:0 }}>
                      {initials(org.name)}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:500, color:'#3D3D3A', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{org.name}</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:6, alignItems:'center', paddingLeft:37 }}>
                    <span style={{ ...ss, fontSize:10, padding:'1px 7px', borderRadius:20, fontWeight:500 }}>
                      {org.sponsor_type === 'INTERNAL' ? 'Interno' : 'Externo'}
                    </span>
                    <span style={{ fontSize:11, color:'#9C9A92' }}>{org.city ?? org.country}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Detail panel ── */}
        <div style={{ flex:1, overflow:'auto', background:'#F8F7F4' }}>
          {selected ? (
            <ClientDetail key={selected.id} org={selected} onUpdate={() => { load(); setSelected(s => orgs.find(o=>o.id===s?.id) ?? null) }} />
          ) : (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%' }}>
              <div style={{ textAlign:'center' }}>
                <i className="ti ti-building" style={{ fontSize:36, color:'#D3D1C7', display:'block', marginBottom:12 }} />
                <div style={{ fontSize:14, color:'#9C9A92', marginBottom:4 }}>Selecciona un cliente</div>
                <div style={{ fontSize:12, color:'#B4B2A9' }}>Haz clic en un cliente de la lista para ver sus detalles</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <OrgModal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load() }}
        />
      )}
    </Layout>
  )
}
