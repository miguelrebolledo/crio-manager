// src/pages/AdverseEventsPage.tsx
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/index'
import Layout from '../components/layout/Layout'

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
  project_id: string
  reporter: { full_name: string } | null
  project: { codigo_proyecto: string; titulo: string } | null
}

const GRADE_LABELS: Record<string, string> = {
  GRADE_1: 'Grado 1 — Leve',
  GRADE_2: 'Grado 2 — Moderado',
  GRADE_3: 'Grado 3 — Grave',
  GRADE_4: 'Grado 4 — Riesgo vital',
  GRADE_5: 'Grado 5 — Muerte', 
}
const STATUS_LABELS: Record<string, string> = {
  REPORTED: 'Reportado', FOLLOW_UP: 'En seguimiento', CLOSED: 'Cerrado',
}
const RELATION_LABELS: Record<string, string> = {
  DEFINITELY_RELATED: 'Definitivamente relacionado',
  PROBABLY_RELATED:   'Probablemente relacionado',
  POSSIBLY_RELATED:   'Posiblemente relacionado',
  NOT_RELATED:        'No relacionado',
  NOT_EVALUABLE:      'No evaluable',
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
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ── Expanded detail ───────────────────────────────────────────
function AEDetail({ ae, onUpdate }: { ae: AdverseEvent; onUpdate: () => void }) {
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)
  const canEdit = ['ADMIN','PM_CRIO','COORDINATOR','INVESTIGATOR'].includes(user?.role ?? '')
  const isSAE = ae.event_type === 'SAE'

  const markNotification = async (field: string) => {
    setSaving(true)
    await supabase.from('adverse_events').update({ [field]: new Date().toISOString() }).eq('id', ae.id)
    setSaving(false)
    onUpdate()
  }

  const updateStatus = async (status: string) => {
    if (status === 'CLOSED' && !confirm('¿Marcar este evento como cerrado?')) return
    setSaving(true)
    const payload: any = { status }
    if (status === 'CLOSED') payload.closed_at = new Date().toISOString()
    await supabase.from('adverse_events').update(payload).eq('id', ae.id)
    setSaving(false)
    onUpdate()
  }

  const notifications = [
    { key: 'pi_notified_at',      label: 'PI notificado',             value: ae.pi_notified_at      },
    { key: 'sponsor_notified_at', label: 'Sponsor notificado',        value: ae.sponsor_notified_at  },
    { key: 'ethics_notified_at',  label: 'Comité Ética notificado',   value: ae.ethics_notified_at   },
  ]

  return (
    <div style={{ background: '#F8F7F4', borderTop: '0.5px solid #E8E6DE', padding: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 12 }}>

        {/* datos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: '#9C9A92', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Datos del evento</div>
          {[
            { label: 'Relación con tratamiento', value: RELATION_LABELS[ae.relation_to_treatment] },
            { label: 'Fecha detección', value: formatDate(ae.detection_date) },
            { label: 'Reportado por', value: (ae.reporter as any)?.full_name ?? '—' },
            { label: 'Registrado', value: formatDateTime(ae.created_at) },
          ].map(f => (
            <div key={f.label}>
              <div style={{ fontSize: 10, color: '#9C9A92', marginBottom: 1 }}>{f.label}</div>
              <div style={{ fontSize: 12, color: '#3D3D3A' }}>{f.value}</div>
            </div>
          ))}
          {ae.actions_taken && (
            <div>
              <div style={{ fontSize: 10, color: '#9C9A92', marginBottom: 1 }}>Acciones tomadas</div>
              <div style={{ fontSize: 12, color: '#3D3D3A', lineHeight: 1.4 }}>{ae.actions_taken}</div>
            </div>
          )}
        </div>

        {/* notificaciones */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, color: '#9C9A92', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
            Timeline regulatorio {isSAE && <span style={{ color: '#A32D2D' }}>— SAE</span>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {notifications.map(n => (
              <div key={n.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  background: n.value ? '#E1F5EE' : (isSAE ? '#FCEBEB' : '#F1EFE8'),
                  border: `1.5px solid ${n.value ? '#1D9E75' : (isSAE ? '#F7C1C1' : '#E8E6DE')}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
                }}>
                  <i className={`ti ${n.value ? 'ti-check' : 'ti-clock'}`}
                    style={{ color: n.value ? '#0F6E56' : (isSAE ? '#A32D2D' : '#B4B2A9') }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#3D3D3A' }}>{n.label}</div>
                  <div style={{ fontSize: 11, color: '#9C9A92' }}>
                    {n.value ? formatDateTime(n.value) : (isSAE ? 'Pendiente' : '—')}
                  </div>
                </div>
                {!n.value && canEdit && (isSAE || n.key === 'pi_notified_at') && (
                  <button onClick={() => markNotification(n.key)} disabled={saving}
                    style={{ fontSize: 11, padding: '3px 8px', background: '#E6F1FB', color: '#0C447C', border: '0.5px solid #B5D4F4', borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}>
                    Marcar
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* actions */}
      {canEdit && ae.status !== 'CLOSED' && (
        <div style={{ display: 'flex', gap: 8, paddingTop: 10, borderTop: '0.5px solid #E8E6DE' }}>
          {ae.status === 'REPORTED' && (
            <button onClick={() => updateStatus('FOLLOW_UP')} disabled={saving}
              style={{ background: '#FAEEDA', color: '#633806', border: '0.5px solid #FAC775', padding: '5px 12px', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
              <i className="ti ti-activity" style={{ fontSize: 13 }} /> Pasar a seguimiento
            </button>
          )}
          <button onClick={() => updateStatus('CLOSED')} disabled={saving}
            style={{ background: '#E1F5EE', color: '#085041', border: '0.5px solid #9FE1CB', padding: '5px 12px', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
            <i className="ti ti-circle-check" style={{ fontSize: 13 }} /> Marcar cerrado
          </button>
        </div>
      )}
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────
export default function AdverseEventsPage() {
  const navigate = useNavigate()
  const { user }  = useAuth()
  const [events, setEvents]   = useState<AdverseEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterType,   setFilterType]   = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterGrade,  setFilterGrade]  = useState('')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('adverse_events')
      .select('*, reporter:users(full_name), project:projects(codigo_proyecto, titulo)')
      .order('detection_date', { ascending: false })

    if (filterType)   q = q.eq('event_type', filterType)
    if (filterStatus) q = q.eq('status', filterStatus)
    if (filterGrade)  q = q.eq('grade', filterGrade)

    const { data } = await q
    let rows = (data ?? []) as AdverseEvent[]

    if (search) {
      const s = search.toLowerCase()
      rows = rows.filter(e =>
        e.description.toLowerCase().includes(s) ||
        e.patient_id.toLowerCase().includes(s) ||
        (e.project as any)?.codigo_proyecto?.toLowerCase().includes(s)
      )
    }

    setEvents(rows)
    setLoading(false)
  }, [filterType, filterStatus, filterGrade, search])

  useEffect(() => { load() }, [load])

  // stats
  const total   = events.length
  const saes    = events.filter(e => e.event_type === 'SAE').length
  const open    = events.filter(e => e.status !== 'CLOSED').length
  const grade34 = events.filter(e => ['GRADE_3','GRADE_4'].includes(e.grade)).length
  const pendingNotif = events.filter(e =>
    e.event_type === 'SAE' && (!e.pi_notified_at || !e.sponsor_notified_at || !e.ethics_notified_at)
  ).length

  const hasFilters = filterType || filterStatus || filterGrade || search

  const selStyle: React.CSSProperties = {
    padding: '6px 10px', border: '0.5px solid #D3D1C7', borderRadius: 8,
    fontSize: 13, background: '#fff', color: '#3D3D3A', cursor: 'pointer',
  }

  return (
    <Layout>
      <div style={{ padding: '24px 28px' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <h1 style={{ fontSize: 17, fontWeight: 500, color: '#3D3D3A', margin: 0 }}>Efectos adversos</h1>
            <div style={{ fontSize: 12, color: '#9C9A92', marginTop: 3 }}>
              {loading ? 'Cargando...' : `${events.length} evento${events.length !== 1 ? 's' : ''} — todos los proyectos`}
            </div>
          </div>
        </div>

        {/* ── Metrics ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Total registrados',     value: total,        color: '#3D3D3A' },
            { label: 'SAE graves',            value: saes,         color: saes > 0 ? '#A32D2D' : '#3D3D3A' },
            { label: 'Sin cerrar',            value: open,         color: open > 0 ? '#854F0B' : '#3D3D3A' },
            { label: 'Grado ≥ 3',             value: grade34,      color: grade34 > 0 ? '#791F1F' : '#3D3D3A' },
            { label: 'Notificaciones SAE pend.', value: pendingNotif, color: pendingNotif > 0 ? '#A32D2D' : '#0F6E56' },
          ].map(m => (
            <div key={m.label} style={{ background: '#fff', border: '0.5px solid #E8E6DE', borderRadius: 9, padding: '12px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: '#9C9A92', marginBottom: 5 }}>{m.label}</div>
              <div style={{ fontSize: 22, fontWeight: 600, color: m.color }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* ── SAE pending alert ── */}
        {pendingNotif > 0 && (
          <div style={{ background: '#FCEBEB', border: '0.5px solid #F7C1C1', borderRadius: 9, padding: '10px 14px', fontSize: 12, color: '#791F1F', marginBottom: 14, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <i className="ti ti-alert-circle" style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }} />
            <div>
              <strong>{pendingNotif} SAE con notificaciones pendientes.</strong> Según ICH E6(R2) deben notificarse al PI, sponsor y Comité de Ética dentro de las 24 horas de detección.
            </div>
          </div>
        )}

        {/* ── Filters ── */}
        <div style={{ background: '#fff', border: '0.5px solid #E8E6DE', borderRadius: 10, padding: '11px 14px', marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 160 }}>
            <i className="ti ti-search" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#9C9A92', fontSize: 14, pointerEvents: 'none' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Descripción, paciente o código..."
              style={{ ...selStyle, paddingLeft: 30, width: '100%' }} />
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} style={selStyle}>
            <option value="">EA y SAE</option>
            <option value="AE">Solo EA</option>
            <option value="SAE">Solo SAE</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selStyle}>
            <option value="">Todos los estados</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)} style={selStyle}>
            <option value="">Todos los grados</option>
            {Object.entries(GRADE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {hasFilters && (
            <button onClick={() => { setFilterType(''); setFilterStatus(''); setFilterGrade(''); setSearch('') }}
              style={{ background: '#E6F1FB', color: '#0C447C', border: 'none', padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <i className="ti ti-x" style={{ fontSize: 12 }} /> Limpiar
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
              <div style={{ fontSize: 14, color: '#9C9A92' }}>
                {hasFilters ? 'Sin eventos con los filtros aplicados' : 'Sin efectos adversos registrados en ningún proyecto'}
              </div>
            </div>
          ) : events.map((ae, i) => {
            const isSAE      = ae.event_type === 'SAE'
            const isExpanded = expandedId === ae.id
            const gs = GRADE_STYLE[ae.grade]   ?? { bg: '#F1EFE8', color: '#444441' }
            const ss = STATUS_STYLE[ae.status] ?? { bg: '#F1EFE8', color: '#444441' }
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

                    {/* icon */}
                    <div style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, background: isSAE ? '#FCEBEB' : '#FAEEDA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>
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
                        {/* proyecto — clickeable */}
                        <span
                          onClick={e => { e.stopPropagation(); navigate(`/proyectos/${ae.project_id}`) }}
                          style={{ fontSize: 11, color: '#185FA5', fontWeight: 500, cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          {(ae.project as any)?.codigo_proyecto}
                        </span>
                        <span style={{ fontSize: 11, color: '#9C9A92' }}>
                          {ae.patient_id} · {formatDate(ae.detection_date)}
                        </span>
                        {missingSAENotif && (
                          <span style={{ fontSize: 11, background: '#FCEBEB', color: '#A32D2D', padding: '2px 8px', borderRadius: 20, fontWeight: 500 }}>
                            <i className="ti ti-bell-x" style={{ fontSize: 11, marginRight: 3 }} />
                            Notif. pendientes
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 13, color: '#3D3D3A', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ae.description}
                      </div>
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
      </div>
    </Layout>
  )
}
