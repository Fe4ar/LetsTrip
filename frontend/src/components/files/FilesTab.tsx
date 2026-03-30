import { useEffect, useState, useRef } from 'react'
import { Trip, FileAsset } from '../../types'
import { filesApi } from '../../services/api'
import toast from 'react-hot-toast'
import { Upload, Trash2, FileText, Image, File } from 'lucide-react'

interface Props { trip: Trip }

export default function FilesTab({ trip }: Props) {
  const [files, setFiles] = useState<FileAsset[]>([])
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { load() }, [trip.id])
  async function load() {
    const res = await filesApi.list(trip.id)
    setFiles(res.data)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await filesApi.upload(trip.id, file)
      toast.success(`${file.name} hochgeladen`)
      load()
    } catch { toast.error('Fehler beim Hochladen') }
    finally { setUploading(false); if (inputRef.current) inputRef.current.value = '' }
  }

  async function deleteFile(id: number) {
    if (!confirm('Datei löschen?')) return
    await filesApi.delete(trip.id, id)
    toast.success('Datei gelöscht'); load()
  }

  function fileIcon(mime: string) {
    if (mime.startsWith('image/')) return <Image size={24} color="#5dade2" />
    if (mime === 'application/pdf') return <FileText size={24} color="#e74c3c" />
    return <File size={24} color="#9191a8" />
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  return (
    <div style={s.page}>
      <div style={s.inner}>
        <div style={s.header}>
          <h2 style={s.title}>Dateien</h2>
          <label style={s.uploadBtn}>
            {uploading ? 'Wird hochgeladen…' : <><Upload size={15} /> Datei hochladen</>}
            <input ref={inputRef} type="file" style={{ display: 'none' }} onChange={handleUpload} accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx,.txt" />
          </label>
        </div>

        {files.length === 0 ? (
          <div style={s.empty}>
            <div style={s.dropZone} onClick={() => inputRef.current?.click()}>
              <Upload size={40} color="#3a3a50" />
              <h3 style={s.emptyTitle}>Noch keine Dateien</h3>
              <p style={s.emptyText}>Klicke hier oder nutze den Button oben, um Dateien hochzuladen.</p>
              <p style={s.emptyHint}>PDFs, Bilder, Dokumente — max. 50 MB</p>
            </div>
          </div>
        ) : (
          <div style={s.fileGrid}>
            {files.map(f => (
              <div key={f.id} style={s.fileCard}>
                <div style={s.fileIcon}>{fileIcon(f.mime_type)}</div>
                <div style={s.fileInfo}>
                  <div style={s.fileName}>{f.original_name}</div>
                  <div style={s.fileMeta}>{formatSize(f.size)} · {new Date(f.created_at).toLocaleDateString('de-DE')}</div>
                </div>
                <div style={s.fileActions}>
                  {f.url && (
                    <a href={f.url} target="_blank" rel="noreferrer" style={s.viewBtn}>Öffnen</a>
                  )}
                  <button style={s.deleteBtn} onClick={() => deleteFile(f.id)}><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { padding: '2rem', overflowY: 'auto', height: 'calc(100vh - 96px)' },
  inner: { maxWidth: 800, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  title: { fontSize: '1.4rem', fontWeight: 700, color: '#fff' },
  uploadBtn: { display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#7c6ff7', border: 'none', borderRadius: 8, color: '#fff', padding: '0.55rem 1rem', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' },
  empty: { display: 'flex', justifyContent: 'center' },
  dropZone: { border: '2px dashed #2e2e42', borderRadius: 16, padding: '4rem 3rem', textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', maxWidth: 480, width: '100%' },
  emptyTitle: { fontSize: '1.1rem', fontWeight: 600, color: '#c5c5d8' },
  emptyText: { color: '#6b6b80', fontSize: '0.9rem' },
  emptyHint: { color: '#4a4a60', fontSize: '0.8rem' },
  fileGrid: { display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  fileCard: { display: 'flex', alignItems: 'center', gap: '1rem', background: '#14141e', border: '1px solid #1e1e2e', borderRadius: 10, padding: '0.875rem 1rem' },
  fileIcon: { flexShrink: 0 },
  fileInfo: { flex: 1, minWidth: 0 },
  fileName: { fontWeight: 500, color: '#e2e2e8', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  fileMeta: { fontSize: '0.78rem', color: '#6b6b80', marginTop: 2 },
  fileActions: { display: 'flex', gap: '0.5rem', flexShrink: 0 },
  viewBtn: { padding: '5px 12px', background: '#1e1e2e', border: '1px solid #2e2e42', borderRadius: 6, color: '#9191a8', fontSize: '0.8rem', textDecoration: 'none', cursor: 'pointer' },
  deleteBtn: { background: 'transparent', border: '1px solid #2e2e42', borderRadius: 6, color: '#4a4a60', cursor: 'pointer', padding: '5px', display: 'flex', alignItems: 'center' },
}
