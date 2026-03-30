import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { tripsApi } from '../services/api'
import { Trip } from '../types'
import { useAuthStore } from '../store/auth'
import toast from 'react-hot-toast'
import { ArrowLeft, Map, BookOpen, List, DollarSign, FolderOpen, Users, Plane } from 'lucide-react'
import MapTab from '../components/map/MapTab'
import BudgetTab from '../components/budget/BudgetTab'
import BookingsTab from '../components/bookings/BookingsTab'
import FilesTab from '../components/files/FilesTab'
import CollabTab from '../components/collab/CollabTab'
import ListTab from '../components/map/ListTab'

type Tab = 'karte' | 'liste' | 'buchungen' | 'budget' | 'dateien' | 'collab'

export default function TripPage() {
  const { tripId } = useParams<{ tripId: string }>()
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const [trip, setTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('karte')

  useEffect(() => {
    if (tripId) loadTrip(+tripId)
  }, [tripId])

  async function loadTrip(id: number) {
    try {
      const res = await tripsApi.get(id)
      setTrip(res.data)
    } catch {
      toast.error('Reise nicht gefunden')
      navigate('/')
    } finally { setLoading(false) }
  }

  if (loading) return <div style={s.loading}><Plane size={32} color="#7c6ff7" /><p>Lade Reise…</p></div>
  if (!trip) return null

  const tabs: { id: Tab; label: string; icon: JSX.Element }[] = [
    { id: 'karte', label: 'Karte', icon: <Map size={15} /> },
    { id: 'liste', label: 'Liste', icon: <List size={15} /> },
    { id: 'buchungen', label: 'Buchungen', icon: <BookOpen size={15} /> },
    { id: 'budget', label: 'Budget', icon: <DollarSign size={15} /> },
    { id: 'dateien', label: 'Dateien', icon: <FolderOpen size={15} /> },
    { id: 'collab', label: 'Collab', icon: <Users size={15} /> },
  ]

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div style={s.headerLeft}>
          <button style={s.backBtn} onClick={() => navigate('/')}>
            <ArrowLeft size={18} />
          </button>
          <Plane size={18} color="#7c6ff7" />
          <span style={s.logo}>LetsTrip</span>
          <span style={s.sep}>›</span>
          <span style={s.tripName}>{trip.name}</span>
          <span style={s.tripDates}>{formatDate(trip.start_date)} – {formatDate(trip.end_date)}</span>
        </div>
        <div style={s.headerRight}>
          <div style={s.userInfo}>
            <div style={s.avatar}>{user?.name?.[0]?.toUpperCase()}</div>
            <span style={s.userName}>{user?.name}</span>
          </div>
        </div>
      </header>

      <nav style={s.nav}>
        {tabs.map(t => (
          <button key={t.id} style={{ ...s.navBtn, ...(tab === t.id ? s.navBtnActive : {}) }} onClick={() => setTab(t.id)}>
            {t.icon} {t.label}
          </button>
        ))}
      </nav>

      <main style={s.main}>
        {tab === 'karte' && <MapTab trip={trip} onTripUpdate={setTrip} />}
        {tab === 'liste' && <ListTab trip={trip} onTripUpdate={setTrip} />}
        {tab === 'buchungen' && <BookingsTab trip={trip} />}
        {tab === 'budget' && <BudgetTab trip={trip} />}
        {tab === 'dateien' && <FilesTab trip={trip} />}
        {tab === 'collab' && <CollabTab trip={trip} onTripUpdate={setTrip} />}
      </main>
    </div>
  )
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#0f0f13', display: 'flex', flexDirection: 'column' },
  loading: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '1rem', color: '#6b6b80' },
  header: { height: 52, background: '#14141e', borderBottom: '1px solid #1e1e2e', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.25rem', position: 'sticky', top: 0, zIndex: 200 },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '0.6rem' },
  backBtn: { background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b6b80', display: 'flex', padding: '4px', borderRadius: 6 },
  logo: { fontSize: '0.95rem', fontWeight: 700, color: '#fff' },
  sep: { color: '#3a3a50', fontSize: '1.1rem' },
  tripName: { fontSize: '0.95rem', fontWeight: 600, color: '#e2e2e8', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  tripDates: { fontSize: '0.75rem', color: '#6b6b80', background: '#1e1e2e', padding: '2px 8px', borderRadius: 20, display: 'none' },
  headerRight: { display: 'flex', alignItems: 'center' },
  userInfo: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  avatar: { width: 30, height: 30, borderRadius: '50%', background: '#2a2050', color: '#7c6ff7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem' },
  userName: { fontSize: '0.82rem', color: '#9191a8' },
  nav: { background: '#14141e', borderBottom: '1px solid #1e1e2e', display: 'flex', padding: '0 1.25rem', position: 'sticky', top: 52, zIndex: 100 },
  navBtn: { display: 'flex', alignItems: 'center', gap: '6px', padding: '0 1rem', height: 44, background: 'transparent', border: 'none', borderBottom: '2px solid transparent', color: '#6b6b80', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500, transition: 'color 0.15s' },
  navBtnActive: { color: '#7c6ff7', borderBottomColor: '#7c6ff7' },
  main: { flex: 1, overflow: 'auto' },
}
