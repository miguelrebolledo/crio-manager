// Componente a insertar en DashboardPage.tsx
// Este es el dashboard específico para rol COORDINATOR

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/index'
import Layout from '../components/layout/Layout'

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

interface CoordProject {
  id: string
  codigo_proyecto: string
  titulo: string
  status: string
  recruited_current: number
  recruitment_target: number | null
  hasReportThisMonth: boolean
  lastReportDate: string | null
}

interface PendingFinding {
  id: string
  description: string
  category: string
  project_id: string
  project_code: string
  visit_date: string
}

interface PendingSample {
  id: string
  patient_id: string
  sample_type: string
  scheduled_date: string
  status: string
  project_id: string
  project_code: string
  hours_open: number
}

interface UpcomingVisit {
  id: string
  visit_type: string
  scheduled_date: string
  monitoring_type: string
  project_id: string
  project_code: string
  monitor_name: string
}

const CATEGORY_STYLE: Record<string,{bg:string;color:string}> = {
  CRITICAL:{bg:'#FCEBEB',color:'#791F1F'},
  MAJOR:   {bg:'#FAEEDA',color:'#633806'},
  MINOR:   {bg:'#E6F1FB',color:'#0C447C'},
}
const SAMPLE_TYPE_LABELS: Record<string,string> = {
  BLOOD:'Sangre', URINE:'Orina', TISSUE:'Tejido',
  BONE_MARROW:'Médula ósea', CSF:'LCR', OTHER:'Otro',
}
const VISIT_TYPE_LABELS: Record<string,string> = {
  INITIATION:'Inicio', FOLLOW_UP:'Seguimiento', CLOSE_OUT:'Cierre',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CL',{day:'2-digit',month:'2-digit',year:'numeric'})
}
function daysUntil(iso: string) {
  return Math.round((new Date(iso).getTime() - Date.now()) / 86400000)
}

const card: React.CSSProperties = {
  background:'#fff', border:'0.5px solid #E8E6DE',
  borderRadius:10, overflow:'hidden', marginBottom:12,
}
const cardHead = (icon: string, title: string, badge?: {text:string;bg:string;color:string}) => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 16px', borderBottom:'0.5px solid #E8E6DE' }}>
    <div style={{ fontSize:13, fontWeight:500, color:'#73726C', display:'flex', alignItems:'center', gap:6 }}>
      <i className={`ti ${icon}`} style={{ color:'#185FA5', fontSize:15 }} />
      {title}
    </div>
    {badge && <span style={{ background:badge.bg, color:badge.color, fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:500 }}>{badge.text}</span>}
  </div>
)

export function CoordinatorDashboard() {
  const { user } = useAuth()
  const navigate  = useNavigate()

  const [projects, setProjects]         = useState<CoordProject[]>([])
  const [pendingFindings, setPendingFindings] = useState<PendingFinding[]>([])
  const [pendingSamples, setPendingSamples]   = useState<PendingSample[]>([])
  const [upcomingVisits, setUpcomingVisits]   = useState<UpcomingVisit[]>([])
  const [loading, setLoading] = useState(true)

  const now       = new Date()
  const thisMonth = now.getMonth() + 1
  const thisYear  = now.getFullYear()
  const monthName = MONTH_NAMES[now.getMonth()]

  useEffect(() => {
    const load = async () => {
      if (!user) return

      // 1. Proyectos asignados a esta coordinadora
      const { data: memberData } = await supabase
        .from('project_team_members')
        .select('project_id')
        .eq('user_id', user.id)
        .eq('is_active', true)

      const projectIds = (memberData ?? []).map((m:any) => m.project_id)

      if (projectIds.length === 0) {
        setLoading(false)
        return
      }

      // 2. Datos de los proyectos
      const { data: projData } = await supabase
        .from('projects')
        .select('id, codigo_proyecto, titulo, status, recruited_current, recruitment_target')
        .in('id', projectIds)
        .in('status', ['ACTIVE','PAUSED','CONTRACTED'])
        .order('codigo_proyecto')

      // 3. Reportes de este mes
      const { data: reports } = await supabase
        .from('recruitment_updates')
        .select('project_id, report_date')
        .in('project_id', projectIds)
        .eq('period_year', thisYear)
        .eq('period_month', thisMonth)

      const reportedIds = new Set((reports ?? []).map((r:any) => r.project_id))
      const lastReportMap: Record<string,string> = {}
      ;(reports ?? []).forEach((r:any) => { lastReportMap[r.project_id] = r.report_date })

      const coordProjects: CoordProject[] = (projData ?? []).map((p:any) => ({
        id:                p.id,
        codigo_proyecto:   p.codigo_proyecto,
        titulo:            p.titulo,
        status:            p.status,
        recruited_current: p.recruited_current,
        recruitment_target: p.recruitment_target,
        hasReportThisMonth: reportedIds.has(p.id),
        lastReportDate:    lastReportMap[p.id] ?? null,
      }))
      setProjects(coordProjects)

      // 4. Hallazgos abiertos sin respuesta en sus proyectos
      const { data: visitsData } = await supabase
        .from('monitoring_visits')
        .select('id, project_id, scheduled_date, projects(codigo_proyecto)')
        .in('project_id', projectIds)

      const visitIds = (visitsData ?? []).map((v:any) => v.id)
      const visitMap: Record<string,any> = {}
      ;(visitsData ?? []).forEach((v:any) => { visitMap[v.id] = v })

      if (visitIds.length > 0) {
        const { data: findingsData } = await supabase
          .from('monitoring_findings')
          .select('id, description, category, visit_id')
          .in('visit_id', visitIds)
          .eq('status', 'OPEN')

        const findings: PendingFinding[] = (findingsData ?? []).map((f:any) => {
          const visit = visitMap[f.visit_id]
          return {
            id:           f.id,
            description:  f.description,
            category:     f.category,
            project_id:   visit?.project_id,
            project_code: (visit?.projects as any)?.codigo_proyecto ?? '—',
            visit_date:   visit?.scheduled_date ?? '',
          }
        })
        setPendingFindings(findings)
      }

      // 5. Muestras pendientes u omisiones
      const { data: samplesData } = await supabase
        .from('sample_collections')
        .select('id, patient_id, sample_type, scheduled_date, status, created_at, project_id, projects(codigo_proyecto)')
        .in('project_id', projectIds)
        .in('status', ['PENDING','OMISSION'])
        .order('scheduled_date')

      const samples: PendingSample[] = (samplesData ?? []).map((s:any) => ({
        id:             s.id,
        patient_id:     s.patient_id,
        sample_type:    s.sample_type,
        scheduled_date: s.scheduled_date,
        status:         s.status,
        project_id:     s.project_id,
        project_code:   (s.projects as any)?.codigo_proyecto ?? '—',
        hours_open:     Math.round((Date.now() - new Date(s.created_at).getTime()) / 3600000),
      }))
      setPendingSamples(samples)

      // 6. Próximas visitas agendadas
      const today = now.toISOString().split('T')[0]
      const in30  = new Date(now.getTime() + 30*86400000).toISOString().split('T')[0]

      const { data: visitsUpcoming } = await supabase
        .from('monitoring_visits')
        .select('id, visit_type, scheduled_date, monitoring_type, project_id, monitor:users(full_name), projects(codigo_proyecto)')
        .in('project_id', projectIds)
        .eq('status', 'SCHEDULED')
        .gte('scheduled_date', today)
        .lte('scheduled_date', in30)
        .order('scheduled_date')

      const upcoming: UpcomingVisit[] = (visitsUpcoming ?? []).map((v:any) => ({
        id:              v.id,
        visit_type:      v.visit_type,
        scheduled_date:  v.scheduled_date,
        monitoring_type: v.monitoring_type,
        project_id:      v.project_id,
        project_code:    (v.projects as any)?.codigo_proyecto ?? '—',
        monitor_name:    (v.monitor as any)?.full_name ?? '—',
      }))
      setUpcomingVisits(upcoming)

      setLoading(false)
    }
    load()
  }, [user])

  const pendingReports  = projects.filter(p => !p.hasReportThisMonth)
  const reportedProjects = projects.filter(p => p.hasReportThisMonth)
  const urgentSamples   = pendingSamples.filter(s => s.status==='OMISSION' && s.hours_open>=72)
  const criticalFindings = pendingFindings.filter(f => f.category==='CRITICAL')

  const hour = new Date().getHours()
  const greeting = hour<12?'Buenos días':hour<19?'Buenas tardes':'Buenas noches'
  const firstName = user?.full_name?.split(' ')[0] ?? ''

  return (
    <div style={{ padding:'24px 28px', maxWidth:1000 }}>

      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:17, fontWeight:500, color:'#3D3D3A' }}>{greeting}, {firstName}</div>
        <div style={{ fontSize:12, color:'#9C9A92', marginTop:3 }}>
          {now.toLocaleDateString('es-CL',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
          {' · '}{projects.length} proyecto{projects.length!==1?'s':''} asignado{projects.length!==1?'s':''}
        </div>
      </div>

      {/* Metric cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:14 }}>
        {[
          {label:'Proyectos asignados',      value:projects.length,         color:'#3D3D3A'},
          {label:`Reportes pendientes (${monthName})`, value:pendingReports.length,  color:pendingReports.length>0?'#A32D2D':'#0F6E56'},
          {label:'Hallazgos sin responder',  value:pendingFindings.length,  color:pendingFindings.length>0?'#854F0B':'#0F6E56'},
          {label:'Muestras pendientes',      value:pendingSamples.length,   color:pendingSamples.length>0?'#854F0B':'#0F6E56'},
        ].map(m=>(
          <div key={m.label} style={{ background:'#fff', border:'0.5px solid #E8E6DE', borderRadius:10, padding:'14px 16px' }}>
            <div style={{ fontSize:11, color:'#9C9A92', marginBottom:6 }}>{m.label}</div>
            <div style={{ fontSize:26, fontWeight:600, color:m.color, lineHeight:1 }}>{loading?'—':m.value}</div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {!loading && (urgentSamples.length>0 || criticalFindings.length>0) && (
        <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:12 }}>
          {criticalFindings.length>0 && (
            <div style={{ background:'#FCEBEB', border:'0.5px solid #F7C1C1', borderRadius:9, padding:'10px 14px', fontSize:12, color:'#791F1F', display:'flex', gap:8 }}>
              <i className="ti ti-alert-circle" style={{ fontSize:15, flexShrink:0 }} />
              <div><strong>{criticalFindings.length} hallazgo{criticalFindings.length>1?'s':''} crítico{criticalFindings.length>1?'s':''} sin respuesta</strong> — requieren acción inmediata.</div>
            </div>
          )}
          {urgentSamples.length>0 && (
            <div style={{ background:'#FCEBEB', border:'0.5px solid #F7C1C1', borderRadius:9, padding:'10px 14px', fontSize:12, color:'#791F1F', display:'flex', gap:8 }}>
              <i className="ti ti-test-pipe" style={{ fontSize:15, flexShrink:0 }} />
              <div><strong>{urgentSamples.length} omisión{urgentSamples.length>1?'es':''} de muestra con más de 72 horas</strong> sin atender.</div>
            </div>
          )}
        </div>
      )}

      {/* ROW 1: Reportes mensuales + Visitas próximas */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>

        {/* Reportes mensuales */}
        <div style={card}>
          {cardHead('ti-chart-bar', `Reportes de reclutamiento — ${monthName} ${thisYear}`,
            pendingReports.length>0
              ? {text:`${pendingReports.length} pendiente${pendingReports.length>1?'s':''}`,bg:'#FCEBEB',color:'#A32D2D'}
              : {text:'Al día',bg:'#E1F5EE',color:'#085041'}
          )}
          <div style={{ padding:'4px 0' }}>
            {loading ? (
              <div style={{ padding:24, fontSize:13, color:'#9C9A92', textAlign:'center' }}>Cargando...</div>
            ) : projects.length===0 ? (
              <div style={{ padding:24, fontSize:13, color:'#9C9A92', textAlign:'center' }}>Sin proyectos asignados.</div>
            ) : projects.map((p,i)=>(
              <div key={p.id}
                onClick={()=>navigate(`/proyectos/${p.id}`)}
                style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 16px', borderBottom:i<projects.length-1?'0.5px solid #E8E6DE':'none', cursor:'pointer' }}
                onMouseEnter={e=>(e.currentTarget.style.background='#F8F7F4')}
                onMouseLeave={e=>(e.currentTarget.style.background='')}>
                <div style={{ width:20, height:20, borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
                  background: p.hasReportThisMonth?'#E1F5EE':'#FCEBEB',
                  border: `1.5px solid ${p.hasReportThisMonth?'#1D9E75':'#F7C1C1'}` }}>
                  <i className={`ti ti-${p.hasReportThisMonth?'check':'clock'}`}
                    style={{ fontSize:11, color:p.hasReportThisMonth?'#0F6E56':'#A32D2D' }} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:500, color:'#185FA5' }}>{p.codigo_proyecto}</div>
                  <div style={{ fontSize:12, color:'#3D3D3A', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.titulo}</div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  {p.hasReportThisMonth ? (
                    <span style={{ fontSize:11, color:'#0F6E56', fontWeight:500 }}>
                      <i className="ti ti-circle-check" style={{ fontSize:12, marginRight:3 }} />
                      Enviado
                    </span>
                  ) : (
                    <span style={{ fontSize:11, color:'#A32D2D', fontWeight:500 }}>
                      <i className="ti ti-alert-circle" style={{ fontSize:12, marginRight:3 }} />
                      Pendiente
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Próximas visitas */}
        <div style={card}>
          {cardHead('ti-calendar-event', 'Visitas agendadas (próximos 30 días)',
            upcomingVisits.length>0
              ? {text:`${upcomingVisits.length} visita${upcomingVisits.length>1?'s':''}`,bg:'#E6F1FB',color:'#0C447C'}
              : undefined
          )}
          <div style={{ padding:'4px 0' }}>
            {loading ? (
              <div style={{ padding:24, fontSize:13, color:'#9C9A92', textAlign:'center' }}>Cargando...</div>
            ) : upcomingVisits.length===0 ? (
              <div style={{ padding:24, fontSize:13, color:'#9C9A92', textAlign:'center' }}>
                Sin visitas agendadas en los próximos 30 días.
              </div>
            ) : upcomingVisits.map((v,i)=>{
              const days = daysUntil(v.scheduled_date)
              const isQA = v.monitoring_type==='INTERNAL_QA'
              return (
                <div key={v.id}
                  onClick={()=>navigate(`/proyectos/${v.project_id}`)}
                  style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 16px', borderBottom:i<upcomingVisits.length-1?'0.5px solid #E8E6DE':'none', cursor:'pointer' }}
                  onMouseEnter={e=>(e.currentTarget.style.background='#F8F7F4')}
                  onMouseLeave={e=>(e.currentTarget.style.background='')}>
                  <div style={{ width:36, height:36, borderRadius:8, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background:isQA?'#E6F1FB':'#EEEDFE' }}>
                    <i className={`ti ${isQA?'ti-shield-check':'ti-eye'}`} style={{ fontSize:17, color:isQA?'#185FA5':'#26215C' }} />
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                      <span style={{ fontSize:11, fontWeight:500, color:'#185FA5' }}>{v.project_code}</span>
                      <span style={{ fontSize:11, background:isQA?'#E6F1FB':'#EEEDFE', color:isQA?'#0C447C':'#26215C', padding:'1px 7px', borderRadius:20, fontWeight:500 }}>
                        {isQA?'QA':''} {VISIT_TYPE_LABELS[v.visit_type]}
                      </span>
                    </div>
                    <div style={{ fontSize:11, color:'#9C9A92' }}>{v.monitor_name}</div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:days<=7?'#A32D2D':days<=14?'#854F0B':'#3D3D3A' }}>
                      {days===0?'Hoy':days===1?'Mañana':`${days}d`}
                    </div>
                    <div style={{ fontSize:10, color:'#9C9A92' }}>{formatDate(v.scheduled_date)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ROW 2: Hallazgos + Muestras */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>

        {/* Hallazgos sin responder */}
        <div style={card}>
          {cardHead('ti-message-x', 'Hallazgos sin responder',
            pendingFindings.length>0
              ? {text:`${pendingFindings.length}`,bg:'#FCEBEB',color:'#A32D2D'}
              : {text:'Sin pendientes',bg:'#E1F5EE',color:'#085041'}
          )}
          <div style={{ padding:'4px 0' }}>
            {loading ? (
              <div style={{ padding:24, fontSize:13, color:'#9C9A92', textAlign:'center' }}>Cargando...</div>
            ) : pendingFindings.length===0 ? (
              <div style={{ padding:24, textAlign:'center' }}>
                <i className="ti ti-circle-check" style={{ fontSize:24, color:'#1D9E75', display:'block', marginBottom:8 }} />
                <div style={{ fontSize:13, color:'#9C9A92' }}>Sin hallazgos pendientes</div>
              </div>
            ) : pendingFindings.map((f,i)=>{
              const cs = CATEGORY_STYLE[f.category]??{bg:'#F1EFE8',color:'#444441'}
              return (
                <div key={f.id}
                  onClick={()=>navigate(`/proyectos/${f.project_id}`)}
                  style={{ padding:'11px 16px', borderBottom:i<pendingFindings.length-1?'0.5px solid #E8E6DE':'none', cursor:'pointer' }}
                  onMouseEnter={e=>(e.currentTarget.style.background='#F8F7F4')}
                  onMouseLeave={e=>(e.currentTarget.style.background='')}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
                    <span style={{ ...cs, fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:500 }}>
                      {{CRITICAL:'Crítico',MAJOR:'Mayor',MINOR:'Menor'}[f.category]}
                    </span>
                    <span style={{ fontSize:11, color:'#185FA5', fontWeight:500 }}>{f.project_code}</span>
                    <span style={{ fontSize:11, color:'#9C9A92' }}>Visita {formatDate(f.visit_date)}</span>
                  </div>
                  <div style={{ fontSize:12, color:'#3D3D3A', lineHeight:1.4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {f.description}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Muestras pendientes */}
        <div style={card}>
          {cardHead('ti-test-pipe', 'Muestras pendientes y omisiones',
            pendingSamples.length>0
              ? {text:`${pendingSamples.length}`,bg:urgentSamples.length>0?'#FCEBEB':'#FAEEDA',color:urgentSamples.length>0?'#A32D2D':'#633806'}
              : {text:'Sin pendientes',bg:'#E1F5EE',color:'#085041'}
          )}
          <div style={{ padding:'4px 0' }}>
            {loading ? (
              <div style={{ padding:24, fontSize:13, color:'#9C9A92', textAlign:'center' }}>Cargando...</div>
            ) : pendingSamples.length===0 ? (
              <div style={{ padding:24, textAlign:'center' }}>
                <i className="ti ti-circle-check" style={{ fontSize:24, color:'#1D9E75', display:'block', marginBottom:8 }} />
                <div style={{ fontSize:13, color:'#9C9A92' }}>Sin muestras pendientes</div>
              </div>
            ) : pendingSamples.map((s,i)=>{
              const isOmission = s.status==='OMISSION'
              const isUrgent   = isOmission && s.hours_open>=72
              return (
                <div key={s.id}
                  onClick={()=>navigate(`/proyectos/${s.project_id}`)}
                  style={{ padding:'11px 16px', borderBottom:i<pendingSamples.length-1?'0.5px solid #E8E6DE':'none', cursor:'pointer', background:isUrgent?'rgba(162,45,45,0.03)':'' }}
                  onMouseEnter={e=>(e.currentTarget.style.background='#F8F7F4')}
                  onMouseLeave={e=>(e.currentTarget.style.background=isUrgent?'rgba(162,45,45,0.03)':'')}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                    <span style={{ fontSize:11, background:isOmission?'#FCEBEB':'#FAEEDA', color:isOmission?'#791F1F':'#633806', padding:'2px 8px', borderRadius:20, fontWeight:500 }}>
                      {isOmission?`Omisión${isUrgent?` ⚠ ${s.hours_open}h`:''}` : 'Pendiente'}
                    </span>
                    <span style={{ fontSize:11, color:'#185FA5', fontWeight:500 }}>{s.project_code}</span>
                  </div>
                  <div style={{ fontSize:12, color:'#3D3D3A' }}>
                    {s.patient_id} · {SAMPLE_TYPE_LABELS[s.sample_type]??s.sample_type} · {formatDate(s.scheduled_date)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
