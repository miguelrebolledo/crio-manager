// src/pages/ProjectDetailPage.tsx
import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/index'
import Layout from '../components/layout/Layout'
import TabDocuments from '../components/project/TabDocuments'
import TabAdverseEvents from '../components/project/TabAdverseEvents'
import TabMonitoring from '../components/project/TabMonitoring'
import TabSamples from '../components/project/TabSamples'
import TabNotes from '../components/project/TabNotes'
import TabMonitoringQA from '../components/project/TabMonitoringQA'
import TabSampleProcessing from '../components/project/TabSampleProcessing'
import TabFinance from '../components/project/TabFinance'




// ── Types ────────────────────────────────────────────────────
interface Project {
  id: string
  codigo_proyecto: string
  titulo: string
  study_type: string
  project_type: string
  trial_phase: string | null
  disease: string | null
  therapeutic_area: string | null
  status: string
  priority: string
  sponsor_type: string
  start_date: string
  estimated_end_date: string | null
  first_patient_recruited_date: string | null
  recruitment_target: number | null
  recruited_current: number
  dropouts_current: number
  excluded_current: number
  ethics_approval_date: string | null
  ethics_renewal_date: string | null
  ethics_committee: string | null
  ethics_code: string | null
  budget_total: number | null
  budget_executed: number | null
  primary_endpoint: string | null
  client_org_id: string | null
  client_org: { id: string; name: string; contact_name: string | null; contact_email: string | null } | null
  principal_investigator: { id: string; full_name: string; email: string } | null
  co_investigator: { id: string; full_name: string; email: string } | null
  recruitment_last_updated: string | null
}

interface TeamMember {
  id: string
  user_id: string
  team_role: string
  assigned_date: string
  is_active: boolean
  user: { id: string; full_name: string; email: string; specialty: string | null }
}

interface Milestone {
  id: string
  name: string
  due_date: string
  completed_date: string | null
  status: string
  notes: string | null
}

interface RecruitmentUpdate {
  id: string
  period_year: number
  period_month: number
  enrolled_total: number
  dropouts_total: number
  excluded_total: number
  new_this_period: number | null
  notes: string | null
  report_date: string
  reporter: { full_name: string } | null
}

// ── Label maps ───────────────────────────────────────────────
const STATUS_LABELS: Record<string,string> = {
  LEAD:'Lead', PROPOSAL:'Propuesta', CONTRACTED:'Contratado',
  ACTIVE:'Activo', PAUSED:'En pausa', CLOSED:'Cerrado',
  COMPLETED:'Completado', CANCELLED:'Cancelado',
}
const TYPE_LABELS: Record<string,string> = {
  INTERVENTIONAL:'Intervencional', OBSERVATIONAL:'Observacional',
  CLINICAL_SERIES:'Serie clínica', SERVICE:'Servicio',
}
const PHASE_LABELS: Record<string,string> = {
  PHASE_0:'Fase 0', PHASE_I:'Fase I', PHASE_II:'Fase II',
  PHASE_IIA:'Fase IIa', PHASE_IIB:'Fase IIb', PHASE_III:'Fase III',
  PHASE_IV:'Fase IV', NOT_APPLICABLE:'No aplica',
}
const DISEASE_LABELS: Record<string,string> = {
  CANCER:'Cáncer', PERINATAL:'Perinatales', AUTOIMMUNE:'Autoinmune',
  MENTAL_HEALTH:'Salud Mental', PULMONARY:'Pulmonar', OTHER:'Otros',
}
const TEAM_ROLE_LABELS: Record<string,string> = {
  PRINCIPAL_INVESTIGATOR:'Investigador Principal',
  CO_INVESTIGATOR:'Co-investigador',
  COORDINATOR_PRINCIPAL:'Coordinadora Principal',
  COORDINATOR_BACKUP:'Coordinadora de Respaldo',
  EXTERNAL_MONITOR:'Monitor Externo',
  LAB_TECHNICIAN:'Laboratorio',
  FINANCE:'Finanzas',
  OTHER:'Otro',
}
const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

const STATUS_STYLE: Record<string,{bg:string;color:string}> = {
  ACTIVE:     {bg:'#E0F2F1',color:'#005246'},
  LEAD:       {bg:'#F1EFE8',color:'#444441'},
  PROPOSAL:   {bg:'#F3E5F5',color:'#6A1B9A'},
  CONTRACTED: {bg:'#E0F7FA',color:'#007A99'},
  PAUSED:     {bg:'#FAEEDA',color:'#633806'},
  CLOSED:     {bg:'#FCEBEB',color:'#791F1F'},
  COMPLETED:  {bg:'#E0F2F1',color:'#005246'},
  CANCELLED:  {bg:'#F1EFE8',color:'#444441'},
}

// ── Shared UI ────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  background:'#fff', border:'0.5px solid #E8E6DE',
  borderRadius:10, overflow:'hidden', marginBottom:12,
}
const cardHeadStyle: React.CSSProperties = {
  display:'flex', alignItems:'center', justifyContent:'space-between',
  padding:'11px 16px', borderBottom:'0.5px solid #E8E6DE',
  fontSize:12, fontWeight:500, color:'#73726C',
}
function DField({ label, value }: { label:string; value?: string|number|null }) {
  return (
    <div>
      <div style={{ fontSize:11, color:'#9C9A92', fontWeight:500, marginBottom:3 }}>{label}</div>
      <div style={{ fontSize:13, color: value ? '#3D3D3A' : '#B4B2A9' }}>{value ?? '—'}</div>
    </div>
  )
}
function Avatar({ name, color='#0A2E5C' }: { name:string; color?:string }) {
  const initials = name.split(' ').slice(0,2).map(n=>n[0]).join('')
  return (
    <div style={{
      width:32, height:32, borderRadius:'50%', background:color,
      color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:11, fontWeight:600, flexShrink:0,
    }}>
      {initials}
    </div>
  )
}

const AVATAR_COLORS = ['#0A2E5C','#00A88A','#633806','#6A1B9A','#444441','#854F0B']

// ── TAB: Información general ─────────────────────────────────
function TabInfo({ project, onUpdate }: { project: Project; onUpdate: () => void }) {
  const [editing, setEditing] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [form, setForm] = useState({
    titulo:           project.titulo,
    status:           project.status,
    priority:         project.priority,
    trial_phase:      project.trial_phase ?? 'NOT_APPLICABLE',
    disease:          project.disease ?? 'OTHER',
    therapeutic_area: project.therapeutic_area ?? '',
    primary_endpoint: project.primary_endpoint ?? '',
    client_org_id: project.client_org?.id ?? '',
    start_date:       project.start_date,
    estimated_end_date: project.estimated_end_date ?? '',
    first_patient_recruited_date: project.first_patient_recruited_date ?? '',
    ethics_approval_date: project.ethics_approval_date ?? '',
    ethics_renewal_date:  project.ethics_renewal_date ?? '',
    ethics_committee:     project.ethics_committee ?? '',
    ethics_code:          project.ethics_code ?? '',
  })
const [orgs, setOrgs] = useState<{id:string; name:string}[]>([])

useEffect(() => {
  supabase.from('organizations')
    .select('id, name')
    .eq('is_active', true)
    .order('name')
    .then(({ data }) => setOrgs(data ?? []))
}, [])
  const inp: React.CSSProperties = {
    width:'100%', padding:'6px 9px', border:'0.5px solid #D3D1C7',
    borderRadius:7, fontSize:13, background:'#F8F7F4', color:'#3D3D3A',
    fontFamily:'inherit', outline:'none',
  }

  const handleSave = async () => {
    setSaving(true)
    const payload: any = { ...form }
    if (!payload.estimated_end_date)          delete payload.estimated_end_date
    if (!payload.first_patient_recruited_date) delete payload.first_patient_recruited_date
    if (!payload.ethics_approval_date)        delete payload.ethics_approval_date
    if (!payload.ethics_renewal_date)         delete payload.ethics_renewal_date
    if (!payload.ethics_committee)            delete payload.ethics_committee
    if (!payload.ethics_code)                 delete payload.ethics_code
    if (!payload.therapeutic_area)            delete payload.therapeutic_area
    if (!payload.primary_endpoint)            delete payload.primary_endpoint
    if (payload.client_org_id === '') payload.client_org_id = null

    await supabase.from('projects').update(payload).eq('id', project.id)
    setSaving(false)
    setEditing(false)
    onUpdate()
  }

  const daysEthics = project.ethics_renewal_date
    ? Math.round((new Date(project.ethics_renewal_date).getTime() - Date.now()) / 86400000)
    : null

  return (
    <div>
      {/* ethics alert */}
      {daysEthics !== null && daysEthics <= 60 && (
        <div style={{
          display:'flex', gap:8, padding:'10px 13px', borderRadius:9, marginBottom:12,
          background: daysEthics < 0 ? '#FCEBEB' : '#FAEEDA',
          border: `0.5px solid ${daysEthics < 0 ? '#F7C1C1' : '#FAC775'}`,
          fontSize:12, color: daysEthics < 0 ? '#791F1F' : '#633806',
        }}>
          <i className="ti ti-shield-x" style={{ fontSize:15, flexShrink:0, marginTop:1 }} />
          <div>
            <strong>{daysEthics < 0 ? 'Comité de Ética vencido' : `Renovación del Comité de Ética en ${daysEthics} días`}</strong>
            {project.ethics_committee && ` — ${project.ethics_committee}`}
          </div>
        </div>
      )}

      {/* datos generales */}
      <div style={cardStyle}>
        <div style={cardHeadStyle}>
          <span><i className="ti ti-clipboard-list" style={{ color:'#0A2E5C', marginRight:6 }} />Datos generales</span>
          {!editing
            ? <button onClick={() => setEditing(true)} style={{ background:'none', border:'0.5px solid #D3D1C7', borderRadius:6, padding:'3px 10px', fontSize:11, cursor:'pointer', color:'#73726C' }}>
                <i className="ti ti-edit" style={{ fontSize:12, marginRight:4 }} />Editar
              </button>
            : <div style={{ display:'flex', gap:6 }}>
                <button onClick={() => setEditing(false)} style={{ background:'none', border:'0.5px solid #D3D1C7', borderRadius:6, padding:'3px 10px', fontSize:11, cursor:'pointer', color:'#73726C' }}>Cancelar</button>
                <button onClick={handleSave} disabled={saving} style={{ background:'#0A2E5C', color:'#fff', border:'none', borderRadius:6, padding:'3px 12px', fontSize:11, cursor:'pointer', fontWeight:500 }}>
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
          }
        </div>
        
        <div style={{ padding:16, display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          {editing ? (
            <>
              <div style={{ gridColumn:'span 2' }}>
                <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:3 }}>Título</label>
                <input style={inp} value={form.titulo} onChange={e=>setForm(f=>({...f,titulo:e.target.value}))} />
              </div>
              <div>
                <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:3 }}>Estado</label>
                <select style={inp} value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                  {Object.entries(STATUS_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:3 }}>Prioridad</label>
                <select style={inp} value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value}))}>
                  <option value="LOW">Baja</option><option value="MEDIUM">Media</option>
                  <option value="HIGH">Alta</option><option value="CRITICAL">Crítica</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:3 }}>Fase</label>
                <select style={inp} value={form.trial_phase} onChange={e=>setForm(f=>({...f,trial_phase:e.target.value}))}>
                  {Object.entries(PHASE_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:3 }}>Enfermedad</label>
                <select style={inp} value={form.disease} onChange={e=>setForm(f=>({...f,disease:e.target.value}))}>
                  {Object.entries(DISEASE_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div style={{ gridColumn:'span 2' }}>
                <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:3 }}>Área terapéutica</label>
                <input style={inp} value={form.therapeutic_area} onChange={e=>setForm(f=>({...f,therapeutic_area:e.target.value}))} placeholder="Ej: Oncología — Hematología" />
              </div>
              <div style={{ gridColumn:'span 2' }}>
                <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:3 }}>Endpoint primario</label>
                <input style={inp} value={form.primary_endpoint} onChange={e=>setForm(f=>({...f,primary_endpoint:e.target.value}))} placeholder="Ej: Tasa de respuesta global (ORR) a 6 meses" />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:3 }}>
                  Sponsor / Cliente externo
                </label>
                <select style={inp}
                  value={form.client_org_id ?? ''}
                  onChange={e => setForm(f => ({ ...f, client_org_id: e.target.value || null }))}>
                  <option value="">Sin sponsor asignado</option>
                  {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:3 }}>Fecha inicio</label>
                <input style={inp} type="date" value={form.start_date} onChange={e=>setForm(f=>({...f,start_date:e.target.value}))} />
              </div>
              <div>
                <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:3 }}>Fecha estimada cierre</label>
                <input style={inp} type="date" value={form.estimated_end_date} onChange={e=>setForm(f=>({...f,estimated_end_date:e.target.value}))} />
              </div>
              <div>
                <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:3 }}>Primer paciente (FPR)</label>
                <input style={inp} type="date" value={form.first_patient_recruited_date} onChange={e=>setForm(f=>({...f,first_patient_recruited_date:e.target.value}))} />
              </div>
              <div>
                <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:3 }}>Aprobación Comité Ética</label>
                <input style={inp} type="date" value={form.ethics_approval_date} onChange={e=>setForm(f=>({...f,ethics_approval_date:e.target.value}))} />
              </div>
              <div>
                <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:3 }}>Renovación Comité Ética</label>
                <input style={inp} type="date" value={form.ethics_renewal_date} onChange={e=>setForm(f=>({...f,ethics_renewal_date:e.target.value}))} />
              </div>
              <div>
                <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:3 }}>Nombre del Comité</label>
                <input style={inp} value={form.ethics_committee} onChange={e=>setForm(f=>({...f,ethics_committee:e.target.value}))} placeholder="Ej: CEC — U. de los Andes" />
              </div>
              <div>
                <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:3 }}>Código aprobación</label>
                <input style={inp} value={form.ethics_code} onChange={e=>setForm(f=>({...f,ethics_code:e.target.value}))} placeholder="Ej: CEC-2024-0847" />
              </div>
            </>
          ) : (
            <>
              <DField label="Código" value={project.codigo_proyecto} />
              <DField label="Tipo de estudio" value={TYPE_LABELS[project.study_type] ?? project.study_type} />
              <DField label="Fase" value={PHASE_LABELS[project.trial_phase ?? ''] ?? '—'} />
              <DField label="Enfermedad" value={DISEASE_LABELS[project.disease ?? ''] ?? '—'} />
              <DField label="Área terapéutica" value={project.therapeutic_area} />
              <DField label="Tipo de sponsor" value={project.sponsor_type === 'INTERNAL' ? 'Interno' : 'Externo'} />
              <div style={{ gridColumn:'span 2' }}>
                <DField label="Endpoint primario" value={project.primary_endpoint} />
              </div>
              <DField label="Fecha de inicio" value={project.start_date} />
              <DField label="Fecha estimada cierre" value={project.estimated_end_date} />
              <DField label="Primer paciente (FPR)" value={project.first_patient_recruited_date} />
              <DField label="Aprobación Comité Ética" value={project.ethics_approval_date} />
              <DField label="Renovación Comité Ética" value={project.ethics_renewal_date} />
              <DField label="Comité" value={project.ethics_committee} />
              <DField label="Código CEC" value={project.ethics_code} />
              {project.client_org && (
                <>
                  <div style={{ gridColumn:'span 2', borderTop:'0.5px solid #E8E6DE', paddingTop:14, marginTop:2 }}>
                    <div style={{ fontSize:11, color:'#9C9A92', fontWeight:500, marginBottom:10 }}>SPONSOR / CLIENTE</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                      <DField label="Organización" value={project.client_org.name} />
                      <DField label="Contacto" value={project.client_org.contact_name} />
                      <DField label="Email" value={project.client_org.contact_email} />
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── TAB: Equipo ───────────────────────────────────────────────
function TabTeam({ projectId }: { projectId: string }) {
  const { user } = useAuth()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [users, setUsers]     = useState<any[]>([])
  const [newUserId,   setNewUserId]   = useState('')
  const [newTeamRole, setNewTeamRole] = useState('OTHER')
  const [saving, setSaving] = useState(false)

  const canEdit = ['ADMIN','PM_CRIO'].includes(user?.role ?? '')

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('project_team_members')
      .select('*, user:users(id, full_name, email, specialty)')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .order('team_role')
    setMembers((data ?? []) as TeamMember[])
    setLoading(false)
  }, [projectId])

  useEffect(() => { load() }, [load])

  const loadUsers = async () => {
    const { data } = await supabase
      .from('users')
      .select('id, full_name, email, role')
      .eq('is_active', true)
      .order('full_name')
    setUsers(data ?? [])
  }

  const handleAdd = async () => {
    if (!newUserId) return
    setSaving(true)
    await supabase.from('project_team_members').insert({
      project_id: projectId,
      user_id:    newUserId,
      team_role:  newTeamRole,
    })
    setSaving(false)
    setShowAdd(false)
    setNewUserId('')
    load()
  }

  const handleRemove = async (id: string) => {
    await supabase.from('project_team_members').update({ is_active: false }).eq('id', id)
    load()
  }

  if (loading) return <div style={{ padding:24, fontSize:13, color:'#9C9A92' }}>Cargando equipo...</div>

  return (
    <div style={cardStyle}>
      <div style={cardHeadStyle}>
        <span><i className="ti ti-users" style={{ color:'#0A2E5C', marginRight:6 }} />Equipo del proyecto</span>
        {canEdit && (
          <button onClick={() => { setShowAdd(!showAdd); loadUsers() }} style={{
            background:'#0A2E5C', color:'#fff', border:'none',
            borderRadius:6, padding:'3px 10px', fontSize:11, cursor:'pointer', fontWeight:500,
            display:'flex', alignItems:'center', gap:4,
          }}>
            <i className="ti ti-plus" style={{ fontSize:12 }} />Agregar
          </button>
        )}
      </div>

      {showAdd && (
        <div style={{ padding:'12px 16px', background:'#F8F7F4', borderBottom:'0.5px solid #E8E6DE', display:'flex', gap:8, alignItems:'flex-end', flexWrap:'wrap' }}>
          <div style={{ flex:2, minWidth:180 }}>
            <label style={{ fontSize:11, color:'#9C9A92', display:'block', marginBottom:3 }}>Usuario</label>
            <select value={newUserId} onChange={e=>setNewUserId(e.target.value)} style={{ width:'100%', padding:'6px 9px', border:'0.5px solid #D3D1C7', borderRadius:7, fontSize:13, background:'#fff' }}>
              <option value="">Seleccionar usuario...</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.full_name} — {u.email}</option>)}
            </select>
          </div>
          <div style={{ flex:1, minWidth:160 }}>
            <label style={{ fontSize:11, color:'#9C9A92', display:'block', marginBottom:3 }}>Rol en el proyecto</label>
            <select value={newTeamRole} onChange={e=>setNewTeamRole(e.target.value)} style={{ width:'100%', padding:'6px 9px', border:'0.5px solid #D3D1C7', borderRadius:7, fontSize:13, background:'#fff' }}>
              {Object.entries(TEAM_ROLE_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <button onClick={handleAdd} disabled={saving||!newUserId} style={{
            background:'#0A2E5C', color:'#fff', border:'none', borderRadius:7,
            padding:'7px 14px', fontSize:12, cursor:'pointer', fontWeight:500,
          }}>
            {saving ? 'Agregando...' : 'Agregar'}
          </button>
          <button onClick={()=>setShowAdd(false)} style={{ background:'none', border:'0.5px solid #D3D1C7', borderRadius:7, padding:'7px 12px', fontSize:12, cursor:'pointer', color:'#73726C' }}>
            Cancelar
          </button>
        </div>
      )}

      <div style={{ padding:'4px 0' }}>
        {members.length === 0 ? (
          <div style={{ padding:24, textAlign:'center', fontSize:13, color:'#9C9A92' }}>
            Sin miembros de equipo asignados.
          </div>
        ) : members.map((m, i) => (
          <div key={m.id} style={{
            display:'flex', alignItems:'center', gap:12,
            padding:'10px 16px', borderBottom: i < members.length-1 ? '0.5px solid #E8E6DE' : 'none',
          }}>
            <Avatar name={m.user.full_name} color={AVATAR_COLORS[i % AVATAR_COLORS.length]} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:500, color:'#3D3D3A' }}>{m.user.full_name}</div>
              <div style={{ fontSize:11, color:'#9C9A92', marginTop:2 }}>
                {TEAM_ROLE_LABELS[m.team_role] ?? m.team_role}
                {m.user.specialty && ` · ${m.user.specialty}`}
              </div>
            </div>
            <div style={{ fontSize:11, color:'#9C9A92' }}>{m.user.email}</div>
            {canEdit && (
              <button onClick={()=>handleRemove(m.id)} style={{ background:'none', border:'0.5px solid #E8E6DE', borderRadius:6, padding:'3px 8px', fontSize:12, cursor:'pointer', color:'#9C9A92' }}
                title="Remover del proyecto">
                <i className="ti ti-x" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── TAB: Reclutamiento ────────────────────────────────────────
function TabRecruitment({ project, onUpdate }: { project: Project; onUpdate: () => void }) {
  const { user } = useAuth()
  const [history, setHistory] = useState<RecruitmentUpdate[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ enrolled_total:'', dropouts_total:'', excluded_total:'', notes:'' })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string|null>(null)

  const canReport = ['ADMIN','PM_CRIO','COORDINATOR'].includes(user?.role ?? '')
  const pct = project.recruitment_target
    ? Math.round(project.recruited_current / project.recruitment_target * 100)
    : 0
  const rc = pct>=80?'#0A2E5C':pct>=50?'#00CBA5':pct>=30?'#EF9F27':'#E24B4A'

  useEffect(() => {
    supabase.from('recruitment_updates')
      .select('*, reporter:users(full_name)')
      .eq('project_id', project.id)
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false })
      .then(({ data }) => setHistory((data ?? []) as RecruitmentUpdate[]))
  }, [project.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.enrolled_total) { setError('El campo enrolados es obligatorio.'); return }
    setSaving(true); setError(null)
    const now = new Date()
    const { error: err } = await supabase.from('recruitment_updates').upsert({
      project_id:      project.id,
      reported_by:     user?.id,
      period_year:     now.getFullYear(),
      period_month:    now.getMonth() + 1,
      report_date:     now.toISOString().split('T')[0],
      enrolled_total:  parseInt(form.enrolled_total),
      dropouts_total:  parseInt(form.dropouts_total || '0'),
      excluded_total:  parseInt(form.excluded_total || '0'),
      notes:           form.notes || null,
    }, { onConflict: 'project_id,period_year,period_month' })
    setSaving(false)
    if (err) { setError(err.message); return }
    setShowForm(false)
    setForm({ enrolled_total:'', dropouts_total:'', excluded_total:'', notes:'' })
    onUpdate()
    const { data } = await supabase.from('recruitment_updates')
      .select('*, reporter:users(full_name)')
      .eq('project_id', project.id)
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false })
    setHistory((data ?? []) as RecruitmentUpdate[])
  }

  const inp: React.CSSProperties = {
    width:'100%', padding:'6px 9px', border:'0.5px solid #D3D1C7',
    borderRadius:7, fontSize:13, background:'#F8F7F4', color:'#3D3D3A', fontFamily:'inherit', outline:'none',
  }

  return (
    <div>
      {/* metrics strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:12 }}>
        {[
          { label:'Meta total',    value: project.recruitment_target ?? '—', color:'#0A2E5C' },
          { label:'Enrolados',     value: project.recruited_current,          color:'#00A88A' },
          { label:'Abandonos',     value: project.dropouts_current,           color:'#854F0B' },
          { label:'Excluidos',     value: project.excluded_current,           color:'#A32D2D' },
          { label:'Activos netos', value: project.recruited_current - project.dropouts_current - project.excluded_current, color:'#3D3D3A' },
        ].map(m => (
          <div key={m.label} style={{ background:'#fff', border:'0.5px solid #E8E6DE', borderRadius:9, padding:'11px 13px', textAlign:'center' }}>
            <div style={{ fontSize:10, color:'#9C9A92', marginBottom:5 }}>{m.label}</div>
            <div style={{ fontSize:20, fontWeight:600, color:m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* progress */}
      {project.recruitment_target && (
        <div style={{ ...cardStyle }}>
          <div style={cardHeadStyle}>
            <span><i className="ti ti-chart-bar" style={{ color:'#0A2E5C', marginRight:6 }} />Progreso de reclutamiento</span>
            <span style={{ fontSize:13, fontWeight:600, color:rc }}>{pct}%</span>
          </div>
          <div style={{ padding:16 }}>
            <div style={{ height:10, background:'#F1EFE8', borderRadius:5, overflow:'hidden', marginBottom:6 }}>
              <div style={{ height:'100%', width:`${Math.min(pct,100)}%`, background:rc, borderRadius:5, transition:'width .4s' }} />
            </div>
            <div style={{ fontSize:11, color:'#9C9A92' }}>
              {project.recruited_current} de {project.recruitment_target} pacientes
              {project.recruitment_last_updated && ` · Último reporte: ${new Date(project.recruitment_last_updated).toLocaleDateString('es-CL')}`}
            </div>
          </div>
        </div>
      )}

      {/* reporte form */}
      {canReport && (
        <div style={{ marginBottom:12 }}>
          {!showForm ? (
            <button onClick={()=>setShowForm(true)} style={{
              background:'#0A2E5C', color:'#fff', border:'none',
              borderRadius:8, padding:'8px 16px', fontSize:13, fontWeight:500, cursor:'pointer',
              display:'flex', alignItems:'center', gap:6,
            }}>
              <i className="ti ti-plus" style={{ fontSize:14 }} />
              Reportar mes actual
            </button>
          ) : (
            <div style={{ ...cardStyle }}>
              <div style={cardHeadStyle}>
                <span><i className="ti ti-edit" style={{ color:'#0A2E5C', marginRight:6 }} />
                  Reporte — {MONTH_NAMES[new Date().getMonth()]} {new Date().getFullYear()}
                </span>
              </div>
              <form onSubmit={handleSubmit} style={{ padding:16 }}>
                <div style={{ background:'#E0F7FA', border:'0.5px solid #80DEEA', borderRadius:8, padding:'8px 11px', fontSize:12, color:'#007A99', marginBottom:14 }}>
                  <i className="ti ti-info-circle" style={{ fontSize:13, verticalAlign:-1, marginRight:4 }} />
                  Ingresa el total acumulado desde el inicio del estudio, no solo los nuevos del mes.
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:12 }}>
                  {[
                    { key:'enrolled_total', label:'Enrolados (total)', req:true },
                    { key:'dropouts_total', label:'Abandonos (total)', req:false },
                    { key:'excluded_total', label:'Excluidos (total)', req:false },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:3 }}>
                        {f.label}{f.req && <span style={{color:'#A32D2D'}}> *</span>}
                      </label>
                      <input style={inp} type="number" min="0"
                        value={(form as any)[f.key]}
                        onChange={e=>setForm(fm=>({...fm,[f.key]:e.target.value}))}
                        placeholder={f.req ? 'Obligatorio' : '0'}
                      />
                    </div>
                  ))}
                </div>
                <div style={{ marginBottom:12 }}>
                  <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:3 }}>Observaciones</label>
                  <textarea style={{ ...inp, minHeight:56, resize:'vertical' }}
                    value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}
                    placeholder="Notas sobre el reclutamiento del período..." />
                </div>
                {error && <div style={{ fontSize:12, color:'#791F1F', background:'#FCEBEB', border:'0.5px solid #F7C1C1', borderRadius:7, padding:'7px 10px', marginBottom:10 }}>{error}</div>}
                <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                  <button type="button" onClick={()=>setShowForm(false)} style={{ background:'none', border:'0.5px solid #D3D1C7', borderRadius:7, padding:'6px 14px', fontSize:12, cursor:'pointer', color:'#73726C' }}>Cancelar</button>
                  <button type="submit" disabled={saving} style={{ background:'#0A2E5C', color:'#fff', border:'none', borderRadius:7, padding:'6px 16px', fontSize:12, fontWeight:500, cursor:'pointer' }}>
                    {saving ? 'Guardando...' : 'Enviar reporte'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* historial */}
      <div style={cardStyle}>
        <div style={cardHeadStyle}>
          <span><i className="ti ti-history" style={{ color:'#0A2E5C', marginRight:6 }} />Historial de reportes</span>
        </div>
        {history.length === 0 ? (
          <div style={{ padding:24, textAlign:'center', fontSize:13, color:'#9C9A92' }}>Sin reportes registrados aún.</div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:'#F8F7F4' }}>
                {['Período','Enrolados','Abandonos','Excluidos','Nuevos','Reportado por','Observaciones'].map(h=>(
                  <th key={h} style={{ padding:'7px 14px', textAlign:'left', fontSize:11, fontWeight:500, color:'#9C9A92', borderBottom:'0.5px solid #E8E6DE' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map(r => (
                <tr key={r.id} style={{ borderBottom:'0.5px solid #E8E6DE' }}>
                  <td style={{ padding:'9px 14px', fontWeight:500 }}>{MONTH_NAMES[r.period_month-1]} {r.period_year}</td>
                  <td style={{ padding:'9px 14px', color:'#00A88A', fontWeight:500 }}>{r.enrolled_total}</td>
                  <td style={{ padding:'9px 14px', color:'#854F0B' }}>{r.dropouts_total}</td>
                  <td style={{ padding:'9px 14px', color:'#A32D2D' }}>{r.excluded_total}</td>
                  <td style={{ padding:'9px 14px' }}>{r.new_this_period != null ? (r.new_this_period > 0 ? `+${r.new_this_period}` : r.new_this_period) : '—'}</td>
                  <td style={{ padding:'9px 14px', color:'#9C9A92', fontSize:12 }}>{(r.reporter as any)?.full_name ?? '—'}</td>
                  <td style={{ padding:'9px 14px', color:'#9C9A92', fontSize:12, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ── TAB: Hitos ────────────────────────────────────────────────
function TabMilestones({ projectId }: { projectId: string }) {
  const { user } = useAuth()
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDate, setNewDate] = useState('')
  const [saving, setSaving]   = useState(false)

  const canEdit = ['ADMIN','PM_CRIO','INVESTIGATOR'].includes(user?.role ?? '')

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('milestones')
      .select('*')
      .eq('project_id', projectId)
      .order('due_date')
    setMilestones((data ?? []) as Milestone[])
    setLoading(false)
  }, [projectId])

  useEffect(() => { load() }, [load])

  const handleAdd = async () => {
    if (!newName || !newDate) return
    setSaving(true)
    await supabase.from('milestones').insert({ project_id: projectId, name: newName, due_date: newDate, status: 'PENDING' })
    setSaving(false)
    setShowAdd(false)
    setNewName(''); setNewDate('')
    load()
  }

  const toggleStatus = async (m: Milestone) => {
    const next = m.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED'
    await supabase.from('milestones').update({
      status: next,
      completed_date: next === 'COMPLETED' ? new Date().toISOString().split('T')[0] : null,
    }).eq('id', m.id)
    load()
  }

  const overdue = milestones.filter(m=>m.status==='OVERDUE').length

  if (loading) return <div style={{ padding:24, fontSize:13, color:'#9C9A92' }}>Cargando hitos...</div>

  return (
    <div>
      {overdue > 0 && (
        <div style={{ background:'#FCEBEB', border:'0.5px solid #F7C1C1', borderRadius:9, padding:'9px 13px', fontSize:12, color:'#791F1F', marginBottom:12, display:'flex', gap:8 }}>
          <i className="ti ti-alert-circle" style={{ fontSize:15, flexShrink:0 }} />
          <div><strong>{overdue} hito{overdue>1?'s':''} vencido{overdue>1?'s':''}</strong> — revisar cronograma del proyecto.</div>
        </div>
      )}

      <div style={cardStyle}>
        <div style={cardHeadStyle}>
          <span><i className="ti ti-flag" style={{ color:'#0A2E5C', marginRight:6 }} />Hitos del proyecto</span>
          {canEdit && (
            <button onClick={()=>setShowAdd(!showAdd)} style={{ background:'#0A2E5C', color:'#fff', border:'none', borderRadius:6, padding:'3px 10px', fontSize:11, cursor:'pointer', fontWeight:500, display:'flex', alignItems:'center', gap:4 }}>
              <i className="ti ti-plus" style={{ fontSize:12 }} />Agregar hito
            </button>
          )}
        </div>

        {showAdd && (
          <div style={{ padding:'12px 16px', background:'#F8F7F4', borderBottom:'0.5px solid #E8E6DE', display:'flex', gap:8, alignItems:'flex-end', flexWrap:'wrap' }}>
            <div style={{ flex:2, minWidth:200 }}>
              <label style={{ fontSize:11, color:'#9C9A92', display:'block', marginBottom:3 }}>Nombre del hito</label>
              <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Ej: Primer paciente reclutado"
                style={{ width:'100%', padding:'6px 9px', border:'0.5px solid #D3D1C7', borderRadius:7, fontSize:13, background:'#fff' }} />
            </div>
            <div style={{ minWidth:140 }}>
              <label style={{ fontSize:11, color:'#9C9A92', display:'block', marginBottom:3 }}>Fecha límite</label>
              <input type="date" value={newDate} onChange={e=>setNewDate(e.target.value)}
                style={{ width:'100%', padding:'6px 9px', border:'0.5px solid #D3D1C7', borderRadius:7, fontSize:13, background:'#fff' }} />
            </div>
            <button onClick={handleAdd} disabled={saving||!newName||!newDate} style={{ background:'#0A2E5C', color:'#fff', border:'none', borderRadius:7, padding:'7px 14px', fontSize:12, cursor:'pointer', fontWeight:500 }}>
              {saving ? 'Guardando...' : 'Agregar'}
            </button>
            <button onClick={()=>setShowAdd(false)} style={{ background:'none', border:'0.5px solid #D3D1C7', borderRadius:7, padding:'7px 12px', fontSize:12, cursor:'pointer', color:'#73726C' }}>Cancelar</button>
          </div>
        )}

        {milestones.length === 0 ? (
          <div style={{ padding:24, textAlign:'center', fontSize:13, color:'#9C9A92' }}>Sin hitos registrados.</div>
        ) : milestones.map((m, i) => {
          const isDone    = m.status === 'COMPLETED'
          const isOverdue = m.status === 'OVERDUE'
          const iconColor = isDone ? '#00A88A' : isOverdue ? '#A32D2D' : '#854F0B'
          const icon      = isDone ? 'ti-circle-check' : isOverdue ? 'ti-alert-triangle' : 'ti-clock'
          const badgeBg   = isDone ? '#E0F2F1' : isOverdue ? '#FCEBEB' : '#FAEEDA'
          const badgeColor= isDone ? '#005246' : isOverdue ? '#791F1F' : '#633806'
          const badgeText = isDone ? 'Completado' : isOverdue ? 'Vencido' : 'Pendiente'
          return (
            <div key={m.id} style={{
              display:'flex', alignItems:'center', gap:12, padding:'11px 16px',
              borderBottom: i < milestones.length-1 ? '0.5px solid #E8E6DE' : 'none',
            }}>
              <i className={`ti ${icon}`} style={{ fontSize:18, color:iconColor, flexShrink:0 }} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:500, color:'#3D3D3A' }}>{m.name}</div>
                <div style={{ fontSize:11, color:'#9C9A92', marginTop:2 }}>
                  {m.due_date}
                  {m.completed_date && ` · Completado: ${m.completed_date}`}
                  {m.notes && ` · ${m.notes}`}
                </div>
              </div>
              <span style={{ background:badgeBg, color:badgeColor, fontSize:11, padding:'2px 9px', borderRadius:20, fontWeight:500 }}>{badgeText}</span>
              {canEdit && (
                <button onClick={()=>toggleStatus(m)} style={{ background:'none', border:'0.5px solid #E8E6DE', borderRadius:6, padding:'3px 8px', fontSize:11, cursor:'pointer', color:'#73726C' }}>
                  {isDone ? 'Marcar pendiente' : 'Marcar completado'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────
const TABS = [
  { key:'info',          label:'Información',    icon:'ti-info-circle'   },
  { key:'team',          label:'Equipo',         icon:'ti-users'         },
  { key:'recruitment',   label:'Reclutamiento',  icon:'ti-users-group'   },
  { key:'milestones',    label:'Hitos',          icon:'ti-flag'          },
  { key:'monitoring',    label:'Monitoreo',      icon:'ti-eye'           },
  { key:'monitoring_qa', label:'Monitoreo QA',   icon:'ti-shield-check'  },
  { key:'adverse',       label:'Ef. adversos',   icon:'ti-alert-triangle'},
  { key:'samples',       label:'Muestras',       icon:'ti-test-pipe'     },
  { key:'processing',    label:'Procesamiento',  icon:'ti-flask'         },
  { key:'documents',     label:'Documentos',     icon:'ti-files'         },
  { key:'notes',         label:'Notas',          icon:'ti-notes'         },
  { key:'finance',       label:'Finanzas',       icon:'ti-cash'          },
]

const PRIORITY_DOT: Record<string,string> = {
  HIGH:'#E24B4A', CRITICAL:'#A32D2D', MEDIUM:'#EF9F27', LOW:'#639922',
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('info')

  const load = useCallback(async () => {
    if (!id) return
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        client_org:organizations(id, name, contact_name, contact_email),
        principal_investigator:users!principal_investigator_id(id, full_name, email),
        co_investigator:users!co_investigator_id(id, full_name, email)
      `)
      .eq('id', id)
      .single()
    if (error || !data) { navigate('/proyectos'); return }
    setProject(data as Project)
    setLoading(false)
  }, [id, navigate])

  useEffect(() => { load() }, [load])

  if (loading) return (
    <Layout>
      <div style={{ padding:32, fontSize:13, color:'#9C9A92' }}>Cargando proyecto...</div>
    </Layout>
  )
  if (!project) return null

  const ss  = STATUS_STYLE[project.status] ?? {bg:'#F1EFE8',color:'#444441'}
  const pd  = PRIORITY_DOT[project.priority] ?? '#B4B2A9'

  return (
    <Layout>
      {/* ── Project header ── */}
      <div style={{ background:'#fff', borderBottom:'0.5px solid #E8E6DE' }}>
        <div style={{ padding:'16px 28px 0' }}>
          {/* breadcrumb */}
          <div style={{ fontSize:12, color:'#9C9A92', marginBottom:10, display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ cursor:'pointer', color:'#0A2E5C' }} onClick={()=>navigate('/proyectos')}>
              <i className="ti ti-folder" style={{ fontSize:12 }} /> Proyectos
            </span>
            <i className="ti ti-chevron-right" style={{ fontSize:11 }} />
            <span>{project.codigo_proyecto}</span>
          </div>

          {/* title row */}
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
            <div>
              <div style={{ fontSize:11, fontWeight:500, color:'#0A2E5C', marginBottom:4 }}>{project.codigo_proyecto}</div>
              <div style={{ fontSize:17, fontWeight:500, color:'#3D3D3A', marginBottom:7 }}>{project.titulo}</div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                <span style={{ ...ss, fontSize:11, padding:'2px 9px', borderRadius:20, fontWeight:500 }}>
                  <i className="ti ti-circle-filled" style={{ fontSize:8, marginRight:3 }} />
                  {STATUS_LABELS[project.status] ?? project.status}
                </span>
                <span style={{ background:'#E0F2F1', color:'#005246', fontSize:11, padding:'2px 9px', borderRadius:20, fontWeight:500 }}>
                  {TYPE_LABELS[project.study_type] ?? project.study_type}
                </span>
                {project.trial_phase && project.trial_phase !== 'NOT_APPLICABLE' && (
                  <span style={{ background:'#E0F7FA', color:'#007A99', fontSize:11, padding:'2px 9px', borderRadius:20, fontWeight:500 }}>
                    {PHASE_LABELS[project.trial_phase]}
                  </span>
                )}
                <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, color:'#73726C' }}>
                  <span style={{ width:7, height:7, borderRadius:'50%', background:pd, display:'inline-block' }} />
                  {project.priority === 'HIGH' ? 'Alta' : project.priority === 'MEDIUM' ? 'Media' : project.priority === 'CRITICAL' ? 'Crítica' : 'Baja'}
                </span>
              </div>
            </div>
          </div>

          {/* tabs */}
          <div style={{ display:'flex', gap:0, overflowX:'auto', marginTop:4 }}>
            {TABS.map(t => (
              <button key={t.key} onClick={()=>setActiveTab(t.key)} style={{
                padding:'9px 14px', fontSize:12, cursor:'pointer',
                background:'none', border:'none',
                color: activeTab===t.key ? '#0A2E5C' : '#73726C',
                borderBottom: activeTab===t.key ? '2px solid #0A2E5C' : '2px solid transparent',
                fontWeight: activeTab===t.key ? 500 : 400,
                whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:5,
              }}>
                <i className={`ti ${t.icon}`} style={{ fontSize:13 }} />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab content ── */}
      <div style={{ padding:'20px 28px', maxWidth:1000 }}>
        {activeTab === 'info'           && <TabInfo             project={project} onUpdate={load} />}
        {activeTab === 'team'           && <TabTeam             projectId={project.id} />}
        {activeTab === 'recruitment'    && <TabRecruitment      project={project} onUpdate={load} />}
        {activeTab === 'milestones'     && <TabMilestones       projectId={project.id} />}
        {activeTab === 'documents'      && <TabDocuments        projectId={project.id} />}
        {activeTab === 'adverse'        && <TabAdverseEvents    projectId={project.id} />}
        {activeTab === 'monitoring'     && <TabMonitoring       projectId={project.id} />}
        {activeTab === 'monitoring_qa'  && <TabMonitoringQA     projectId={project.id} />}
        {activeTab === 'samples'        && <TabSamples          projectId={project.id} />}
        {activeTab === 'processing'     && <TabSampleProcessing projectId={project.id} />}
        {activeTab === 'notes'          && <TabNotes            projectId={project.id} />}
        {activeTab === 'finance'        && <TabFinance          projectId={project.id} project={project} />}


          
      </div>
    </Layout>
  )
}
