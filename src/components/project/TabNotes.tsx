// src/components/project/TabNotes.tsx
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/index'

interface Note {
  id: string
  content: string
  created_at: string
  author: { full_name: string; role: string } | null
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador', PM_CRIO: 'PM / Gestor CRO',
  INVESTIGATOR: 'Investigador', COORDINATOR: 'Coordinadora',
}

const AVATAR_COLORS = ['#0A2E5C','#00A88A','#633806','#6A1B9A','#854F0B','#791F1F']

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

export default function TabNotes({ projectId }: { projectId: string }) {
  const { user } = useAuth()
  const [notes, setNotes]     = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)

  // Solo ADMIN, PM_CRIO e INVESTIGATOR pueden ver notas
  const canView  = ['ADMIN','PM_CRIO','INVESTIGATOR'].includes(user?.role ?? '')
  const canWrite = ['ADMIN','PM_CRIO','INVESTIGATOR'].includes(user?.role ?? '')

  const load = useCallback(async () => {
    if (!canView) return
    setLoading(true)
    const { data } = await supabase
      .from('project_notes')
      .select('*, author:users(full_name, role)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
    setNotes((data ?? []) as Note[])
    setLoading(false)
  }, [projectId, canView])

  useEffect(() => { load() }, [load])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    setSaving(true)
    setError(null)
    const { error: err } = await supabase.from('project_notes').insert({
      project_id: projectId,
      author_id:  user?.id,
      content:    content.trim(),
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setContent('')
    load()
  }

  // Si el rol no tiene acceso, mostrar mensaje
  if (!canView) {
    return (
      <div style={{ background: '#fff', border: '0.5px solid #E8E6DE', borderRadius: 10, padding: 48, textAlign: 'center' }}>
        <i className="ti ti-lock" style={{ fontSize: 28, color: '#D3D1C7', display: 'block', marginBottom: 10 }} />
        <div style={{ fontSize: 14, fontWeight: 500, color: '#9C9A92', marginBottom: 4 }}>Acceso restringido</div>
        <div style={{ fontSize: 12, color: '#B4B2A9' }}>Las notas internas son visibles solo para Administradores e Investigadores.</div>
      </div>
    )
  }

  return (
    <div>
      {/* aviso de privacidad */}
      <div style={{ background: '#E0F7FA', border: '0.5px solid #80DEEA', borderRadius: 9, padding: '9px 13px', fontSize: 12, color: '#007A99', marginBottom: 14, display: 'flex', gap: 8 }}>
        <i className="ti ti-lock" style={{ fontSize: 14, flexShrink: 0 }} />
        <div>Estas notas son <strong>visibles solo para Administradores, PM/CRIO e Investigadores.</strong> No son accesibles para coordinadoras, monitores externos ni sponsors.</div>
      </div>

      {/* form nueva nota */}
      {canWrite && (
        <div style={{ background: '#fff', border: '0.5px solid #E8E6DE', borderRadius: 10, padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#73726C', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-pencil" style={{ color: '#0A2E5C', fontSize: 14 }} />
            Nueva nota interna
          </div>
          <form onSubmit={handleSubmit}>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Agrega una nota interna — acuerdos, observaciones confidenciales, seguimiento con el sponsor, etc."
              style={{
                width: '100%', padding: '9px 11px',
                border: '0.5px solid #D3D1C7', borderRadius: 8,
                fontSize: 13, background: '#F8F7F4', color: '#3D3D3A',
                fontFamily: 'inherit', outline: 'none',
                resize: 'vertical', minHeight: 80,
              }}
              onFocus={e => (e.target.style.borderColor = '#378ADD')}
              onBlur={e => (e.target.style.borderColor = '#D3D1C7')}
            />
            {error && (
              <div style={{ fontSize: 12, color: '#791F1F', background: '#FCEBEB', border: '0.5px solid #F7C1C1', borderRadius: 7, padding: '7px 10px', margin: '8px 0' }}>
                <i className="ti ti-alert-circle" style={{ fontSize: 13, marginRight: 5 }} />{error}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <button
                type="submit"
                disabled={saving || !content.trim()}
                style={{
                  background: saving || !content.trim() ? '#9C9A92' : '#0A2E5C',
                  color: '#fff', border: 'none', padding: '7px 16px',
                  borderRadius: 8, fontSize: 13, fontWeight: 500,
                  cursor: saving || !content.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <i className="ti ti-send" style={{ fontSize: 13 }} />
                {saving ? 'Guardando...' : 'Guardar nota'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* lista de notas */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', fontSize: 13, color: '#9C9A92' }}>Cargando notas...</div>
        ) : notes.length === 0 ? (
          <div style={{ background: '#fff', border: '0.5px solid #E8E6DE', borderRadius: 10, padding: 48, textAlign: 'center' }}>
            <i className="ti ti-notes-off" style={{ fontSize: 28, color: '#D3D1C7', display: 'block', marginBottom: 10 }} />
            <div style={{ fontSize: 14, color: '#9C9A92' }}>Sin notas internas aún</div>
            <div style={{ fontSize: 12, color: '#B4B2A9', marginTop: 4 }}>Las notas que agregues aparecerán aquí</div>
          </div>
        ) : notes.map((note, i) => {
          const authorName = (note.author as any)?.full_name ?? 'Usuario'
          const authorRole = (note.author as any)?.role ?? ''
          const color = AVATAR_COLORS[i % AVATAR_COLORS.length]

          return (
            <div key={note.id} style={{
              background: '#fff', border: '0.5px solid #E8E6DE',
              borderRadius: 10, padding: 16,
              borderLeft: `3px solid ${color}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: color, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 600, flexShrink: 0,
                }}>
                  {initials(authorName)}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#3D3D3A' }}>{authorName}</div>
                  <div style={{ fontSize: 11, color: '#9C9A92' }}>
                    {ROLE_LABELS[authorRole] ?? authorRole} · {formatDateTime(note.created_at)}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: '#3D3D3A', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {note.content}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
