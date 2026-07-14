// src/components/project/TabSamples.tsx
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/index'

// ── Types ────────────────────────────────────────────────────
interface Sample {
  id: string
  patient_id: string
  sample_type: string
  visit_timepoint: string | null
  scheduled_date: string
  collected_date: string | null
  volume_quantity: string | null
  cold_chain_required: boolean
  processing_required: boolean
  status: string
  storage_location: string | null
  shipping_destination: string | null
  notes: string | null
  created_at: string
  registered_by: string
}

// ── Label maps ───────────────────────────────────────────────
const SAMPLE_TYPE_LABELS: Record<string, string> = {
  BLOOD: 'Sangre', URINE: 'Orina', TISSUE: 'Tejido',
  BONE_MARROW: 'Médula ósea', CSF: 'LCR', OTHER: 'Otro',
}
const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente', COLLECTED: 'Recolectada',
  PROCESSING: 'En proceso', STORED: 'Almacenada',
  SHIPPED: 'Enviada', OMISSION: 'Omisión',
}
const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  PENDING:    { bg: '#FAEEDA', color: '#633806' },
  COLLECTED:  { bg: '#E6F1FB', color: '#0C447C' },
  PROCESSING: { bg: '#EEEDFE', color: '#26215C' },
  STORED:     { bg: '#E1F5EE', color: '#085041' },
  SHIPPED:    { bg: '#F1EFE8', color: '#444441' },
  OMISSION:   { bg: '#FCEBEB', color: '#791F1F' },
}
const TYPE_STYLE: Record<string, { bg: string; color: string }> = {
  BLOOD:       { bg: '#FCEBEB', color: '#791F1F' },
  URINE:       { bg: '#E6F1FB', color: '#0C447C' },
  TISSUE:      { bg: '#FAEEDA', color: '#633806' },
  BONE_MARROW: { bg: '#EEEDFE', color: '#26215C' },
  CSF:         { bg: '#E1F5EE', color: '#085041' },
  OTHER:       { bg: '#F1EFE8', color: '#444441' },
}

// Estados del flujo en orden
const STATUS_FLOW = ['PENDING', 'COLLECTED', 'PROCESSING', 'STORED', 'SHIPPED']
const STATUS_FLOW_LABELS = ['Programada', 'Recolectada', 'Procesando', 'Almacenada', 'Enviada']
const STATUS_FLOW_ICONS  = ['ti-clock', 'ti-droplet', 'ti-flask', 'ti-snowflake', 'ti-truck']

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function hoursOpen(createdAt: string): number {
  return Math.round((Date.now() - new Date(createdAt).getTime()) / 3600000)
}

// ── New sample modal ──────────────────────────────────────────
function SampleModal({ projectId, onClose, onSaved }: { projectId: string; onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth()
  const [form, setForm] = useState({
    patient_id:          '',
    sample_type:         'BLOOD',
    visit_timepoint:     '',
    scheduled_date:      new Date().toISOString().split('T')[0],
    volume_quantity:     '',
    collected_by_name:   '',
    cold_chain_required: false,
    processing_required: false,
    notes:               '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const inp: React.CSSProperties = {
    width: '100%', padding: '7px 10px', border: '0.5px solid #D3D1C7',
    borderRadius: 8, fontSize: 13, background: '#F8F7F4',
    color: '#3D3D3A', fontFamily: 'inherit', outline: 'none',
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.patient_id) { setError('El ID del paciente es obligatorio.'); return }
    setSaving(true)
    setError(null)
    const { error: err } = await supabase.from('sample_collections').insert({
      project_id:          projectId,
      registered_by:       user?.id,
      patient_id:          form.patient_id,
      sample_type:         form.sample_type,
      visit_timepoint:     form.visit_timepoint || null,
      scheduled_date:      form.scheduled_date,
      volume_quantity:     form.volume_quantity || null,
      cold_chain_required: form.cold_chain_required,
      processing_required: form.processing_required,
      notes:               form.notes || (form.collected_by_name ? `Recolectada por: ${form.collected_by_name}` : null),
      status:              'PENDING',
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.16)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '0.5px solid #E8E6DE' }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: '#3D3D3A' }}>
            <i className="ti ti-test-pipe" style={{ color: '#185FA5', marginRight: 8, fontSize: 15, verticalAlign: -2 }} />
            Registrar toma de muestra
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9C9A92', fontSize: 18 }}>
            <i className="ti ti-x" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 13 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: '#9C9A92', fontWeight: 500, display: 'block', marginBottom: 4 }}>ID Paciente <span style={{ color: '#A32D2D' }}>*</span></label>
                <input style={inp} value={form.patient_id} onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))} placeholder="Ej: PAC-014" required />
                <div style={{ fontSize: 10, color: '#9C9A92', marginTop: 3 }}>ID interno — nunca nombre real</div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#9C9A92', fontWeight: 500, display: 'block', marginBottom: 4 }}>Tipo de muestra <span style={{ color: '#A32D2D' }}>*</span></label>
                <select style={inp} value={form.sample_type} onChange={e => setForm(f => ({ ...f, sample_type: e.target.value }))}>
                  {Object.entries(SAMPLE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: '#9C9A92', fontWeight: 500, display: 'block', marginBottom: 4 }}>Fecha programada <span style={{ color: '#A32D2D' }}>*</span></label>
                <input style={inp} type="date" value={form.scheduled_date} onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))} required />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#9C9A92', fontWeight: 500, display: 'block', marginBottom: 4 }}>Visita / Timepoint</label>
                <select style={inp} value={form.visit_timepoint} onChange={e => setForm(f => ({ ...f, visit_timepoint: e.target.value }))}>
                  <option value="">Sin asignar</option>
                  <option>Visita basal (D0)</option>
                  <option>Semana 4</option>
                  <option>Semana 8</option>
                  <option>Semana 12</option>
                  <option>Semana 24</option>
                  <option>Final de estudio</option>
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#9C9A92', fontWeight: 500, display: 'block', marginBottom: 4 }}>Volumen / cantidad</label>
              <input style={inp} value={form.volume_quantity} onChange={e => setForm(f => ({ ...f, volume_quantity: e.target.value }))} placeholder="Ej: 10 mL, 3 tubos, biopsia 2 cilindros" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#9C9A92', fontWeight: 500, display: 'block', marginBottom: 4 }}>Tomado por (quién recolectó)
              </label>
              <input style={inp}
                value={form.collected_by_name ?? ''}
                onChange={e => setForm(f => ({ ...f, collected_by_name: e.target.value }))}
                placeholder="Nombre de quien recolectó la muestra" />
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              {[
                { key: 'cold_chain_required', label: 'Requiere cadena de frío' },
                { key: 'processing_required', label: 'Requiere procesamiento' },
              ].map(opt => (
                <div key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                  onClick={() => setForm(f => ({ ...f, [opt.key]: !(f as any)[opt.key] }))}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                    border: `1.5px solid ${(form as any)[opt.key] ? '#185FA5' : '#D3D1C7'}`,
                    background: (form as any)[opt.key] ? '#185FA5' : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {(form as any)[opt.key] && <i className="ti ti-check" style={{ fontSize: 11, color: '#fff' }} />}
                  </div>
                  <span style={{ fontSize: 13, color: '#3D3D3A' }}>{opt.label}</span>
                </div>
              ))}
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#9C9A92', fontWeight: 500, display: 'block', marginBottom: 4 }}>Instrucciones especiales</label>
              <textarea style={{ ...inp, minHeight: 56, resize: 'vertical' }}
                value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Ej: Centrifugar 10 min, alicuotar en 3 tubos, almacenar a -80°C..." />
            </div>
            {error && (
              <div style={{ background: '#FCEBEB', border: '0.5px solid #F7C1C1', borderRadius: 8, padding: '9px 12px', fontSize: 12, color: '#791F1F' }}>
                <i className="ti ti-alert-circle" style={{ fontSize: 13, marginRight: 5 }} />{error}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 20px', borderTop: '0.5px solid #E8E6DE' }}>
            <button type="button" onClick={onClose} style={{ background: 'transparent', border: '0.5px solid #D3D1C7', color: '#73726C', padding: '7px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
            <button type="submit" disabled={saving} style={{ background: saving ? '#9C9A92' : '#185FA5', color: '#fff', border: 'none', padding: '7px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="ti ti-send" style={{ fontSize: 13 }} />
              {saving ? 'Registrando...' : 'Registrar muestra'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Status change modal ───────────────────────────────────────
function StatusModal({ sample, onClose, onSaved }: { sample: Sample; onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth()
  const [selected, setSelected] = useState('')
  const [note, setNote]         = useState('')
  const [saving, setSaving]     = useState(false)

  const availableStatuses = [...STATUS_FLOW.filter(s => s !== sample.status), 'OMISSION']
    .filter(s => s !== sample.status)

  const handleApply = async () => {
    if (!selected) return
    setSaving(true)
    const payload: any = {
      status:     selected,
      updated_by: user?.id,
      updated_at: new Date().toISOString(),
    }
    if (selected === 'COLLECTED') payload.collected_date = new Date().toISOString().split('T')[0]
    if (note) payload.notes = note

    await supabase.from('sample_collections').update(payload).eq('id', sample.id)
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.16)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '0.5px solid #E8E6DE' }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: '#3D3D3A' }}>
            <i className="ti ti-refresh" style={{ color: '#185FA5', marginRight: 8, fontSize: 15, verticalAlign: -2 }} />
            Cambiar estado
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9C9A92', fontSize: 18 }}>
            <i className="ti ti-x" />
          </button>
        </div>
        <div style={{ padding: 16 }}>
          <div style={{ fontSize: 12, color: '#9C9A92', marginBottom: 10 }}>
            Estado actual: <strong style={{ color: '#3D3D3A' }}>{STATUS_LABELS[sample.status]}</strong>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {availableStatuses.map(s => {
              const ss = STATUS_STYLE[s] ?? { bg: '#F1EFE8', color: '#444441' }
              return (
                <div key={s}
                  onClick={() => setSelected(s)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 13px', border: `0.5px solid ${selected === s ? '#185FA5' : '#E8E6DE'}`,
                    borderRadius: 9, cursor: 'pointer',
                    background: selected === s ? '#EBF4FF' : '#fff',
                  }}>
                  <span style={{ ...ss, fontSize: 11, padding: '2px 9px', borderRadius: 20, fontWeight: 500 }}>{STATUS_LABELS[s]}</span>
                  <span style={{ fontSize: 12, color: '#73726C' }}>
                    {s === 'OMISSION' ? 'No fue posible recolectar en la ventana de tiempo' :
                     s === 'COLLECTED' ? 'Muestra obtenida del paciente' :
                     s === 'PROCESSING' ? 'En laboratorio — centrifugación / alicuotado' :
                     s === 'STORED' ? 'Procesada y conservada según protocolo' :
                     s === 'SHIPPED' ? 'Despachada al laboratorio central o sponsor' : ''}
                  </span>
                </div>
              )
            })}
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#9C9A92', fontWeight: 500, display: 'block', marginBottom: 4 }}>Observación (opcional)</label>
            <textarea
              style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #D3D1C7', borderRadius: 8, fontSize: 13, background: '#F8F7F4', color: '#3D3D3A', fontFamily: 'inherit', outline: 'none', resize: 'vertical', minHeight: 52 }}
              value={note} onChange={e => setNote(e.target.value)}
              placeholder="Notas sobre el cambio de estado..."
            />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 20px', borderTop: '0.5px solid #E8E6DE' }}>
          <button onClick={onClose} style={{ background: 'transparent', border: '0.5px solid #D3D1C7', color: '#73726C', padding: '7px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={handleApply} disabled={!selected || saving} style={{ background: !selected || saving ? '#9C9A92' : '#185FA5', color: '#fff', border: 'none', padding: '7px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: !selected || saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Aplicando...' : 'Aplicar cambio'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Sample row ────────────────────────────────────────────────
function SampleRow({ sample, onUpdate, canEdit }: { sample: Sample; onUpdate: () => void; canEdit: boolean }) {
  const [expanded, setExpanded]     = useState(false)
  const [showStatus, setShowStatus] = useState(false)

  const ss = STATUS_STYLE[sample.status] ?? { bg: '#F1EFE8', color: '#444441' }
  const ts = TYPE_STYLE[sample.sample_type] ?? { bg: '#F1EFE8', color: '#444441' }

  const isOmission  = sample.status === 'OMISSION'
  const hours       = isOmission ? hoursOpen(sample.created_at) : 0
  const urgentOmission = isOmission && hours >= 72

  // flujo visual
  const flowIdx = STATUS_FLOW.indexOf(sample.status)

  return (
    <div style={{ borderBottom: '0.5px solid #E8E6DE' }}>
      <div
        style={{ padding: '12px 16px', cursor: 'pointer', background: urgentOmission ? 'rgba(162,45,45,0.03)' : '' }}
        onClick={() => setExpanded(e => !e)}
        onMouseEnter={e => (e.currentTarget.style.background = '#F8F7F4')}
        onMouseLeave={e => (e.currentTarget.style.background = urgentOmission ? 'rgba(162,45,45,0.03)' : '')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
              <span style={{ ...ts, fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500 }}>
                {SAMPLE_TYPE_LABELS[sample.sample_type]}
              </span>
              <span style={{ ...ss, fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500 }}>
                {STATUS_LABELS[sample.status]}
                {urgentOmission && ` ⚠ ${hours}h`}
              </span>
              {sample.cold_chain_required && (
                <span style={{ fontSize: 11, background: '#E6F1FB', color: '#0C447C', padding: '2px 7px', borderRadius: 20 }}>
                  <i className="ti ti-snowflake" style={{ fontSize: 11, marginRight: 3 }} />Frío
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#9C9A92' }}>
              {sample.patient_id}
              {sample.visit_timepoint && ` · ${sample.visit_timepoint}`}
              {' · '}{formatDate(sample.scheduled_date)}
              {sample.volume_quantity && ` · ${sample.volume_quantity}`}
            </div>

          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            {canEdit && (
              <button
                onClick={e => { e.stopPropagation(); setShowStatus(true) }}
                style={{ fontSize: 11, padding: '4px 10px', background: isOmission ? '#FCEBEB' : '#E6F1FB', color: isOmission ? '#791F1F' : '#0C447C', border: `0.5px solid ${isOmission ? '#F7C1C1' : '#B5D4F4'}`, borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}
              >
                {isOmission ? 'Atender omisión' : 'Cambiar estado'}
              </button>
            )}
            <i className={`ti ti-chevron-${expanded ? 'up' : 'down'}`} style={{ fontSize: 14, color: '#9C9A92' }} />
          </div>
        </div>
      </div>

      {expanded && (
        <div style={{ background: '#F8F7F4', borderTop: '0.5px solid #E8E6DE', padding: 16 }}>
          {/* flujo visual */}
          {!isOmission && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: '#9C9A92', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>Flujo de la muestra</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                {STATUS_FLOW.map((s, i) => {
                  const done   = i < flowIdx
                  const active = i === flowIdx
                  const dotBg  = done ? '#0F6E56' : active ? '#185FA5' : '#E8E6DE'
                  const dotColor = done || active ? '#fff' : '#9C9A92'
                  return (
                    <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: dotBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, border: `2px solid ${dotBg}` }}>
                          <i className={`ti ${STATUS_FLOW_ICONS[i]}`} style={{ color: dotColor }} />
                        </div>
                        <span style={{ fontSize: 10, color: active ? '#185FA5' : done ? '#0F6E56' : '#9C9A92', fontWeight: active ? 500 : 400 }}>
                          {STATUS_FLOW_LABELS[i]}
                        </span>
                      </div>
                      {i < STATUS_FLOW.length - 1 && (
                        <div style={{ width: 32, height: 2, background: done ? '#1D9E75' : '#E8E6DE', margin: '0 2px', marginBottom: 18 }} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* datos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            {[
              { label: 'Paciente',           value: sample.patient_id },
              { label: 'Fecha programada',   value: formatDate(sample.scheduled_date) },
              { label: 'Fecha recolección',  value: sample.collected_date ? formatDate(sample.collected_date) : '—' },
              { label: 'Volumen',            value: sample.volume_quantity ?? '—' },
              { label: 'Cadena de frío',     value: sample.cold_chain_required ? 'Requerida' : 'No requerida' },
              { label: 'Procesamiento',      value: sample.processing_required ? 'Requerido' : 'No requerido' },
              { label: 'Ubicación almac.',   value: sample.storage_location ?? '—' },
              { label: 'Destino de envío',   value: sample.shipping_destination ?? '—' },
            ].map(f => (
              <div key={f.label}>
                <div style={{ fontSize: 10, color: '#9C9A92', marginBottom: 2 }}>{f.label}</div>
                <div style={{ fontSize: 12, color: '#3D3D3A' }}>{f.value}</div>
              </div>
            ))}
            {sample.notes && (
              <div style={{ gridColumn: 'span 3' }}>
                <div style={{ fontSize: 10, color: '#9C9A92', marginBottom: 2 }}>Observaciones</div>
                <div style={{ fontSize: 12, color: '#3D3D3A', lineHeight: 1.4 }}>{sample.notes}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {showStatus && (
        <StatusModal
          sample={sample}
          onClose={() => setShowStatus(false)}
          onSaved={() => { setShowStatus(false); onUpdate() }}
        />
      )}
    </div>
  )
}

// ── MAIN TAB ─────────────────────────────────────────────────
export default function TabSamples({ projectId }: { projectId: string }) {
  const { user }  = useAuth()
  const [samples, setSamples]   = useState<Sample[]>([])
  const [loading, setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [fStatus, setFStatus]   = useState('')
  const [fType, setFType]       = useState('')

  const canEdit   = ['ADMIN','PM_CRIO','COORDINATOR','LAB'].includes(user?.role ?? '')
  const canCreate = ['ADMIN','PM_CRIO','COORDINATOR'].includes(user?.role ?? '')

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('sample_collections')
      .select('*')
      .eq('project_id', projectId)
      .order('scheduled_date', { ascending: false })

    if (fStatus) q = q.eq('status', fStatus)
    if (fType)   q = q.eq('sample_type', fType)

    const { data } = await q
    setSamples((data ?? []) as Sample[])
    setLoading(false)
  }, [projectId, fStatus, fType])

  useEffect(() => { load() }, [load])

  // stats
  const total     = samples.length
  const omissions = samples.filter(s => s.status === 'OMISSION').length
  const pending   = samples.filter(s => s.status === 'PENDING').length
  const completed = samples.filter(s => ['STORED','SHIPPED'].includes(s.status)).length
  const urgentOm  = samples.filter(s => s.status === 'OMISSION' && hoursOpen(s.created_at) >= 72).length

  const selStyle: React.CSSProperties = {
    padding: '5px 10px', border: '0.5px solid #D3D1C7', borderRadius: 8,
    fontSize: 12, background: '#fff', color: '#3D3D3A', cursor: 'pointer',
  }

  return (
    <div>
      {/* metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
        {[
          { label: 'Total muestras',     value: total,     color: '#3D3D3A' },
          { label: 'Pendientes',         value: pending,   color: pending > 0 ? '#854F0B' : '#3D3D3A' },
          { label: 'Omisiones abiertas', value: omissions, color: omissions > 0 ? '#A32D2D' : '#3D3D3A' },
          { label: 'Completadas',        value: completed, color: completed > 0 ? '#0F6E56' : '#3D3D3A' },
        ].map(m => (
          <div key={m.label} style={{ background: '#fff', border: '0.5px solid #E8E6DE', borderRadius: 9, padding: '11px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#9C9A92', marginBottom: 5 }}>{m.label}</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* urgent omission alert */}
      {urgentOm > 0 && (
        <div style={{ background: '#FCEBEB', border: '0.5px solid #F7C1C1', borderRadius: 9, padding: '10px 14px', fontSize: 12, color: '#791F1F', marginBottom: 14, display: 'flex', gap: 8 }}>
          <i className="ti ti-alert-circle" style={{ fontSize: 15, flexShrink: 0 }} />
          <div><strong>{urgentOm} omisión{urgentOm > 1 ? 'es' : ''} con más de 72 horas sin atender.</strong> Requieren acción inmediata.</div>
        </div>
      )}

      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={fStatus} onChange={e => setFStatus(e.target.value)} style={selStyle}>
            <option value="">Todos los estados</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={fType} onChange={e => setFType(e.target.value)} style={selStyle}>
            <option value="">Todos los tipos</option>
            {Object.entries(SAMPLE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {(fStatus || fType) && (
            <button onClick={() => { setFStatus(''); setFType('') }} style={{ background: '#E6F1FB', color: '#0C447C', border: 'none', padding: '5px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>
              <i className="ti ti-x" style={{ fontSize: 11 }} /> Limpiar
            </button>
          )}
        </div>
        {canCreate && (
          <button onClick={() => setShowModal(true)} style={{ background: '#185FA5', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-plus" style={{ fontSize: 14 }} /> Registrar muestra
          </button>
        )}
      </div>

      {/* list */}
      <div style={{ background: '#fff', border: '0.5px solid #E8E6DE', borderRadius: 10, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', fontSize: 13, color: '#9C9A92' }}>Cargando muestras...</div>
        ) : samples.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <i className="ti ti-test-pipe-off" style={{ fontSize: 28, color: '#D3D1C7', display: 'block', marginBottom: 10 }} />
            <div style={{ fontSize: 14, color: '#9C9A92', marginBottom: 6 }}>
              {fStatus || fType ? 'Sin muestras con los filtros aplicados' : 'Sin muestras registradas'}
            </div>
            {canCreate && !fStatus && !fType && (
              <button onClick={() => setShowModal(true)} style={{ background: '#185FA5', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 13, cursor: 'pointer', marginTop: 4 }}>
                Registrar primera muestra
              </button>
            )}
          </div>
        ) : (
          samples.map(s => <SampleRow key={s.id} sample={s} onUpdate={load} canEdit={canEdit} />)
        )}
      </div>

      {showModal && (
        <SampleModal
          projectId={projectId}
          onClose={() => setShowModal(false)}
          onSaved={load}
        />
      )}
    </div>
  )
}
