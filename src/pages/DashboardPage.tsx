// src/pages/DashboardPage.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/index'
import Layout from '../components/layout/Layout'

// ── Types ────────────────────────────────────────────────────
interface Project {
  id: string
  codigo_proyecto: string
  titulo: string
  status: string
  study_type: string
  priority: string
  recruited_current: number
  recruitment_target: number | null
  ethics_renewal_date: string | null
  estimated_end_date: string | null
  disease: string | null
}
interface Alert {
  type: 'danger' | 'warn' | 'info'
  icon: string
  title: string
  detail: string
  projectId?: string
  code?: string
}

// ── Label / style maps ────────────────────────────────────────
const STATUS_LABELS: Record<string,string> = {
  LEAD:'Lead', PROPOSAL:'Propuesta', CONTRACTED:'Contratado',
  ACTIVE:'Activo', PAUSED:'En pausa', CLOSED:'Cerrado',
  COMPLETED:'Completado', CANCELLED:'Cancelado',
}
const TYPE_LABELS: Record<string,string> = {
  INTERVENTIONAL:'Intervencional', OBSERVATIONAL:'Observacional',
  CLINICAL_SERIES:'Serie clínica', SERVICE:'Servicio',
}
const DISEASE_LABELS: Record<string,string> = {
  CANCER:'Cáncer', PERINATAL:'Perinatales', AUTOIMMUNE:'Autoinmune',
  MENTAL_HEALTH:'Mental', PULMONARY:'Pulmonar', OTHER:'Otros',
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
const TYPE_STYLE: Record<string,{bg:string;color:string}> = {
  INTERVENTIONAL:  {bg:'#E1F5EE',color:'#085041'},
  OBSERVATIONAL:   {bg:'#EEEDFE',color:'#26215C'},
  CLINICAL_SERIES: {bg:'#FAEEDA',color:'#633806'},
  SERVICE:         {bg:'#F1EFE8',color:'#444441'},
}
const PRIORITY_DOT: Record<string,string> = {
  HIGH:'#E24B4A', CRITICAL:'#A32D2D', MEDIUM:'#EF9F27', LOW:'#639922',
}
const ALERT_STYLE = {
  danger: {bg:'#FCEBEB', border:'#F7C1C1', color:'#791F1F'},
  warn:   {bg:'#FAEEDA', border:'#FAC775', color:'#633806'},
  info:   {bg:'#E6F1FB', border:'#B5D4F4', color:'#0C447C'},
}
const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

// ── Helpers ──────────────────────────────────────────────────
function daysUntil(d: string) {
  return Math.round((new Date(d).getTime() - Date.now()) / 86400000)
}
function ethicsLabel(date: string|null): {text:string;color:string} {
  if (!date) return {text:'—',color:'#9C9A92'}
  const d = daysUntil(date)
  if (d < 0)   return {text:'Vencida',color:'#A32D2D'}
  if (d <= 30) return {text:`${d}d ⚠`,color:'#A32D2D'}
  if (d <= 60) return {text:`${d}d`,color:'#854F0B'}
  const dt = new Date(date)
  return {text:`${dt.getDate()}/${dt.getMonth()+1}/${dt.getFullYear()}`,color:'#9C9A92'}
}
function recruitPct(cur:number, target:number|null) {
  if (!target) return 0
  return Math.round(cur/target*100)
}
function recruitColor(pct:number) {
  if (pct>=80) return '#185FA5'
  if (pct>=50) return '#1D9E75'
  if (pct>=30) return '#EF9F27'
  return '#E24B4A'
}

// ── Shared card ───────────────────────────────────────────────
const card: React.CSSProperties = {
  background:'#fff', border:'0.5px solid #E8E6DE',
  borderRadius:10, overflow:'hidden',
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

// ── Mini bar chart ────────────────────────────────────────────
function MiniBarChart({ data, maxVal, color = '#185FA5' }: { data: {label:string;value:number}[]; maxVal: number; color?: string }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:5, height:64 }}>
      {data.map(d => {
        const h = maxVal > 0 ? Math.round((d.value / maxVal) * 56) : 0
        return (
          <div key={d.label} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
            <span style={{ fontSize:10, color:'#9C9A92', fontWeight:500 }}>{d.value > 0 ? d.value : ''}</span>
            <div style={{ width:'100%', height:h || 2, background: h > 0 ? color : '#E8E6DE', borderRadius:'3px 3px 0 0', minHeight:2 }} />
            <span style={{ fontSize:10, color:'#9C9A92' }}>{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth()
  const navigate  = useNavigate()

  // data states
  const [projects, setProjects]     = useState<Project[]>([])
  const [alerts, setAlerts]         = useState<Alert[]>([])
  const [monitoringStats, setMonitoringStats] = useState({ total:0, completed:0, scheduled:0, openFindings:0, criticalFindings:0, respondedFindings:0 })
  const [recruitmentHistory, setRecruitmentHistory] = useState<{label:string;value:number}[]>([])
  const [closingSoon, setClosingSoon] = useState<Project[]>([])
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    const load = async () => {
      // ── 1. Proyectos ──
      const { data: projs } = await supabase
        .from('projects')
        .select('id,codigo_proyecto,titulo,status,study_type,priority,recruited_current,recruitment_target,ethics_renewal_date,estimated_end_date,disease')
        .order('created_at', { ascending: false })
      const allProjs = (projs ?? []) as Project[]
      setProjects(allProjs)

      // ── 2. Alertas ──
      const newAlerts: Alert[] = []

      // Ética vencida o próxima
      const { data: ethicsData } = await supabase
        .from('ethics_alerts')
        .select('*')
        .in('renewal_alert_level', ['EXPIRED','URGENT','WARNING'])
      ;(ethicsData ?? []).forEach((a:any) => {
        newAlerts.push({
          type: a.renewal_alert_level === 'EXPIRED' ? 'danger' : 'warn',
          icon: 'ti-shield-x',
          title: a.renewal_alert_level === 'EXPIRED'
            ? `Comité de Ética vencido — ${a.codigo_proyecto}`
            : `Renovación ética en ${a.days_until_renewal} días — ${a.codigo_proyecto}`,
          detail: a.titulo ?? '',
          projectId: a.id,
          code: a.codigo_proyecto,
        })
      })

      // Hallazgos críticos sin respuesta
      const { data: critFindings } = await supabase
        .from('monitoring_findings')
        .select('id, visit_id, monitoring_visits(project_id, projects(codigo_proyecto))')
        .eq('category', 'CRITICAL')
        .eq('status', 'OPEN')
      const critCount = (critFindings ?? []).length
      if (critCount > 0) {
        newAlerts.push({
          type: 'danger', icon: 'ti-message-x',
          title: `${critCount} hallazgo${critCount>1?'s':''} crítico${critCount>1?'s':''} sin respuesta`,
          detail: 'Requieren acción inmediata de la coordinadora',
        })
      }

      // SAE sin notificaciones completas
      const { data: saePending } = await supabase
        .from('adverse_events')
        .select('id, project_id, projects(codigo_proyecto)')
        .eq('event_type', 'SAE')
        .neq('status', 'CLOSED')
        .or('pi_notified_at.is.null,sponsor_notified_at.is.null,ethics_notified_at.is.null')
      const saeCount = (saePending ?? []).length
      if (saeCount > 0) {
        newAlerts.push({
          type: 'danger', icon: 'ti-alert-circle',
          title: `${saeCount} SAE con notificaciones regulatorias pendientes`,
          detail: 'Notificación obligatoria dentro de 24h según ICH E6(R2)',
        })
      }

      // Reclutamiento bajo meta (<30%)
      const lowRecruitment = allProjs.filter(p =>
        p.status === 'ACTIVE' &&
        p.recruitment_target &&
        p.recruitment_target > 0 &&
        recruitPct(p.recruited_current, p.recruitment_target) < 30
      )
      if (lowRecruitment.length > 0) {
        newAlerts.push({
          type: 'warn', icon: 'ti-users-group',
          title: `${lowRecruitment.length} estudio${lowRecruitment.length>1?'s':''} con reclutamiento bajo el 30%`,
          detail: lowRecruitment.map(p=>p.codigo_proyecto).join(', '),
        })
      }

      setAlerts(newAlerts)

      // ── 3. Monitoreo stats ──
      const { data: visits } = await supabase
        .from('monitoring_visits')
        .select('id, status, findings:monitoring_findings(id, category, status)')
      const visitList = (visits ?? []) as any[]
      const allFindings = visitList.flatMap((v:any) => v.findings ?? [])
      setMonitoringStats({
        total:             visitList.length,
        completed:         visitList.filter((v:any) => v.status === 'COMPLETED').length,
        scheduled:         visitList.filter((v:any) => v.status === 'SCHEDULED').length,
        openFindings:      allFindings.filter((f:any) => f.status === 'OPEN').length,
        criticalFindings:  allFindings.filter((f:any) => f.category === 'CRITICAL' && f.status === 'OPEN').length,
        respondedFindings: allFindings.filter((f:any) => f.status === 'RESPONDED').length,
      })

      // ── 4. Historial reclutamiento últimos 6 meses ──
      const now = new Date()
      const months: {label:string;value:number}[] = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        months.push({ label: MONTH_NAMES[d.getMonth()], value: 0 })
      }
      const { data: recHistory } = await supabase
        .from('recruitment_updates')
        .select('period_year, period_month, new_this_period')
        .gte('period_year', now.getFullYear() - 1)
      ;(recHistory ?? []).forEach((r:any) => {
        const d = new Date(r.period_year, r.period_month - 1, 1)
        const diffMonths = (now.getFullYear()-d.getFullYear())*12 + now.getMonth()-d.getMonth()
        if (diffMonths >= 0 && diffMonths < 6) {
          months[5 - diffMonths].value += (r.new_this_period ?? 0)
        }
      })
      setRecruitmentHistory(months)

      // ── 5. Proyectos próximos a cerrar ──
      const in90 = new Date()
      in90.setDate(in90.getDate() + 90)
      const closing = allProjs.filter(p =>
        p.status === 'ACTIVE' &&
        p.estimated_end_date &&
        new Date(p.estimated_end_date) <= in90 &&
        new Date(p.estimated_end_date) >= new Date()
      ).sort((a,b) => new Date(a.estimated_end_date!).getTime() - new Date(b.estimated_end_date!).getTime())
      setClosingSoon(closing)

      setLoading(false)
    }
    load()
  }, [])

  // computed
  const active   = projects.filter(p => p.status === 'ACTIVE').length
  const pipeline = projects.filter(p => ['LEAD','PROPOSAL','CONTRACTED'].includes(p.status)).length
  const paused   = projects.filter(p => p.status === 'PAUSED').length
  const total    = projects.length

  const byStatus  = Object.entries(projects.reduce((a,p)=>{a[p.status]=(a[p.status]??0)+1;return a},{} as Record<string,number>)).sort((a,b)=>b[1]-a[1])
  const byType    = Object.entries(projects.reduce((a,p)=>{a[p.study_type]=(a[p.study_type]??0)+1;return a},{} as Record<string,number>))
  const byDisease = Object.entries(projects.reduce((a,p)=>{const k=p.disease??'OTHER';a[k]=(a[k]??0)+1;return a},{} as Record<string,number>)).sort((a,b)=>b[1]-a[1])

  const hour = new Date().getHours()
  const greeting = hour<12?'Buenos días':hour<19?'Buenas tardes':'Buenas noches'
  const firstName = user?.full_name?.split(' ')[0] ?? ''

  const maxRec = Math.max(...recruitmentHistory.map(m=>m.value), 1)

  return (
    <Layout>
      <div style={{ padding:'24px 28px', maxWidth:1160 }}>

        {/* ── Header ── */}
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:17, fontWeight:500, color:'#3D3D3A' }}>{greeting}, {firstName}</div>
          <div style={{ fontSize:12, color:'#9C9A92', marginTop:3 }}>
            {new Date().toLocaleDateString('es-CL',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
          </div>
        </div>

        {/* ── Top metric cards ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:14 }}>
          {[
            {label:'Total proyectos',  value:loading?'—':total,    sub:'en el sistema',           color:'#3D3D3A'},
            {label:'Activos',          value:loading?'—':active,   sub:'en ejecución',            color:'#185FA5'},
            {label:'En pipeline',      value:loading?'—':pipeline, sub:'Lead · Proposal · Cont.', color:'#0F6E56'},
            {label:'En pausa',         value:loading?'—':paused,   sub:'requieren revisión',      color:paused>0?'#854F0B':'#3D3D3A'},
          ].map(m=>(
            <div key={m.label} style={{ background:'#fff', border:'0.5px solid #E8E6DE', borderRadius:10, padding:'14px 16px' }}>
              <div style={{ fontSize:11, color:'#9C9A92', marginBottom:6 }}>{m.label}</div>
              <div style={{ fontSize:26, fontWeight:600, color:m.color, lineHeight:1 }}>{m.value}</div>
              <div style={{ fontSize:11, color:'#B4B2A9', marginTop:5 }}>{m.sub}</div>
            </div>
          ))}
        </div>

        {/* ── ROW 1: Alerts + Monitoring ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>

          {/* Alertas */}
          <div style={card}>
            {cardHead('ti-alert-triangle', 'Panel de alertas',
              alerts.length>0 ? {text:`${alerts.length} alerta${alerts.length>1?'s':''}`,bg:'#FCEBEB',color:'#A32D2D'} : undefined
            )}
            <div style={{ padding:'10px 14px', display:'flex', flexDirection:'column', gap:8 }}>
              {loading ? (
                <div style={{ fontSize:12, color:'#9C9A92', padding:'8px 0' }}>Cargando alertas...</div>
              ) : alerts.length === 0 ? (
                <div style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 0', fontSize:13, color:'#0F6E56' }}>
                  <i className="ti ti-circle-check" style={{ fontSize:18 }} />
                  Sin alertas activas — todo en orden
                </div>
              ) : alerts.map((a,i) => {
                const s = ALERT_STYLE[a.type]
                return (
                  <div key={i} style={{ display:'flex', gap:9, padding:'9px 11px', background:s.bg, border:`0.5px solid ${s.border}`, borderRadius:8, fontSize:12, cursor:a.projectId?'pointer':'default' }}
                    onClick={() => a.projectId && navigate(`/proyectos/${a.projectId}`)}>
                    <i className={`ti ${a.icon}`} style={{ color:s.color, fontSize:15, flexShrink:0, marginTop:1 }} />
                    <div>
                      <div style={{ fontWeight:500, color:s.color }}>{a.title}</div>
                      <div style={{ color:s.color, opacity:0.8, marginTop:2, fontSize:11 }}>{a.detail}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Monitoreo */}
          <div style={card}>
            {cardHead('ti-eye', 'Monitoreo')}
            <div style={{ padding:'14px 16px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:14 }}>
                {[
                  {label:'Total visitas',      value:monitoringStats.total,             color:'#3D3D3A'},
                  {label:'Realizadas',          value:monitoringStats.completed,         color:'#0F6E56'},
                  {label:'Agendadas',           value:monitoringStats.scheduled,         color:'#185FA5'},
                  {label:'Hallazgos abiertos',  value:monitoringStats.openFindings,      color:monitoringStats.openFindings>0?'#854F0B':'#3D3D3A'},
                  {label:'Críticos sin resp.',  value:monitoringStats.criticalFindings,  color:monitoringStats.criticalFindings>0?'#A32D2D':'#3D3D3A'},
                  {label:'Esperando monitor',   value:monitoringStats.respondedFindings, color:monitoringStats.respondedFindings>0?'#633806':'#3D3D3A'},
                ].map(m=>(
                  <div key={m.label} style={{ background:'#F8F7F4', borderRadius:8, padding:'9px 11px', textAlign:'center' }}>
                    <div style={{ fontSize:10, color:'#9C9A92', marginBottom:4 }}>{m.label}</div>
                    <div style={{ fontSize:18, fontWeight:600, color:m.color }}>{loading?'—':m.value}</div>
                  </div>
                ))}
              </div>
              <button onClick={()=>navigate('/monitoreo')} style={{ width:'100%', background:'none', border:'0.5px solid #E8E6DE', borderRadius:8, padding:'7px', fontSize:12, color:'#73726C', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                Ver módulo de monitoreo <i className="ti ti-arrow-right" style={{ fontSize:13 }} />
              </button>
            </div>
          </div>
        </div>

        {/* ── ROW 2: Recruitment chart + Closing soon ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>

          {/* Reclutamiento últimos 6 meses */}
          <div style={card}>
            {cardHead('ti-chart-bar', 'Nuevos pacientes por mes')}
            <div style={{ padding:'14px 16px' }}>
              {loading ? (
                <div style={{ fontSize:12, color:'#9C9A92' }}>Cargando...</div>
              ) : recruitmentHistory.every(m=>m.value===0) ? (
                <div style={{ fontSize:13, color:'#9C9A92', textAlign:'center', padding:'16px 0' }}>
                  Sin reportes de reclutamiento aún.<br/>
                  <span style={{ fontSize:11 }}>Los datos aparecerán cuando las coordinadoras envíen sus reportes mensuales.</span>
                </div>
              ) : (
                <MiniBarChart data={recruitmentHistory} maxVal={maxRec} color="#185FA5" />
              )}
              <div style={{ borderTop:'0.5px solid #E8E6DE', marginTop:12, paddingTop:10, display:'flex', justifyContent:'space-between', fontSize:11, color:'#9C9A92' }}>
                <span>Últimos 6 meses — todos los estudios</span>
                <span style={{ fontWeight:500, color:'#185FA5' }}>
                  {recruitmentHistory.reduce((s,m)=>s+m.value,0)} total
                </span>
              </div>
            </div>
          </div>

          {/* Proyectos próximos a cerrar */}
          <div style={card}>
            {cardHead('ti-calendar-x', 'Próximos a cerrar',
              closingSoon.length>0 ? {text:`${closingSoon.length} en 90 días`,bg:'#FAEEDA',color:'#633806'} : undefined
            )}
            <div style={{ padding: closingSoon.length===0 ? '14px 16px' : '4px 0' }}>
              {loading ? (
                <div style={{ padding:'14px 16px', fontSize:12, color:'#9C9A92' }}>Cargando...</div>
              ) : closingSoon.length === 0 ? (
                <div style={{ fontSize:13, color:'#9C9A92', textAlign:'center', padding:'16px 0' }}>
                  Sin proyectos activos con cierre en los próximos 90 días.
                </div>
              ) : closingSoon.map((p,i) => {
                const days = daysUntil(p.estimated_end_date!)
                const urgColor = days<=30?'#A32D2D':days<=60?'#854F0B':'#633806'
                return (
                  <div key={p.id}
                    onClick={() => navigate(`/proyectos/${p.id}`)}
                    style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 16px', borderBottom:i<closingSoon.length-1?'0.5px solid #E8E6DE':'none', cursor:'pointer' }}
                    onMouseEnter={e=>(e.currentTarget.style.background='#F8F7F4')}
                    onMouseLeave={e=>(e.currentTarget.style.background='')}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:500, color:'#185FA5' }}>{p.codigo_proyecto}</div>
                      <div style={{ fontSize:12, color:'#3D3D3A', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.titulo}</div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:urgColor }}>{days}d</div>
                      <div style={{ fontSize:10, color:'#9C9A92' }}>
                        {new Date(p.estimated_end_date!).toLocaleDateString('es-CL',{day:'2-digit',month:'2-digit',year:'numeric'})}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── ROW 3: Distribution by type/disease + Recent projects ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1.6fr', gap:12, marginBottom:12 }}>

          {/* Distribución */}
          <div style={card}>
            {cardHead('ti-chart-donut', 'Distribución de estudios')}
            <div style={{ padding:'14px 16px' }}>
              {/* por tipo */}
              <div style={{ fontSize:11, fontWeight:500, color:'#9C9A92', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:8 }}>Por tipo</div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
                {byType.map(([type,count]) => {
                  const ts = TYPE_STYLE[type] ?? {bg:'#F1EFE8',color:'#444441'}
                  return (
                    <span key={type} style={{ ...ts, fontSize:11, padding:'3px 10px', borderRadius:20, fontWeight:500 }}>
                      {TYPE_LABELS[type]??type} {count}
                    </span>
                  )
                })}
              </div>
              {/* por enfermedad */}
              <div style={{ fontSize:11, fontWeight:500, color:'#9C9A92', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:8 }}>Por enfermedad</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {byDisease.slice(0,5).map(([dis,count]) => {
                  const pct = total>0 ? Math.round(count/total*100) : 0
                  return (
                    <div key={dis}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:3 }}>
                        <span style={{ color:'#3D3D3A' }}>{DISEASE_LABELS[dis]??dis}</span>
                        <span style={{ color:'#9C9A92' }}>{count} ({pct}%)</span>
                      </div>
                      <div style={{ height:5, background:'#F1EFE8', borderRadius:3, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${pct}%`, background:'#185FA5', borderRadius:3 }} />
                      </div>
                    </div>
                  )
                })}
              </div>
              {/* por estado */}
              <div style={{ fontSize:11, fontWeight:500, color:'#9C9A92', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:8, marginTop:14 }}>Por estado</div>
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                {byStatus.map(([status,count]) => {
                  const ss = STATUS_STYLE[status] ?? {bg:'#F1EFE8',color:'#444441'}
                  const pct = total>0 ? Math.round(count/total*100) : 0
                  return (
                    <div key={status} style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ ...ss, fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:500, minWidth:88 }}>
                        {STATUS_LABELS[status]??status}
                      </span>
                      <div style={{ flex:1, height:5, background:'#F1EFE8', borderRadius:3, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${pct}%`, background:ss.color, borderRadius:3, opacity:0.7 }} />
                      </div>
                      <span style={{ fontSize:11, color:'#9C9A92', minWidth:14, textAlign:'right' }}>{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Proyectos recientes */}
          <div style={card}>
            {cardHead('ti-folder', 'Proyectos recientes')}
            <div>
              {loading ? (
                <div style={{ padding:24, fontSize:13, color:'#9C9A92', textAlign:'center' }}>Cargando...</div>
              ) : projects.length === 0 ? (
                <div style={{ padding:32, textAlign:'center' }}>
                  <i className="ti ti-folder-off" style={{ fontSize:24, color:'#D3D1C7', display:'block', marginBottom:8 }} />
                  <div style={{ fontSize:13, color:'#9C9A92', marginBottom:8 }}>No hay proyectos aún.</div>
                  <button onClick={()=>navigate('/proyectos')} style={{ background:'#185FA5', color:'#fff', border:'none', borderRadius:8, padding:'7px 16px', fontSize:13, cursor:'pointer' }}>
                    Crear primer proyecto
                  </button>
                </div>
              ) : projects.slice(0,7).map((p,i) => {
                const pct = recruitPct(p.recruited_current, p.recruitment_target)
                const rc  = recruitColor(pct)
                const et  = ethicsLabel(p.ethics_renewal_date)
                const ss  = STATUS_STYLE[p.status] ?? {bg:'#F1EFE8',color:'#444441'}
                const pd  = PRIORITY_DOT[p.priority] ?? '#B4B2A9'
                return (
                  <div key={p.id}
                    onClick={() => navigate(`/proyectos/${p.id}`)}
                    style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px', borderBottom:i<Math.min(projects.length,7)-1?'0.5px solid #E8E6DE':'none', cursor:'pointer' }}
                    onMouseEnter={e=>(e.currentTarget.style.background='#F8F7F4')}
                    onMouseLeave={e=>(e.currentTarget.style.background='')}>
                    <div style={{ width:7, height:7, borderRadius:'50%', background:pd, flexShrink:0 }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                        <span style={{ fontSize:11, fontWeight:500, color:'#185FA5' }}>{p.codigo_proyecto}</span>
                        <span style={{ ...ss, fontSize:10, padding:'1px 7px', borderRadius:20, fontWeight:500 }}>{STATUS_LABELS[p.status]??p.status}</span>
                        {et.text !== '—' && <span style={{ fontSize:10, color:et.color, fontWeight:500 }}><i className="ti ti-shield" style={{ fontSize:10, marginRight:2 }} />{et.text}</span>}
                      </div>
                      <div style={{ fontSize:12, color:'#3D3D3A', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.titulo}</div>
                    </div>
                    {p.recruitment_target && (
                      <div style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
                        <div style={{ width:48, height:5, background:'#F1EFE8', borderRadius:3, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${Math.min(pct,100)}%`, background:rc, borderRadius:3 }} />
                        </div>
                        <span style={{ fontSize:10, color:'#9C9A92', minWidth:24 }}>{pct}%</span>
                      </div>
                    )}
                  </div>
                )
              })}
              <div style={{ padding:'10px 16px', borderTop:'0.5px solid #E8E6DE' }}>
                <button onClick={()=>navigate('/proyectos')} style={{ width:'100%', background:'none', border:'0.5px solid #E8E6DE', borderRadius:8, padding:'7px', fontSize:12, color:'#73726C', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                  Ver todos los proyectos <i className="ti ti-arrow-right" style={{ fontSize:13 }} />
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </Layout>
  )
}
