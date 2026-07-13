// src/pages/ProjectsPage.tsx
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/index'
import Layout from '../components/layout/Layout'

// ── Types ────────────────────────────────────────────────────
interface Project {
  id: string
  codigo_proyecto: string
  titulo: string
  study_type: string
  status: string
  priority: string
  recruited_current: number
  recruitment_target: number | null
  ethics_renewal_date: string | null
  start_date: string
  principal_investigator: { full_name: string } | null
  client_org: { name: string } | null
}

interface NewProjectForm {
  codigo_proyecto: string
  titulo: string
  study_type: string
  project_type: string
  status: string
  priority: string
  sponsor_type: string
  start_date: string
  trial_phase: string
  disease: string
  recruitment_target: string
  estimated_end_date: string
}

// ── Label / style maps ────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  LEAD:'Lead', PROPOSAL:'Propuesta', CONTRACTED:'Contratado',
  ACTIVE:'Activo', PAUSED:'En pausa', CLOSED:'Cerrado',
  COMPLETED:'Completado', CANCELLED:'Cancelado',
}
const TYPE_LABELS: Record<string, string> = {
  INTERVENTIONAL:'Intervencional', OBSERVATIONAL:'Observacional',
  CLINICAL_SERIES:'Serie clínica', SERVICE:'Servicio',
}
const PRIORITY_LABELS: Record<string, string> = {
  LOW:'Baja', MEDIUM:'Media', HIGH:'Alta', CRITICAL:'Crítica',
}
const DISEASE_LABELS: Record<string, string> = {
  CANCER:'Cáncer', PERINATAL:'Perinatales', AUTOIMMUNE:'Autoinmune',
  MENTAL_HEALTH:'Salud Mental', PULMONARY:'Pulmonar', OTHER:'Otros',
}
const STATUS_STYLE: Record<string, {bg:string;color:string}> = {
  ACTIVE:     {bg:'#E1F5EE',color:'#085041'},
  LEAD:       {bg:'#F1EFE8',color:'#444441'},
  PROPOSAL:   {bg:'#EEEDFE',color:'#26215C'},
  CONTRACTED: {bg:'#E6F1FB',color:'#0C447C'},
  PAUSED:     {bg:'#FAEEDA',color:'#633806'},
  CLOSED:     {bg:'#FCEBEB',color:'#791F1F'},
  COMPLETED:  {bg:'#E1F5EE',color:'#085041'},
  CANCELLED:  {bg:'#F1EFE8',color:'#444441'},
}
const TYPE_STYLE: Record<string, {bg:string;color:string}> = {
  INTERVENTIONAL:  {bg:'#E1F5EE',color:'#085041'},
  OBSERVATIONAL:   {bg:'#EEEDFE',color:'#26215C'},
  CLINICAL_SERIES: {bg:'#FAEEDA',color:'#633806'},
  SERVICE:         {bg:'#F1EFE8',color:'#444441'},
}
const PRIORITY_DOT: Record<string,string> = {
  HIGH:'#E24B4A', CRITICAL:'#A32D2D', MEDIUM:'#EF9F27', LOW:'#639922',
}

const PROJECT_TYPE_MAP: Record<string,string> = {
  INTERVENTIONAL:  'INTERVENTIONAL_TRIAL',
  OBSERVATIONAL:   'OBSERVATIONAL_TRIAL',
  CLINICAL_SERIES: 'OBSERVATIONAL_TRIAL',
  SERVICE:         'SERVICE_OTHER',
}

// ── Helpers ──────────────────────────────────────────────────
function daysUntil(d: string) {
  return Math.round((new Date(d).getTime() - Date.now()) / 86400000)
}
function ethicsLabel(date: string | null): {text:string;color:string} {
  if (!date) return {text:'—',color:'#9C9A92'}
  const d = daysUntil(date)
  if (d < 0)   return {text:'Vencida',color:'#A32D2D'}
  if (d <= 30) return {text:`${d}d ⚠`,color:'#A32D2D'}
  if (d <= 60) return {text:`${d}d`,color:'#854F0B'}
  const dt = new Date(date)
  return {text:`${dt.getDate()}/${dt.getMonth()+1}/${dt.getFullYear()}`,color:'#9C9A92'}
}
function recruitPct(cur: number, target: number|null) {
  if (!target) return 0
  return Math.round(cur / target * 100)
}
function recruitColor(pct: number) {
  if (pct >= 80) return '#185FA5'
  if (pct >= 50) return '#1D9E75'
  if (pct >= 30) return '#EF9F27'
  return '#E24B4A'
}
async function nextCode(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `${year}CR`
  const { data } = await supabase
    .from('projects')
    .select('codigo_proyecto')
    .ilike('codigo_proyecto', `${prefix}%`)
    .order('codigo_proyecto', { ascending: false })
    .limit(1)
  if (!data || data.length === 0) return `${prefix}001`
  const last = parseInt(data[0].codigo_proyecto.replace(prefix, ''), 10)
  return `${prefix}${String(last + 1).padStart(3, '0')}`
}

// ── Shared UI pieces ─────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '7px 10px',
  border: '0.5px solid #D3D1C7', borderRadius: 8,
  fontSize: 13, background: '#F8F7F4', color: '#3D3D3A',
  fontFamily: 'inherit', outline: 'none',
}
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 500, color: '#73726C', marginBottom: 4, display: 'block',
}
function Field({ label, required, children }: { label:string; required?:boolean; children: React.ReactNode }) {
  return (
    <div style={{ display:'flex', flexDirection:'column' }}>
      <label style={labelStyle}>{label}{required && <span style={{color:'#A32D2D'}}> *</span>}</label>
      {children}
    </div>
  )
}

// ── MODAL: Nuevo proyecto ─────────────────────────────────────
function NewProjectModal({ onClose, onCreated }: { onClose:()=>void; onCreated:(id:string)=>void }) {
  const { user } = useAuth()
  const [form, setForm] = useState<NewProjectForm>({
    codigo_proyecto: '', titulo: '', study_type: '',
    project_type: '', status: 'LEAD', priority: 'MEDIUM',
    sponsor_type: 'EXTERNAL', start_date: new Date().toISOString().split('T')[0],
    trial_phase: 'NOT_APPLICABLE', disease: 'OTHER',
    recruitment_target: '', estimated_end_date: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string|null>(null)
  const [codeLoading, setCodeLoading] = useState(true)

  useEffect(() => {
    nextCode().then(code => {
      setForm(f => ({ ...f, codigo_proyecto: code }))
      setCodeLoading(false)
    })
  }, [])

  const set = (k: keyof NewProjectForm) => (
    (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.titulo || !form.study_type || !form.start_date) {
      setError('Completa los campos obligatorios.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const payload: any = {
        codigo_proyecto: form.codigo_proyecto,
        titulo:          form.titulo,
        study_type:      form.study_type,
        project_type:    PROJECT_TYPE_MAP[form.study_type] ?? 'SERVICE_OTHER',
        status:          form.status,
        priority:        form.priority,
        sponsor_type:    form.sponsor_type,
        start_date:      form.start_date,
        trial_phase:     form.trial_phase || 'NOT_APPLICABLE',
        disease:         form.disease || 'OTHER',
      }
      if (form.recruitment_target)  payload.recruitment_target  = parseInt(form.recruitment_target)
      if (form.estimated_end_date)  payload.estimated_end_date  = form.estimated_end_date

      const { data, error: err } = await supabase
        .from('projects')
        .insert(payload)
        .select('id')
        .single()

      if (err) throw err

      // agregar al PM como miembro del equipo
      if (user) {
        await supabase.from('project_team_members').insert({
          project_id: data.id,
          user_id:    user.id,
          team_role:  'OTHER',
        })
      }

      onCreated(data.id)
    } catch (err: any) {
      setError(err.message ?? 'Error al crear el proyecto')
    } finally {
      setLoading(false)
    }
  }

  const overlay: React.CSSProperties = {
    position:'fixed', inset:0, background:'rgba(0,0,0,0.35)',
    zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:16,
  }
  const modal: React.CSSProperties = {
    background:'#fff', borderRadius:12, width:'100%', maxWidth:560,
    maxHeight:'88vh', overflowY:'auto', boxShadow:'0 8px 32px rgba(0,0,0,0.16)',
  }

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modal}>
        {/* head */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'0.5px solid #E8E6DE' }}>
          <div style={{ fontSize:15, fontWeight:500, color:'#3D3D3A' }}>
            <i className="ti ti-folder-plus" style={{ color:'#185FA5', marginRight:8, fontSize:16, verticalAlign:-2 }} />
            Nuevo proyecto
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#9C9A92', fontSize:18, lineHeight:1 }}>
            <i className="ti ti-x" />
          </button>
        </div>

        {/* body */}
        <form onSubmit={handleSubmit}>
          <div style={{ padding:'20px', display:'flex', flexDirection:'column', gap:14 }}>

            {/* código + título */}
            <div style={{ display:'grid', gridTemplateColumns:'140px 1fr', gap:12 }}>
              <Field label="Código" required>
                <input style={{ ...inputStyle, background: codeLoading ? '#F1EFE8' : '#F8F7F4', fontWeight:500, color:'#185FA5' }}
                  value={codeLoading ? 'Generando...' : form.codigo_proyecto}
                  onChange={set('codigo_proyecto')}
                  pattern="^[0-9]{4}CR[0-9]+"
                  title="Formato: YYYYCR001"
                  required
                />
              </Field>
              <Field label="Título del proyecto" required>
                <input style={inputStyle} value={form.titulo} onChange={set('titulo')}
                  placeholder="Nombre completo del estudio o servicio" required />
              </Field>
            </div>

            {/* tipo + fase */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Field label="Tipo de estudio" required>
                <select style={inputStyle} value={form.study_type} onChange={set('study_type')} required>
                  <option value="">Seleccionar...</option>
                  <option value="INTERVENTIONAL">Intervencional</option>
                  <option value="OBSERVATIONAL">Observacional</option>
                  <option value="CLINICAL_SERIES">Serie clínica</option>
                  <option value="SERVICE">Servicio / Otro</option>
                </select>
              </Field>
              <Field label="Fase del ensayo">
                <select style={inputStyle} value={form.trial_phase} onChange={set('trial_phase')}>
                  <option value="NOT_APPLICABLE">No aplica</option>
                  <option value="PHASE_I">Fase I</option>
                  <option value="PHASE_II">Fase II</option>
                  <option value="PHASE_IIA">Fase IIa</option>
                  <option value="PHASE_IIB">Fase IIb</option>
                  <option value="PHASE_III">Fase III</option>
                  <option value="PHASE_IV">Fase IV</option>
                  <option value="PHASE_0">Fase 0</option>
                </select>
              </Field>
            </div>

            {/* estado + prioridad + sponsor */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
              <Field label="Estado inicial">
                <select style={inputStyle} value={form.status} onChange={set('status')}>
                  <option value="LEAD">Lead</option>
                  <option value="PROPOSAL">Propuesta</option>
                  <option value="CONTRACTED">Contratado</option>
                  <option value="ACTIVE">Activo</option>
                </select>
              </Field>
              <Field label="Prioridad">
                <select style={inputStyle} value={form.priority} onChange={set('priority')}>
                  <option value="LOW">Baja</option>
                  <option value="MEDIUM">Media</option>
                  <option value="HIGH">Alta</option>
                  <option value="CRITICAL">Crítica</option>
                </select>
              </Field>
              <Field label="Tipo de sponsor">
                <select style={inputStyle} value={form.sponsor_type} onChange={set('sponsor_type')}>
                  <option value="EXTERNAL">Externo</option>
                  <option value="INTERNAL">Interno</option>
                </select>
              </Field>
            </div>

            {/* enfermedad */}
            <Field label="Área / enfermedad">
              <select style={inputStyle} value={form.disease} onChange={set('disease')}>
                <option value="OTHER">Otros</option>
                <option value="CANCER">Cáncer</option>
                <option value="PERINATAL">Perinatales</option>
                <option value="AUTOIMMUNE">Autoinmune</option>
                <option value="MENTAL_HEALTH">Salud Mental</option>
                <option value="PULMONARY">Pulmonar</option>
              </select>
            </Field>

            {/* fechas */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Field label="Fecha de inicio" required>
                <input style={inputStyle} type="date" value={form.start_date} onChange={set('start_date')} required />
              </Field>
              <Field label="Fecha estimada de cierre">
                <input style={inputStyle} type="date" value={form.estimated_end_date} onChange={set('estimated_end_date')} />
              </Field>
            </div>

            {/* meta reclutamiento */}
            <Field label="Meta de reclutamiento (pacientes)">
              <input style={inputStyle} type="number" min="0"
                value={form.recruitment_target} onChange={set('recruitment_target')}
                placeholder="Ej: 100 — dejar vacío si no aplica" />
            </Field>

            {/* info box */}
            <div style={{ background:'#E6F1FB', border:'0.5px solid #B5D4F4', borderRadius:8, padding:'9px 12px', fontSize:12, color:'#0C447C' }}>
              <i className="ti ti-info-circle" style={{ fontSize:13, verticalAlign:-1, marginRight:5 }} />
              Puedes completar el equipo, investigador principal, sponsor y detalles del protocolo desde el detalle del proyecto.
            </div>

            {error && (
              <div style={{ background:'#FCEBEB', border:'0.5px solid #F7C1C1', borderRadius:8, padding:'9px 12px', fontSize:12, color:'#791F1F' }}>
                <i className="ti ti-alert-circle" style={{ fontSize:13, verticalAlign:-1, marginRight:5 }} />
                {error}
              </div>
            )}
          </div>

          {/* footer */}
          <div style={{ display:'flex', justifyContent:'flex-end', gap:8, padding:'14px 20px', borderTop:'0.5px solid #E8E6DE' }}>
            <button type="button" onClick={onClose} style={{
              background:'transparent', border:'0.5px solid #D3D1C7', color:'#73726C',
              padding:'7px 16px', borderRadius:8, fontSize:13, cursor:'pointer',
            }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading} style={{
              background: loading ? '#9C9A92' : '#185FA5', color:'#fff', border:'none',
              padding:'7px 18px', borderRadius:8, fontSize:13, fontWeight:500,
              cursor: loading ? 'not-allowed' : 'pointer',
              display:'flex', alignItems:'center', gap:6,
            }}>
              <i className="ti ti-send" style={{ fontSize:13 }} />
              {loading ? 'Creando...' : 'Crear proyecto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────
export default function ProjectsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)

  // filters
  const [search,    setSearch]    = useState('')
  const [fStatus,   setFStatus]   = useState('')
  const [fType,     setFType]     = useState('')
  const [fPriority, setFPriority] = useState('')
  const [fDisease,  setFDisease]  = useState('')

  const canCreate = ['ADMIN','PM_CRIO'].includes(user?.role ?? '')

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('projects')
      .select(`
        id, codigo_proyecto, titulo, study_type, status, priority,
        recruited_current, recruitment_target, ethics_renewal_date, start_date,
        principal_investigator:users!principal_investigator_id(full_name),
        client_org:organizations(name)
      `)
      .order('created_at', { ascending: false })

    if (fStatus)   q = q.eq('status', fStatus)
    if (fType)     q = q.eq('study_type', fType)
    if (fPriority) q = q.eq('priority', fPriority)
    if (fDisease)  q = q.eq('disease', fDisease)
    if (search)    q = q.or(`codigo_proyecto.ilike.%${search}%,titulo.ilike.%${search}%`)

    const { data } = await q
    setProjects((data ?? []) as Project[])
    setLoading(false)
  }, [search, fStatus, fType, fPriority, fDisease])

  useEffect(() => { load() }, [load])

  const clearFilters = () => {
    setSearch(''); setFStatus(''); setFType(''); setFPriority(''); setFDisease('')
  }

  const hasFilters = search || fStatus || fType || fPriority || fDisease

  const selStyle: React.CSSProperties = {
    padding: '6px 10px', border: '0.5px solid #D3D1C7', borderRadius: 8,
    fontSize: 13, background: '#fff', color: '#3D3D3A', cursor: 'pointer',
  }

  return (
    <Layout>
      <div style={{ padding: '24px 28px' }}>

        {/* ── Header ── */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:18 }}>
          <div>
            <h1 style={{ fontSize:17, fontWeight:500, color:'#3D3D3A', margin:0 }}>Proyectos</h1>
            <div style={{ fontSize:12, color:'#9C9A92', marginTop:3 }}>
              {loading ? 'Cargando...' : `${projects.length} proyecto${projects.length !== 1 ? 's' : ''}`}
              {hasFilters && ' — filtros aplicados'}
            </div>
          </div>
          {canCreate && (
            <button
              onClick={() => setShowModal(true)}
              style={{
                background:'#185FA5', color:'#fff', border:'none',
                padding:'8px 16px', borderRadius:8, fontSize:13, fontWeight:500,
                cursor:'pointer', display:'flex', alignItems:'center', gap:6,
              }}
            >
              <i className="ti ti-plus" style={{ fontSize:15 }} />
              Nuevo proyecto
            </button>
          )}
        </div>

        {/* ── Filters ── */}
        <div style={{
          background:'#fff', border:'0.5px solid #E8E6DE', borderRadius:10,
          padding:'12px 16px', marginBottom:12,
          display:'flex', gap:8, flexWrap:'wrap', alignItems:'center',
        }}>
          {/* search */}
          <div style={{ position:'relative', flex:1, minWidth:180 }}>
            <i className="ti ti-search" style={{
              position:'absolute', left:9, top:'50%', transform:'translateY(-50%)',
              color:'#9C9A92', fontSize:14, pointerEvents:'none',
            }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Código, título o investigador..."
              style={{ ...selStyle, paddingLeft:30, width:'100%' }}
            />
          </div>

          <select value={fStatus}   onChange={e => setFStatus(e.target.value)}   style={selStyle}>
            <option value="">Estado</option>
            {Object.entries(STATUS_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
          </select>

          <select value={fType}     onChange={e => setFType(e.target.value)}     style={selStyle}>
            <option value="">Tipo</option>
            {Object.entries(TYPE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
          </select>

          <select value={fPriority} onChange={e => setFPriority(e.target.value)} style={selStyle}>
            <option value="">Prioridad</option>
            {Object.entries(PRIORITY_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
          </select>

          <select value={fDisease}  onChange={e => setFDisease(e.target.value)}  style={selStyle}>
            <option value="">Enfermedad</option>
            {Object.entries(DISEASE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
          </select>

          {hasFilters && (
            <button onClick={clearFilters} style={{
              background:'#E6F1FB', color:'#0C447C', border:'none',
              padding:'6px 12px', borderRadius:20, fontSize:12, fontWeight:500, cursor:'pointer',
              display:'flex', alignItems:'center', gap:4,
            }}>
              <i className="ti ti-x" style={{ fontSize:12 }} /> Limpiar
            </button>
          )}
        </div>

        {/* ── Table ── */}
        <div style={{ background:'#fff', border:'0.5px solid #E8E6DE', borderRadius:10, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, tableLayout:'fixed' }}>
            <thead>
              <tr style={{ background:'#F8F7F4' }}>
                {[
                  { label:'Código',        w:100 },
                  { label:'Título / PI',   w:220 },
                  { label:'Tipo',          w:130 },
                  { label:'Estado',        w:110 },
                  { label:'Prioridad',     w:90  },
                  { label:'Reclutamiento', w:120 },
                  { label:'Renovación ética', w:110 },
                  { label:'',              w:60  },
                ].map(h => (
                  <th key={h.label} style={{
                    padding:'8px 14px', textAlign:'left',
                    fontSize:11, fontWeight:500, color:'#9C9A92',
                    borderBottom:'0.5px solid #E8E6DE',
                    width: h.w,
                  }}>
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding:32, textAlign:'center', color:'#9C9A92', fontSize:13 }}>
                  Cargando proyectos...
                </td></tr>
              ) : projects.length === 0 ? (
                <tr><td colSpan={8} style={{ padding:48, textAlign:'center' }}>
                  <i className="ti ti-folder-off" style={{ fontSize:28, color:'#D3D1C7', display:'block', marginBottom:10 }} />
                  <div style={{ fontSize:14, color:'#9C9A92', marginBottom:6 }}>
                    {hasFilters ? 'Sin proyectos con los filtros aplicados' : 'No hay proyectos aún'}
                  </div>
                  {!hasFilters && canCreate && (
                    <button onClick={() => setShowModal(true)} style={{
                      background:'#185FA5', color:'#fff', border:'none',
                      padding:'7px 16px', borderRadius:8, fontSize:13, cursor:'pointer',
                      marginTop:4,
                    }}>
                      Crear primer proyecto
                    </button>
                  )}
                  {hasFilters && (
                    <button onClick={clearFilters} style={{
                      background:'none', border:'none', color:'#185FA5',
                      fontSize:13, cursor:'pointer', textDecoration:'underline', marginTop:4,
                    }}>
                      Limpiar filtros
                    </button>
                  )}
                </td></tr>
              ) : projects.map(p => {
                const pct = recruitPct(p.recruited_current, p.recruitment_target)
                const rc  = recruitColor(pct)
                const et  = ethicsLabel(p.ethics_renewal_date)
                const ss  = STATUS_STYLE[p.status]   ?? {bg:'#F1EFE8',color:'#444441'}
                const ts  = TYPE_STYLE[p.study_type] ?? {bg:'#F1EFE8',color:'#444441'}
                const pd  = PRIORITY_DOT[p.priority] ?? '#B4B2A9'
                const pl  = PRIORITY_LABELS[p.priority] ?? p.priority

                return (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/proyectos/${p.id}`)}
                    style={{ borderBottom:'0.5px solid #E8E6DE', cursor:'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F8F7F4')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <td style={{ padding:'10px 14px', fontWeight:500, color:'#185FA5', fontSize:12 }}>
                      {p.codigo_proyecto}
                    </td>
                    <td style={{ padding:'10px 14px' }}>
                      <div style={{ fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {p.titulo}
                      </div>
                      <div style={{ fontSize:11, color:'#9C9A92', marginTop:2 }}>
                        {(p.principal_investigator as any)?.full_name ?? 'Sin PI asignado'}
                      </div>
                    </td>
                    <td style={{ padding:'10px 14px' }}>
                      <span style={{ ...ts, fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:500 }}>
                        {TYPE_LABELS[p.study_type] ?? p.study_type}
                      </span>
                    </td>
                    <td style={{ padding:'10px 14px' }}>
                      <span style={{ ...ss, fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:500 }}>
                        {STATUS_LABELS[p.status] ?? p.status}
                      </span>
                    </td>
                    <td style={{ padding:'10px 14px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:12 }}>
                        <span style={{ width:7, height:7, borderRadius:'50%', background:pd, display:'inline-block', flexShrink:0 }} />
                        {pl}
                      </div>
                    </td>
                    <td style={{ padding:'10px 14px' }}>
                      {p.recruitment_target ? (
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <div style={{ flex:1, height:5, background:'#F1EFE8', borderRadius:3, overflow:'hidden', minWidth:40 }}>
                            <div style={{ height:'100%', width:`${Math.min(pct,100)}%`, background:rc, borderRadius:3 }} />
                          </div>
                          <span style={{ fontSize:11, color:'#9C9A92', minWidth:28 }}>{pct}%</span>
                        </div>
                      ) : (
                        <span style={{ fontSize:11, color:'#B4B2A9' }}>N/A</span>
                      )}
                    </td>
                    <td style={{ padding:'10px 14px', fontSize:12, color:et.color }}>
                      {et.text}
                    </td>
                    <td style={{ padding:'10px 14px' }}>
                      <div style={{ display:'flex', gap:4, justifyContent:'flex-end' }}>
                        <button
                          onClick={e => { e.stopPropagation(); navigate(`/proyectos/${p.id}`) }}
                          style={{ padding:'4px 6px', border:'0.5px solid #E8E6DE', borderRadius:6, background:'transparent', cursor:'pointer', color:'#73726C', fontSize:14 }}
                          title="Ver detalle"
                        >
                          <i className="ti ti-eye" />
                        </button>
                        {canCreate && (
                          <button
                            onClick={e => { e.stopPropagation(); navigate(`/proyectos/${p.id}`) }}
                            style={{ padding:'4px 6px', border:'0.5px solid #E8E6DE', borderRadius:6, background:'transparent', cursor:'pointer', color:'#73726C', fontSize:14 }}
                            title="Editar"
                          >
                            <i className="ti ti-edit" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* pager */}
          {projects.length > 0 && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 16px', borderTop:'0.5px solid #E8E6DE' }}>
              <span style={{ fontSize:12, color:'#9C9A92' }}>
                {projects.length} resultado{projects.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal ── */}
      {showModal && (
        <NewProjectModal
          onClose={() => setShowModal(false)}
          onCreated={id => { setShowModal(false); navigate(`/proyectos/${id}`) }}
        />
      )}
    </Layout>
  )
}
