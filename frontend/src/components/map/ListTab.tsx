import { useState } from 'react'
import { Trip, Place } from '../../types'
import { placesApi } from '../../services/api'
import toast from 'react-hot-toast'
import { MapPin, Trash2, Edit2, Check, X } from 'lucide-react'

interface Props { trip: Trip; onTripUpdate: (t: Trip) => void }

export default function ListTab({ trip, onTripUpdate }: Props) {
  const [places, setPlaces] = useState<Place[]>([])
  const [loaded, setLoaded] = useState(false)
  const [editingPlace, setEditingPlace] = useState<number | null>(null)
  const [editNotes, setEditNotes] = useState('')

  if (!loaded) {
    placesApi.list(trip.id).then(r => { setPlaces(r.data); setLoaded(true) }).catch(() => {})
  }

  async function deletePlace(id: number) {
    await placesApi.delete(trip.id, id)
    setPlaces(prev => prev.filter(p => p.id !== id))
    toast.success('Ort entfernt')
  }

  async function saveNotes(place: Place) {
    await placesApi.update(trip.id, place.id, { notes: editNotes })
    setPlaces(prev => prev.map(p => p.id === place.id ? { ...p, notes: editNotes } : p))
    setEditingPlace(null)
    toast.success('Notiz gespeichert')
  }

  const catIcon: Record<string, string> = { sehenswürdigkeit: '🏛️', restaurant: '🍽️', unterkunft: '🏨', transport: '🚉', natur: '🌿', einkaufen: '🛍️', sonstiges: '📍' }

  return (
    <div style={s.page}>
      <div style={s.inner}>
        <h2 style={s.title}>Alle Orte nach Tag</h2>
        {(trip.days || []).map(day => {
          const dp = places.filter(p => p.day_id === day.id).sort((a, b) => a.order_index - b.order_index)
          return (
            <div key={day.id} style={s.daySection}>
              <div style={s.dayHeader}>
                <div style={s.dayBadge}>{day.day_number}</div>
                <div>
                  <span style={s.dayLabel}>{day.label}</span>
                  <span style={s.dayDate}> · {new Date(day.date + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' })}</span>
                </div>
              </div>
              {dp.length === 0 ? (
                <div style={s.empty}>Keine Orte geplant</div>
              ) : (
                <div style={s.placeList}>
                  {dp.map((place, idx) => (
                    <div key={place.id} style={s.placeCard}>
                      <div style={s.placeNum}>{idx + 1}</div>
                      <span style={s.placeIconEl}>{catIcon[place.category] || '📍'}</span>
                      <div style={s.placeInfo}>
                        <div style={s.placeName}>{place.name}</div>
                        {place.address && <div style={s.placeAddr}><MapPin size={11} /> {place.address.split(',').slice(0, 2).join(',')}</div>}
                        {editingPlace === place.id ? (
                          <div style={s.notesRow}>
                            <input style={s.notesInput} value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Notiz…" autoFocus />
                            <button style={s.saveBtn} onClick={() => saveNotes(place)}><Check size={13} /></button>
                            <button style={s.cancelBtn} onClick={() => setEditingPlace(null)}><X size={13} /></button>
                          </div>
                        ) : (
                          place.notes ? <div style={s.placeNotes}>{place.notes}</div> : null
                        )}
                      </div>
                      <div style={s.placeActions}>
                        {editingPlace !== place.id && (
                          <button style={s.actionBtn} onClick={() => { setEditingPlace(place.id); setEditNotes(place.notes) }}><Edit2 size={13} /></button>
                        )}
                        <button style={s.actionBtn} onClick={() => deletePlace(place.id)}><Trash2 size={13} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { padding: '2rem', overflowY: 'auto', height: 'calc(100vh - 96px)' },
  inner: { maxWidth: 800, margin: '0 auto' },
  title: { fontSize: '1.4rem', fontWeight: 700, color: '#fff', marginBottom: '1.5rem' },
  daySection: { marginBottom: '2rem' },
  dayHeader: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' },
  dayBadge: { width: 32, height: 32, borderRadius: 8, background: '#2a2050', color: '#7c6ff7', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', flexShrink: 0 },
  dayLabel: { fontWeight: 700, color: '#fff', fontSize: '1rem' },
  dayDate: { color: '#6b6b80', fontSize: '0.85rem' },
  empty: { color: '#4a4a60', fontSize: '0.85rem', fontStyle: 'italic', padding: '0.5rem 0 0.5rem 3.25rem' },
  placeList: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  placeCard: { display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#14141e', border: '1px solid #1e1e2e', borderRadius: 10, padding: '0.75rem 1rem' },
  placeNum: { width: 22, height: 22, borderRadius: '50%', background: '#1e1e2e', color: '#9191a8', fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  placeIconEl: { fontSize: '1.25rem', flexShrink: 0 },
  placeInfo: { flex: 1, minWidth: 0 },
  placeName: { fontWeight: 600, color: '#e2e2e8', fontSize: '0.9rem' },
  placeAddr: { display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: '#6b6b80', marginTop: 2 },
  placeNotes: { fontSize: '0.8rem', color: '#9191a8', marginTop: 4, fontStyle: 'italic' },
  notesRow: { display: 'flex', gap: '0.4rem', marginTop: '0.4rem' },
  notesInput: { flex: 1, padding: '4px 8px', background: '#0f0f1a', border: '1px solid #2e2e42', borderRadius: 6, color: '#fff', fontSize: '0.82rem', outline: 'none' },
  saveBtn: { background: '#7c6ff7', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', padding: '4px 8px', display: 'flex' },
  cancelBtn: { background: '#1e1e2e', border: '1px solid #2e2e42', borderRadius: 6, color: '#9191a8', cursor: 'pointer', padding: '4px 8px', display: 'flex' },
  placeActions: { display: 'flex', gap: '0.4rem', flexShrink: 0 },
  actionBtn: { background: 'transparent', border: 'none', cursor: 'pointer', color: '#4a4a60', padding: '4px', display: 'flex', borderRadius: 6 },
}
