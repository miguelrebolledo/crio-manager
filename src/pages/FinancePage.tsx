// src/pages/FinancePage.tsx
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/index'
import Layout from '../components/layout/Layout'

interface InvoiceSummary {
  id: string
  project_id: string
  number: string
  description: string | null
  amount: number
  currency: string
  issue_date: string
  due_date: string | null
  paid_date: string | null
  status: string
  project: { codigo_proyecto: string; titulo: string } | null
}

interface QuotationSummary {
  id: string
  project_id: string
  number: string
  amount: number
  currency: string
  issue_date: string
  status: string
  project: { codigo_proyecto: string; titulo: string } | null
}

const INVOICE_STATUS_LABELS: Record<string,string> = {
  PENDING:'Pendiente', SENT:'Enviada', PAID:'Pagada', OVERDUE:'Vencida', CANCELLED:'Cancelada',
}
const QUOTATION_STATUS_LABELS: Record<string,string> = {
  DRAFT:'Borrador', SENT:'Enviada', ACCEPTED:'Aceptada', REJECTED:'Rechazada', EXPIRED:'Vencida',
}
const INVOICE_STATUS_STYLE: Record<string,{bg:string;color:string}> = {
  PENDING:{bg:'#FAEEDA',color:'#633806'}, SENT:{bg:'#E6F1FB',color:'#0C447C'},
  PAID:{bg:'#E1F5EE',color:'#085041'}, OVERDUE:{bg:'#FCEBEB',color:'#791F1F'},
  CANCELLED:{bg:'#F1EFE8',color:'#444441'},
}
const QUOTATION_STATUS_STYLE: Record<string,{bg:string;color:string}> = {
  DRAFT:{bg:'#F1EFE8',color:'#444441'}, SENT:{bg:'#E6F1FB',color:'#0C447C'},
  ACCEPTED:{bg:'#E1F5EE',color:'#085041'}, REJECTED:{bg:'#FCEBEB',color:'#791F1F'},
  EXPIRED:{bg:'#FAEEDA',color:'#633806'},
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CL',{day:'2-digit',month:'2-digit',year:'numeric'})
}
function formatAmount(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString('es-CL',{minimumFractionDigits:2,maximumFractionDigits:2})}`
}
function daysUntil(iso: string) {
  return Math.round((new Date(iso).getTime()-Date.now())/86400000)
}

export default function FinancePage() {
  const navigate  = useNavigate()
  const { user }  = useAuth()
  const [invoices, setInvoices]     = useState<InvoiceSummary[]>([])
  const [quotations, setQuotations] = useState<QuotationSummary[]>([])
  const [loading, setLoading]       = useState(true)
  const [activeTab, setActiveTab]   = useState<'invoices'|'quotations'>('invoices')
  const [fStatus, setFStatus]       = useState('')

  const canView = ['FINANCE','ADMIN','PM_CRIO'].includes(user?.role??'')

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: iData }, { data: qData }] = await Promise.all([
      supabase.from('invoices').select('*, project:projects(codigo_proyecto,titulo)').order('issue_date', { ascending: false }),
      supabase.from('quotations').select('*, project:projects(codigo_proyecto,titulo)').order('issue_date', { ascending: false }),
    ])
    let invs = (iData??[]) as InvoiceSummary[]
    let quots = (qData??[]) as QuotationSummary[]
    if (fStatus) {
      invs  = invs.filter(i=>i.status===fStatus)
      quots = quots.filter(q=>q.status===fStatus)
    }
    setInvoices(invs)
    setQuotations(quots)
    setLoading(false)
  }, [fStatus])

  useEffect(() => { load() }, [load])

  if (!canView) {
    return (
      <Layout>
        <div style={{ padding:48, textAlign:'center' }}>
          <i className="ti ti-lock" style={{ fontSize:32, color:'#D3D1C7', display:'block', marginBottom:12 }} />
          <div style={{ fontSize:15, fontWeight:500, color:'#9C9A92', marginBottom:4 }}>Acceso restringido</div>
          <div style={{ fontSize:13, color:'#B4B2A9' }}>Solo Finanzas, Administrador y PM/CRIO pueden acceder a este módulo.</div>
        </div>
      </Layout>
    )
  }

  // metrics
  const totalInvoiced = invoices.filter(i=>i.status!=='CANCELLED').reduce((s,i)=>s+i.amount,0)
  const totalPaid     = invoices.filter(i=>i.status==='PAID').reduce((s,i)=>s+i.amount,0)
  const totalPending  = invoices.filter(i=>['PENDING','SENT'].includes(i.status)).reduce((s,i)=>s+i.amount,0)
  const totalOverdue  = invoices.filter(i=>i.status==='OVERDUE').reduce((s,i)=>s+i.amount,0)
  const overdueCount  = invoices.filter(i=>i.status==='OVERDUE').length

  const selStyle: React.CSSProperties = {
    padding:'6px 10px', border:'0.5px solid #D3D1C7', borderRadius:8,
    fontSize:13, background:'#fff', color:'#3D3D3A', cursor:'pointer',
  }

  // detectar moneda predominante
  const currency = invoices[0]?.currency ?? 'USD'

  return (
    <Layout>
      <div style={{ padding:'24px 28px' }}>
        <div style={{ marginBottom:18 }}>
          <h1 style={{ fontSize:17, fontWeight:500, color:'#3D3D3A', margin:0 }}>Finanzas</h1>
          <div style={{ fontSize:12, color:'#9C9A92', marginTop:3 }}>
            {loading?'Cargando...':`${invoices.length} factura${invoices.length!==1?'s':''} · ${quotations.length} cotización${quotations.length!==1?'es':''} — todos los proyectos`}
          </div>
        </div>

        {/* metrics */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
          {[
            {label:'Total facturado',  value:formatAmount(totalInvoiced,currency), color:'#3D3D3A'},
            {label:'Cobrado / Pagado', value:formatAmount(totalPaid,currency),     color:'#0F6E56'},
            {label:'Por cobrar',       value:formatAmount(totalPending,currency),  color:'#185FA5'},
            {label:'Vencido sin pago', value:formatAmount(totalOverdue,currency),  color:totalOverdue>0?'#A32D2D':'#0F6E56'},
          ].map(m=>(
            <div key={m.label} style={{ background:'#fff', border:'0.5px solid #E8E6DE', borderRadius:10, padding:'14px 16px' }}>
              <div style={{ fontSize:11, color:'#9C9A92', marginBottom:6 }}>{m.label}</div>
              <div style={{ fontSize:15, fontWeight:600, color:m.color }}>{loading?'—':m.value}</div>
            </div>
          ))}
        </div>

        {overdueCount>0 && (
          <div style={{ background:'#FCEBEB', border:'0.5px solid #F7C1C1', borderRadius:9, padding:'10px 14px', fontSize:12, color:'#791F1F', marginBottom:14, display:'flex', gap:8 }}>
            <i className="ti ti-alert-circle" style={{ fontSize:15, flexShrink:0 }} />
            <div><strong>{overdueCount} factura{overdueCount>1?'s':''} vencida{overdueCount>1?'s':''}</strong> por un total de {formatAmount(totalOverdue,currency)} sin pago registrado.</div>
          </div>
        )}

        {/* tabs */}
        <div style={{ display:'flex', gap:0, marginBottom:12, background:'#fff', border:'0.5px solid #E8E6DE', borderRadius:10, overflow:'hidden' }}>
          {[
            {key:'invoices',   label:`Facturas (${invoices.length})`,    icon:'ti-receipt'},
            {key:'quotations', label:`Cotizaciones (${quotations.length})`, icon:'ti-file-invoice'},
          ].map(t=>(
            <button key={t.key} onClick={()=>setActiveTab(t.key as any)} style={{
              flex:1, padding:'9px 16px', fontSize:13, cursor:'pointer',
              background:'none', border:'none',
              color:activeTab===t.key?'#185FA5':'#73726C',
              borderBottom:activeTab===t.key?'2px solid #185FA5':'2px solid transparent',
              fontWeight:activeTab===t.key?500:400,
              display:'flex', alignItems:'center', justifyContent:'center', gap:6,
            }}>
              <i className={`ti ${t.icon}`} style={{ fontSize:14 }} />{t.label}
            </button>
          ))}
        </div>

        {/* filters */}
        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          <select value={fStatus} onChange={e=>setFStatus(e.target.value)} style={selStyle}>
            <option value="">Todos los estados</option>
            {activeTab==='invoices'
              ? Object.entries(INVOICE_STATUS_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)
              : Object.entries(QUOTATION_STATUS_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)
            }
          </select>
          {fStatus && (
            <button onClick={()=>setFStatus('')} style={{ background:'#E6F1FB', color:'#0C447C', border:'none', padding:'6px 12px', borderRadius:20, fontSize:12, fontWeight:500, cursor:'pointer' }}>
              <i className="ti ti-x" style={{ fontSize:12 }} /> Limpiar
            </button>
          )}
        </div>

        {/* INVOICES */}
        {activeTab==='invoices' && (
          <div style={{ background:'#fff', border:'0.5px solid #E8E6DE', borderRadius:10, overflow:'hidden' }}>
            {loading ? (
              <div style={{ padding:32, textAlign:'center', fontSize:13, color:'#9C9A92' }}>Cargando...</div>
            ) : invoices.length===0 ? (
              <div style={{ padding:48, textAlign:'center' }}>
                <i className="ti ti-receipt-off" style={{ fontSize:28, color:'#D3D1C7', display:'block', marginBottom:10 }} />
                <div style={{ fontSize:14, color:'#9C9A92' }}>Sin facturas registradas</div>
              </div>
            ) : invoices.map((inv,i)=>{
              const is = INVOICE_STATUS_STYLE[inv.status]??{bg:'#F1EFE8',color:'#444441'}
              const daysLeft = inv.due_date?daysUntil(inv.due_date):null
              const isOverdue = inv.status==='OVERDUE'
              return (
                <div key={inv.id} style={{ padding:'13px 16px', borderBottom:i<invoices.length-1?'0.5px solid #E8E6DE':'none', background:isOverdue?'rgba(162,45,45,0.02)':'' }}
                  onMouseEnter={e=>(e.currentTarget.style.background='#F8F7F4')}
                  onMouseLeave={e=>(e.currentTarget.style.background=isOverdue?'rgba(162,45,45,0.02)':'')}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:5, flexWrap:'wrap' }}>
                        <span style={{ fontSize:13, fontWeight:500, color:'#3D3D3A' }}>{inv.number}</span>
                        <span style={{ ...is, fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:500 }}>{INVOICE_STATUS_LABELS[inv.status]}</span>
                        <span style={{ fontSize:13, fontWeight:600, color:isOverdue?'#A32D2D':'#185FA5' }}>{formatAmount(inv.amount,inv.currency)}</span>
                        <span onClick={()=>navigate(`/proyectos/${inv.project_id}`)}
                          style={{ fontSize:11, color:'#185FA5', fontWeight:500, cursor:'pointer', textDecoration:'underline' }}>
                          {(inv.project as any)?.codigo_proyecto}
                        </span>
                        {daysLeft!==null && !['PAID','CANCELLED'].includes(inv.status) && (
                          <span style={{ fontSize:11, color:daysLeft<0?'#A32D2D':daysLeft<=7?'#854F0B':'#9C9A92', fontWeight:daysLeft<0?600:400 }}>
                            {daysLeft<0?`Vencida hace ${Math.abs(daysLeft)}d`:daysLeft===0?'Vence hoy':`Vence en ${daysLeft}d`}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize:12, color:'#9C9A92' }}>
                        {inv.description&&<span>{inv.description} · </span>}
                        Emitida: {formatDate(inv.issue_date)}
                        {inv.due_date&&` · Pago esperado: ${formatDate(inv.due_date)}`}
                        {inv.paid_date&&` · Pagada: ${formatDate(inv.paid_date)}`}
                      </div>
                    </div>
                    <button onClick={()=>navigate(`/proyectos/${inv.project_id}`)}
                      style={{ fontSize:11, padding:'4px 10px', background:'#E6F1FB', color:'#0C447C', border:'0.5px solid #B5D4F4', borderRadius:6, cursor:'pointer', fontWeight:500, flexShrink:0 }}>
                      Ver proyecto
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* QUOTATIONS */}
        {activeTab==='quotations' && (
          <div style={{ background:'#fff', border:'0.5px solid #E8E6DE', borderRadius:10, overflow:'hidden' }}>
            {loading ? (
              <div style={{ padding:32, textAlign:'center', fontSize:13, color:'#9C9A92' }}>Cargando...</div>
            ) : quotations.length===0 ? (
              <div style={{ padding:48, textAlign:'center' }}>
                <i className="ti ti-file-off" style={{ fontSize:28, color:'#D3D1C7', display:'block', marginBottom:10 }} />
                <div style={{ fontSize:14, color:'#9C9A92' }}>Sin cotizaciones registradas</div>
              </div>
            ) : quotations.map((q,i)=>{
              const qs = QUOTATION_STATUS_STYLE[q.status]??{bg:'#F1EFE8',color:'#444441'}
              return (
                <div key={q.id} style={{ padding:'13px 16px', borderBottom:i<quotations.length-1?'0.5px solid #E8E6DE':'none' }}
                  onMouseEnter={e=>(e.currentTarget.style.background='#F8F7F4')}
                  onMouseLeave={e=>(e.currentTarget.style.background='')}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:5, flexWrap:'wrap' }}>
                        <span style={{ fontSize:13, fontWeight:500, color:'#3D3D3A' }}>{q.number}</span>
                        <span style={{ ...qs, fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:500 }}>{QUOTATION_STATUS_LABELS[q.status]}</span>
                        <span style={{ fontSize:13, fontWeight:600, color:'#185FA5' }}>{formatAmount(q.amount,q.currency)}</span>
                        <span onClick={()=>navigate(`/proyectos/${q.project_id}`)}
                          style={{ fontSize:11, color:'#185FA5', fontWeight:500, cursor:'pointer', textDecoration:'underline' }}>
                          {(q.project as any)?.codigo_proyecto}
                        </span>
                      </div>
                      <div style={{ fontSize:12, color:'#9C9A92' }}>Emitida: {formatDate(q.issue_date)}</div>
                    </div>
                    <button onClick={()=>navigate(`/proyectos/${q.project_id}`)}
                      style={{ fontSize:11, padding:'4px 10px', background:'#E6F1FB', color:'#0C447C', border:'0.5px solid #B5D4F4', borderRadius:6, cursor:'pointer', fontWeight:500, flexShrink:0 }}>
                      Ver proyecto
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
