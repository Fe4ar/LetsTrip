import { useState } from 'react'
import { tripsApi } from '../../services/api'
import { Trip } from '../../types'
import toast from 'react-hot-toast'
import { X } from 'lucide-react'

interface Props { onClose: () => void; onCreated: (t: Trip) => void }

export default function CreateTripModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !startDate || !endDate) { toast.error('Bitte alle Pflichtfelder ausfüllen'); return }
    if (endDate < startDate) { toast.error('Enddatum muss nach Startdatum liegen'); return }
    setLoading(true)
    try {
      const res = await tripsApi.create({ name, description, start_date: startDate, end_date: endDate })
      toast.success('Reise erstellt!')
      onCreated(res.data)
      onClose()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Fehler beim Erstellen')
    } finally { setLoading(false) }
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.header}>
          <h2 style={s.title}>Neue Reise erstellen</h2>
          <button style={s.closeBtn} onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.field}>
            <label style={s.label}>Reisename *</label>
            <input style={s.input} value={name} onChange={e => setName(e.target.value)} placeholder="z.B. Europareise 2025" required />
          </div>
          <div style={s.field}>
            <label style={s.label}>Beschreibung</label>
            <textarea style={{ ...s.input, minHeight: 80, resize: 'vertical' }} value={description} onChange={e => setDescription(e.target.value)} placeholder="Optionale Beschreibung" />
          </div>
          <div style={s.row}>
            <div style={s.field}>
              <label style={s.label}>Startdatum *</label>
              <input style={s.input} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
            </div>
            <div style={s.field}>
              <label style={s.label}>Enddatum *</label>
              <input style={s.input} type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required />
            </div>
          </div>
          {startDate && endDate && endDate >= startDate && (
            <div style={s.hint}>
              📅 {Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1} Reisetage werden automatisch angelegt
            </div>
          )}
          <div style={s.actions}>
            <button type="button" style={s.cancelBtn} onClick={onClose}>Abbrechen</button>
            <button type="submit" style={s.submitBtn} disabled={loading}>{loading ? 'Erstelle…' : 'Reise erstellen'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' },
  modal: { background: '#14141e', border: '1px solid #2e2e42', borderRadius: 14, padding: '1.75rem', width: '100%', maxWidth: 500 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  title: { fontSize: '1.2rem', fontWeight: 700, color: '#fff' },
  closeBtn: { background: 'transparent', border: 'none', color: '#6b6b80', cursor: 'pointer', padding: 4, display: 'flex' },
  form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 },
  label: { fontSize: '0.82rem', fontWeight: 500, color: '#9191a8' },
  input: { padding: '0.65rem 0.85rem', background: '#0f0f1a', border: '1px solid #2e2e42', borderRadius: 8, color: '#fff', fontSize: '0.9rem', outline: 'none', width: '100%', fontFamily: 'inherit' },
  row: { display: 'flex', gap: '0.75rem' },
  hint: { background: '#1a1a2e', border: '1px solid #2e2e42', borderRadius: 8, padding: '0.6rem 0.85rem', fontSize: '0.82rem', color: '#7c6ff7' },
  actions: { display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' },
  cancelBtn: { padding: '0.6rem 1.2rem', background: 'transparent', border: '1px solid #2e2e42', borderRadius: 8, color: '#9191a8', cursor: 'pointer', fontSize: '0.9rem' },
  submitBtn: { padding: '0.6rem 1.4rem', background: '#7c6ff7', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 },
}
