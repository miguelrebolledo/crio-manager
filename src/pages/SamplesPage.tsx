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
  project: { codigo_proyecto: string; titulo: string } | null
}

const SAMPLE_TYPE_LABELS: Record<string,string> = {
  BLOOD:'Sangre', URINE:'Orina', TISSUE:'Tejido',
  BONE_MARROW:'Médula ósea', CSF:'LCR', OTHER:'Otro',
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
  BLOOD:{bg:'#FCEBEB',color:'#791F1F'}, URINE:{bg:'#E6F1FB',color:'#0C447C'},
  TISSUE:{bg:'#FAEEDA',color:'#633806'}, BONE_MARROW:{bg:'#EEEDFE',color:'#26215C'},
  CSF:{bg:'#E1F5EE',color:'#085041'}, OTHER:{bg:'#F1EFE8',color:'#444441'},
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CL', { day:'2-digit', month:'2-digit', year:'numeric' })
}
function hoursOpen(iso: string) {
  return Math.round((Date.now() - new Date(iso).getTime()) / 3600000)
}

export default function SamplesPage() {
  const navigate  = useNavigate()
  const { user }  = useAuth()
  const [samples, setSamples]   = useState<Sample[]>([])
  const [loading, setLoading]   = useState(true)
  const [fStatus, setFStatus]   = useState('')
  const [fType,   setFType]     = useState('')
  const [search,  setSearch]    = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('sample_collections')
      .select('id, project_id, patient_id, sample_type, visit_timepoint, scheduled_date, status, cold_chain_required, notes, created_at, project:projects(codigo_proyecto, titulo)')
      .order('scheduled_date', { ascending: false })

    if (fStatus) q = q.eq('status', fStatus)
    if (fType)   q = q.eq('sample_type', fType)

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
  }, [fStatus, fType, search])

  useEffect(() => { load() }, [load])

  const total     = samples.length
  const omissions = samples.filter(s => s.status === 'OMISSION').length
  const pending   = samples.filter(s => s.status === 'PENDING').length
  const urgentOm  = samples.filter(s => s.status === 'OMISSION' && hoursOpen(s.created_at) >= 72).length
  const completed = samples.filter(s => ['STORED','SHIPPED'].includes(s.status)).length

  const hasFilters = fStatus || fType || search

  const selStyle: React.CSSProperties = {
    padding: '6px 10px', border: '0.5px solid #D3D1C7', borderRadius: 8,
    fontSize: 13, background: '#fff', color: '#3D3D3A', cursor: 'pointer',
  }

  return (
    <Layout>
      <div style={{ padding: '24px 28px' }}>
        <div style={{ marginBottom: 18 }}>
          <h1 style={{ fontSize: 17, fontWeight: 500, color: '#3D3D3A', margin: 0 }}>Toma de muestras</h1>
          <div style={{ fontSize: 12, color: '#9C9A92', marginTop: 3 }}>
            {loading ? 'Cargando...' : `${total} muestra${total !== 1 ? 's' : ''} — todos los proyectos`}
          </div>
        </div>

        {/* metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Total',              value: total,     color: '#3D3D3A' },
            { label: 'Pendientes',         value: pending,   color: pending > 0 ? '#854F0B' : '#3D3D3A' },
            { label: 'Omisiones abiertas', value: omissions, color: omissions > 0 ? '#A32D2D' : '#3D3D3A' },
            { label: 'Urgentes (>72h)',    value: urgentOm,  color: urgentOm > 0 ? '#791F1F' : '#0F6E56' },
            { label: 'Completadas',        value: completed, color: completed > 0 ? '#0F6E56' : '#3D3D3A' },
          ].map(m => (
            <div key={m.label} style={{ background: '#fff', border: '0.5px solid #E8E6DE', borderRadius: 9, padding: '12px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: '#9C9A92', marginBottom: 5 }}>{m.label}</div>
              <div style={{ fontSize: 22, fontWeight: 600, color: m.color }}>{m.value}</div>
            </div>
          ))}
        </div>

        {urgentOm > 0 && (
          <div style={{ background: '#FCEBEB', border: '0.5px solid #F7C1C1', borderRadius: 9, padding: '10px 14px', fontSize: 12, color: '#791F1F', marginBottom: 14, display: 'flex', gap: 8 }}>
            <i className="ti ti-alert-circle" style={{ fontSize: 15, flexShrink: 0 }} />
            <div><strong>{urgentOm} omisión{urgentOm > 1 ? 'es' : ''} con más de 72 horas sin atender.</strong> Coordinar con los proyectos correspondientes.</div>
          </div>
        )}

        {/* filters */}
        <div style={{ background: '#fff', border: '0.5px solid #E8E6DE', borderRadius: 10, padding: '11px 14px', marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 160 }}>
            <i className="ti ti-search" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#9C9A92', fontSize: 14, pointerEvents: 'none' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Paciente o código de proyecto..."
              style={{ ...selStyle, paddingLeft: 30, width: '100%' }} />
          </div>
          <select value={fStatus} onChange={e => setFStatus(e.target.value)} style={selStyle}>
            <option value="">Todos los estados</option>
            {Object.entries(STATUS_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={fType} onChange={e => setFType(e.target.value)} style={selStyle}>
            <option value="">Todos los tipos</option>
            {Object.entries(SAMPLE_TYPE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {hasFilters && (
            <button onClick={() => { setFStatus(''); setFType(''); setSearch('') }}
              style={{ background: '#E6F1FB', color: '#0C447C', border: 'none', padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <i className="ti ti-x" style={{ fontSize: 12 }} /> Limpiar
            </button>
          )}
        </div>

        {/* table */}
        <div style={{ background: '#fff', border: '0.5px solid #E8E6DE', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ background: '#F8F7F4' }}>
                {[
                  {label:'Proyecto',  w:100},
                  {label:'Paciente',  w:90},
                  {label:'Tipo',      w:110},
                  {label:'Timepoint', w:130},
                  {label:'Fecha prog.',w:100},
                  {label:'Estado',    w:120},
                  {label:'Frío',      w:60},
                  {label:'',          w:80},
                ].map(h => (
                  <th key={h.label} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#9C9A92', borderBottom: '0.5px solid #E8E6DE', width: h.w }}>
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', fontSize: 13, color: '#9C9A92' }}>Cargando...</td></tr>
              ) : samples.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 48, textAlign: 'center' }}>
                  <i className="ti ti-test-pipe-off" style={{ fontSize: 28, color: '#D3D1C7', display: 'block', marginBottom: 10 }} />
                  <div style={{ fontSize: 14, color: '#9C9A92' }}>
                    {hasFilters ? 'Sin muestras con los filtros aplicados' : 'Sin muestras registradas'}
                  </div>
                </td></tr>
              ) : samples.map((s, i) => {
                const ss = STATUS_STYLE[s.status] ?? {bg:'#F1EFE8',color:'#444441'}
                const ts = TYPE_STYLE[s.sample_type] ?? {bg:'#F1EFE8',color:'#444441'}
                const isOmission = s.status === 'OMISSION'
                const hours = isOmission ? hoursOpen(s.created_at) : 0
                const urgent = isOmission && hours >= 72

                return (
                  <tr key={s.id} style={{ borderBottom: '0.5px solid #E8E6DE', background: urgent ? 'rgba(162,45,45,0.03)' : '' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F8F7F4')}
                    onMouseLeave={e => (e.currentTarget.style.background = urgent ? 'rgba(162,45,45,0.03)' : '')}>
                    <td style={{ padding: '10px 14px' }}>
                      <span
                        onClick={() => navigate(`/proyectos/${s.project_id}`)}
                        style={{ fontSize: 12, fontWeight: 500, color: '#185FA5', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        {(s.project as any)?.codigo_proyecto ?? '—'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12 }}>{s.patient_id}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ ...ts, fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500 }}>
                        {SAMPLE_TYPE_LABELS[s.sample_type]}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#73726C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.visit_timepoint ?? '—'}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12 }}>{formatDate(s.scheduled_date)}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ ...ss, fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500 }}>
                        {STATUS_LABELS[s.status]}{urgent ? ` ⚠ ${hours}h` : ''}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      {s.cold_chain_required
                        ? <i className="ti ti-snowflake" style={{ fontSize: 14, color: '#0C447C' }} />
                        : <span style={{ fontSize: 11, color: '#D3D1C7' }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <button
                        onClick={() => navigate(`/proyectos/${s.project_id}`)}
                        style={{ fontSize: 11, padding: '4px 10px', background: '#E6F1FB', color: '#0C447C', border: '0.5px solid #B5D4F4', borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}
                      >
                        Ver proyecto
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}
