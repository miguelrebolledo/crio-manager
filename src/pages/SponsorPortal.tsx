// src/pages/SponsorPortal.tsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/index'
import Layout from '../components/layout/Layout'

// ── Types ────────────────────────────────────────────────────
interface SponsorProject {
  id: string
  codigo_proyecto: string
  titulo: string
  status: string
  study_type: string
  trial_phase: string | null
  start_date: string
  estimated_end_date: string | null
  recruited_current: number
  recruitment_target: number | null
  ethics_renewal_date: string | null
  principal_investigator: { full_name: string; email: string } | null
}

interface Milestone {
  id: string
  name: string
  due_date: string
  status: string
  completed_date: string | null
}

interface Document {
  id: string
  name: string
  doc_type: string
  storage_path: string
  file_size_bytes: number | null
  mime_type: string | null
  created_at: string
}

interface Finding {
  id: string
  description: string
  category: string
  status: string
  created_at: string
  response_text: string | null
}

interface Visit {
  id: string
  visit_type: string
  status: string
  scheduled_date: string
  actual_date: string | null
  findings: Finding[]
  monitor: { full_name: string } | null
}

interface Invoice {
  id: string
  number: string
  description: string | null
  amount: number
  currency: string
  issue_date: string
  due_date: string | null
  paid_date: string | null
  status: string
}

interface Quotation {
  id: string
  number: string
  description: string | null
  amount: number
  currency: string
  issue_date: string
  status: string
}

// ── Label maps ───────────────────────────────────────────────
const STATUS_LABELS: Record<string,string> = {
  LEAD:'Lead', PROPOSAL:'Propuesta', CONTRACTED:'Contratado',
  ACTIVE:'Activo', PAUSED:'En pausa', CLOSED:'Cerrado',
  COMPLETED:'Completado', CANCELLED:'Cancelado',
}
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
const TYPE_LABELS: Record<string,string> = {
  INTERVENTIONAL:'Intervencional', OBSERVATIONAL:'Observacional',
  CLINICAL_SERIES:'Serie clínica', SERVICE:'Servicio',
}
const PHASE_LABELS: Record<string,string> = {
  PHASE_I:'Fase I', PHASE_II:'Fase II', PHASE_IIA:'Fase IIa',
  PHASE_IIB:'Fase IIb', PHASE_III:'Fase III', PHASE_IV:'Fase IV',
  PHASE_0:'Fase 0', NOT_APPLICABLE:'—',
}
const VISIT_TYPE_LABELS: Record<string,string> = {
  INITIATION:'Inicio', FOLLOW_UP:'Seguimiento', CLOSE_OUT:'Cierre',
}
const FINDING_CATEGORY_STYLE: Record<string,{bg:string;color:string}> = {
  CRITICAL:{bg:'#FCEBEB',color:'#791F1F'},
  MAJOR:   {bg:'#FAEEDA',color:'#633806'},
  MINOR:   {bg:'#E0F7FA',color:'#007A99'},
}
const INVOICE_STATUS_LABELS: Record<string,string> = {
  PENDING:'Pendiente', SENT:'Enviada', PAID:'Pagada', OVERDUE:'Vencida', CANCELLED:'Cancelada',
}
const INVOICE_STATUS_STYLE: Record<string,{bg:string;color:string}> = {
  PENDING:{bg:'#FAEEDA',color:'#633806'}, SENT:{bg:'#E0F7FA',color:'#007A99'},
  PAID:{bg:'#E0F2F1',color:'#005246'}, OVERDUE:{bg:'#FCEBEB',color:'#791F1F'},
  CANCELLED:{bg:'#F1EFE8',color:'#444441'},
}
const DOC_TYPE_LABELS: Record<string,string> = {
  PROTOCOL:'Protocolo', INVESTIGATORS_BROCHURE:'Manual investigador',
  ETHICS_APPROVAL:'Aprobación ética', INFORMED_CONSENT:'Consentimiento',
  CRF:'CRF', SAFETY_REPORT:'Informe seguridad',
  MONITORING_REPORT:'Informe monitoreo', CONTRACT:'Contrato', OTHER:'Otro',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CL',{day:'2-digit',month:'2-digit',year:'numeric'})
}
function formatAmount(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString('es-CL',{minimumFractionDigits:2})}`
}
function daysUntil(iso: string) {
  return Math.round((new Date(iso).getTime()-Date.now())/86400000)
}
function recruitPct(cur:number, target:number|null) {
  if (!target) return 0
  return Math.round(cur/target*100)
}

const card: React.CSSProperties = {
  background:'#fff', border:'0.5px solid #E8E6DE',
  borderRadius:10, overflow:'hidden', marginBottom:12,
}
const cardHead = (icon:string, title:string) => (
  <div style={{ display:'flex', alignItems:'center', gap:6, padding:'11px 16px', borderBottom:'0.5px solid #E8E6DE', fontSize:13, fontWeight:500, color:'#73726C' }}>
    <i className={`ti ${icon}`} style={{ color:'#00BFFF', fontSize:15 }} />
    {title}
  </div>
)

// ── Project detail view ───────────────────────────────────────
function ProjectDetail({ project }: { project: SponsorProject }) {
  const [activeTab, setActiveTab] = useState<'overview'|'milestones'|'monitoring'|'documents'|'finance'>('overview')
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [visits, setVisits]         = useState<Visit[]>([])
  const [documents, setDocuments]   = useState<Document[]>([])
  const [invoices, setInvoices]     = useState<Invoice[]>([])
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [downloading, setDownloading] = useState<string|null>(null)
  const [confirmingId, setConfirmingId] = useState<string|null>(null)

  useEffect(() => {
    supabase.from('milestones').select('*').eq('project_id', project.id).order('due_date')
      .then(({data}) => setMilestones((data??[]) as Milestone[]))
    supabase.from('monitoring_visits')
      .select('*, findings:monitoring_findings(*), monitor:users(full_name)')
      .eq('project_id', project.id).eq('monitoring_type', 'EXTERNAL').order('scheduled_date', { ascending: false })
      .then(({data}) => setVisits((data??[]) as Visit[]))
    supabase.from('documents').select('*')
      .eq('project_id', project.id).eq('visible_to_sponsor', true).order('created_at', { ascending: false })
      .then(({data}) => setDocuments((data??[]) as Document[]))
    supabase.from('invoices').select('*').eq('project_id', project.id).order('issue_date', { ascending: false })
      .then(({data}) => setInvoices((data??[]) as Invoice[]))
    supabase.from('quotations').select('*').eq('project_id', project.id).order('issue_date', { ascending: false })
      .then(({data}) => setQuotations((data??[]) as Quotation[]))
  }, [project.id])

  const handleDownload = async (doc: Document) => {
    setDownloading(doc.id)
    const { data } = await supabase.storage.from('documents').createSignedUrl(doc.storage_path, 3600)
    if (data) window.open(data.signedUrl, '_blank')
    setDownloading(null)
  }

  const confirmPayment = async (inv: Invoice) => {
    if (!confirm(`¿Confirmar recepción de pago para factura ${inv.number}?`)) return
    setConfirmingId(inv.id)
    await supabase.from('invoices').update({ status:'PAID', paid_date: new Date().toISOString().split('T')[0] }).eq('id', inv.id)
    setConfirmingId(null)
    const {data} = await supabase.from('invoices').select('*').eq('project_id', project.id).order('issue_date', { ascending: false })
    setInvoices((data??[]) as Invoice[])
  }

  const pct = recruitPct(project.recruited_current, project.recruitment_target)
  const pctColor = pct>=80?'#0A2E5C':pct>=50?'#00CBA5':pct>=30?'#EF9F27':'#E24B4A'
  const ss = STATUS_STYLE[project.status]??{bg:'#F1EFE8',color:'#444441'}

  const TABS = [
    {key:'overview',   label:'Resumen',    icon:'ti-info-circle'},
    {key:'milestones', label:'Hitos',      icon:'ti-flag'},
    {key:'monitoring', label:'Monitoreo',  icon:'ti-eye'},
    {key:'documents',  label:`Documentos (${documents.length})`, icon:'ti-files'},
    {key:'finance',    label:'Facturas',   icon:'ti-receipt'},
  ]

  return (
    <div>
      {/* project header */}
      <div style={{ background:'#fff', border:'0.5px solid #E8E6DE', borderRadius:10, padding:16, marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:600, color:'#00BFFF', marginBottom:4 }}>{project.codigo_proyecto}</div>
            <div style={{ fontSize:16, fontWeight:600, color:'#0A2E5C', marginBottom:8 }}>{project.titulo}</div>
            <div style={{ display:'flex', gap:7, flexWrap:'wrap', alignItems:'center' }}>
              <span style={{ ...ss, fontSize:11, padding:'2px 9px', borderRadius:20, fontWeight:500 }}>
                {STATUS_LABELS[project.status]}
              </span>
              <span style={{ background:'#E0F2F1', color:'#005246', fontSize:11, padding:'2px 9px', borderRadius:20, fontWeight:500 }}>
                {TYPE_LABELS[project.study_type]??project.study_type}
              </span>
              {project.trial_phase && project.trial_phase!=='NOT_APPLICABLE' && (
                <span style={{ background:'#E0F7FA', color:'#007A99', fontSize:11, padding:'2px 9px', borderRadius:20, fontWeight:500 }}>
                  {PHASE_LABELS[project.trial_phase]??project.trial_phase}
                </span>
              )}
            </div>
          </div>
          {project.recruitment_target && (
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:11, color:'#9C9A92', marginBottom:5 }}>Reclutamiento</div>
              <div style={{ fontSize:20, fontWeight:700, color:pctColor }}>{pct}%</div>
              <div style={{ fontSize:11, color:'#9C9A92' }}>{project.recruited_current} / {project.recruitment_target}</div>
            </div>
          )}
        </div>

        {project.recruitment_target && (
          <div style={{ height:6, background:'#F1EFE8', borderRadius:3, overflow:'hidden', marginBottom:10 }}>
            <div style={{ height:'100%', width:`${Math.min(pct,100)}%`, background:pctColor, borderRadius:3 }} />
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
          {[
            {label:'Inicio', value:formatDate(project.start_date)},
            {label:'Cierre estimado', value:project.estimated_end_date?formatDate(project.estimated_end_date):'—'},
            {label:'PI', value:(project.principal_investigator as any)?.full_name??'—'},
          ].map(f=>(
            <div key={f.label}>
              <div style={{ fontSize:10, color:'#9C9A92', marginBottom:2 }}>{f.label}</div>
              <div style={{ fontSize:12, color:'#3D3D3A', fontWeight:500 }}>{f.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* tabs */}
      <div style={{ display:'flex', gap:0, marginBottom:12, background:'#fff', border:'0.5px solid #E8E6DE', borderRadius:10, overflow:'hidden' }}>
        {TABS.map(t=>(
          <button key={t.key} onClick={()=>setActiveTab(t.key as any)} style={{
            flex:1, padding:'9px 8px', fontSize:12, cursor:'pointer',
            background:'none', border:'none',
            color:activeTab===t.key?'#00BFFF':'#73726C',
            borderBottom:activeTab===t.key?'2px solid #00BFFF':'2px solid transparent',
            fontWeight:activeTab===t.key?600:400,
            display:'flex', alignItems:'center', justifyContent:'center', gap:5,
          }}>
            <i className={`ti ${t.icon}`} style={{ fontSize:13 }} />{t.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab==='overview' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          {/* Ethics */}
          <div style={card}>
            {cardHead('ti-shield-check','Comité de Ética')}
            <div style={{ padding:14 }}>
              {[
                {label:'Aprobación', value:project.ethics_renewal_date?formatDate(project.ethics_renewal_date):'—'},
                {label:'Renovación', value:project.ethics_renewal_date?formatDate(project.ethics_renewal_date):'—'},
              ].map(f=>(
                <div key={f.label} style={{ marginBottom:10 }}>
                  <div style={{ fontSize:10, color:'#9C9A92', marginBottom:2 }}>{f.label}</div>
                  <div style={{ fontSize:13, color:'#3D3D3A' }}>{f.value}</div>
                </div>
              ))}
              {project.ethics_renewal_date && daysUntil(project.ethics_renewal_date)<=60 && (
                <div style={{ background:'#FAEEDA', border:'0.5px solid #FAC775', borderRadius:7, padding:'7px 10px', fontSize:11, color:'#633806', marginTop:6 }}>
                  <i className="ti ti-alert-triangle" style={{ fontSize:12, marginRight:4 }} />
                  Renovación en {daysUntil(project.ethics_renewal_date)} días
                </div>
              )}
            </div>
          </div>
          {/* Recruitment summary */}
          <div style={card}>
            {cardHead('ti-users-group','Reclutamiento')}
            <div style={{ padding:14 }}>
              {[
                {label:'Meta total',     value:project.recruitment_target??'N/A', color:'#0A2E5C'},
                {label:'Enrolados',      value:project.recruited_current,         color:'#00A88A'},
                {label:'% completado',   value:project.recruitment_target?`${pct}%`:'—', color:pctColor},
              ].map(m=>(
                <div key={m.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <span style={{ fontSize:12, color:'#73726C' }}>{m.label}</span>
                  <span style={{ fontSize:14, fontWeight:600, color:m.color }}>{m.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MILESTONES */}
      {activeTab==='milestones' && (
        <div style={card}>
          {cardHead('ti-flag','Hitos del proyecto')}
          {milestones.length===0 ? (
            <div style={{ padding:24, textAlign:'center', fontSize:13, color:'#9C9A92' }}>Sin hitos registrados.</div>
          ) : milestones.map((m,i)=>{
            const isDone    = m.status==='COMPLETED'
            const isOverdue = m.status==='OVERDUE'
            const iconColor = isDone?'#00A88A':isOverdue?'#A32D2D':'#854F0B'
            const icon      = isDone?'ti-circle-check':isOverdue?'ti-alert-triangle':'ti-clock'
            return (
              <div key={m.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 16px', borderBottom:i<milestones.length-1?'0.5px solid #E8E6DE':'none' }}>
                <i className={`ti ${icon}`} style={{ fontSize:17, color:iconColor, flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:500, color:'#3D3D3A' }}>{m.name}</div>
                  <div style={{ fontSize:11, color:'#9C9A92', marginTop:2 }}>
                    {m.due_date}
                    {m.completed_date&&` · Completado: ${m.completed_date}`}
                  </div>
                </div>
                <span style={{
                  fontSize:11, padding:'2px 9px', borderRadius:20, fontWeight:500,
                  background:isDone?'#E0F2F1':isOverdue?'#FCEBEB':'#FAEEDA',
                  color:isDone?'#005246':isOverdue?'#791F1F':'#633806',
                }}>
                  {isDone?'Completado':isOverdue?'Vencido':'Pendiente'}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* MONITORING */}
      {activeTab==='monitoring' && (
        <div style={card}>
          {cardHead('ti-eye','Visitas de monitoreo')}
          {visits.length===0 ? (
            <div style={{ padding:24, textAlign:'center', fontSize:13, color:'#9C9A92' }}>Sin visitas registradas.</div>
          ) : visits.map((v,i)=>{
            const openF = v.findings?.filter(f=>['OPEN','RESPONDED'].includes(f.status)).length??0
            return (
              <div key={v.id} style={{ borderBottom:i<visits.length-1?'0.5px solid #E8E6DE':'none' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:4, flexWrap:'wrap' }}>
                      <span style={{ fontSize:11, background:v.status==='COMPLETED'?'#E0F2F1':'#E0F7FA', color:v.status==='COMPLETED'?'#005246':'#007A99', padding:'2px 8px', borderRadius:20, fontWeight:500 }}>
                        {v.status==='COMPLETED'?'Realizada':v.status==='SCHEDULED'?'Agendada':'Cancelada'}
                      </span>
                      <span style={{ fontSize:11, background:'#F1EFE8', color:'#444441', padding:'2px 8px', borderRadius:20 }}>
                        {VISIT_TYPE_LABELS[v.visit_type]}
                      </span>
                      {openF>0 && (
                        <span style={{ fontSize:11, background:'#FAEEDA', color:'#633806', padding:'2px 8px', borderRadius:20, fontWeight:500 }}>
                          {openF} hallazgo{openF>1?'s':''} en seguimiento
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize:12, color:'#9C9A92' }}>
                      {formatDate(v.scheduled_date)}
                      {v.actual_date&&` · Realizada: ${formatDate(v.actual_date)}`}
                      {v.monitor&&` · ${(v.monitor as any).full_name}`}
                    </div>
                  </div>
                </div>
                {v.findings?.filter(f=>f.status==='APPROVED').length>0 && (
                  <div style={{ padding:'0 16px 12px' }}>
                    {v.findings.filter(f=>f.status==='APPROVED').map(f=>{
                      const cs = FINDING_CATEGORY_STYLE[f.category]??{bg:'#F1EFE8',color:'#444441'}
                      return (
                        <div key={f.id} style={{ background:'#F8F7F4', borderRadius:8, padding:'9px 12px', marginBottom:6, fontSize:12 }}>
                          <div style={{ display:'flex', gap:6, marginBottom:4 }}>
                            <span style={{ ...cs, fontSize:10, padding:'1px 7px', borderRadius:20, fontWeight:500 }}>
                              {{CRITICAL:'Crítico',MAJOR:'Mayor',MINOR:'Menor'}[f.category]}
                            </span>
                            <span style={{ fontSize:10, background:'#E0F2F1', color:'#005246', padding:'1px 7px', borderRadius:20, fontWeight:500 }}>Resuelto</span>
                          </div>
                          <div style={{ color:'#3D3D3A' }}>{f.description}</div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* DOCUMENTS */}
      {activeTab==='documents' && (
        <div style={card}>
          {cardHead('ti-files','Documentos disponibles')}
          <div style={{ fontSize:11, color:'#9C9A92', padding:'8px 16px', borderBottom:'0.5px solid #E8E6DE' }}>
            Solo se muestran los documentos habilitados para el sponsor por el equipo del estudio.
          </div>
          {documents.length===0 ? (
            <div style={{ padding:24, textAlign:'center', fontSize:13, color:'#9C9A92' }}>Sin documentos disponibles aún.</div>
          ) : documents.map((doc,i)=>(
            <div key={doc.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 16px', borderBottom:i<documents.length-1?'0.5px solid #E8E6DE':'none' }}>
              <div style={{ width:32, height:32, borderRadius:7, background:'#E0F7FA', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <i className="ti ti-file" style={{ fontSize:15, color:'#007A99' }} />
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:500, color:'#3D3D3A', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{doc.name}</div>
                <div style={{ fontSize:11, color:'#9C9A92', marginTop:2 }}>
                  {DOC_TYPE_LABELS[doc.doc_type]??doc.doc_type} · {formatDate(doc.created_at)}
                </div>
              </div>
              <button onClick={()=>handleDownload(doc)} disabled={downloading===doc.id}
                style={{ background:'#0A2E5C', color:'#fff', border:'none', padding:'5px 12px', borderRadius:7, fontSize:11, fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
                <i className="ti ti-download" style={{ fontSize:13 }} />
                {downloading===doc.id?'Descargando...':'Descargar'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* FINANCE */}
      {activeTab==='finance' && (
        <div>
          {/* Quotations */}
          <div style={{ ...card }}>
            {cardHead('ti-file-invoice','Cotizaciones')}
            {quotations.length===0 ? (
              <div style={{ padding:24, textAlign:'center', fontSize:13, color:'#9C9A92' }}>Sin cotizaciones registradas.</div>
            ) : quotations.map((q,i)=>(
              <div key={q.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderBottom:i<quotations.length-1?'0.5px solid #E8E6DE':'none' }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:4, flexWrap:'wrap' }}>
                    <span style={{ fontSize:13, fontWeight:500, color:'#3D3D3A' }}>{q.number}</span>
                    <span style={{ fontSize:13, fontWeight:600, color:'#0A2E5C' }}>{formatAmount(q.amount,q.currency)}</span>
                    <span style={{ fontSize:11, background:q.status==='ACCEPTED'?'#E0F2F1':'#E0F7FA', color:q.status==='ACCEPTED'?'#005246':'#007A99', padding:'2px 8px', borderRadius:20, fontWeight:500 }}>
                      {q.status==='DRAFT'?'Borrador':q.status==='SENT'?'Enviada':q.status==='ACCEPTED'?'Aceptada':q.status==='REJECTED'?'Rechazada':'Vencida'}
                    </span>
                  </div>
                  {q.description && <div style={{ fontSize:12, color:'#9C9A92' }}>{q.description}</div>}
                  <div style={{ fontSize:11, color:'#9C9A92', marginTop:2 }}>Emitida: {formatDate(q.issue_date)}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Invoices */}
          <div style={card}>
            {cardHead('ti-receipt','Facturas')}
            {invoices.length===0 ? (
              <div style={{ padding:24, textAlign:'center', fontSize:13, color:'#9C9A92' }}>Sin facturas emitidas.</div>
            ) : invoices.map((inv,i)=>{
              const is = INVOICE_STATUS_STYLE[inv.status]??{bg:'#F1EFE8',color:'#444441'}
              const daysLeft = inv.due_date?daysUntil(inv.due_date):null
              return (
                <div key={inv.id} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 16px', borderBottom:i<invoices.length-1?'0.5px solid #E8E6DE':'none' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:5, flexWrap:'wrap' }}>
                      <span style={{ fontSize:13, fontWeight:500, color:'#3D3D3A' }}>{inv.number}</span>
                      <span style={{ ...is, fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:500 }}>{INVOICE_STATUS_LABELS[inv.status]}</span>
                      <span style={{ fontSize:13, fontWeight:600, color:'#0A2E5C' }}>{formatAmount(inv.amount,inv.currency)}</span>
                      {daysLeft!==null && !['PAID','CANCELLED'].includes(inv.status) && (
                        <span style={{ fontSize:11, color:daysLeft<0?'#A32D2D':daysLeft<=7?'#854F0B':'#9C9A92', fontWeight:daysLeft<0?600:400 }}>
                          {daysLeft<0?`Vencida hace ${Math.abs(daysLeft)}d`:daysLeft===0?'Vence hoy':`Vence en ${daysLeft}d`}
                        </span>
                      )}
                    </div>
                    {inv.description && <div style={{ fontSize:12, color:'#3D3D3A', marginBottom:3 }}>{inv.description}</div>}
                    <div style={{ fontSize:11, color:'#9C9A92' }}>
                      Emitida: {formatDate(inv.issue_date)}
                      {inv.due_date&&` · Pago esperado: ${formatDate(inv.due_date)}`}
                      {inv.paid_date&&` · Pagada: ${formatDate(inv.paid_date)}`}
                    </div>
                  </div>
                  {inv.status==='SENT' && (
                    <button onClick={()=>confirmPayment(inv)} disabled={confirmingId===inv.id}
                      style={{ background:'#E0F2F1', color:'#005246', border:'0.5px solid #80D4C4', padding:'5px 12px', borderRadius:7, fontSize:11, fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
                      <i className="ti ti-circle-check" style={{ fontSize:13 }} />
                      {confirmingId===inv.id?'Confirmando...':'Confirmar pago'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────
export default function SponsorPortal() {
  const { user }  = useAuth()
  const [projects, setProjects]     = useState<SponsorProject[]>([])
  const [selected, setSelected]     = useState<SponsorProject|null>(null)
  const [loading, setLoading]       = useState(true)
  const [orgName, setOrgName]       = useState('')

  useEffect(() => {
    const load = async () => {
  if (!user) return

  // Buscar org_id directamente desde el usuario
  const { data: userData } = await supabase
    .from('users')
    .select('org_id, organizations(id, name)')
    .eq('id', user.id)
    .single()

  const org = (userData as any)?.organizations
  if (!org) {
    setLoading(false)
    return
  }

  setOrgName(org.name)

  const { data: projData } = await supabase
    .from('projects')
    .select('*, principal_investigator:users!principal_investigator_id(full_name, email)')
    .eq('client_org_id', org.id)
    .in('status', ['ACTIVE','CONTRACTED','PAUSED','COMPLETED'])
    .order('created_at', { ascending: false })

  const projs = (projData??[]) as SponsorProject[]
  setProjects(projs)
  if (projs.length > 0) setSelected(projs[0])
  setLoading(false)
}
    load()
  }, [user])

  const hour = new Date().getHours()
  const greeting = hour<12?'Buenos días':hour<19?'Buenas tardes':'Buenas noches'
  const firstName = user?.full_name?.split(' ')[0]??''

  return (
    <Layout>
      <div style={{ padding:'24px 28px' }}>

        {/* Header */}
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:17, fontWeight:600, color:'#0A2E5C' }}>{greeting}, {firstName}</div>
          <div style={{ fontSize:12, color:'#9C9A92', marginTop:3 }}>
            Portal del sponsor — {orgName || 'Centro IMPACT'}
          </div>
        </div>

        {loading ? (
          <div style={{ padding:48, textAlign:'center', fontSize:13, color:'#9C9A92' }}>Cargando tus proyectos...</div>
        ) : projects.length===0 ? (
          <div style={{ background:'#fff', border:'0.5px solid #E8E6DE', borderRadius:10, padding:48, textAlign:'center' }}>
            <i className="ti ti-folder-off" style={{ fontSize:32, color:'#D3D1C7', display:'block', marginBottom:12 }} />
            <div style={{ fontSize:15, fontWeight:500, color:'#9C9A92', marginBottom:4 }}>Sin proyectos asignados</div>
            <div style={{ fontSize:13, color:'#B4B2A9' }}>
              Tu organización aún no tiene proyectos activos. Contacta al equipo de Centro IMPACT.
            </div>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'220px 1fr', gap:14 }}>

            {/* Project list */}
            <div style={{ background:'#fff', border:'0.5px solid #E8E6DE', borderRadius:10, overflow:'hidden', height:'fit-content' }}>
              <div style={{ padding:'10px 14px', borderBottom:'0.5px solid #E8E6DE', fontSize:11, fontWeight:500, color:'#9C9A92', textTransform:'uppercase', letterSpacing:'0.05em' }}>
                Mis proyectos ({projects.length})
              </div>
              {projects.map((p,i)=>{
                const isSelected = selected?.id===p.id
                const ss = STATUS_STYLE[p.status]??{bg:'#F1EFE8',color:'#444441'}
                return (
                  <div key={p.id} onClick={()=>setSelected(p)}
                    style={{
                      padding:'11px 14px', cursor:'pointer',
                      background:isSelected?'#E0F7FA':'transparent',
                      borderLeft:`2px solid ${isSelected?'#00BFFF':'transparent'}`,
                      borderBottom:i<projects.length-1?'0.5px solid #E8E6DE':'none',
                    }}
                    onMouseEnter={e=>{ if(!isSelected)(e.currentTarget as HTMLElement).style.background='#F8F7F4' }}
                    onMouseLeave={e=>{ if(!isSelected)(e.currentTarget as HTMLElement).style.background='transparent' }}
                  >
                    <div style={{ fontSize:11, fontWeight:600, color:'#00BFFF', marginBottom:3 }}>{p.codigo_proyecto}</div>
                    <div style={{ fontSize:12, color:'#3D3D3A', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:5 }}>{p.titulo}</div>
                    <span style={{ ...ss, fontSize:10, padding:'1px 7px', borderRadius:20, fontWeight:500 }}>{STATUS_LABELS[p.status]}</span>
                  </div>
                )
              })}
            </div>

            {/* Project detail */}
            <div>
              {selected && <ProjectDetail key={selected.id} project={selected} />}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
