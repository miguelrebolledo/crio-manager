// src/pages/SamplesPage.tsx
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/index'
import Layout from '../components/layout/Layout'

interface Sample {
  id: string
  project_id: string
  patient_id: string
  sample_type: string
  visit_timepoint: string | null
  scheduled_date: string
  status: string
  cold_chain_required: boolean
  notes: string | null
  created_at: string
  collected_by: string | null
  project: { codigo_proyecto: string; titulo: string } | null
  collector: { full_name: string } | null
}

interface CollectorSummary {
  collector_id: string | null
  collector_name: string
  total: number
  by_type: Record<string,number>
  by_status: Record<string,number>
}

const SAMPLE_TYPE_LABELS: Record<string,string> = {
  BLOOD:'Sangre', URINE:'Orina', TISSUE:'Tejido',
  BONE_MARROW:'Médula ósea', CSF:'LCR',
  PLACENTA:'Placenta', CORD_BLOOD:'Sangre de cordón',
  UMBILICAL_CORD:'Cordón umbilical', SALIVA:'Saliva', OTHER:'Otro',
}
const STATUS_LABELS: Record<string,string> = {
  PENDING:'Pendiente', COLLECTED:'Recolectada', PROCESSING:'En proceso',
  STORED:'Almacenada', SHIPPED:'Enviada', OMISSION:'Omisión',
}
const STATUS_STYLE: Record<string,{bg:string;color:string}> = {
  PENDING:    {bg:'#FAEEDA',color:'#633806'},
  COLLECTED:  {bg:'#E6F1FB',color:'#0C447C'},
  PROCESSING: {bg:'#EEEDFE',color:'#26215C'},
  STORED:     {bg:'#E1F5EE',color:'#085041'},
  SHIPPED:    {bg:'#F1EFE8',color:'#444441'},
  OMISSION:   {bg:'#FCEBEB',color:'#791F1F'},
}
const TYPE_STYLE: Record<string,{bg:string;color:string}> = {
  BLOOD:         {bg:'#FCEBEB',color:'#791F1F'},
  URINE:         {bg:'#E6F1FB',color:'#0C447C'},
  TISSUE:        {bg:'#FAEEDA',color:'#633806'},
  BONE_MARROW:   {bg:'#EEEDFE',color:'#26215C'},
  CSF:           {bg:'#E1F5EE',color:'#085041'},
  PLACENTA:      {bg:'#FAEEDA',color:'#854F0B'},
  CORD_BLOOD:    {bg:'#FCEBEB',color:'#633806'},
  UMBILICAL_CORD:{bg:'#F1EFE8',color:'#444441'},
  SALIVA:        {bg:'#E6F1FB',color:'#26215C'},
  OTHER:         {bg:'#F1EFE8',color:'#444441'},
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CL',{day:'2-digit',month:'2-digit',year:'numeric'})
}
function hoursOpen(iso: string) {
  return Math.round((Date.now()-new Date(iso).getTime())/3600000)
}

// ── Collector summary tab ─────────────────────────────────────
function CollectorSummaryView() {
  const [summaries, setSummaries] = useState<CollectorSummary[]>([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    supabase.from('sample_collections')
      .select('collected_by, sample_type, status, collector:users!collected_by(full_name)')
      .not('status', 'eq', 'PENDING')
      .then(({ data }) => {
        const map: Record<string, CollectorSummary> = {}
        ;(data ?? []).forEach((s:any) => {
          const key = s.collected_by ?? 'unknown'
          const name = s.collected_by
            ? (s.collector?.full_name ?? 'Sin nombre')
            : 'Sin asignar'
          if (!map[key]) {
            map[key] = { collector_id:s.collected_by, collector_name:name, total:0, by_type:{}, by_status:{} }
          }
          map[key].total++
          map[key].by_type[s.sample_type] = (map[key].by_type[s.sample_type]??0) + 1
          map[key].by_status[s.status]    = (map[key].by_status[s.status]??0) + 1
        })
        setSummaries(Object.values(map).sort((a,b)=>b.total-a.total))
        setLoading(false)
      })
  }, [])

  if (loading) return <div style={{ padding:32, textAlign:'center', fontSize:13, color:'#9C9A92' }}>Cargando...</div>

  if (summaries.length===0) return (
    <div style={{ background:'#fff', border:'0.5px solid #E8E6DE', borderRadius:10, padding:48, textAlign:'center' }}>
      <i className="ti ti-users-off" style={{ fontSize:28, color:'#D3D1C7', display:'block', marginBottom:10 }} />
      <div style={{ fontSize:14, color:'#9C9A92' }}>Sin muestras recolectadas aún</div>
    </div>
  )

  return (
    <div style={{ background:'#fff', border:'0.5px solid #E8E6DE', borderRadius:10, overflow:'hidden' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
        <thead>
          <tr style={{ background:'#F8F7F4' }}>
            {['Recolector/a','Total muestras','Por tipo','Por estado'].map(h=>(
              <th key={h} style={{ padding:'8px 16px', textAlign:'left', fontSize:11, fontWeight:500, color:'#9C9A92', borderBottom:'0.5px solid #E8E6DE' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {summaries.map((s,i)=>(
            <tr key={s.collector_id??'unknown'} style={{ borderBottom:i<summaries.length-1?'0.5px solid #E8E6DE':'none' }}>
              <td style={{ padding:'12px 16px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:30, height:30, borderRadius:'50%', background:'#185FA5', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, flexShrink:0 }}>
                    {s.collector_name.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase()}
                  </div>
                  <span style={{ fontWeight:500, color:'#3D3D3A' }}>{s.collector_name}</span>
                </div>
              </td>
              <td style={{ padding:'12px 16px' }}>
                <span style={{ fontSize:18, fontWeight:600, color:'#185FA5' }}>{s.total}</span>
              </td>
              <td style={{ padding:'12px 16px' }}>
                <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                  {Object.entries(s.by_type).sort((a,b)=>b[1]-a[1]).map(([type,count])=>{
                    const ts = TYPE_STYLE[type]??{bg:'#F1EFE8',color:'#444441'}
                    return (
                      <span key={type} style={{ ...ts, fontSize:10, padding:'2px 7px', borderRadius:20, fontWeight:500 }}>
                        {SAMPLE_TYPE_LABELS[type]??type} {count}
                      </span>
                    )
                  })}
                </div>
              </td>
              <td style={{ padding:'12px 16px' }}>
                <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                  {Object.entries(s.by_status).sort((a,b)=>b[1]-a[1]).map(([status,count])=>{
                    const ss = STATUS_STYLE[status]??{bg:'#F1EFE8',color:'#444441'}
                    return (
                      <span key={status} style={{ ...ss, fontSize:10, padding:'2px 7px', borderRadius:20, fontWeight:500 }}>
                        {STATUS_LABELS[status]??status} {count}
                      </span>
                    )
                  })}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────
export default function SamplesPage() {
  const navigate  = useNavigate()
  const { user }  = useAuth()
  const [samples, setSamples]   = useState<Sample[]>([])
  const [loading, setLoading]   = useState(true)
  const [activeTab, setActiveTab] = useState<'list'|'collectors'>('list')
  const [fStatus, setFStatus]   = useState('')
  const [fType,   setFType]     = useState('')
  const [fMonth,  setFMonth]    = useState('')
  const [fPending, setFPending] = useState(false)
  const [search,  setSearch]    = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('sample_collections')
      .select('id, project_id, patient_id, sample_type, visit_timepoint, scheduled_date, status, cold_chain_required, notes, created_at, collected_by, project:projects(codigo_proyecto, titulo), collector:users!collected_by(full_name)')
      .order('scheduled_date', { ascending: false })

    if (fPending) {
      q = q.eq('status', 'PENDING')
    } else if (fStatus) {
      q = q.eq('status', fStatus)
    }

    if (fType) q = q.eq('sample_type', fType)

    if (fMonth) {
      const [year, month] = fMonth.split('-')
      const start = `${year}-${month}-01`
      const end   = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0]
      q = q.gte('scheduled_date', start).lte('scheduled_date', end)
    }

    const { data } = await q
    let rows = (data ?? []) as unknown as Sample[]

    if (search) {
      const s = search.toLowerCase()
      rows = rows.filter(r =>
        r.patient_id.toLowerCase().includes(s) ||
        (r.project as any)?.codigo_proyecto?.toLowerCase().includes(s)
      )
    }

    setSamples(rows)
    setLoading(false)
  }, [fStatus, fType, fMonth, fPending, search])

  useEffect(() => { load() }, [load])

  const clearFilters = () => { setFStatus(''); setFType(''); setFMonth(''); setFPending(false); setSearch('') }

  const total     = samples.length
  const omissions = samples.filter(s=>s.status==='OMISSION').length
  const pending   = samples.filter(s=>s.status==='PENDING').length
  const urgentOm  = samples.filter(s=>s.status==='OMISSION'&&hoursOpen(s.created_at)>=72).length
  const completed = samples.filter(s=>['STORED','SHIPPED'].includes(s.status)).length

  const hasFilters = fStatus||fType||search||fMonth||fPending

  const selStyle: React.CSSProperties = {
    padding:'6px 10px', border:'0.5px solid #D3D1C7', borderRadius:8,
    fontSize:13, background:'#fff', color:'#3D3D3A', cursor:'pointer',
  }

  return (
    <Layout>
      <div style={{ padding:'24px 28px' }}>
        <div style={{ marginBottom:18 }}>
          <h1 style={{ fontSize:17, fontWeight:500, color:'#3D3D3A', margin:0 }}>Toma de muestras</h1>
          <div style={{ fontSize:12, color:'#9C9A92', marginTop:3 }}>
            {loading?'Cargando...':`${total} muestra${total!==1?'s':''} — todos los proyectos`}
          </div>
        </div>

        {/* metrics */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:16 }}>
          {[
            {label:'Total',              value:total,     color:'#3D3D3A'},
            {label:'Pendientes',         value:pending,   color:pending>0?'#854F0B':'#3D3D3A'},
            {label:'Omisiones abiertas', value:omissions, color:omissions>0?'#A32D2D':'#3D3D3A'},
            {label:'Urgentes (>72h)',    value:urgentOm,  color:urgentOm>0?'#791F1F':'#0F6E56'},
            {label:'Completadas',        value:completed, color:completed>0?'#0F6E56':'#3D3D3A'},
          ].map(m=>(
            <div key={m.label} style={{ background:'#fff', border:'0.5px solid #E8E6DE', borderRadius:9, padding:'12px 14px', textAlign:'center' }}>
              <div style={{ fontSize:10, color:'#9C9A92', marginBottom:5 }}>{m.label}</div>
              <div style={{ fontSize:22, fontWeight:600, color:m.color }}>{m.value}</div>
            </div>
          ))}
        </div>

        {urgentOm>0 && (
          <div style={{ background:'#FCEBEB', border:'0.5px solid #F7C1C1', borderRadius:9, padding:'10px 14px', fontSize:12, color:'#791F1F', marginBottom:14, display:'flex', gap:8 }}>
            <i className="ti ti-alert-circle" style={{ fontSize:15, flexShrink:0 }} />
            <div><strong>{urgentOm} omisión{urgentOm>1?'es':''} con más de 72 horas sin atender.</strong></div>
          </div>
        )}

        {/* tabs */}
        <div style={{ display:'flex', gap:0, marginBottom:12, background:'#fff', border:'0.5px solid #E8E6DE', borderRadius:10, overflow:'hidden' }}>
          {[
            {key:'list',       label:'Lista de muestras',     icon:'ti-test-pipe'},
            {key:'collectors', label:'Resumen por recolector', icon:'ti-users'},
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

        {/* COLLECTORS TAB */}
        {activeTab==='collectors' && <CollectorSummaryView />}

        {/* LIST TAB */}
        {activeTab==='list' && (
          <>
            {/* filters */}
            <div style={{ background:'#fff', border:'0.5px solid #E8E6DE', borderRadius:10, padding:'11px 14px', marginBottom:12, display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
              <div style={{ position:'relative', flex:1, minWidth:160 }}>
                <i className="ti ti-search" style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'#9C9A92', fontSize:14, pointerEvents:'none' }} />
                <input value={search} onChange={e=>setSearch(e.target.value)}
                  placeholder="Paciente o código de proyecto..."
                  style={{ ...selStyle, paddingLeft:30, width:'100%' }} />
              </div>
              <select value={fPending?'PENDING':fStatus} onChange={e=>{
                if (e.target.value==='PENDING') { setFPending(true); setFStatus('') }
                else { setFPending(false); setFStatus(e.target.value) }
              }} style={selStyle}>
                <option value="">Todos los estados</option>
                <option value="PENDING">Solo pendientes</option>
                {Object.entries(STATUS_LABELS).filter(([k])=>k!=='PENDING').map(([k,v])=><option key={k} value={k}>{v}</option>)}
              </select>
              <select value={fType} onChange={e=>setFType(e.target.value)} style={selStyle}>
                <option value="">Todos los tipos</option>
                {Object.entries(SAMPLE_TYPE_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
              </select>
              <input type="month" value={fMonth} onChange={e=>setFMonth(e.target.value)} style={selStyle} />
              {hasFilters && (
                <button onClick={clearFilters} style={{ background:'#E6F1FB', color:'#0C447C', border:'none', padding:'6px 12px', borderRadius:20, fontSize:12, fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                  <i className="ti ti-x" style={{ fontSize:12 }} /> Limpiar
                </button>
              )}
            </div>

            {/* table */}
            <div style={{ background:'#fff', border:'0.5px solid #E8E6DE', borderRadius:10, overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, tableLayout:'fixed' }}>
                <thead>
                  <tr style={{ background:'#F8F7F4' }}>
                    {[
                      {label:'Proyecto',    w:100},
                      {label:'Paciente',    w:90},
                      {label:'Tipo',        w:130},
                      {label:'Timepoint',   w:120},
                      {label:'Fecha prog.', w:100},
                      {label:'Estado',      w:120},
                      {label:'Recolectado por', w:130},
                      {label:'',            w:90},
                    ].map(h=>(
                      <th key={h.label} style={{ padding:'8px 14px', textAlign:'left', fontSize:11, fontWeight:500, color:'#9C9A92', borderBottom:'0.5px solid #E8E6DE', width:h.w }}>
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} style={{ padding:32, textAlign:'center', fontSize:13, color:'#9C9A92' }}>Cargando...</td></tr>
                  ) : samples.length===0 ? (
                    <tr><td colSpan={8} style={{ padding:48, textAlign:'center' }}>
                      <i className="ti ti-test-pipe-off" style={{ fontSize:28, color:'#D3D1C7', display:'block', marginBottom:10 }} />
                      <div style={{ fontSize:14, color:'#9C9A92' }}>
                        {hasFilters?'Sin muestras con los filtros aplicados':'Sin muestras registradas'}
                      </div>
                    </td></tr>
                  ) : samples.map((s,i)=>{
                    const ss = STATUS_STYLE[s.status]??{bg:'#F1EFE8',color:'#444441'}
                    const ts = TYPE_STYLE[s.sample_type]??{bg:'#F1EFE8',color:'#444441'}
                    const isOmission = s.status==='OMISSION'
                    const hours = isOmission?hoursOpen(s.created_at):0
                    const urgent = isOmission&&hours>=72
                    return (
                      <tr key={s.id} style={{ borderBottom:'0.5px solid #E8E6DE', background:urgent?'rgba(162,45,45,0.03)':'' }}
                        onMouseEnter={e=>(e.currentTarget.style.background='#F8F7F4')}
                        onMouseLeave={e=>(e.currentTarget.style.background=urgent?'rgba(162,45,45,0.03)':'')}>
                        <td style={{ padding:'10px 14px' }}>
                          <span onClick={()=>navigate(`/proyectos/${s.project_id}`)}
                            style={{ fontSize:12, fontWeight:500, color:'#185FA5', cursor:'pointer', textDecoration:'underline' }}>
                            {(s.project as any)?.codigo_proyecto??'—'}
                          </span>
                        </td>
                        <td style={{ padding:'10px 14px', fontSize:12 }}>{s.patient_id}</td>
                        <td style={{ padding:'10px 14px' }}>
                          <span style={{ ...ts, fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:500 }}>
                            {SAMPLE_TYPE_LABELS[s.sample_type]??s.sample_type}
                          </span>
                        </td>
                        <td style={{ padding:'10px 14px', fontSize:12, color:'#73726C', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {s.visit_timepoint??'—'}
                        </td>
                        <td style={{ padding:'10px 14px', fontSize:12 }}>{formatDate(s.scheduled_date)}</td>
                        <td style={{ padding:'10px 14px' }}>
                          <span style={{ ...ss, fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:500 }}>
                            {STATUS_LABELS[s.status]}{urgent?` ⚠ ${hours}h`:''}
                          </span>
                        </td>
                        <td style={{ padding:'10px 14px', fontSize:12, color:'#73726C', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {(s.collector as any)?.full_name??'—'}
                        </td>
                        <td style={{ padding:'10px 14px' }}>
                          <button onClick={()=>navigate(`/proyectos/${s.project_id}`)}
                            style={{ fontSize:11, padding:'4px 10px', background:'#E6F1FB', color:'#0C447C', border:'0.5px solid #B5D4F4', borderRadius:6, cursor:'pointer', fontWeight:500 }}>
                            Ver proyecto
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
