// src/pages/MonitoringQAPage.tsx
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/index'
import Layout from '../components/layout/Layout'

interface Finding {
  id: string
  description: string
  category: string
  status: string
  response_text: string | null
  response_date: string | null
  decision_approved: boolean | null
  decision_text: string | null
  decision_date: string | null
  created_at: string
}

interface Visit {
  id: string
  project_id: string
  visit_type: string
  status: string
  scheduled_date: string
  actual_date: string | null
  monitoring_type: string
  monitor: { id: string; full_name: string } | null
  findings: Finding[]
  project: { codigo_proyecto: string; titulo: string } | null
}

const VISIT_TYPE_LABELS: Record<string,string>   = {INITIATION:'Inicio',FOLLOW_UP:'Seguimiento',CLOSE_OUT:'Cierre'}
const VISIT_STATUS_LABELS: Record<string,string>  = {SCHEDULED:'Agendada',COMPLETED:'Realizada',CANCELLED:'Cancelada'}
const CATEGORY_LABELS: Record<string,string>      = {CRITICAL:'Crítico',MAJOR:'Mayor',MINOR:'Menor'}
const FINDING_STATUS_LABELS: Record<string,string>= {OPEN:'Abierto',RESPONDED:'Respondido',APPROVED:'Aprobado',REJECTED:'Rechazado'}

const VISIT_STATUS_STYLE: Record<string,{bg:string;color:string}> = {
  SCHEDULED:{bg:'#E0F7FA',color:'#007A99'}, COMPLETED:{bg:'#E0F2F1',color:'#005246'}, CANCELLED:{bg:'#FCEBEB',color:'#791F1F'},
}
const CATEGORY_STYLE: Record<string,{bg:string;color:string}> = {
  CRITICAL:{bg:'#FCEBEB',color:'#791F1F'}, MAJOR:{bg:'#FAEEDA',color:'#633806'}, MINOR:{bg:'#E0F7FA',color:'#007A99'},
}
const FINDING_STATUS_STYLE: Record<string,{bg:string;color:string}> = {
  OPEN:{bg:'#FCEBEB',color:'#791F1F'}, RESPONDED:{bg:'#FAEEDA',color:'#633806'},
  APPROVED:{bg:'#E0F2F1',color:'#005246'}, REJECTED:{bg:'#F1EFE8',color:'#444441'},
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CL',{day:'2-digit',month:'2-digit',year:'numeric'})
}

export default function MonitoringQAPage() {
  const navigate  = useNavigate()
  const { user }  = useAuth()
  const [visits, setVisits]     = useState<Visit[]>([])
  const [loading, setLoading]   = useState(true)
  const [expandedId, setExpandedId] = useState<string|null>(null)
  const [activeTab, setActiveTab]   = useState<'visits'|'findings'>('visits')
  const [fStatus, setFStatus] = useState('')
  const [fType, setFType]     = useState('')

  const canView = ['QA','ADMIN','PM_CRIO','COORDINATOR'].includes(user?.role ?? '')

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('monitoring_visits')
      .select('*, monitor:users(id, full_name), findings:monitoring_findings(*), project:projects(codigo_proyecto, titulo)')
      .eq('monitoring_type', 'INTERNAL_QA')
      .order('scheduled_date', { ascending: false })

    if (fStatus) q = q.eq('status', fStatus)
    if (fType)   q = q.eq('visit_type', fType)

    const { data } = await q
    setVisits((data ?? []) as Visit[])
    setLoading(false)
  }, [fStatus, fType])

  useEffect(() => { load() }, [load])

  if (!canView) {
    return (
      <Layout>
        <div style={{ padding:48, textAlign:'center' }}>
          <i className="ti ti-lock" style={{ fontSize:32, color:'#D3D1C7', display:'block', marginBottom:12 }} />
          <div style={{ fontSize:15, fontWeight:500, color:'#9C9A92', marginBottom:4 }}>Acceso restringido</div>
          <div style={{ fontSize:13, color:'#B4B2A9' }}>No tienes permisos para ver el módulo de calidad.</div>
        </div>
      </Layout>
    )
  }

  const allFindings = visits.flatMap(v=>v.findings.map(f=>({...f,visit:v})))
  const openFindings = allFindings.filter(f=>['OPEN','RESPONDED'].includes(f.status))

  const total     = visits.length
  const scheduled = visits.filter(v=>v.status==='SCHEDULED').length
  const openF     = allFindings.filter(f=>['OPEN','RESPONDED'].includes(f.status)).length
  const critF     = allFindings.filter(f=>f.category==='CRITICAL'&&f.status==='OPEN').length

  const selStyle: React.CSSProperties = {
    padding:'6px 10px', border:'0.5px solid #D3D1C7', borderRadius:8,
    fontSize:13, background:'#fff', color:'#3D3D3A', cursor:'pointer',
  }

  return (
    <Layout>
      <div style={{ padding:'24px 28px' }}>

        <div style={{ marginBottom:18 }}>
          <h1 style={{ fontSize:17, fontWeight:500, color:'#3D3D3A', margin:0 }}>Monitoreo de Calidad (QA)</h1>
          <div style={{ fontSize:12, color:'#9C9A92', marginTop:3 }}>
            {loading?'Cargando...':`${total} visita${total!==1?'s':''} — todos los proyectos · Confidencial`}
          </div>
        </div>

        {/* confidentiality banner */}
        <div style={{ background:'#E0F7FA', border:'0.5px solid #80DEEA', borderRadius:9, padding:'9px 13px', fontSize:12, color:'#007A99', marginBottom:14, display:'flex', gap:8 }}>
          <i className="ti ti-lock" style={{ fontSize:14, flexShrink:0 }} />
          <div>Módulo confidencial — visible solo para <strong>QA, PM/CRIO, Administrador y Coordinadora.</strong> No accesible para Investigador Principal, Monitor Externo ni Sponsor.</div>
        </div>

        {/* metrics */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
          {[
            {label:'Total visitas QA',     value:total,     color:'#3D3D3A'},
            {label:'Agendadas',            value:scheduled, color:scheduled>0?'#0A2E5C':'#3D3D3A'},
            {label:'Hallazgos abiertos',   value:openF,     color:openF>0?'#854F0B':'#3D3D3A'},
            {label:'Críticos sin resp.',   value:critF,     color:critF>0?'#A32D2D':'#00A88A'},
          ].map(m=>(
            <div key={m.label} style={{ background:'#fff', border:'0.5px solid #E8E6DE', borderRadius:9, padding:'12px 14px', textAlign:'center' }}>
              <div style={{ fontSize:10, color:'#9C9A92', marginBottom:5 }}>{m.label}</div>
              <div style={{ fontSize:22, fontWeight:600, color:m.color }}>{m.value}</div>
            </div>
          ))}
        </div>

        {critF>0 && (
          <div style={{ background:'#FCEBEB', border:'0.5px solid #F7C1C1', borderRadius:9, padding:'10px 14px', fontSize:12, color:'#791F1F', marginBottom:14, display:'flex', gap:8 }}>
            <i className="ti ti-alert-circle" style={{ fontSize:15, flexShrink:0 }} />
            <div><strong>{critF} hallazgo{critF>1?'s':''} crítico{critF>1?'s':''} QA sin respuesta</strong> — requieren acción inmediata de la coordinadora.</div>
          </div>
        )}

        {/* tabs */}
        <div style={{ display:'flex', gap:0, marginBottom:12, background:'#fff', border:'0.5px solid #E8E6DE', borderRadius:10, overflow:'hidden' }}>
          {[
            {key:'visits',   label:'Visitas QA',                    icon:'ti-shield-check'},
            {key:'findings', label:`Hallazgos abiertos (${openF})`, icon:'ti-alert-circle'},
          ].map(t=>(
            <button key={t.key} onClick={()=>setActiveTab(t.key as any)} style={{
              flex:1, padding:'9px 16px', fontSize:13, cursor:'pointer',
              background:'none', border:'none',
              color:activeTab===t.key?'#0A2E5C':'#73726C',
              borderBottom:activeTab===t.key?'2px solid #0A2E5C':'2px solid transparent',
              fontWeight:activeTab===t.key?500:400,
              display:'flex', alignItems:'center', justifyContent:'center', gap:6,
            }}>
              <i className={`ti ${t.icon}`} style={{ fontSize:14 }} />{t.label}
            </button>
          ))}
        </div>

        {/* VISITS TAB */}
        {activeTab==='visits' && (
          <>
            <div style={{ display:'flex', gap:8, marginBottom:12 }}>
              <select value={fStatus} onChange={e=>setFStatus(e.target.value)} style={selStyle}>
                <option value="">Todos los estados</option>
                {Object.entries(VISIT_STATUS_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
              </select>
              <select value={fType} onChange={e=>setFType(e.target.value)} style={selStyle}>
                <option value="">Todos los tipos</option>
                {Object.entries(VISIT_TYPE_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
              </select>
              {(fStatus||fType) && (
                <button onClick={()=>{setFStatus('');setFType('')}} style={{ background:'#E0F7FA', color:'#007A99', border:'none', padding:'6px 12px', borderRadius:20, fontSize:12, fontWeight:500, cursor:'pointer' }}>
                  <i className="ti ti-x" style={{ fontSize:12 }} /> Limpiar
                </button>
              )}
            </div>

            <div style={{ background:'#fff', border:'0.5px solid #E8E6DE', borderRadius:10, overflow:'hidden' }}>
              {loading ? (
                <div style={{ padding:32, textAlign:'center', fontSize:13, color:'#9C9A92' }}>Cargando...</div>
              ) : visits.length===0 ? (
                <div style={{ padding:48, textAlign:'center' }}>
                  <i className="ti ti-shield-check" style={{ fontSize:28, color:'#D3D1C7', display:'block', marginBottom:10 }} />
                  <div style={{ fontSize:14, color:'#9C9A92' }}>Sin visitas QA registradas</div>
                </div>
              ) : visits.map((v,i)=>{
                const vs = VISIT_STATUS_STYLE[v.status]??{bg:'#F1EFE8',color:'#444441'}
                const isExp = expandedId===v.id
                const openVF = v.findings.filter(f=>['OPEN','RESPONDED'].includes(f.status)).length
                return (
                  <div key={v.id} style={{ borderBottom:i<visits.length-1?'0.5px solid #E8E6DE':'none' }}>
                    <div
                      style={{ padding:'13px 16px', cursor:'pointer', display:'flex', alignItems:'center', gap:12 }}
                      onClick={()=>setExpandedId(isExp?null:v.id)}
                      onMouseEnter={e=>{if(!isExp)(e.currentTarget as HTMLElement).style.background='#F8F7F4'}}
                      onMouseLeave={e=>{if(!isExp)(e.currentTarget as HTMLElement).style.background=''}}
                    >
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:4, flexWrap:'wrap' }}>
                          <span style={{ ...vs, fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:500 }}>
                            {VISIT_STATUS_LABELS[v.status]}
                          </span>
                          <span style={{ fontSize:11, background:'#E0F7FA', color:'#007A99', padding:'2px 8px', borderRadius:20, fontWeight:500 }}>
                            QA — {VISIT_TYPE_LABELS[v.visit_type]}
                          </span>
                          <span onClick={e=>{e.stopPropagation();navigate(`/proyectos/${v.project_id}`)}}
                            style={{ fontSize:11, color:'#0A2E5C', fontWeight:500, cursor:'pointer', textDecoration:'underline' }}>
                            {(v.project as any)?.codigo_proyecto}
                          </span>
                          {openVF>0 && (
                            <span style={{ fontSize:11, background:'#FCEBEB', color:'#791F1F', padding:'2px 8px', borderRadius:20, fontWeight:500 }}>
                              {openVF} hallazgo{openVF>1?'s':''} abierto{openVF>1?'s':''}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize:12, color:'#9C9A92' }}>
                          {formatDate(v.scheduled_date)}
                          {v.actual_date&&` · Realizada: ${formatDate(v.actual_date)}`}
                          {' · '}{(v.monitor as any)?.full_name??'—'}
                        </div>
                      </div>
                      <i className={`ti ti-chevron-${isExp?'up':'down'}`} style={{ fontSize:15, color:'#9C9A92' }} />
                    </div>

                    {isExp && (
                      <div style={{ background:'#F8F7F4', borderTop:'0.5px solid #E8E6DE', padding:'10px 16px' }}>
                        {v.findings.length===0 ? (
                          <div style={{ fontSize:13, color:'#9C9A92', textAlign:'center', padding:'8px 0' }}>Sin hallazgos en esta visita QA.</div>
                        ) : v.findings.map(f=>{
                          const cs = CATEGORY_STYLE[f.category]??{bg:'#F1EFE8',color:'#444441'}
                          const fs = FINDING_STATUS_STYLE[f.status]??{bg:'#F1EFE8',color:'#444441'}
                          return (
                            <div key={f.id} style={{ marginBottom:8, background:'#fff', border:'0.5px solid #E8E6DE', borderRadius:8, padding:'10px 13px' }}>
                              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
                                <span style={{ ...cs, fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:500 }}>{CATEGORY_LABELS[f.category]}</span>
                                <span style={{ ...fs, fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:500 }}>{FINDING_STATUS_LABELS[f.status]}</span>
                              </div>
                              <div style={{ fontSize:13, color:'#3D3D3A' }}>{f.description}</div>
                              {f.response_text && (
                                <div style={{ marginTop:8, fontSize:12, color:'#73726C', background:'#F8F7F4', borderRadius:6, padding:'7px 10px' }}>
                                  <i className="ti ti-message-reply" style={{ fontSize:12, marginRight:4 }} />{f.response_text}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* FINDINGS TAB */}
        {activeTab==='findings' && (
          <div style={{ background:'#fff', border:'0.5px solid #E8E6DE', borderRadius:10, overflow:'hidden' }}>
            {openFindings.length===0 ? (
              <div style={{ padding:48, textAlign:'center' }}>
                <i className="ti ti-circle-check" style={{ fontSize:28, color:'#00CBA5', display:'block', marginBottom:10 }} />
                <div style={{ fontSize:14, color:'#9C9A92' }}>Sin hallazgos QA abiertos — todo en orden</div>
              </div>
            ) : openFindings.map((f,i)=>{
              const cs = CATEGORY_STYLE[f.category]??{bg:'#F1EFE8',color:'#444441'}
              const fs = FINDING_STATUS_STYLE[f.status]??{bg:'#F1EFE8',color:'#444441'}
              const v  = (f as any).visit as Visit
              return (
                <div key={f.id} style={{ padding:'13px 16px', borderBottom:i<openFindings.length-1?'0.5px solid #E8E6DE':'none' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:6, flexWrap:'wrap' }}>
                    <span style={{ ...cs, fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:500 }}>{CATEGORY_LABELS[f.category]}</span>
                    <span style={{ ...fs, fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:500 }}>{FINDING_STATUS_LABELS[f.status]}</span>
                    <span onClick={()=>navigate(`/proyectos/${v.project_id}`)}
                      style={{ fontSize:11, color:'#0A2E5C', fontWeight:500, cursor:'pointer', textDecoration:'underline' }}>
                      {(v.project as any)?.codigo_proyecto}
                    </span>
                    <span style={{ fontSize:11, color:'#9C9A92' }}>
                      Visita QA {formatDate(v.scheduled_date)} · {(v.monitor as any)?.full_name}
                    </span>
                  </div>
                  <div style={{ fontSize:13, color:'#3D3D3A', lineHeight:1.4 }}>{f.description}</div>
                  {f.response_text && (
                    <div style={{ marginTop:8, fontSize:12, color:'#73726C', background:'#F8F7F4', borderRadius:6, padding:'7px 10px' }}>
                      <i className="ti ti-message-reply" style={{ fontSize:12, marginRight:4 }} />{f.response_text}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
