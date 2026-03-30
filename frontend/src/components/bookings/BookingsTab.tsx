import { useEffect, useState } from 'react'
import { Trip, Booking } from '../../types'
import { bookingsApi } from '../../services/api'
import toast from 'react-hot-toast'
import { Plus, Trash2, Edit2, X, ExternalLink } from 'lucide-react'

interface Props { trip: Trip }

const TYPES = [
  { value: 'unterkunft', label: 'Unterkunft', icon: '🏨' },
  { value: 'flug', label: 'Flug', icon: '✈️' },
  { value: 'mietwagen', label: 'Mietwagen', icon: '🚗' },
  { value: 'sonstiges', label: 'Sonstige Reservierung', icon: '📋' },
]

export default function BookingsTab({ trip }: Props) {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const emptyForm = { title: '', booking_type: 'unterkunft', date: '', price: '', currency: 'EUR', notes: '', link: '' }
  const [form, setForm] = useState({ ...emptyForm })

  useEffect(() => { load() }, [trip.id])
  async function load() {
    const res = await bookingsApi.list(trip.id)
    setBookings(res.data)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = { ...form, price: form.price ? parseFloat(form.price) : null, date: form.date || null }
    try {
      if (editId) { await bookingsApi.update(trip.id, editId, payload); toast.success('Buchung aktualisiert') }
      else { await bookingsApi.create(trip.id, payload); toast.success('Buchung hinzugefügt') }
      setShowForm(false); setEditId(null); setForm({ ...emptyForm }); load()
    } catch { toast.error('Fehler beim Speichern') }
  }

  async function deleteBkg(id: number) {
    if (!confirm('Buchung löschen?')) return
    await bookingsApi.delete(trip.id, id); toast.success('Buchung gelöscht'); load()
  }

  function startEdit(b: Booking) {
    setForm({ title: b.title, booking_type: b.booking_type, date: b.date || '', price: b.price != null ? String(b.price) : '', currency: b.currency, notes: b.notes, link: b.link })
    setEditId(b.id); setShowForm(true)
  }

  const typeInfo = (type: string) => TYPES.find(t => t.value === type) || TYPES[3]

  return (
    <div style={s.page}>
      <div style={s.inner}>
        <div style={s.header}>
          <h2 style={s.title}>Buchungen</h2>
          <button style={s.addBtn} onClick={() => { setShowForm(true); setEditId(null); setForm({ ...emptyForm }) }}>
            <Plus size={15} /> Buchung hinzufügen
          </button>
        </div>

        {bookings.length === 0 ? (
          <div style={s.empty}>
            <span style={{ fontSize: '3rem' }}>📋</span>
            <h3 style={s.emptyTitle}>Noch keine Buchungen</h3>
            <p style={s.emptyText}>Füge Unterkünfte, Flüge und andere Reservierungen hinzu.</p>
          </div>
        ) : (
          <div style={s.grid}>
            {bookings.map(b => {
              const ti = typeInfo(b.booking_type)
              return (
                <div key={b.id} style={s.card}>
                  <div style={s.cardTop}>
                    <span style={s.typeIcon}>{ti.icon}</span>
                    <span style={s.typeBadge}>{ti.label}</span>
                    <div style={s.cardActions}>
                      <button style={s.iconBtn} onClick={() => startEdit(b)}><Edit2 size={13} /></button>
                      <button style={s.iconBtn} onClick={() => deleteBkg(b.id)}><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <h3 style={s.cardTitle}>{b.title}</h3>
                  {b.date && <p style={s.cardMeta}>📅 {new Date(b.date + 'T12:00:00').toLocaleDateString('de-DE')}</p>}
                  {b.price != null && <p style={s.cardPrice}>{b.price.toFixed(2)} {b.currency}</p>}
                  {b.notes && <p style={s.cardNotes}>{b.notes}</p>}
                  {b.link && (
                    <a href={b.link} target="_blank" rel="noreferrer" style={s.link}>
                      <ExternalLink size={12} /> Buchungslink öffnen
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showForm && (
        <div style={s.overlay} onClick={() => setShowForm(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>{editId ? 'Buchung bearbeiten' : 'Neue Buchung'}</h3>
              <button style={s.closeBtn} onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} style={s.form}>
              <div style={s.field}><label style={s.label}>Titel *</label><input style={s.input} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="z.B. Hotel Adlon" required /></div>
              <div style={s.field}><label style={s.label}>Typ</label>
                <select style={s.input} value={form.booking_type} onChange={e => setForm(f => ({ ...f, booking_type: e.target.value }))}>
                  {TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                </select>
              </div>
              <div style={s.row}>
                <div style={s.field}><label style={s.label}>Datum</label><input style={s.input} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
                <div style={s.field}><label style={s.label}>Preis</label><input style={s.input} type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" /></div>
                <div style={s.field}><label style={s.label}>Währung</label>
                  <select style={s.input} value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                    {['EUR','USD','GBP','CHF'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div style={s.field}><label style={s.label}>Buchungslink</label><input style={s.input} type="url" value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))} placeholder="https://…" /></div>
              <div style={s.field}><label style={s.label}>Notiz</label><textarea style={{ ...s.input, minHeight: 70, resize: 'vertical' }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optionale Notiz…" /></div>
              <div style={s.modalActions}>
                <button type="button" style={s.cancelBtn} onClick={() => setShowForm(false)}>Abbrechen</button>
                <button type="submit" style={s.submitBtn}>{editId ? 'Speichern' : 'Hinzufügen'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { padding: '2rem', overflowY: 'auto', height: 'calc(100vh - 96px)' },
  inner: { maxWidth: 1000, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  title: { fontSize: '1.4rem', fontWeight: 700, color: '#fff' },
  addBtn: { display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#7c6ff7', border: 'none', borderRadius: 8, color: '#fff', padding: '0.55rem 1rem', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' },
  empty: { textAlign: 'center', padding: '4rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' },
  emptyTitle: { fontSize: '1.2rem', fontWeight: 600, color: '#c5c5d8' },
  emptyText: { color: '#6b6b80', fontSize: '0.9rem' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' },
  card: { background: '#14141e', border: '1px solid #1e1e2e', borderRadius: 12, padding: '1.25rem' },
  cardTop: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' },
  typeIcon: { fontSize: '1.25rem' },
  typeBadge: { background: '#1e1e2e', color: '#9191a8', padding: '2px 8px', borderRadius: 20, fontSize: '0.75rem' },
  cardActions: { display: 'flex', gap: '4px', marginLeft: 'auto' },
  iconBtn: { background: 'transparent', border: 'none', cursor: 'pointer', color: '#4a4a60', padding: '4px', display: 'flex', borderRadius: 4 },
  cardTitle: { fontSize: '1rem', fontWeight: 600, color: '#fff', marginBottom: '0.4rem' },
  cardMeta: { fontSize: '0.82rem', color: '#9191a8', marginBottom: '0.25rem' },
  cardPrice: { fontSize: '1.1rem', fontWeight: 700, color: '#7c6ff7', marginBottom: '0.25rem' },
  cardNotes: { fontSize: '0.82rem', color: '#6b6b80', fontStyle: 'italic', marginBottom: '0.5rem' },
  link: { display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: '#5dade2', textDecoration: 'none' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' },
  modal: { background: '#14141e', border: '1px solid #2e2e42', borderRadius: 14, padding: '1.5rem', width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' },
  modalTitle: { fontSize: '1.1rem', fontWeight: 700, color: '#fff' },
  closeBtn: { background: 'transparent', border: 'none', color: '#6b6b80', cursor: 'pointer', display: 'flex' },
  form: { display: 'flex', flexDirection: 'column', gap: '0.85rem' },
  row: { display: 'flex', gap: '0.75rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 },
  label: { fontSize: '0.78rem', fontWeight: 500, color: '#9191a8' },
  input: { padding: '0.6rem 0.75rem', background: '#0f0f1a', border: '1px solid #2e2e42', borderRadius: 8, color: '#fff', fontSize: '0.875rem', outline: 'none', width: '100%', fontFamily: 'inherit' },
  modalActions: { display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' },
  cancelBtn: { padding: '0.55rem 1.1rem', background: 'transparent', border: '1px solid #2e2e42', borderRadius: 8, color: '#9191a8', cursor: 'pointer', fontSize: '0.875rem' },
  submitBtn: { padding: '0.55rem 1.25rem', background: '#7c6ff7', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 },
}
