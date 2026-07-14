// src/components/project/TabMonitoringQA.tsx
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/index'

// ── Types ────────────────────────────────────────────────────
interface Finding {
  id: string
  visit_id: string
  description: string
  category: string
  status: string
  response_text: string | null
  response_by: string | null
  response_date: string | null
  decision_approved: boolean | null
  decision_text: string | null
  decision_by: string | null
  decision_date: string | null
  created_at: string
}

interface Visit {
  id: string
  project_id: string
  monitor_id: string
  visit_type: string
  status: string
  scheduled_date: string
  actual_date: string | null
  training_date: string | null
  notes: string | null
  monitoring_type: string
  created_at: string
  monitor: { id: string; full_name: string; email: string } | null
  findings: Finding[]
}

// ── Label maps ───────────────────────────────────────────────
const VISIT_TYPE_LABELS: Record<string,string> = {
  INITIATION:'Inicio', FOLLOW_UP:'Seguimiento', CLOSE_OUT:'Cierre',
}
const VISIT_STATUS_LABELS: Record<string,string> = {
  SCHEDULED:'Agendada', COMPLETED:'Realizada', CANCELLED:'Cancelada',
}
const CATEGORY_LABELS: Record<string,string> = {
  CRITICAL:'Crítico', MAJOR:'Mayor', MINOR:'Menor',
}
const FINDING_STATUS_LABELS: Record<string,string> = {
  OPEN:'Abierto', RESPONDED:'Respondido',
  APPROVED:'Aprobado', REJECTED:'Rechazado',
}
const VISIT_STATUS_STYLE: Record<string,{bg:string;color:string}> = {
  SCHEDULED:  {bg:'#E6F1FB',color:'#0C447C'},
  COMPLETED:  {bg:'#E1F5EE',color:'#085041'},
  CANCELLED:  {bg:'#FCEBEB',color:'#791F1F'},
}
const VISIT_TYPE_STYLE: Record<string,{bg:string;color:string}> = {
  INITIATION: {bg:'#EEEDFE',color:'#26215C'},
  FOLLOW_UP:  {bg:'#F1EFE8',color:'#444441'},
  CLOSE_OUT:  {bg:'#FAEEDA',color:'#633806'},
}
const CATEGORY_STYLE: Record<string,{bg:string;color:string}> = {
  CRITICAL: {bg:'#FCEBEB',color:'#791F1F'},
  MAJOR:    {bg:'#FAEEDA',color:'#633806'},
  MINOR:    {bg:'#E6F1FB',color:'#0C447C'},
}
const FINDING_STATUS_STYLE: Record<string,{bg:string;color:string}> = {
  OPEN:      {bg:'#FCEBEB',color:'#791F1F'},
  RESPONDED: {bg:'#FAEEDA',color:'#633806'},
  APPROVED:  {bg:'#E1F5EE',color:'#085041'},
  REJECTED:  {bg:'#F1EFE8',color:'#444441'},
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CL',{day:'2-digit',month:'2-digit',year:'numeric'})
}
function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-CL',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})
}

// ── Finding row ───────────────────────────────────────────────
function FindingRow({ finding, onUpdate }: { finding: Finding; onUpdate: () => void }) {
  const { user } = useAuth()
  const [expanded, setExpanded]     = useState(false)
  const [showForm, setShowForm]     = useState(false)
  const [responseText, setResponseText] = useState('')
  const [decisionText, setDecisionText] = useState('')
  const [saving, setSaving] = useState(false)

  const role = user?.role ?? ''
  const isQA          = ['QA','ADMIN','PM_CRIO'].includes(role)
  const isCoordinator = ['COORDINATOR','ADMIN','PM_CRIO'].includes(role)

  const cs = CATEGORY_STYLE[finding.category]     ?? {bg:'#F1EFE8',color:'#444441'}
  const fs = FINDING_STATUS_STYLE[finding.status] ?? {bg:'#F1EFE8',color:'#444441'}

  const canRespond = isCoordinator && (finding.status === 'OPEN' || finding.status === 'REJECTED')
  const canDecide  = isQA && finding.status === 'RESPONDED'

  const submitResponse = async () => {
    if (!responseText.trim()) return
    setSaving(true)
    await supabase.from('monitoring_findings').update({
      status:        'RESPONDED',
      response_text: responseText.trim(),
      response_by:   user?.id,
      response_date: new Date().toISOString(),
    }).eq('id', finding.id)
    setSaving(false)
    setShowForm(false)
    setResponseText('')
    onUpdate()
  }

  const submitDecision = async (approved: boolean) => {
    if (!decisionText.trim()) return
    setSaving(true)
    await supabase.from('monitoring_findings').update({
      status:            approved ? 'APPROVED' : 'REJECTED',
      decision_approved: approved,
      decision_text:     decisionText.trim(),
      decision_by:       user?.id,
      decision_date:     new Date().toISOString(),
    }).eq('id', finding.id)
    setSaving(false)
    setDecisionText('')
    onUpdate()
  }

  const inp: React.CSSProperties = {
    width:'100%', padding:'7px 10px', border:'0.5px solid #D3D1C7',
    borderRadius:8, fontSize:13, background:'#fff',
    color:'#3D3D3A', fontFamily:'inherit', outline:'none',
    resize:'vertical', minHeight:60,
  }

  return (
    <div style={{ borderBottom:'0.5px solid #E8E6DE' }}>
      <div
        style={{ padding:'11px 16px', cursor:'pointer', display:'flex', alignItems:'flex-start', gap:10 }}
        onClick={() => setExpanded(e=>!e)}
        onMouseEnter={e=>(e.currentTarget.style.background='#F8F7F4')}
        onMouseLeave={e=>(e.currentTarget.style.background='')}
      >
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5, flexWrap:'wrap' }}>
            <span style={{ ...cs, fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:500 }}>
              {CATEGORY_LABELS[finding.category]}
            </span>
            <span style={{ ...fs, fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:500 }}>
              {FINDING_STATUS_LABELS[finding.status]}
            </span>
            <span style={{ fontSize:11, color:'#9C9A92' }}>{formatDate(finding.created_at)}</span>
          </div>
          <div style={{ fontSize:13, color:'#3D3D3A', lineHeight:1.4 }}>{finding.description}</div>
        </div>
        <i className={`ti ti-chevron-${expanded?'up':'down'}`} style={{ fontSize:15, color:'#9C9A92', flexShrink:0, marginTop:2 }} />
      </div>

      {expanded && (
        <div style={{ background:'#F8F7F4', padding:'12px 16px', display:'flex', flexDirection:'column', gap:10 }}>

          {finding.response_text && (
            <div style={{ background:'#fff', border:'0.5px solid #E8E6DE', borderRadius:8, padding:'10px 12px' }}>
              <div style={{ fontSize:11, fontWeight:500, color:'#9C9A92', marginBottom:5, display:'flex', alignItems:'center', gap:5 }}>
                <i className="ti ti-message-reply" style={{ fontSize:13 }} />
                Respuesta coordinadora — {finding.response_date ? formatDateTime(finding.response_date) : ''}
              </div>
              <div style={{ fontSize:13, color:'#3D3D3A', lineHeight:1.4 }}>{finding.response_text}</div>
            </div>
          )}

          {finding.decision_text && (
            <div style={{
              background: finding.decision_approved ? '#E1F5EE' : '#FCEBEB',
              border: `0.5px solid ${finding.decision_approved ? '#9FE1CB' : '#F7C1C1'}`,
              borderRadius:8, padding:'10px 12px',
            }}>
              <div style={{ fontSize:11, fontWeight:500, color:finding.decision_approved?'#085041':'#791F1F', marginBottom:5, display:'flex', alignItems:'center', gap:5 }}>
                <i className={`ti ti-${finding.decision_approved?'circle-check':'circle-x'}`} style={{ fontSize:13 }} />
                {finding.decision_approved?'Aprobado':'Rechazado'} por QA — {finding.decision_date ? formatDateTime(finding.decision_date) : ''}
              </div>
              <div style={{ fontSize:13, color:finding.decision_approved?'#085041':'#791F1F', lineHeight:1.4 }}>{finding.decision_text}</div>
            </div>
          )}

          {canRespond && !showForm && (
            <button onClick={()=>setShowForm(true)} style={{ background:'#185FA5', color:'#fff', border:'none', padding:'6px 14px', borderRadius:8, fontSize:12, fontWeight:500, cursor:'pointer', alignSelf:'flex-start', display:'flex', alignItems:'center', gap:5 }}>
              <i className="ti ti-message" style={{ fontSize:13 }} />
              {finding.status==='REJECTED' ? 'Corregir respuesta' : 'Responder hallazgo'}
            </button>
          )}

          {canRespond && showForm && (
            <div style={{ background:'#fff', border:'0.5px solid #E8E6DE', borderRadius:9, padding:14 }}>
              {finding.status==='REJECTED' && (
                <div style={{ background:'#FAEEDA', border:'0.5px solid #FAC775', borderRadius:7, padding:'8px 11px', fontSize:12, color:'#633806', marginBottom:10 }}>
                  <i className="ti ti-info-circle" style={{ fontSize:13, marginRight:5 }} />
                  El equipo QA rechazó tu respuesta. Incluye mayor evidencia o detalle.
                </div>
              )}
              <textarea style={inp} value={responseText} onChange={e=>setResponseText(e.target.value)}
                placeholder="Describe la acción correctiva tomada..." />
              <div style={{ display:'flex', gap:8, marginTop:8 }}>
                <button onClick={submitResponse} disabled={saving||!responseText.trim()} style={{ background:'#185FA5', color:'#fff', border:'none', padding:'6px 14px', borderRadius:7, fontSize:12, fontWeight:500, cursor:'pointer' }}>
                  {saving?'Enviando...':'Enviar respuesta'}
                </button>
                <button onClick={()=>{setShowForm(false);setResponseText('')}} style={{ background:'none', border:'0.5px solid #D3D1C7', color:'#73726C', padding:'6px 12px', borderRadius:7, fontSize:12, cursor:'pointer' }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {canDecide && (
            <div style={{ background:'#fff', border:'0.5px solid #E8E6DE', borderRadius:9, padding:14 }}>
              <div style={{ fontSize:12, fontWeight:500, color:'#3D3D3A', marginBottom:8 }}>
                <i className="ti ti-shield-check" style={{ fontSize:13, color:'#185FA5', marginRight:5 }} />
                Decisión del equipo QA
              </div>
              <textarea style={inp} value={decisionText} onChange={e=>setDecisionText(e.target.value)}
                placeholder="Comentario sobre la decisión..." />
              <div style={{ display:'flex', gap:8, marginTop:8 }}>
                <button onClick={()=>submitDecision(true)} disabled={saving||!decisionText.trim()} style={{ background:'#E1F5EE', color:'#085041', border:'0.5px solid #9FE1CB', padding:'6px 14px', borderRadius:7, fontSize:12, fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                  <i className="ti ti-check" style={{ fontSize:13 }} /> Aprobar
                </button>
                <button onClick={()=>submitDecision(false)} disabled={saving||!decisionText.trim()} style={{ background:'#FCEBEB', color:'#791F1F', border:'0.5px solid #F7C1C1', padding:'6px 14px', borderRadius:7, fontSize:12, fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                  <i className="ti ti-x" style={{ fontSize:13 }} /> Rechazar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── QA Visit modal ────────────────────────────────────────────
function QAVisitModal({ projectId, onClose, onSaved }: { projectId:string; onClose:()=>void; onSaved:()=>void }) {
  const { user } = useAuth()
  const [qaUsers, setQaUsers] = useState<any[]>([])
  const [form, setForm] = useState({
    monitor_id:     '',
    visit_type:     'FOLLOW_UP',
    scheduled_date: '',
    notes:          '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string|null>(null)

  useEffect(() => {
    supabase.from('users').select('id, full_name, email')
      .in('role', ['QA','ADMIN','PM_CRIO'])
      .eq('is_active', true)
      .order('full_name')
      .then(({data}) => setQaUsers(data ?? []))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.monitor_id || !form.scheduled_date) { setError('Responsable QA y fecha son obligatorios.'); return }
    setSaving(true)
    const { error: err } = await supabase.from('monitoring_visits').insert({
      project_id:      projectId,
      monitor_id:      form.monitor_id,
      visit_type:      form.visit_type,
      status:          'SCHEDULED',
      scheduled_date:  form.scheduled_date,
      notes:           form.notes || null,
      monitoring_type: 'INTERNAL_QA',
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
    onClose()
  }

  const inp: React.CSSProperties = {
    width:'100%', padding:'7px 10px', border:'0.5px solid #D3D1C7',
    borderRadius:8, fontSize:13, background:'#F8F7F4',
    color:'#3D3D3A', fontFamily:'inherit', outline:'none',
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth:460, boxShadow:'0 8px 32px rgba(0,0,0,0.16)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'0.5px solid #E8E6DE' }}>
          <div style={{ fontSize:15, fontWeight:500, color:'#3D3D3A' }}>
            <i className="ti ti-shield-check" style={{ color:'#185FA5', marginRight:8, fontSize:15, verticalAlign:-2 }} />
            Agendar visita de calidad (QA)
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#9C9A92', fontSize:18 }}>
            <i className="ti ti-x" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ padding:20, display:'flex', flexDirection:'column', gap:13 }}>
            <div style={{ background:'#E6F1FB', border:'0.5px solid #B5D4F4', borderRadius:8, padding:'9px 12px', fontSize:12, color:'#0C447C' }}>
              <i className="ti ti-lock" style={{ fontSize:13, marginRight:5 }} />
              Esta visita y sus hallazgos son <strong>confidenciales</strong> — no visibles para el Investigador Principal ni el Monitor Externo.
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:4 }}>Tipo de visita *</label>
                <select style={inp} value={form.visit_type} onChange={e=>setForm(f=>({...f,visit_type:e.target.value}))}>
                  {Object.entries(VISIT_TYPE_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:4 }}>Fecha programada *</label>
                <input style={inp} type="date" value={form.scheduled_date} onChange={e=>setForm(f=>({...f,scheduled_date:e.target.value}))} required />
              </div>
            </div>
            <div>
              <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:4 }}>Responsable QA *</label>
              <select style={inp} value={form.monitor_id} onChange={e=>setForm(f=>({...f,monitor_id:e.target.value}))} required>
                <option value="">Seleccionar responsable QA...</option>
                {qaUsers.map(u=><option key={u.id} value={u.id}>{u.full_name} — {u.email}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:4 }}>Observaciones</label>
              <textarea style={{ ...inp, minHeight:56, resize:'vertical' }}
                value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}
                placeholder="Objetivo de la visita de calidad..." />
            </div>
            {error && <div style={{ background:'#FCEBEB', border:'0.5px solid #F7C1C1', borderRadius:8, padding:'9px 12px', fontSize:12, color:'#791F1F' }}><i className="ti ti-alert-circle" style={{ fontSize:13, marginRight:5 }} />{error}</div>}
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', gap:8, padding:'14px 20px', borderTop:'0.5px solid #E8E6DE' }}>
            <button type="button" onClick={onClose} style={{ background:'transparent', border:'0.5px solid #D3D1C7', color:'#73726C', padding:'7px 16px', borderRadius:8, fontSize:13, cursor:'pointer' }}>Cancelar</button>
            <button type="submit" disabled={saving} style={{ background:saving?'#9C9A92':'#185FA5', color:'#fff', border:'none', padding:'7px 18px', borderRadius:8, fontSize:13, fontWeight:500, cursor:saving?'not-allowed':'pointer', display:'flex', alignItems:'center', gap:6 }}>
              <i className="ti ti-send" style={{ fontSize:13 }} />
              {saving?'Agendando...':'Agendar visita QA'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Finding modal ─────────────────────────────────────────────
function FindingModal({ visitId, onClose, onSaved }: { visitId:string; onClose:()=>void; onSaved:()=>void }) {
  const [form, setForm] = useState({ description:'', category:'MINOR' })
  const [saving, setSaving] = useState(false)

  const inp: React.CSSProperties = {
    width:'100%', padding:'7px 10px', border:'0.5px solid #D3D1C7',
    borderRadius:8, fontSize:13, background:'#F8F7F4',
    color:'#3D3D3A', fontFamily:'inherit', outline:'none',
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.description.trim()) return
    setSaving(true)
    await supabase.from('monitoring_findings').insert({
      visit_id:    visitId,
      description: form.description.trim(),
      category:    form.category,
      status:      'OPEN',
    })
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth:440, boxShadow:'0 8px 32px rgba(0,0,0,0.16)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'0.5px solid #E8E6DE' }}>
          <div style={{ fontSize:15, fontWeight:500, color:'#3D3D3A' }}>
            <i className="ti ti-alert-circle" style={{ color:'#A32D2D', marginRight:8, fontSize:15, verticalAlign:-2 }} />
            Registrar hallazgo QA
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#9C9A92', fontSize:18 }}><i className="ti ti-x" /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ padding:20, display:'flex', flexDirection:'column', gap:13 }}>
            <div>
              <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:4 }}>Categoría *</label>
              <select style={inp} value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                {Object.entries(CATEGORY_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:4 }}>Descripción del hallazgo *</label>
              <textarea style={{ ...inp, minHeight:80, resize:'vertical' }}
                value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}
                placeholder="Describe el hallazgo de calidad detectado..." required />
            </div>
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', gap:8, padding:'14px 20px', borderTop:'0.5px solid #E8E6DE' }}>
            <button type="button" onClick={onClose} style={{ background:'transparent', border:'0.5px solid #D3D1C7', color:'#73726C', padding:'7px 16px', borderRadius:8, fontSize:13, cursor:'pointer' }}>Cancelar</button>
            <button type="submit" disabled={saving} style={{ background:saving?'#9C9A92':'#A32D2D', color:'#fff', border:'none', padding:'7px 18px', borderRadius:8, fontSize:13, fontWeight:500, cursor:saving?'not-allowed':'pointer', display:'flex', alignItems:'center', gap:6 }}>
              <i className="ti ti-send" style={{ fontSize:13 }} />
              {saving?'Guardando...':'Registrar hallazgo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Visit card ────────────────────────────────────────────────
function VisitCard({ visit, onUpdate }: { visit:Visit; onUpdate:()=>void }) {
  const { user } = useAuth()
  const [expanded, setExpanded]       = useState(false)
  const [showFinding, setShowFinding] = useState(false)
  const [saving, setSaving] = useState(false)

  const role = user?.role ?? ''
  const isQA     = ['QA','ADMIN','PM_CRIO'].includes(role)
  const canEdit  = ['QA','ADMIN','PM_CRIO'].includes(role)
  const canAddFinding = isQA && visit.status === 'COMPLETED'

  const vs = VISIT_STATUS_STYLE[visit.status] ?? {bg:'#F1EFE8',color:'#444441'}
  const vt = VISIT_TYPE_STYLE[visit.visit_type] ?? {bg:'#F1EFE8',color:'#444441'}

  const openFindings  = visit.findings.filter(f=>['OPEN','RESPONDED'].includes(f.status)).length
  const totalFindings = visit.findings.length

  const markCompleted = async () => {
    setSaving(true)
    await supabase.from('monitoring_visits').update({
      status:      'COMPLETED',
      actual_date: new Date().toISOString().split('T')[0],
    }).eq('id', visit.id)
    setSaving(false)
    onUpdate()
  }

  return (
    <div style={{ background:'#fff', border:'0.5px solid #E8E6DE', borderRadius:10, overflow:'hidden', marginBottom:10 }}>
      <div
        style={{ padding:'13px 16px', cursor:'pointer', display:'flex', alignItems:'center', gap:12 }}
        onClick={()=>setExpanded(e=>!e)}
        onMouseEnter={e=>(e.currentTarget.style.background='#F8F7F4')}
        onMouseLeave={e=>(e.currentTarget.style.background='')}
      >
        <div style={{ width:38, height:38, borderRadius:9, background:'#E6F1FB', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <i className="ti ti-shield-check" style={{ fontSize:17, color:'#185FA5' }} />
        </div>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:4, flexWrap:'wrap' }}>
            <span style={{ ...vt, fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:500 }}>
              Visita QA — {VISIT_TYPE_LABELS[visit.visit_type]}
            </span>
            <span style={{ ...vs, fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:500 }}>
              {VISIT_STATUS_LABELS[visit.status]}
            </span>
            {totalFindings>0 && (
              <span style={{ fontSize:11, background:openFindings>0?'#FCEBEB':'#E1F5EE', color:openFindings>0?'#791F1F':'#085041', padding:'2px 8px', borderRadius:20, fontWeight:500 }}>
                {openFindings>0?`${openFindings} hallazgo${openFindings>1?'s':''} abierto${openFindings>1?'s':''}`:`${totalFindings} hallazgo${totalFindings>1?'s':''} cerrado${totalFindings>1?'s':''}`}
              </span>
            )}
          </div>
          <div style={{ fontSize:12, color:'#9C9A92' }}>
            <i className="ti ti-calendar" style={{ fontSize:12, marginRight:4 }} />
            {formatDate(visit.scheduled_date)}
            {visit.actual_date&&` · Realizada: ${formatDate(visit.actual_date)}`}
            {' · '}
            <i className="ti ti-user" style={{ fontSize:12, marginRight:4 }} />
            {(visit.monitor as any)?.full_name ?? '—'}
          </div>
        </div>
        <div style={{ display:'flex', gap:6, alignItems:'center', flexShrink:0 }}>
          {canEdit && visit.status==='SCHEDULED' && (
            <button onClick={e=>{e.stopPropagation();markCompleted()}} disabled={saving}
              style={{ fontSize:11, padding:'4px 10px', background:'#E1F5EE', color:'#085041', border:'0.5px solid #9FE1CB', borderRadius:6, cursor:'pointer', fontWeight:500 }}>
              Marcar realizada
            </button>
          )}
          <i className={`ti ti-chevron-${expanded?'up':'down'}`} style={{ fontSize:15, color:'#9C9A92' }} />
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop:'0.5px solid #E8E6DE' }}>
          {visit.findings.length===0 ? (
            <div style={{ padding:'16px 20px', fontSize:13, color:'#9C9A92', textAlign:'center' }}>
              Sin hallazgos registrados en esta visita QA.
            </div>
          ) : (
            visit.findings.map(f=><FindingRow key={f.id} finding={f} onUpdate={onUpdate} />)
          )}
          {canAddFinding && (
            <div style={{ padding:'10px 16px', borderTop:visit.findings.length>0?'0.5px solid #E8E6DE':'none' }}>
              <button onClick={()=>setShowFinding(true)} style={{ background:'#FCEBEB', color:'#791F1F', border:'0.5px solid #F7C1C1', padding:'5px 12px', borderRadius:7, fontSize:12, fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                <i className="ti ti-plus" style={{ fontSize:13 }} /> Registrar hallazgo QA
              </button>
            </div>
          )}
        </div>
      )}
      {showFinding && <FindingModal visitId={visit.id} onClose={()=>setShowFinding(false)} onSaved={onUpdate} />}
    </div>
  )
}

// ── MAIN TAB ─────────────────────────────────────────────────
export default function TabMonitoringQA({ projectId }: { projectId: string }) {
  const { user }  = useAuth()
  const [visits, setVisits]       = useState<Visit[]>([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)

  const role = user?.role ?? ''
  const canView     = ['QA','ADMIN','PM_CRIO','COORDINATOR'].includes(role)
  const canSchedule = ['QA','ADMIN','PM_CRIO'].includes(role)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('monitoring_visits')
      .select('*, monitor:users(id, full_name, email), findings:monitoring_findings(*)')
      .eq('project_id', projectId)
      .eq('monitoring_type', 'INTERNAL_QA')
      .order('scheduled_date', { ascending: false })
    setVisits((data ?? []) as Visit[])
    setLoading(false)
  }, [projectId])

  useEffect(() => { load() }, [load])

  if (!canView) {
    return (
      <div style={{ background:'#fff', border:'0.5px solid #E8E6DE', borderRadius:10, padding:48, textAlign:'center' }}>
        <i className="ti ti-lock" style={{ fontSize:28, color:'#D3D1C7', display:'block', marginBottom:10 }} />
        <div style={{ fontSize:14, fontWeight:500, color:'#9C9A92', marginBottom:4 }}>Acceso restringido</div>
        <div style={{ fontSize:12, color:'#B4B2A9' }}>El monitoreo interno de calidad no es visible para este rol.</div>
      </div>
    )
  }

  const total     = visits.length
  const upcoming  = visits.filter(v=>v.status==='SCHEDULED').length
  const allF      = visits.flatMap(v=>v.findings)
  const openF     = allF.filter(f=>['OPEN','RESPONDED'].includes(f.status)).length
  const criticalF = allF.filter(f=>f.category==='CRITICAL'&&f.status==='OPEN').length

  return (
    <div>
      {/* confidentiality banner */}
      <div style={{ background:'#E6F1FB', border:'0.5px solid #B5D4F4', borderRadius:9, padding:'9px 13px', fontSize:12, color:'#0C447C', marginBottom:14, display:'flex', gap:8 }}>
        <i className="ti ti-lock" style={{ fontSize:14, flexShrink:0 }} />
        <div>Monitoreo interno de calidad — <strong>confidencial.</strong> No visible para Investigador Principal, Monitor Externo ni Sponsor.</div>
      </div>

      {/* metrics */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:14 }}>
        {[
          {label:'Total visitas QA',     value:total,     color:'#3D3D3A'},
          {label:'Agendadas',            value:upcoming,  color:upcoming>0?'#185FA5':'#3D3D3A'},
          {label:'Hallazgos abiertos',   value:openF,     color:openF>0?'#854F0B':'#3D3D3A'},
          {label:'Hallazgos críticos',   value:criticalF, color:criticalF>0?'#A32D2D':'#3D3D3A'},
        ].map(m=>(
          <div key={m.label} style={{ background:'#fff', border:'0.5px solid #E8E6DE', borderRadius:9, padding:'11px 14px', textAlign:'center' }}>
            <div style={{ fontSize:10, color:'#9C9A92', marginBottom:5 }}>{m.label}</div>
            <div style={{ fontSize:22, fontWeight:600, color:m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {criticalF>0 && (
        <div style={{ background:'#FCEBEB', border:'0.5px solid #F7C1C1', borderRadius:9, padding:'10px 14px', fontSize:12, color:'#791F1F', marginBottom:14, display:'flex', gap:8 }}>
          <i className="ti ti-alert-circle" style={{ fontSize:15, flexShrink:0 }} />
          <div><strong>{criticalF} hallazgo{criticalF>1?'s':''} crítico{criticalF>1?'s':''} QA sin respuesta.</strong> Requieren acción de la coordinadora.</div>
        </div>
      )}

      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
        {canSchedule && (
          <button onClick={()=>setShowModal(true)} style={{ background:'#185FA5', color:'#fff', border:'none', padding:'7px 14px', borderRadius:8, fontSize:13, fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
            <i className="ti ti-calendar-plus" style={{ fontSize:14 }} /> Agendar visita QA
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ padding:32, textAlign:'center', fontSize:13, color:'#9C9A92' }}>Cargando visitas QA...</div>
      ) : visits.length===0 ? (
        <div style={{ background:'#fff', border:'0.5px solid #E8E6DE', borderRadius:10, padding:48, textAlign:'center' }}>
          <i className="ti ti-shield-check" style={{ fontSize:28, color:'#D3D1C7', display:'block', marginBottom:10 }} />
          <div style={{ fontSize:14, color:'#9C9A92', marginBottom:6 }}>Sin visitas de calidad registradas</div>
          {canSchedule && (
            <button onClick={()=>setShowModal(true)} style={{ background:'#185FA5', color:'#fff', border:'none', borderRadius:8, padding:'7px 16px', fontSize:13, cursor:'pointer', marginTop:4 }}>
              Agendar primera visita QA
            </button>
          )}
        </div>
      ) : (
        visits.map(v=><VisitCard key={v.id} visit={v} onUpdate={load} />)
      )}

      {showModal && (
        <QAVisitModal
          projectId={projectId}
          onClose={()=>setShowModal(false)}
          onSaved={load}
        />
      )}
    </div>
  )
}
