// src/components/project/TabAdverseEvents.tsx
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/index'

// ── Types ────────────────────────────────────────────────────
interface AdverseEvent {
  id: string
  event_type: string
  grade: string
  patient_id: string
  detection_date: string
  description: string
  relation_to_treatment: string
  actions_taken: string | null
  status: string
  pi_notified_at: string | null
  sponsor_notified_at: string | null
  ethics_notified_at: string | null
  closed_at: string | null
  created_at: string
  reporter: { full_name: string } | null
}

// ── Label maps ───────────────────────────────────────────────
const GRADE_LABELS: Record<string, string> = {
  GRADE_1: 'Grado 1 — Leve',
  GRADE_2: 'Grado 2 — Moderado',
  GRADE_3: 'Grado 3 — Grave',
  GRADE_4: 'Grado 4 — Riesgo vital',
  GRADE_5: 'Grado 5 — Muerte',
}
const RELATION_LABELS: Record<string, string> = {
  DEFINITELY_RELATED:  'Definitivamente relacionado',
  PROBABLY_RELATED:    'Probablemente relacionado',
  POSSIBLY_RELATED:    'Posiblemente relacionado',
  NOT_RELATED:         'No relacionado',
  NOT_EVALUABLE:       'No evaluable',
}
const STATUS_LABELS: Record<string, string> = {
  REPORTED:   'Reportado',
  FOLLOW_UP:  'En seguimiento',
  CLOSED:     'Cerrado',
}

const GRADE_STYLE: Record<string, { bg: string; color: string }> = {
  GRADE_1: { bg: '#F1EFE8', color: '#444441' },
  GRADE_2: { bg: '#FAEEDA', color: '#633806' },
  GRADE_3: { bg: '#FCEBEB', color: '#791F1F' },
  GRADE_4: { bg: '#791F1F', color: '#fff'    },
  GRADE_5: { bg: '#3D3D3A', color: '#fff'    },
}
const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  REPORTED:  { bg: '#E6F1FB', color: '#0C447C' },
  FOLLOW_UP: { bg: '#FAEEDA', color: '#633806' },
  CLOSED:    { bg: '#E1F5EE', color: '#085041' },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CL', { day:'2-digit', month:'2-digit', year:'numeric' })
}
function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-CL', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
}

// ── Form modal ───────────────────────────────────────────────
function AEModal({
  projectId,
  onClose,
  onSaved,
}: {
  projectId: string
  onClose: () => void
  onSaved: () => void
}) {
  const { user } = useAuth()
  const [form, setForm] = useState({
    event_type:            'AE',
    grade:                 'GRADE_1',
    patient_id:            '',
    detection_date:        new Date().toISOString().split('T')[0],
    description:           '',
    relation_to_treatment: 'NOT_EVALUABLE',
    actions_taken:         '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const isSAE = form.event_type === 'SAE'

  const inp: React.CSSProperties = {
    width: '100%', padding: '7px 10px',
    border: '0.5px solid #D3D1C7', borderRadius: 8,
    fontSize: 13, background: '#F8F7F4', color: '#3D3D3A',
    fontFamily: 'inherit', outline: 'none',
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.patient_id || !form.description) {
      setError('ID de paciente y descripción son obligatorios.')
      return
    }
    setSaving(true)
    setError(null)
    const { error: err } = await supabase.from('adverse_events').insert({
      project_id:            projectId,
      reported_by:           user?.id,
      event_type:            form.event_type,
      grade:                 form.grade,
      patient_id:            form.patient_id,
      detection_date:        form.detection_date,
      description:           form.description,
      relation_to_treatment: form.relation_to_treatment,
      actions_taken:         form.actions_taken || null,
      status:                'REPORTED',
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
    onClose()
  }

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
    zIndex: 200, display: 'flex', alignItems: 'center',
    justifyContent: 'center', padding: 16,
  }

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.16)' }}>

        {/* head */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '0.5px solid #E8E6DE' }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: '#3D3D3A' }}>
            <i className="ti ti-alert-triangle" style={{ color: '#A32D2D', marginRight: 8, fontSize: 15, verticalAlign: -2 }} />
            Registrar efecto adverso
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9C9A92', fontSize: 18 }}>
            <i className="ti ti-x" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 13 }}>

            {/* SAE alert */}
            {isSAE && (
              <div style={{ background: '#FCEBEB', border: '0.5px solid #F7C1C1', borderRadius: 9, padding: '10px 13px', fontSize: 12, color: '#791F1F', display: 'flex', gap: 8 }}>
                <i className="ti ti-alert-circle" style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }} />
                <div>
                  <strong>Evento adverso grave (SAE).</strong> Debes notificar al PI, sponsor y Comité de Ética dentro de las <strong>24 horas</strong> según ICH E6(R2). Registra las notificaciones una vez enviadas.
                </div>
              </div>
            )}

            {/* tipo + grado */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: '#9C9A92', fontWeight: 500, display: 'block', marginBottom: 4 }}>
                  Tipo de evento <span style={{ color: '#A32D2D' }}>*</span>
                </label>
                <select style={inp} value={form.event_type}
                  onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))}>
                  <option value="AE">EA — Efecto adverso</option>
                  <option value="SAE">SAE — Efecto adverso grave</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#9C9A92', fontWeight: 500, display: 'block', marginBottom: 4 }}>
                  Grado de severidad <span style={{ color: '#A32D2D' }}>*</span>
                </label>
                <select style={inp} value={form.grade}
                  onChange={e => setForm(f => ({ ...f, grade: e.target.value }))}>
                  {Object.entries(GRADE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* paciente + fecha */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: '#9C9A92', fontWeight: 500, display: 'block', marginBottom: 4 }}>
                  ID del paciente <span style={{ color: '#A32D2D' }}>*</span>
                </label>
                <input style={inp} value={form.patient_id}
                  onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))}
                  placeholder="Ej: PAC-014" required />
                <div style={{ fontSize: 10, color: '#9C9A92', marginTop: 3 }}>
                  Usar ID interno del estudio — nunca nombre real
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#9C9A92', fontWeight: 500, display: 'block', marginBottom: 4 }}>
                  Fecha de detección <span style={{ color: '#A32D2D' }}>*</span>
                </label>
                <input style={inp} type="date" value={form.detection_date}
                  onChange={e => setForm(f => ({ ...f, detection_date: e.target.value }))} required />
              </div>
            </div>

            {/* descripción */}
            <div>
              <label style={{ fontSize: 11, color: '#9C9A92', fontWeight: 500, display: 'block', marginBottom: 4 }}>
                Descripción del evento <span style={{ color: '#A32D2D' }}>*</span>
              </label>
              <textarea style={{ ...inp, minHeight: 72, resize: 'vertical' }}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Describe el evento, síntomas, intensidad y contexto clínico..." required />
            </div>

            {/* relación */}
            <div>
              <label style={{ fontSize: 11, color: '#9C9A92', fontWeight: 500, display: 'block', marginBottom: 4 }}>
                Relación con el tratamiento
              </label>
              <select style={inp} value={form.relation_to_treatment}
                onChange={e => setForm(f => ({ ...f, relation_to_treatment: e.target.value }))}>
                {Object.entries(RELATION_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            {/* acciones */}
            <div>
              <label style={{ fontSize: 11, color: '#9C9A92', fontWeight: 500, display: 'block', marginBottom: 4 }}>
                Acciones tomadas
              </label>
              <textarea style={{ ...inp, minHeight: 60, resize: 'vertical' }}
                value={form.actions_taken}
                onChange={e => setForm(f => ({ ...f, actions_taken: e.target.value }))}
                placeholder="Ej: Reducción de dosis, hospitalización, derivación a especialista..." />
            </div>

            {error && (
              <div style={{ background: '#FCEBEB', border: '0.5px solid #F7C1C1', borderRadius: 8, padding: '9px 12px', fontSize: 12, color: '#791F1F' }}>
                <i className="ti ti-alert-circle" style={{ fontSize: 13, verticalAlign: -1, marginRight: 5 }} />
                {error}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 20px', borderTop: '0.5px solid #E8E6DE' }}>
            <button type="button" onClick={onClose} style={{ background: 'transparent', border: '0.5px solid #D3D1C7', color: '#73726C', padding: '7px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} style={{ background: saving ? '#9C9A92' : '#A32D2D', color: '#fff', border: 'none', padding: '7px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="ti ti-send" style={{ fontSize: 13 }} />
              {saving ? 'Registrando...' : 'Registrar evento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Event detail expanded ─────────────────────────────────────
function AEDetail({ ae, onUpdate }: { ae: AdverseEvent; onUpdate: () => void }) {
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)
  const canEdit = ['ADMIN','PM_CRIO','COORDINATOR','INVESTIGATOR'].includes(user?.role ?? '')

  const markNotification = async (field: 'pi_notified_at' | 'sponsor_notified_at' | 'ethics_notified_at') => {
    setSaving(true)
    await supabase.from('adverse_events')
      .update({ [field]: new Date().toISOString() })
      .eq('id', ae.id)
    setSaving(false)
    onUpdate()
  }

  const closeEvent = async () => {
    if (!confirm('¿Marcar este evento como cerrado?')) return
    setSaving(true)
    await supabase.from('adverse_events')
      .update({ status: 'CLOSED', closed_at: new Date().toISOString() })
      .eq('id', ae.id)
    setSaving(false)
    onUpdate()
  }

  const setFollowUp = async () => {
    setSaving(true)
    await supabase.from('adverse_events')
      .update({ status: 'FOLLOW_UP' })
      .eq('id', ae.id)
    setSaving(false)
    onUpdate()
  }

  const isSAE = ae.event_type === 'SAE'

  const notifications = [
    { key: 'pi_notified_at',      label: 'Notificación al PI',             value: ae.pi_notified_at,      deadline: '24h' },
    { key: 'sponsor_notified_at', label: 'Notificación al sponsor',        value: ae.sponsor_notified_at, deadline: '24h (SAE)' },
    { key: 'ethics_notified_at',  label: 'Notificación al Comité de Ética', value: ae.ethics_notified_at, deadline: '24h (SAE)' },
  ]

  return (
    <div style={{ background: '#F8F7F4', borderTop: '0.5px solid #E8E6DE', padding: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>

        {/* datos del evento */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, color: '#9C9A92', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
            Datos del evento
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Relación con tratamiento', value: RELATION_LABELS[ae.relation_to_treatment] },
              { label: 'Fecha de detección', value: formatDate(ae.detection_date) },
              { label: 'Reportado por', value: (ae.reporter as any)?.full_name ?? '—' },
              { label: 'Registrado', value: formatDateTime(ae.created_at) },
            ].map(f => (
              <div key={f.label}>
                <div style={{ fontSize: 10, color: '#9C9A92', marginBottom: 2 }}>{f.label}</div>
                <div style={{ fontSize: 12, color: '#3D3D3A' }}>{f.value}</div>
              </div>
            ))}
            {ae.actions_taken && (
              <div>
                <div style={{ fontSize: 10, color: '#9C9A92', marginBottom: 2 }}>Acciones tomadas</div>
                <div style={{ fontSize: 12, color: '#3D3D3A', lineHeight: 1.4 }}>{ae.actions_taken}</div>
              </div>
            )}
          </div>
        </div>

        {/* timeline notificaciones */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, color: '#9C9A92', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
            Timeline regulatorio {isSAE && <span style={{ color: '#A32D2D' }}>— obligatorio SAE</span>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {notifications.map(n => (
              <div key={n.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  background: n.value ? '#E1F5EE' : (isSAE ? '#FCEBEB' : '#F1EFE8'),
                  border: `1.5px solid ${n.value ? '#1D9E75' : (isSAE ? '#F7C1C1' : '#E8E6DE')}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12,
                }}>
                  <i className={`ti ${n.value ? 'ti-check' : 'ti-clock'}`}
                    style={{ color: n.value ? '#0F6E56' : (isSAE ? '#A32D2D' : '#B4B2A9') }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#3D3D3A' }}>{n.label}</div>
                  <div style={{ fontSize: 11, color: '#9C9A92' }}>
                    {n.value ? formatDateTime(n.value) : (isSAE ? `Pendiente — plazo ${n.deadline}` : 'No requerido')}
                  </div>
                </div>
                {!n.value && canEdit && (isSAE || n.key === 'pi_notified_at') && (
                  <button
                    onClick={() => markNotification(n.key as any)}
                    disabled={saving}
                    style={{ fontSize: 11, padding: '3px 8px', background: '#E6F1FB', color: '#0C447C', border: '0.5px solid #B5D4F4', borderRadius: 6, cursor: 'pointer', fontWeight: 500, flexShrink: 0 }}
                  >
                    Marcar enviada
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* actions */}
      {canEdit && ae.status !== 'CLOSED' && (
        <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: '0.5px solid #E8E6DE' }}>
          {ae.status === 'REPORTED' && (
            <button onClick={setFollowUp} disabled={saving} style={{ background: '#FAEEDA', color: '#633806', border: '0.5px solid #FAC775', padding: '5px 12px', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
              <i className="ti ti-activity" style={{ fontSize: 13 }} />
              Pasar a seguimiento
            </button>
          )}
          <button onClick={closeEvent} disabled={saving} style={{ background: '#E1F5EE', color: '#085041', border: '0.5px solid #9FE1CB', padding: '5px 12px', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
            <i className="ti ti-circle-check" style={{ fontSize: 13 }} />
            Marcar como cerrado
          </button>
        </div>
      )}
    </div>
  )
}

// ── MAIN TAB ─────────────────────────────────────────────────
export default function TabAdverseEvents({ projectId }: { projectId: string }) {
  const { user } = useAuth()
  const [events, setEvents]     = useState<AdverseEvent[]>([])
  const [loading, setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const canCreate = ['ADMIN','PM_CRIO','COORDINATOR','INVESTIGATOR'].includes(user?.role ?? '')

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('adverse_events')
      .select('*, reporter:users(full_name)')
      .eq('project_id', projectId)
      .order('detection_date', { ascending: false })

    if (filterType)   q = q.eq('event_type', filterType)
    if (filterStatus) q = q.eq('status', filterStatus)

    const { data } = await q
    setEvents((data ?? []) as AdverseEvent[])
    setLoading(false)
  }, [projectId, filterType, filterStatus])

  useEffect(() => { load() }, [load])

  // stats
  const total   = events.length
  const saes    = events.filter(e => e.event_type === 'SAE').length
  const open    = events.filter(e => e.status !== 'CLOSED').length
  const grade34 = events.filter(e => ['GRADE_3','GRADE_4'].includes(e.grade)).length

  const selStyle: React.CSSProperties = {
    padding: '5px 10px', border: '0.5px solid #D3D1C7', borderRadius: 8,
    fontSize: 12, background: '#fff', color: '#3D3D3A', cursor: 'pointer',
  }

  return (
    <div>
      {/* ── Metrics ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
        {[
          { label: 'Total registrados', value: total,   color: '#3D3D3A' },
          { label: 'SAE graves',        value: saes,    color: saes > 0 ? '#A32D2D' : '#3D3D3A' },
          { label: 'Sin cerrar',        value: open,    color: open > 0 ? '#854F0B' : '#3D3D3A' },
          { label: 'Grado ≥ 3',         value: grade34, color: grade34 > 0 ? '#791F1F' : '#3D3D3A' },
        ].map(m => (
          <div key={m.label} style={{ background: '#fff', border: '0.5px solid #E8E6DE', borderRadius: 9, padding: '11px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#9C9A92', marginBottom: 5 }}>{m.label}</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* ── Header bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} style={selStyle}>
            <option value="">EA y SAE</option>
            <option value="AE">Solo EA</option>
            <option value="SAE">Solo SAE</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selStyle}>
            <option value="">Todos los estados</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          {(filterType || filterStatus) && (
            <button onClick={() => { setFilterType(''); setFilterStatus('') }} style={{ background: '#E6F1FB', color: '#0C447C', border: 'none', padding: '5px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>
              <i className="ti ti-x" style={{ fontSize: 11 }} /> Limpiar
            </button>
          )}
        </div>
        {canCreate && (
          <button onClick={() => setShowModal(true)} style={{ background: '#A32D2D', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-plus" style={{ fontSize: 14 }} />
            Registrar evento
          </button>
        )}
      </div>

      {/* ── List ── */}
      <div style={{ background: '#fff', border: '0.5px solid #E8E6DE', borderRadius: 10, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', fontSize: 13, color: '#9C9A92' }}>Cargando eventos...</div>
        ) : events.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <i className="ti ti-mood-happy" style={{ fontSize: 28, color: '#D3D1C7', display: 'block', marginBottom: 10 }} />
            <div style={{ fontSize: 14, color: '#9C9A92', marginBottom: 4 }}>
              {filterType || filterStatus ? 'Sin eventos con los filtros aplicados' : 'Sin efectos adversos registrados'}
            </div>
            {!filterType && !filterStatus && (
              <div style={{ fontSize: 12, color: '#B4B2A9' }}>Los EA y SAE aparecerán aquí cuando sean reportados</div>
            )}
          </div>
        ) : events.map((ae, i) => {
          const isSAE     = ae.event_type === 'SAE'
          const isExpanded = expandedId === ae.id
          const gs = GRADE_STYLE[ae.grade]    ?? { bg: '#F1EFE8', color: '#444441' }
          const ss = STATUS_STYLE[ae.status]  ?? { bg: '#F1EFE8', color: '#444441' }

          // SAE sin notificaciones completas
          const missingSAENotif = isSAE && (!ae.pi_notified_at || !ae.sponsor_notified_at || !ae.ethics_notified_at)

          return (
            <div key={ae.id} style={{ borderBottom: i < events.length - 1 ? '0.5px solid #E8E6DE' : 'none' }}>
              <div
                style={{ padding: '13px 16px', cursor: 'pointer' }}
                onClick={() => setExpandedId(isExpanded ? null : ae.id)}
                onMouseEnter={e => { if (!isExpanded) (e.currentTarget as HTMLElement).style.background = '#F8F7F4' }}
                onMouseLeave={e => { if (!isExpanded) (e.currentTarget as HTMLElement).style.background = '' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>

                  {/* type icon */}
                  <div style={{
                    width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                    background: isSAE ? '#FCEBEB' : '#FAEEDA',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 17,
                  }}>
                    <i className={`ti ${isSAE ? 'ti-alert-circle' : 'ti-activity'}`}
                      style={{ color: isSAE ? '#A32D2D' : '#633806' }} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: isSAE ? '#A32D2D' : '#633806', background: isSAE ? '#FCEBEB' : '#FAEEDA', padding: '2px 8px', borderRadius: 20 }}>
                        {ae.event_type}
                      </span>
                      <span style={{ ...gs, fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500 }}>
                        {ae.grade.replace('GRADE_', 'Grado ')}
                      </span>
                      <span style={{ ...ss, fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500 }}>
                        {STATUS_LABELS[ae.status]}
                      </span>
                      <span style={{ fontSize: 11, color: '#9C9A92' }}>
                        {ae.patient_id} · {formatDate(ae.detection_date)}
                      </span>
                      {missingSAENotif && (
                        <span style={{ fontSize: 11, background: '#FCEBEB', color: '#A32D2D', padding: '2px 8px', borderRadius: 20, fontWeight: 500 }}>
                          <i className="ti ti-bell-x" style={{ fontSize: 11, marginRight: 3 }} />
                          Notificaciones pendientes
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: '#3D3D3A', lineHeight: 1.4 }}>{ae.description}</div>
                  </div>

                  <i className={`ti ti-chevron-${isExpanded ? 'up' : 'down'}`}
                    style={{ fontSize: 16, color: '#9C9A92', flexShrink: 0, marginTop: 4 }} />
                </div>
              </div>

              {isExpanded && <AEDetail ae={ae} onUpdate={load} />}
            </div>
          )
        })}
      </div>

      {/* ── Modal ── */}
      {showModal && (
        <AEModal
          projectId={projectId}
          onClose={() => setShowModal(false)}
          onSaved={load}
        />
      )}
    </div>
  )
}
