// src/components/project/TabDocuments.tsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/index'

// ── Types ────────────────────────────────────────────────────
interface Document {
  id: string
  name: string
  doc_type: string
  storage_path: string
  file_size_bytes: number | null
  mime_type: string | null
  visible_to_sponsor: boolean
  created_at: string
  uploader: { full_name: string } | null
}

// ── Label maps ───────────────────────────────────────────────
const DOC_TYPE_LABELS: Record<string, string> = {
  PROTOCOL:              'Protocolo',
  INVESTIGATORS_BROCHURE:'Manual del investigador',
  ETHICS_APPROVAL:       'Aprobación ética',
  INFORMED_CONSENT:      'Consentimiento informado',
  CRF:                   'CRF',
  SAFETY_REPORT:         'Informe de seguridad',
  MONITORING_REPORT:     'Informe de monitoreo',
  CONTRACT:              'Contrato',
  OTHER:                 'Otro',
}

// ── File helpers ─────────────────────────────────────────────
function formatBytes(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function fileIcon(mimeType: string | null): { icon: string; bg: string; color: string } {
  if (!mimeType) return { icon: 'ti-file',               bg: '#F1EFE8', color: '#444441' }
  if (mimeType.includes('pdf'))        return { icon: 'ti-file-type-pdf',   bg: '#FCEBEB', color: '#791F1F' }
  if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType.includes('csv'))
    return { icon: 'ti-file-spreadsheet', bg: '#E0F2F1', color: '#005246' }
  if (mimeType.includes('word') || mimeType.includes('document'))
    return { icon: 'ti-file-type-docx',  bg: '#E0F7FA', color: '#007A99' }
  if (mimeType.includes('image'))
    return { icon: 'ti-photo',           bg: '#F3E5F5', color: '#6A1B9A' }
  if (mimeType.includes('zip') || mimeType.includes('rar'))
    return { icon: 'ti-file-zip',        bg: '#FAEEDA', color: '#633806' }
  return { icon: 'ti-file',             bg: '#F1EFE8', color: '#444441' }
}

// ── Upload modal ─────────────────────────────────────────────
function UploadModal({
  projectId,
  onClose,
  onUploaded,
}: {
  projectId: string
  onClose: () => void
  onUploaded: () => void
}) {
  const { user } = useAuth()
  const fileRef  = useRef<HTMLInputElement>(null)
  const [file, setFile]           = useState<File | null>(null)
  const [docType, setDocType]     = useState('OTHER')
  const [visibleToSponsor, setVisibleToSponsor] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress]   = useState(0)
  const [error, setError]         = useState<string | null>(null)
  const [dragOver, setDragOver]   = useState(false)

  const handleFile = (f: File) => {
    if (f.size > 50 * 1024 * 1024) {
      setError('El archivo supera el límite de 50 MB.')
      return
    }
    setFile(f)
    setError(null)
    // auto-detectar tipo por nombre
    const name = f.name.toLowerCase()
    if (name.includes('protocol'))    setDocType('PROTOCOL')
    else if (name.includes('consent')) setDocType('INFORMED_CONSENT')
    else if (name.includes('crf'))     setDocType('CRF')
    else if (name.includes('cec') || name.includes('ethic') || name.includes('etica')) setDocType('ETHICS_APPROVAL')
    else if (name.includes('informe') || name.includes('report')) setDocType('SAFETY_REPORT')
    else if (name.includes('contrat') || name.includes('contract')) setDocType('CONTRACT')
    else if (name.includes('manual') || name.includes('brochure')) setDocType('INVESTIGATORS_BROCHURE')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleUpload = async () => {
    if (!file || !user) return
    setUploading(true)
    setError(null)
    setProgress(10)

    try {
      const ext      = file.name.split('.').pop()
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path     = `${projectId}/${Date.now()}_${safeName}`

      setProgress(30)

      // 1. Subir a Supabase Storage
      const { error: storageErr } = await supabase.storage
        .from('documents')
        .upload(path, file, { contentType: file.type, upsert: false })

      if (storageErr) throw storageErr
      setProgress(70)

      // 2. Registrar metadata en tabla documents
      const { error: dbErr } = await supabase
        .from('documents')
        .insert({
          project_id:          projectId,
          name:                file.name,
          doc_type:            docType,
          storage_path:        path,
          file_size_bytes:     file.size,
          mime_type:           file.type || `application/${ext}`,
          visible_to_sponsor:  visibleToSponsor,
          uploaded_by:         user.id,
        })

      if (dbErr) throw dbErr
      setProgress(100)

      setTimeout(() => { onUploaded(); onClose() }, 300)
    } catch (err: any) {
      setError(err.message ?? 'Error al subir el archivo.')
      setUploading(false)
      setProgress(0)
    }
  }

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
    zIndex: 200, display: 'flex', alignItems: 'center',
    justifyContent: 'center', padding: 16,
  }
  const inp: React.CSSProperties = {
    width: '100%', padding: '7px 10px', border: '0.5px solid #D3D1C7',
    borderRadius: 8, fontSize: 13, background: '#F8F7F4',
    color: '#3D3D3A', fontFamily: 'inherit', outline: 'none',
  }

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 480, boxShadow: '0 8px 32px rgba(0,0,0,0.16)' }}>

        {/* head */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '0.5px solid #E8E6DE' }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: '#3D3D3A' }}>
            <i className="ti ti-upload" style={{ color: '#0A2E5C', marginRight: 8, fontSize: 15, verticalAlign: -2 }} />
            Subir documento
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9C9A92', fontSize: 18 }}>
            <i className="ti ti-x" />
          </button>
        </div>

        <div style={{ padding: 20 }}>

          {/* drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `1.5px dashed ${dragOver ? '#0A2E5C' : file ? '#00A88A' : '#D3D1C7'}`,
              borderRadius: 10, padding: '24px 16px', textAlign: 'center',
              cursor: 'pointer', marginBottom: 16, transition: 'all .15s',
              background: dragOver ? '#EBF4FF' : file ? '#F0FAF5' : '#F8F7F4',
            }}
          >
            <input ref={fileRef} type="file" style={{ display: 'none' }}
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

            {file ? (
              <div>
                <i className="ti ti-circle-check" style={{ fontSize: 28, color: '#00A88A', display: 'block', marginBottom: 6 }} />
                <div style={{ fontSize: 13, fontWeight: 500, color: '#3D3D3A' }}>{file.name}</div>
                <div style={{ fontSize: 11, color: '#9C9A92', marginTop: 3 }}>{formatBytes(file.size)}</div>
                <button
                  onClick={e => { e.stopPropagation(); setFile(null) }}
                  style={{ marginTop: 8, background: 'none', border: 'none', fontSize: 11, color: '#9C9A92', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Cambiar archivo
                </button>
              </div>
            ) : (
              <div>
                <i className="ti ti-cloud-upload" style={{ fontSize: 28, color: '#B4B2A9', display: 'block', marginBottom: 8 }} />
                <div style={{ fontSize: 13, fontWeight: 500, color: '#3D3D3A', marginBottom: 3 }}>
                  Arrastra un archivo aquí o haz clic para seleccionar
                </div>
                <div style={{ fontSize: 11, color: '#9C9A92' }}>PDF, Word, Excel, imágenes — máx. 50 MB</div>
              </div>
            )}
          </div>

          {/* tipo de documento */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: '#9C9A92', fontWeight: 500, display: 'block', marginBottom: 4 }}>
              Tipo de documento
            </label>
            <select style={inp} value={docType} onChange={e => setDocType(e.target.value)}>
              {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* visible para sponsor */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', background: '#F8F7F4',
            border: '0.5px solid #E8E6DE', borderRadius: 8, marginBottom: 14,
            cursor: 'pointer',
          }}
            onClick={() => setVisibleToSponsor(v => !v)}
          >
            <div style={{
              width: 18, height: 18, borderRadius: 4,
              border: `1.5px solid ${visibleToSponsor ? '#0A2E5C' : '#D3D1C7'}`,
              background: visibleToSponsor ? '#0A2E5C' : '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'all .1s',
            }}>
              {visibleToSponsor && <i className="ti ti-check" style={{ fontSize: 11, color: '#fff' }} />}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#3D3D3A' }}>Visible para el sponsor</div>
              <div style={{ fontSize: 11, color: '#9C9A92', marginTop: 1 }}>
                El sponsor podrá ver y descargar este documento en su portal
              </div>
            </div>
          </div>

          {/* progress bar */}
          {uploading && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9C9A92', marginBottom: 4 }}>
                <span>Subiendo archivo...</span>
                <span>{progress}%</span>
              </div>
              <div style={{ height: 6, background: '#E8E6DE', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: '#0A2E5C', borderRadius: 3, transition: 'width .3s' }} />
              </div>
            </div>
          )}

          {error && (
            <div style={{ background: '#FCEBEB', border: '0.5px solid #F7C1C1', borderRadius: 8, padding: '9px 12px', fontSize: 12, color: '#791F1F', marginBottom: 12 }}>
              <i className="ti ti-alert-circle" style={{ fontSize: 13, verticalAlign: -1, marginRight: 5 }} />
              {error}
            </div>
          )}
        </div>

        {/* footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 20px', borderTop: '0.5px solid #E8E6DE' }}>
          <button onClick={onClose} disabled={uploading} style={{ background: 'transparent', border: '0.5px solid #D3D1C7', color: '#73726C', padding: '7px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={handleUpload} disabled={!file || uploading} style={{
            background: !file || uploading ? '#9C9A92' : '#0A2E5C',
            color: '#fff', border: 'none', padding: '7px 18px', borderRadius: 8,
            fontSize: 13, fontWeight: 500,
            cursor: !file || uploading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <i className="ti ti-upload" style={{ fontSize: 13 }} />
            {uploading ? 'Subiendo...' : 'Subir documento'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── MAIN TAB ─────────────────────────────────────────────────
export default function TabDocuments({ projectId }: { projectId: string }) {
  const { user } = useAuth()
  const [docs, setDocs]         = useState<Document[]>([])
  const [loading, setLoading]   = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [filterType, setFilterType] = useState('')
  const [downloading, setDownloading] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const canUpload = ['ADMIN','PM_CRIO','INVESTIGATOR','COORDINATOR'].includes(user?.role ?? '')
  const canDelete = ['ADMIN','PM_CRIO'].includes(user?.role ?? '')

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('documents')
      .select('*, uploader:users(full_name)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (filterType) q = q.eq('doc_type', filterType)

    const { data } = await q
    setDocs((data ?? []) as Document[])
    setLoading(false)
  }, [projectId, filterType])

  useEffect(() => { load() }, [load])

  const handleDownload = async (doc: Document) => {
    setDownloading(doc.id)
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.storage_path, 3600)

      if (error) throw error

      // abrir en nueva pestaña
      window.open(data.signedUrl, '_blank')
    } catch {
      alert('Error al generar el enlace de descarga. Intenta de nuevo.')
    } finally {
      setDownloading(null)
    }
  }

  const handleDelete = async (doc: Document) => {
    if (!confirm(`¿Eliminar "${doc.name}"? Esta acción no se puede deshacer.`)) return
    setDeleteId(doc.id)
    try {
      // 1. Eliminar de Storage
      await supabase.storage.from('documents').remove([doc.storage_path])
      // 2. Eliminar registro de la tabla
      await supabase.from('documents').delete().eq('id', doc.id)
      load()
    } catch {
      alert('Error al eliminar el documento.')
    } finally {
      setDeleteId(null)
    }
  }

  const toggleSponsorVisibility = async (doc: Document) => {
    await supabase
      .from('documents')
      .update({ visible_to_sponsor: !doc.visible_to_sponsor })
      .eq('id', doc.id)
    load()
  }

  // agrupar por tipo
  const grouped = docs.reduce((acc, d) => {
    const key = d.doc_type
    if (!acc[key]) acc[key] = []
    acc[key].push(d)
    return acc
  }, {} as Record<string, Document[]>)

  const selStyle: React.CSSProperties = {
    padding: '5px 10px', border: '0.5px solid #D3D1C7', borderRadius: 8,
    fontSize: 12, background: '#fff', color: '#3D3D3A', cursor: 'pointer',
  }

  return (
    <div>
      {/* ── Header bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} style={selStyle}>
            <option value="">Todos los tipos</option>
            {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          {filterType && (
            <button onClick={() => setFilterType('')} style={{ background: '#E0F7FA', color: '#007A99', border: 'none', padding: '5px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>
              <i className="ti ti-x" style={{ fontSize: 11 }} /> Limpiar
            </button>
          )}
        </div>
        {canUpload && (
          <button
            onClick={() => setShowUpload(true)}
            style={{ background: '#0A2E5C', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <i className="ti ti-upload" style={{ fontSize: 14 }} />
            Subir documento
          </button>
        )}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div style={{ padding: 32, textAlign: 'center', fontSize: 13, color: '#9C9A92' }}>
          Cargando documentos...
        </div>
      ) : docs.length === 0 ? (
        <div style={{ background: '#fff', border: '0.5px solid #E8E6DE', borderRadius: 10, padding: 48, textAlign: 'center' }}>
          <i className="ti ti-files-off" style={{ fontSize: 28, color: '#D3D1C7', display: 'block', marginBottom: 10 }} />
          <div style={{ fontSize: 14, color: '#9C9A92', marginBottom: 6 }}>
            {filterType ? 'Sin documentos de este tipo' : 'Sin documentos adjuntos'}
          </div>
          {canUpload && !filterType && (
            <button onClick={() => setShowUpload(true)} style={{ background: '#0A2E5C', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 13, cursor: 'pointer', marginTop: 4 }}>
              Subir el primer documento
            </button>
          )}
        </div>
      ) : filterType ? (
        // Vista plana cuando hay filtro
        <div style={{ background: '#fff', border: '0.5px solid #E8E6DE', borderRadius: 10, overflow: 'hidden' }}>
          {docs.map((doc, i) => <DocRow key={doc.id} doc={doc} index={i} total={docs.length} onDownload={handleDownload} onDelete={handleDelete} onToggleSponsor={toggleSponsorVisibility} downloading={downloading} deleting={deleteId} canDelete={canDelete} canUpload={canUpload} />)}
        </div>
      ) : (
        // Vista agrupada por tipo
        Object.entries(grouped).map(([type, typeDocs]) => (
          <div key={type} style={{ background: '#fff', border: '0.5px solid #E8E6DE', borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}>
            <div style={{ padding: '10px 16px', borderBottom: '0.5px solid #E8E6DE', fontSize: 12, fontWeight: 500, color: '#73726C', display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="ti ti-folder" style={{ color: '#0A2E5C', fontSize: 14 }} />
              {DOC_TYPE_LABELS[type] ?? type}
              <span style={{ marginLeft: 4, background: '#F1EFE8', color: '#9C9A92', fontSize: 11, padding: '1px 7px', borderRadius: 20 }}>
                {typeDocs.length}
              </span>
            </div>
            {typeDocs.map((doc, i) => (
              <DocRow key={doc.id} doc={doc} index={i} total={typeDocs.length}
                onDownload={handleDownload} onDelete={handleDelete}
                onToggleSponsor={toggleSponsorVisibility}
                downloading={downloading} deleting={deleteId}
                canDelete={canDelete} canUpload={canUpload} />
            ))}
          </div>
        ))
      )}

      {/* ── Sponsor note ── */}
      {docs.length > 0 && (
        <div style={{ marginTop: 10, background: '#F8F7F4', border: '0.5px solid #E8E6DE', borderRadius: 9, padding: '10px 14px', fontSize: 12, color: '#73726C', display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-eye" style={{ fontSize: 13, color: '#0A2E5C', flexShrink: 0 }} />
          <span>
            <strong>{docs.filter(d => d.visible_to_sponsor).length}</strong> de {docs.length} documentos son visibles para el sponsor.
            Usa el ícono <i className="ti ti-eye" style={{ fontSize: 12 }} /> para cambiar la visibilidad.
          </span>
        </div>
      )}

      {/* ── Upload modal ── */}
      {showUpload && (
        <UploadModal
          projectId={projectId}
          onClose={() => setShowUpload(false)}
          onUploaded={load}
        />
      )}
    </div>
  )
}

// ── DocRow component ─────────────────────────────────────────
function DocRow({
  doc, index, total,
  onDownload, onDelete, onToggleSponsor,
  downloading, deleting, canDelete, canUpload,
}: {
  doc: Document
  index: number
  total: number
  onDownload: (d: Document) => void
  onDelete: (d: Document) => void
  onToggleSponsor: (d: Document) => void
  downloading: string | null
  deleting: string | null
  canDelete: boolean
  canUpload: boolean
}) {
  const { icon, bg, color } = fileIcon(doc.mime_type)
  const isDownloading = downloading === doc.id
  const isDeleting    = deleting === doc.id

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '11px 16px',
      borderBottom: index < total - 1 ? '0.5px solid #E8E6DE' : 'none',
    }}
      onMouseEnter={e => (e.currentTarget.style.background = '#F8F7F4')}
      onMouseLeave={e => (e.currentTarget.style.background = '')}
    >
      {/* file icon */}
      <div style={{ width: 32, height: 32, borderRadius: 7, background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>
        <i className={`ti ${icon}`} />
      </div>

      {/* info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#3D3D3A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {doc.name}
        </div>
        <div style={{ fontSize: 11, color: '#9C9A92', marginTop: 2 }}>
          {formatDate(doc.created_at)}
          {doc.file_size_bytes && ` · ${formatBytes(doc.file_size_bytes)}`}
          {doc.uploader && ` · ${(doc.uploader as any).full_name}`}
        </div>
      </div>

      {/* sponsor visibility */}
{canUpload && (
  <button
    onClick={() => onToggleSponsor(doc)}
    title={doc.visible_to_sponsor ? 'Visible para sponsor' : 'Oculto para sponsor'}
    style={{
      background: doc.visible_to_sponsor ? '#E0F7FA' : 'transparent',
      border: `0.5px solid ${doc.visible_to_sponsor ? '#80DEEA' : '#E8E6DE'}`,
      borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
      color: doc.visible_to_sponsor ? '#007A99' : '#B4B2A9',
      fontSize: 11, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4,
    }}
  >
    <i className={`ti ${doc.visible_to_sponsor ? 'ti-eye' : 'ti-eye-off'}`} style={{ fontSize: 13 }} />
    {doc.visible_to_sponsor ? 'Sponsor: sí' : 'Sponsor: no'}
  </button>
)}

{/* download */}
<button
  onClick={() => onDownload(doc)}
  disabled={isDownloading}
  title="Descargar"
  style={{
    padding: '4px 10px', border: '0.5px solid #E8E6DE', borderRadius: 6,
    background: 'transparent', cursor: isDownloading ? 'wait' : 'pointer',
    color: '#0A2E5C', fontSize: 11, fontWeight: 500,
    display: 'flex', alignItems: 'center', gap: 4,
  }}
>
  <i className="ti ti-download" style={{ fontSize: 13 }} />
  {isDownloading ? 'Descargando...' : 'Descargar'}
</button>

{/* delete */}
{canDelete && (
  <button
    onClick={() => onDelete(doc)}
    disabled={isDeleting}
    title="Eliminar"
    style={{
      padding: '4px 10px', border: '0.5px solid #FCEBEB', borderRadius: 6,
      background: 'transparent', cursor: isDeleting ? 'wait' : 'pointer',
      color: '#A32D2D', fontSize: 11, fontWeight: 500,
      display: 'flex', alignItems: 'center', gap: 4,
    }}
  >
    <i className="ti ti-trash" style={{ fontSize: 13 }} />
    {isDeleting ? 'Eliminando...' : 'Eliminar'}
  </button>
)}
    </div>
  )
}
