// src/components/project/TabSampleProcessing.tsx
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/index'

interface Collection {
  id: string
  patient_id: string
  sample_type: string
  collected_date: string | null
  scheduled_date: string
}

interface Processing {
  id: string
  collection_id: string
  patient_id: string
  sample_type: string
  scheduled_date: string
  processed_date: string | null
  volume_quantity: string | null
  status: string
  special_instructions: string | null
  notes: string | null
  created_at: string
  processed_by: { full_name: string } | null
  registered_by: { full_name: string } | null
  collection: { patient_id: string; collected_date: string | null } | null
}

const SAMPLE_TYPE_LABELS: Record<string,string> = {
  BLOOD:'Sangre', URINE:'Orina', TISSUE:'Tejido',
  BONE_MARROW:'Médula ósea', CSF:'LCR',
  PLACENTA:'Placenta', CORD_BLOOD:'Sangre de cordón',
  UMBILICAL_CORD:'Cordón umbilical', SALIVA:'Saliva', OTHER:'Otro',
}

const STATUS_LABELS: Record<string,string> = {
  PENDING:'Pendiente', IN_PROGRESS:'En proceso',
  STORED:'Almacenada', READY_FOR_PICKUP:'Lista para recoger', SHIPPED:'Enviada',
}
const STATUS_STYLE: Record<string,{bg:string;color:string}> = {
  PENDING:          {bg:'#FAEEDA',color:'#633806'},
  IN_PROGRESS:      {bg:'#EEEDFE',color:'#26215C'},
  STORED:           {bg:'#E1F5EE',color:'#085041'},
  READY_FOR_PICKUP: {bg:'#E6F1FB',color:'#0C447C'},
  SHIPPED:          {bg:'#F1EFE8',color:'#444441'},
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CL',{day:'2-digit',month:'2-digit',year:'numeric'})
}

// ── New processing modal ──────────────────────────────────────
function ProcessingModal({ projectId, onClose, onSaved }: { projectId:string; onClose:()=>void; onSaved:()=>void }) {
  const { user } = useAuth()
  const [collections, setCollections] = useState<Collection[]>([])
  const [form, setForm] = useState({
    collection_id:        '',
    patient_id:           '',
    sample_type:          '',
    scheduled_date:       new Date().toISOString().split('T')[0],
    volume_quantity:      '',
    special_instructions: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string|null>(null)

  useEffect(() => {
    supabase.from('sample_collections')
      .select('id, patient_id, sample_type, collected_date, scheduled_date')
      .eq('project_id', projectId)
      .in('status', ['COLLECTED','PROCESSING','STORED'])
      .order('scheduled_date', { ascending: false })
      .then(({ data }) => setCollections((data ?? []) as Collection[]))
  }, [projectId])

  const handleCollectionChange = (collectionId: string) => {
    const col = collections.find(c => c.id === collectionId)
    if (col) {
      setForm(f => ({
        ...f,
        collection_id: collectionId,
        patient_id:    col.patient_id,
        sample_type:   col.sample_type,
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.collection_id || !form.scheduled_date) {
      setError('Muestra y fecha programada son obligatorias.')
      return
    }
    setSaving(true)
    setError(null)
    const { error: err } = await supabase.from('sample_processing').insert({
      project_id:           projectId,
      collection_id:        form.collection_id,
      patient_id:           form.patient_id,
      sample_type:          form.sample_type,
      scheduled_date:       form.scheduled_date,
      volume_quantity:      form.volume_quantity || null,
      special_instructions: form.special_instructions || null,
      registered_by:        user?.id,
      status:               'PENDING',
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
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth:500, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 8px 32px rgba(0,0,0,0.16)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'0.5px solid #E8E6DE' }}>
          <div style={{ fontSize:15, fontWeight:500, color:'#3D3D3A' }}>
            <i className="ti ti-flask" style={{ color:'#185FA5', marginRight:8, fontSize:15, verticalAlign:-2 }} />
            Registrar procesamiento
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#9C9A92', fontSize:18 }}>
            <i className="ti ti-x" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ padding:20, display:'flex', flexDirection:'column', gap:13 }}>
            <div>
              <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:4 }}>
                Muestra recolectada <span style={{color:'#A32D2D'}}>*</span>
              </label>
              <select style={inp} value={form.collection_id}
                onChange={e => handleCollectionChange(e.target.value)} required>
                <option value="">Seleccionar muestra...</option>
                {collections.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.patient_id} — {SAMPLE_TYPE_LABELS[c.sample_type]??c.sample_type} — {formatDate(c.scheduled_date)}
                  </option>
                ))}
              </select>
              {collections.length===0 && (
                <div style={{ fontSize:11, color:'#9C9A92', marginTop:4 }}>
                  No hay muestras recolectadas disponibles para procesar.
                </div>
              )}
            </div>

            {form.collection_id && (
              <div style={{ background:'#E6F1FB', border:'0.5px solid #B5D4F4', borderRadius:8, padding:'9px 12px', fontSize:12, color:'#0C447C' }}>
                <i className="ti ti-info-circle" style={{ fontSize:13, marginRight:5 }} />
                Paciente: <strong>{form.patient_id}</strong> · Tipo: <strong>{SAMPLE_TYPE_LABELS[form.sample_type]??form.sample_type}</strong>
              </div>
            )}

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:4 }}>
                  Fecha programada <span style={{color:'#A32D2D'}}>*</span>
                </label>
                <input style={inp} type="date" value={form.scheduled_date}
                  onChange={e => setForm(f => ({...f, scheduled_date:e.target.value}))} required />
              </div>
              <div>
                <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:4 }}>Volumen / cantidad</label>
                <input style={inp} value={form.volume_quantity}
                  onChange={e => setForm(f => ({...f, volume_quantity:e.target.value}))}
                  placeholder="Ej: 2 mL, 3 alícuotas" />
              </div>
            </div>

            <div>
              <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:4 }}>Instrucciones especiales</label>
              <textarea style={{ ...inp, minHeight:64, resize:'vertical' }}
                value={form.special_instructions}
                onChange={e => setForm(f => ({...f, special_instructions:e.target.value}))}
                placeholder="Ej: Centrifugar 10 min a 2000rpm, alicuotar en tubos de 0.5 mL, almacenar a -80°C..." />
            </div>

            {error && (
              <div style={{ background:'#FCEBEB', border:'0.5px solid #F7C1C1', borderRadius:8, padding:'9px 12px', fontSize:12, color:'#791F1F' }}>
                <i className="ti ti-alert-circle" style={{ fontSize:13, marginRight:5 }} />{error}
              </div>
            )}
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', gap:8, padding:'14px 20px', borderTop:'0.5px solid #E8E6DE' }}>
            <button type="button" onClick={onClose} style={{ background:'transparent', border:'0.5px solid #D3D1C7', color:'#73726C', padding:'7px 16px', borderRadius:8, fontSize:13, cursor:'pointer' }}>Cancelar</button>
            <button type="submit" disabled={saving||!form.collection_id} style={{ background:saving||!form.collection_id?'#9C9A92':'#185FA5', color:'#fff', border:'none', padding:'7px 18px', borderRadius:8, fontSize:13, fontWeight:500, cursor:saving||!form.collection_id?'not-allowed':'pointer', display:'flex', alignItems:'center', gap:6 }}>
              <i className="ti ti-send" style={{ fontSize:13 }} />
              {saving?'Registrando...':'Registrar procesamiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Status update modal ───────────────────────────────────────
function StatusModal({ proc, onClose, onSaved }: { proc:Processing; onClose:()=>void; onSaved:()=>void }) {
  const { user } = useAuth()
  const [selected, setSelected] = useState('')
  const [processedBy, setProcessedBy] = useState('')
  const [note, setNote]         = useState('')
  const [saving, setSaving]     = useState(false)
  const [labUsers, setLabUsers] = useState<any[]>([])

  useEffect(() => {
    supabase.from('users').select('id, full_name')
      .in('role', ['LAB','COORDINATOR','ADMIN','PM_CRIO'])
      .eq('is_active', true)
      .order('full_name')
      .then(({ data }) => setLabUsers(data ?? []))
  }, [])

  const availableStatuses = ['PENDING','IN_PROGRESS','STORED','READY_FOR_PICKUP','SHIPPED']
    .filter(s => s !== proc.status)

  const handleApply = async () => {
    if (!selected) return
    setSaving(true)
    const payload: any = {
      status:     selected,
      updated_at: new Date().toISOString(),
    }
    if (selected === 'IN_PROGRESS' || selected === 'STORED') {
      payload.processed_date = new Date().toISOString().split('T')[0]
    }
    if (processedBy) payload.processed_by = processedBy
    if (note) payload.notes = note

    await supabase.from('sample_processing').update(payload).eq('id', proc.id)
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth:420, boxShadow:'0 8px 32px rgba(0,0,0,0.16)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'0.5px solid #E8E6DE' }}>
          <div style={{ fontSize:15, fontWeight:500, color:'#3D3D3A' }}>
            <i className="ti ti-refresh" style={{ color:'#185FA5', marginRight:8, fontSize:15, verticalAlign:-2 }} />
            Actualizar procesamiento
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#9C9A92', fontSize:18 }}>
            <i className="ti ti-x" />
          </button>
        </div>
        <div style={{ padding:16 }}>
          <div style={{ fontSize:12, color:'#9C9A92', marginBottom:10 }}>
            Estado actual: <strong style={{color:'#3D3D3A'}}>{STATUS_LABELS[proc.status]}</strong>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:7, marginBottom:14 }}>
            {availableStatuses.map(s => {
              const ss = STATUS_STYLE[s] ?? {bg:'#F1EFE8',color:'#444441'}
              return (
                <div key={s} onClick={() => setSelected(s)}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 13px', border:`0.5px solid ${selected===s?'#185FA5':'#E8E6DE'}`, borderRadius:9, cursor:'pointer', background:selected===s?'#EBF4FF':'#fff' }}>
                  <span style={{ ...ss, fontSize:11, padding:'2px 9px', borderRadius:20, fontWeight:500 }}>{STATUS_LABELS[s]}</span>
                  <span style={{ fontSize:12, color:'#73726C' }}>
                    {s==='IN_PROGRESS'?'Muestra en proceso de análisis':
                     s==='STORED'?'Procesada y almacenada según protocolo':
                     s==='READY_FOR_PICKUP'?'Lista para ser recogida por el sponsor':
                     s==='SHIPPED'?'Enviada al destino final':
                     'Pendiente de procesar'}
                  </span>
                </div>
              )
            })}
          </div>

          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:4 }}>Procesado por</label>
            <select value={processedBy} onChange={e => setProcessedBy(e.target.value)}
              style={{ width:'100%', padding:'7px 10px', border:'0.5px solid #D3D1C7', borderRadius:8, fontSize:13, background:'#F8F7F4', color:'#3D3D3A', outline:'none' }}>
              <option value="">Seleccionar persona...</option>
              {labUsers.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:4 }}>Observaciones</label>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              placeholder="Notas sobre el procesamiento..."
              style={{ width:'100%', padding:'7px 10px', border:'0.5px solid #D3D1C7', borderRadius:8, fontSize:13, background:'#F8F7F4', color:'#3D3D3A', fontFamily:'inherit', outline:'none', resize:'vertical', minHeight:52 }} />
          </div>
        </div>
        <div style={{ display:'flex', justifyContent:'flex-end', gap:8, padding:'14px 20px', borderTop:'0.5px solid #E8E6DE' }}>
          <button onClick={onClose} style={{ background:'transparent', border:'0.5px solid #D3D1C7', color:'#73726C', padding:'7px 16px', borderRadius:8, fontSize:13, cursor:'pointer' }}>Cancelar</button>
          <button onClick={handleApply} disabled={!selected||saving}
            style={{ background:!selected||saving?'#9C9A92':'#185FA5', color:'#fff', border:'none', padding:'7px 18px', borderRadius:8, fontSize:13, fontWeight:500, cursor:!selected||saving?'not-allowed':'pointer' }}>
            {saving?'Aplicando...':'Aplicar cambio'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Processing row ────────────────────────────────────────────
function ProcessingRow({ proc, onUpdate, canEdit }: { proc:Processing; onUpdate:()=>void; canEdit:boolean }) {
  const [expanded, setExpanded]     = useState(false)
  const [showStatus, setShowStatus] = useState(false)

  const ss = STATUS_STYLE[proc.status] ?? {bg:'#F1EFE8',color:'#444441'}

  return (
    <div style={{ borderBottom:'0.5px solid #E8E6DE' }}>
      <div
        style={{ padding:'12px 16px', cursor:'pointer' }}
        onClick={() => setExpanded(e=>!e)}
        onMouseEnter={e=>(e.currentTarget.style.background='#F8F7F4')}
        onMouseLeave={e=>(e.currentTarget.style.background='')}
      >
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4, flexWrap:'wrap' }}>
              <span style={{ ...ss, fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:500 }}>
                {STATUS_LABELS[proc.status]}
              </span>
              <span style={{ fontSize:11, background:'#F1EFE8', color:'#444441', padding:'2px 8px', borderRadius:20 }}>
                {SAMPLE_TYPE_LABELS[proc.sample_type]??proc.sample_type}
              </span>
              <span style={{ fontSize:11, color:'#9C9A92' }}>
                {proc.patient_id} · Prog: {formatDate(proc.scheduled_date)}
              </span>
            </div>
            <div style={{ fontSize:12, color:'#9C9A92' }}>
              {proc.processed_by ? `Procesado por: ${(proc.processed_by as any).full_name}` : 'Sin procesar aún'}
              {proc.processed_date && ` · ${formatDate(proc.processed_date)}`}
              {proc.volume_quantity && ` · ${proc.volume_quantity}`}
            </div>
          </div>
          <div style={{ display:'flex', gap:6, alignItems:'center', flexShrink:0 }}>
            {canEdit && (
              <button onClick={e=>{e.stopPropagation();setShowStatus(true)}}
                style={{ fontSize:11, padding:'4px 10px', background:'#E6F1FB', color:'#0C447C', border:'0.5px solid #B5D4F4', borderRadius:6, cursor:'pointer', fontWeight:500 }}>
                Actualizar estado
              </button>
            )}
            <i className={`ti ti-chevron-${expanded?'up':'down'}`} style={{ fontSize:14, color:'#9C9A92' }} />
          </div>
        </div>
      </div>

      {expanded && (
        <div style={{ background:'#F8F7F4', borderTop:'0.5px solid #E8E6DE', padding:16 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
            {[
              {label:'Paciente',          value:proc.patient_id},
              {label:'Tipo de muestra',   value:SAMPLE_TYPE_LABELS[proc.sample_type]??proc.sample_type},
              {label:'Fecha programada',  value:formatDate(proc.scheduled_date)},
              {label:'Fecha procesada',   value:proc.processed_date?formatDate(proc.processed_date):'—'},
              {label:'Volumen/cantidad',  value:proc.volume_quantity??'—'},
              {label:'Procesado por',     value:(proc.processed_by as any)?.full_name??'—'},
              {label:'Registrado por',    value:(proc.registered_by as any)?.full_name??'—'},
            ].map(f=>(
              <div key={f.label}>
                <div style={{ fontSize:10, color:'#9C9A92', marginBottom:2 }}>{f.label}</div>
                <div style={{ fontSize:12, color:'#3D3D3A' }}>{f.value}</div>
              </div>
            ))}
            {proc.special_instructions && (
              <div style={{ gridColumn:'span 3' }}>
                <div style={{ fontSize:10, color:'#9C9A92', marginBottom:2 }}>Instrucciones especiales</div>
                <div style={{ fontSize:12, color:'#3D3D3A', lineHeight:1.4 }}>{proc.special_instructions}</div>
              </div>
            )}
            {proc.notes && (
              <div style={{ gridColumn:'span 3' }}>
                <div style={{ fontSize:10, color:'#9C9A92', marginBottom:2 }}>Observaciones</div>
                <div style={{ fontSize:12, color:'#3D3D3A', lineHeight:1.4 }}>{proc.notes}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {showStatus && (
        <StatusModal proc={proc} onClose={()=>setShowStatus(false)} onSaved={()=>{setShowStatus(false);onUpdate()}} />
      )}
    </div>
  )
}

// ── MAIN TAB ─────────────────────────────────────────────────
export default function TabSampleProcessing({ projectId }: { projectId:string }) {
  const { user }  = useAuth()
  const [procs, setProcs]       = useState<Processing[]>([])
  const [loading, setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [fStatus, setFStatus]   = useState('')

  const canCreate = ['ADMIN','PM_CRIO','COORDINATOR'].includes(user?.role??'')
  const canEdit   = ['ADMIN','PM_CRIO','COORDINATOR','LAB'].includes(user?.role??'')

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('sample_processing')
      .select('*, processed_by:users!processed_by(full_name), registered_by:users!registered_by(full_name), collection:sample_collections(patient_id, collected_date)')
      .eq('project_id', projectId)
      .order('scheduled_date', { ascending: false })

    if (fStatus) q = q.eq('status', fStatus)

    const { data } = await q
    setProcs((data??[]) as Processing[])
    setLoading(false)
  }, [projectId, fStatus])

  useEffect(() => { load() }, [load])

  const total    = procs.length
  const pending  = procs.filter(p=>p.status==='PENDING').length
  const inProg   = procs.filter(p=>p.status==='IN_PROGRESS').length
  const ready    = procs.filter(p=>p.status==='READY_FOR_PICKUP').length

  const selStyle: React.CSSProperties = {
    padding:'5px 10px', border:'0.5px solid #D3D1C7', borderRadius:8,
    fontSize:12, background:'#fff', color:'#3D3D3A', cursor:'pointer',
  }

  return (
    <div>
      {/* metrics */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:14 }}>
        {[
          {label:'Total registros',    value:total,   color:'#3D3D3A'},
          {label:'Pendientes',         value:pending, color:pending>0?'#854F0B':'#3D3D3A'},
          {label:'En proceso',         value:inProg,  color:inProg>0?'#26215C':'#3D3D3A'},
          {label:'Listas para recoger',value:ready,   color:ready>0?'#185FA5':'#3D3D3A'},
        ].map(m=>(
          <div key={m.label} style={{ background:'#fff', border:'0.5px solid #E8E6DE', borderRadius:9, padding:'11px 14px', textAlign:'center' }}>
            <div style={{ fontSize:10, color:'#9C9A92', marginBottom:5 }}>{m.label}</div>
            <div style={{ fontSize:22, fontWeight:600, color:m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12, flexWrap:'wrap', gap:8 }}>
        <div style={{ display:'flex', gap:8 }}>
          <select value={fStatus} onChange={e=>setFStatus(e.target.value)} style={selStyle}>
            <option value="">Todos los estados</option>
            {Object.entries(STATUS_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
          </select>
          {fStatus && (
            <button onClick={()=>setFStatus('')} style={{ background:'#E6F1FB', color:'#0C447C', border:'none', padding:'5px 10px', borderRadius:20, fontSize:11, fontWeight:500, cursor:'pointer' }}>
              <i className="ti ti-x" style={{ fontSize:11 }} /> Limpiar
            </button>
          )}
        </div>
        {canCreate && (
          <button onClick={()=>setShowModal(true)} style={{ background:'#185FA5', color:'#fff', border:'none', padding:'7px 14px', borderRadius:8, fontSize:13, fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
            <i className="ti ti-plus" style={{ fontSize:14 }} /> Registrar procesamiento
          </button>
        )}
      </div>

      {/* list */}
      <div style={{ background:'#fff', border:'0.5px solid #E8E6DE', borderRadius:10, overflow:'hidden' }}>
        {loading ? (
          <div style={{ padding:32, textAlign:'center', fontSize:13, color:'#9C9A92' }}>Cargando...</div>
        ) : procs.length===0 ? (
          <div style={{ padding:48, textAlign:'center' }}>
            <i className="ti ti-flask-off" style={{ fontSize:28, color:'#D3D1C7', display:'block', marginBottom:10 }} />
            <div style={{ fontSize:14, color:'#9C9A92', marginBottom:6 }}>
              {fStatus?'Sin registros con este filtro':'Sin procesamientos registrados'}
            </div>
            {canCreate && !fStatus && (
              <button onClick={()=>setShowModal(true)} style={{ background:'#185FA5', color:'#fff', border:'none', borderRadius:8, padding:'7px 16px', fontSize:13, cursor:'pointer', marginTop:4 }}>
                Registrar primer procesamiento
              </button>
            )}
          </div>
        ) : (
          procs.map(p=><ProcessingRow key={p.id} proc={p} onUpdate={load} canEdit={canEdit} />)
        )}
      </div>

      {showModal && (
        <ProcessingModal projectId={projectId} onClose={()=>setShowModal(false)} onSaved={load} />
      )}
    </div>
  )
}
