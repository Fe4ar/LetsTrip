import { useEffect, useState, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Trip, TripDay, Place, RouteData } from '../../types'
import { placesApi, tripsApi } from '../../services/api'
import toast from 'react-hot-toast'
import { Search, Plus, MapPin, Trash2, Navigation, ChevronDown, ChevronUp, GripVertical, X, Edit2, Check } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({ iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png', iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png', shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png' })

interface Props { trip: Trip; onTripUpdate: (t: Trip) => void }

function MapController({ center }: { center: [number, number] | null }) {
  const map = useMap()
  useEffect(() => { if (center) map.setView(center, 12, { animate: true }) }, [center])
  return null
}

export default function MapTab({ trip, onTripUpdate }: Props) {
  const [days, setDays] = useState<TripDay[]>(trip.days || [])
  const [places, setPlaces] = useState<Place[]>([])
  const [selectedDay, setSelectedDay] = useState<TripDay | null>(null)
  const [routeData, setRouteData] = useState<RouteData | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null)
  const [editingDayId, setEditingDayId] = useState<number | null>(null)
  const [editNotes, setEditNotes] = useState('')
  const [collapsedDays, setCollapsedDays] = useState<Set<number>>(new Set())

  useEffect(() => { loadPlaces() }, [trip.id])
  useEffect(() => { if (selectedDay) loadRoute(selectedDay.id) }, [selectedDay, places])

  async function loadPlaces() {
    try {
      const res = await placesApi.list(trip.id)
      const all: Place[] = res.data
      setPlaces(all)
      setDays(prev => prev.map(d => ({ ...d, places: all.filter(p => p.day_id === d.id).sort((a, b) => a.order_index - b.order_index) })))
    } catch { toast.error('Orte konnten nicht geladen werden') }
  }

  async function loadRoute(dayId: number) {
    try {
      const res = await placesApi.getRoute(trip.id, dayId)
      setRouteData(res.data)
    } catch { setRouteData(null) }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const res = await placesApi.geocode(searchQuery)
      setSearchResults(res.data)
    } catch { toast.error('Suche fehlgeschlagen') }
    finally { setSearching(false) }
  }

  async function addPlace(result: any) {
    if (!selectedDay) { toast.error('Bitte zuerst einen Tag auswählen'); return }
    const existingPlaces = places.filter(p => p.day_id === selectedDay.id)
    try {
      const res = await placesApi.create(trip.id, {
        name: result.name.split(',')[0].trim(),
        address: result.name,
        lat: result.lat, lon: result.lon,
        day_id: selectedDay.id,
        order_index: existingPlaces.length,
        category: 'sehenswürdigkeit'
      })
      const newPlace: Place = res.data
      setPlaces(prev => [...prev, newPlace])
      setMapCenter([result.lat, result.lon])
      setSearchResults([])
      setSearchQuery('')
      toast.success(`${newPlace.name} zu ${selectedDay.label} hinzugefügt`)
    } catch { toast.error('Fehler beim Hinzufügen') }
  }

  async function deletePlace(placeId: number) {
    try {
      await placesApi.delete(trip.id, placeId)
      setPlaces(prev => prev.filter(p => p.id !== placeId))
      toast.success('Ort entfernt')
    } catch { toast.error('Fehler beim Löschen') }
  }

  async function saveNotes(day: TripDay) {
    try {
      await tripsApi.updateDay(trip.id, day.id, { notes: editNotes })
      setDays(prev => prev.map(d => d.id === day.id ? { ...d, notes: editNotes } : d))
      setEditingDayId(null)
      toast.success('Notiz gespeichert')
    } catch { toast.error('Fehler beim Speichern') }
  }

  const dayPlaces = useCallback((dayId: number) => places.filter(p => p.day_id === dayId).sort((a, b) => a.order_index - b.order_index), [places])

  const allGeoPlaces = places.filter(p => p.lat && p.lon)
  const routePositions: [number, number][] = routeData?.geometry?.coordinates?.map((c: [number, number]) => [c[1], c[0]]) || []

  const defaultCenter: [number, number] = allGeoPlaces.length > 0
    ? [allGeoPlaces[0].lat!, allGeoPlaces[0].lon!]
    : [48.1351, 11.5820]

  const categoryIcon = (cat: string) => {
    const icons: Record<string, string> = { sehenswürdigkeit: '🏛️', restaurant: '🍽️', unterkunft: '🏨', transport: '🚉', natur: '🌿', einkaufen: '🛍️', sonstiges: '📍' }
    return icons[cat] || '📍'
  }

  return (
    <div style={s.container}>
      {/* Left Sidebar - Days */}
      <aside style={s.leftSidebar}>
        <div style={s.sidebarHeader}>
          <h3 style={s.sidebarTitle}>Reisetage</h3>
          <span style={s.dayCount}>{days.length} Tage</span>
        </div>
        <div style={s.dayList}>
          {days.map(day => {
            const dp = dayPlaces(day.id)
            const isCollapsed = collapsedDays.has(day.id)
            const isSelected = selectedDay?.id === day.id
            return (
              <div key={day.id} style={{ ...s.dayCard, ...(isSelected ? s.dayCardActive : {}) }}>
                <div style={s.dayHeader} onClick={() => {
                  setSelectedDay(isSelected ? null : day)
                  setCollapsedDays(prev => { const n = new Set(prev); isCollapsed ? n.delete(day.id) : n; return n })
                }}>
                  <div style={s.dayHeaderLeft}>
                    <div style={s.dayBadge}>{day.day_number}</div>
                    <div>
                      <div style={s.dayLabel}>{day.label}</div>
                      <div style={s.dayDate}>{new Date(day.date + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}</div>
                    </div>
                  </div>
                  <div style={s.dayHeaderRight}>
                    <span style={s.placeCountBadge}>{dp.length}</span>
                    <button style={s.collapseBtn} onClick={e => { e.stopPropagation(); setCollapsedDays(prev => { const n = new Set(prev); n.has(day.id) ? n.delete(day.id) : n.add(day.id); return n }) }}>
                      {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    </button>
                  </div>
                </div>
                {!isCollapsed && (
                  <div style={s.dayBody}>
                    {dp.length === 0 ? (
                      <p style={s.noPlaces}>Keine Orte geplant</p>
                    ) : (
                      dp.map((place, idx) => (
                        <div key={place.id} style={s.placeItem}>
                          <div style={s.placeOrder}>{idx + 1}</div>
                          <div style={s.placeIcon}>{categoryIcon(place.category)}</div>
                          <div style={s.placeInfo} onClick={() => place.lat && setMapCenter([place.lat, place.lon])}>
                            <div style={s.placeName}>{place.name}</div>
                            {place.notes && <div style={s.placeNotes}>{place.notes}</div>}
                          </div>
                          <button style={s.deletePlaceBtn} onClick={() => deletePlace(place.id)}><Trash2 size={12} /></button>
                        </div>
                      ))
                    )}
                    {editingDayId === day.id ? (
                      <div style={s.notesEditor}>
                        <textarea style={s.notesInput} value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Notizen für diesen Tag…" rows={3} />
                        <div style={s.notesActions}>
                          <button style={s.saveBtn} onClick={() => saveNotes(day)}><Check size={13} /> Speichern</button>
                          <button style={s.cancelNoteBtn} onClick={() => setEditingDayId(null)}><X size={13} /></button>
                        </div>
                      </div>
                    ) : (
                      <button style={s.editNotesBtn} onClick={() => { setEditingDayId(day.id); setEditNotes(day.notes) }}>
                        <Edit2 size={12} /> {day.notes ? 'Notiz bearbeiten' : 'Notiz hinzufügen'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </aside>

      {/* Map */}
      <div style={s.mapContainer}>
        <MapContainer center={defaultCenter} zoom={5} style={{ height: '100%', width: '100%', background: '#1a1a2a' }} zoomControl={true}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          <MapController center={mapCenter} />
          {allGeoPlaces.map(place => (
            <Marker key={place.id} position={[place.lat!, place.lon!]}>
              <Popup>
                <div style={{ color: '#000', minWidth: 140 }}>
                  <strong>{place.name}</strong><br />
                  <small style={{ color: '#555' }}>{place.address}</small><br />
                  {place.notes && <em style={{ color: '#666' }}>{place.notes}</em>}
                </div>
              </Popup>
            </Marker>
          ))}
          {routePositions.length > 1 && (
            <Polyline positions={routePositions} color="#7c6ff7" weight={4} opacity={0.8} />
          )}
        </MapContainer>

        {/* Route info overlay */}
        {routeData && routeData.total_distance > 0 && (
          <div style={s.routeOverlay}>
            <Navigation size={14} color="#7c6ff7" />
            <span style={s.routeInfo}>
              <strong>{(routeData.total_distance / 1000).toFixed(1)} km</strong>
              <span style={s.routeSep}>·</span>
              <strong>{formatDuration(routeData.total_duration)}</strong>
              <span style={s.routeSep}>·</span>
              <span style={s.routeLabel}>Fahrt</span>
            </span>
            {routeData.segments.map((seg, i) => (
              <span key={i} style={s.routeSeg}>
                {(seg.distance_m / 1000).toFixed(1)}km · {formatDuration(seg.duration_s)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Right Sidebar - Search */}
      <aside style={s.rightSidebar}>
        <div style={s.sidebarHeader}>
          <h3 style={s.sidebarTitle}>Ort suchen</h3>
        </div>
        {!selectedDay && (
          <div style={s.hint}>
            <MapPin size={16} color="#7c6ff7" />
            <span>Wähle zuerst einen Tag aus, dann suche einen Ort</span>
          </div>
        )}
        {selectedDay && (
          <div style={s.selectedDayTag}>
            <MapPin size={12} color="#7c6ff7" />
            Wird hinzugefügt zu: <strong>{selectedDay.label}</strong>
            <button style={s.clearDay} onClick={() => setSelectedDay(null)}><X size={12} /></button>
          </div>
        )}
        <form onSubmit={handleSearch} style={s.searchForm}>
          <div style={s.searchRow}>
            <input style={s.searchInput} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Stadt, Sehenswürdigkeit…" />
            <button type="submit" style={s.searchBtn} disabled={searching}>
              {searching ? '…' : <Search size={16} />}
            </button>
          </div>
        </form>

        {searchResults.length > 0 && (
          <div style={s.results}>
            {searchResults.map((r, i) => (
              <div key={i} style={s.resultItem} onClick={() => addPlace(r)}>
                <MapPin size={14} color="#7c6ff7" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={s.resultName}>{r.name.split(',')[0]}</div>
                  <div style={s.resultAddr}>{r.name.split(',').slice(1, 3).join(',').trim()}</div>
                </div>
                <Plus size={14} color="#7c6ff7" style={{ marginLeft: 'auto', flexShrink: 0 }} />
              </div>
            ))}
          </div>
        )}

        {selectedDay && (
          <div style={s.categories}>
            <p style={s.catTitle}>Kategorien</p>
            {['sehenswürdigkeit', 'restaurant', 'unterkunft', 'transport', 'natur', 'einkaufen', 'sonstiges'].map(cat => {
              const icons: Record<string, string> = { sehenswürdigkeit: '🏛️', restaurant: '🍽️', unterkunft: '🏨', transport: '🚉', natur: '🌿', einkaufen: '🛍️', sonstiges: '📍' }
              return (
                <div key={cat} style={s.catItem}>
                  <span>{icons[cat]}</span>
                  <span style={s.catLabel}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                </div>
              )
            })}
          </div>
        )}
      </aside>
    </div>
  )
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h}h ${m}min` : `${m}min`
}

const s: Record<string, React.CSSProperties> = {
  container: { display: 'flex', height: 'calc(100vh - 96px)', overflow: 'hidden' },
  leftSidebar: { width: 280, background: '#14141e', borderRight: '1px solid #1e1e2e', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  rightSidebar: { width: 280, background: '#14141e', borderLeft: '1px solid #1e1e2e', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  sidebarHeader: { padding: '1rem', borderBottom: '1px solid #1e1e2e', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 },
  sidebarTitle: { fontSize: '0.85rem', fontWeight: 600, color: '#c5c5d8', textTransform: 'uppercase', letterSpacing: '0.05em' },
  dayCount: { fontSize: '0.75rem', color: '#6b6b80', background: '#1e1e2e', padding: '2px 8px', borderRadius: 20 },
  dayList: { flex: 1, overflowY: 'auto', padding: '0.5rem' },
  dayCard: { borderRadius: 8, marginBottom: '0.4rem', border: '1px solid #1e1e2e', background: '#0f0f1a', cursor: 'pointer', transition: 'border-color 0.15s' },
  dayCardActive: { borderColor: '#7c6ff7', background: '#1a1428' },
  dayHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.75rem' },
  dayHeaderLeft: { display: 'flex', alignItems: 'center', gap: '0.6rem' },
  dayBadge: { width: 24, height: 24, borderRadius: 6, background: '#2a2050', color: '#7c6ff7', fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  dayLabel: { fontSize: '0.85rem', fontWeight: 600, color: '#e2e2e8' },
  dayDate: { fontSize: '0.72rem', color: '#6b6b80' },
  dayHeaderRight: { display: 'flex', alignItems: 'center', gap: '4px' },
  placeCountBadge: { fontSize: '0.7rem', background: '#1e1e2e', color: '#9191a8', padding: '1px 6px', borderRadius: 10 },
  collapseBtn: { background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b6b80', display: 'flex', padding: 2 },
  dayBody: { padding: '0 0.5rem 0.5rem', borderTop: '1px solid #1e1e2e' },
  noPlaces: { fontSize: '0.75rem', color: '#4a4a60', padding: '0.5rem 0.25rem', fontStyle: 'italic' },
  placeItem: { display: 'flex', alignItems: 'flex-start', gap: '0.4rem', padding: '0.4rem 0', borderBottom: '1px solid #1a1a28' },
  placeOrder: { width: 16, height: 16, borderRadius: '50%', background: '#2e2e42', color: '#9191a8', fontSize: '0.65rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  placeIcon: { fontSize: '14px', flexShrink: 0 },
  placeInfo: { flex: 1, cursor: 'pointer', minWidth: 0 },
  placeName: { fontSize: '0.8rem', color: '#c5c5d8', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  placeNotes: { fontSize: '0.72rem', color: '#6b6b80', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  deletePlaceBtn: { background: 'transparent', border: 'none', cursor: 'pointer', color: '#4a4a60', padding: 2, display: 'flex', flexShrink: 0 },
  notesEditor: { marginTop: '0.5rem' },
  notesInput: { width: '100%', background: '#0f0f1a', border: '1px solid #2e2e42', borderRadius: 6, color: '#e2e2e8', fontSize: '0.8rem', padding: '0.4rem', fontFamily: 'inherit', resize: 'vertical' },
  notesActions: { display: 'flex', gap: '0.4rem', marginTop: '0.3rem' },
  saveBtn: { display: 'flex', alignItems: 'center', gap: 4, background: '#7c6ff7', border: 'none', borderRadius: 6, color: '#fff', fontSize: '0.78rem', padding: '4px 10px', cursor: 'pointer' },
  cancelNoteBtn: { background: 'transparent', border: '1px solid #2e2e42', borderRadius: 6, color: '#6b6b80', padding: '4px 8px', cursor: 'pointer', display: 'flex' },
  editNotesBtn: { display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: 'none', color: '#4a4a60', fontSize: '0.75rem', cursor: 'pointer', marginTop: '0.4rem', padding: '2px 0' },
  mapContainer: { flex: 1, position: 'relative' },
  routeOverlay: { position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', background: 'rgba(20,20,30,0.92)', border: '1px solid #2e2e42', borderRadius: 24, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 1000, backdropFilter: 'blur(8px)', flexWrap: 'wrap' },
  routeInfo: { fontSize: '0.85rem', color: '#e2e2e8', display: 'flex', alignItems: 'center', gap: '6px' },
  routeSep: { color: '#3a3a50' },
  routeLabel: { color: '#9191a8', fontWeight: 400 },
  routeSeg: { fontSize: '0.75rem', color: '#6b6b80', background: '#1e1e2e', padding: '2px 8px', borderRadius: 12 },
  hint: { display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.75rem 1rem', background: '#1a1428', margin: '0.5rem', borderRadius: 8, fontSize: '0.8rem', color: '#9191a8', lineHeight: 1.4 },
  selectedDayTag: { display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', background: '#2a2050', fontSize: '0.8rem', color: '#c5c5d8', flexWrap: 'wrap' },
  clearDay: { background: 'transparent', border: 'none', cursor: 'pointer', color: '#7c6ff7', display: 'flex', marginLeft: 'auto' },
  searchForm: { padding: '0.75rem', flexShrink: 0 },
  searchRow: { display: 'flex', gap: '0.5rem' },
  searchInput: { flex: 1, padding: '0.6rem 0.75rem', background: '#0f0f1a', border: '1px solid #2e2e42', borderRadius: 8, color: '#fff', fontSize: '0.85rem', outline: 'none', width: '100%' },
  searchBtn: { padding: '0.6rem 0.75rem', background: '#7c6ff7', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  results: { flex: 1, overflowY: 'auto', borderTop: '1px solid #1e1e2e' },
  resultItem: { display: 'flex', alignItems: 'flex-start', gap: '0.6rem', padding: '0.65rem 0.75rem', cursor: 'pointer', borderBottom: '1px solid #1a1a28', transition: 'background 0.1s' },
  resultName: { fontSize: '0.85rem', fontWeight: 500, color: '#e2e2e8' },
  resultAddr: { fontSize: '0.75rem', color: '#6b6b80', marginTop: 2 },
  categories: { padding: '0.75rem', borderTop: '1px solid #1e1e2e', flexShrink: 0 },
  catTitle: { fontSize: '0.72rem', color: '#6b6b80', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', fontWeight: 600 },
  catItem: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0', fontSize: '0.82rem', color: '#9191a8' },
  catLabel: { textTransform: 'capitalize' },
}
