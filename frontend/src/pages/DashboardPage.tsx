import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { tripsApi } from '../services/api'
import { Trip } from '../types'
import { useAuthStore } from '../store/auth'
import toast from 'react-hot-toast'
import { Plus, MapPin, Calendar, Users, LogOut, Settings, Plane } from 'lucide-react'
import CreateTripModal from '../components/trips/CreateTripModal'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => { loadTrips() }, [])

  async function loadTrips() {
    try {
      const res = await tripsApi.list()
      setTrips(res.data)
    } catch { toast.error('Reisen konnten nicht geladen werden') }
    finally { setLoading(false) }
  }

  function handleLogout() { logout(); navigate('/login') }

  const canCreate = user?.role === 'admin' || user?.role === 'teamleiter'

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div style={s.headerLeft}>
          <Plane size={22} color="#7c6ff7" />
          <span style={s.logo}>LetsTrip</span>
        </div>
        <div style={s.headerRight}>
          {user?.role === 'admin' && (
            <button style={s.iconBtn} onClick={() => navigate('/admin')} title="Benutzerverwaltung">
              <Settings size={18} />
            </button>
          )}
          <div style={s.userBadge}>
            <div style={s.avatar}>{user?.name?.[0]?.toUpperCase()}</div>
            <div>
              <div style={s.userName}>{user?.name}</div>
              <div style={s.userRole}>{roleLabel(user?.role)}</div>
            </div>
          </div>
          <button style={s.iconBtn} onClick={handleLogout} title="Abmelden"><LogOut size={18} /></button>
        </div>
      </header>

      <main style={s.main}>
        <div style={s.pageHeader}>
          <div>
            <h1 style={s.title}>Meine Reisen</h1>
            <p style={s.subtitle}>{trips.length} {trips.length === 1 ? 'Reise' : 'Reisen'} gesamt</p>
          </div>
          {canCreate && (
            <button style={s.createBtn} onClick={() => setShowCreate(true)}>
              <Plus size={18} /> Neue Reise
            </button>
          )}
        </div>

        {loading ? (
          <div style={s.loading}>Lade Reisen…</div>
        ) : trips.length === 0 ? (
          <div style={s.empty}>
            <Plane size={48} color="#3a3a50" />
            <h3 style={s.emptyTitle}>Noch keine Reisen</h3>
            <p style={s.emptyText}>{canCreate ? 'Erstelle deine erste Reise um loszulegen.' : 'Du wurdest noch zu keiner Reise eingeladen.'}</p>
            {canCreate && <button style={s.createBtn} onClick={() => setShowCreate(true)}><Plus size={16} /> Erste Reise erstellen</button>}
          </div>
        ) : (
          <div style={s.grid}>
            {trips.map(trip => (
              <div key={trip.id} style={s.card} onClick={() => navigate(`/trips/${trip.id}`)}>
                <div style={s.cardTop}>
                  <div style={s.cardEmoji}>✈️</div>
                  <div style={s.cardMeta}>
                    <span style={s.memberCount}><Users size={12} /> {trip.members?.length || 0}</span>
                  </div>
                </div>
                <h3 style={s.cardTitle}>{trip.name}</h3>
                {trip.description && <p style={s.cardDesc}>{trip.description}</p>}
                <div style={s.cardDates}>
                  <Calendar size={13} color="#7c6ff7" />
                  <span>{formatDate(trip.start_date)} – {formatDate(trip.end_date)}</span>
                </div>
                <div style={s.cardDays}>
                  <MapPin size={13} color="#5dade2" />
                  <span>{dayCount(trip.start_date, trip.end_date)} Reisetage</span>
                </div>
                <div style={s.memberAvatars}>
                  {(trip.members || []).slice(0, 5).map(m => (
                    <div key={m.id} style={s.miniAvatar} title={m.name}>{m.name[0]?.toUpperCase()}</div>
                  ))}
                  {(trip.members?.length || 0) > 5 && <div style={s.miniAvatarMore}>+{(trip.members?.length || 0) - 5}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showCreate && <CreateTripModal onClose={() => setShowCreate(false)} onCreated={(t) => { setTrips(prev => [t, ...prev]); navigate(`/trips/${t.id}`) }} />}
    </div>
  )
}

function roleLabel(role?: string) {
  return role === 'admin' ? 'Administrator' : role === 'teamleiter' ? 'Teamleiter' : 'Reisender'
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function dayCount(start: string, end: string) {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#0f0f13', display: 'flex', flexDirection: 'column' },
  header: { height: 56, background: '#14141e', borderBottom: '1px solid #1e1e2e', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem', position: 'sticky', top: 0, zIndex: 100 },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '0.6rem' },
  logo: { fontSize: '1.1rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.5px' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  userBadge: { display: 'flex', alignItems: 'center', gap: '0.6rem' },
  avatar: { width: 32, height: 32, borderRadius: '50%', background: '#2a2050', color: '#7c6ff7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem' },
  userName: { fontSize: '0.82rem', fontWeight: 600, color: '#e2e2e8' },
  userRole: { fontSize: '0.7rem', color: '#6b6b80' },
  iconBtn: { background: 'transparent', border: 'none', cursor: 'pointer', color: '#8888a0', padding: '0.4rem', borderRadius: 6, display: 'flex', alignItems: 'center' },
  main: { flex: 1, maxWidth: 1200, margin: '0 auto', width: '100%', padding: '2rem 1.5rem' },
  pageHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' },
  title: { fontSize: '1.75rem', fontWeight: 700, color: '#fff' },
  subtitle: { color: '#6b6b80', fontSize: '0.9rem', marginTop: '0.25rem' },
  createBtn: { display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#7c6ff7', border: 'none', borderRadius: 8, color: '#fff', padding: '0.65rem 1.25rem', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' },
  loading: { textAlign: 'center', color: '#6b6b80', padding: '4rem' },
  empty: { textAlign: 'center', padding: '5rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' },
  emptyTitle: { fontSize: '1.25rem', fontWeight: 600, color: '#c5c5d8' },
  emptyText: { color: '#6b6b80', maxWidth: 360 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' },
  card: { background: '#14141e', border: '1px solid #1e1e2e', borderRadius: 12, padding: '1.5rem', cursor: 'pointer', transition: 'border-color 0.15s, transform 0.15s' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' },
  cardEmoji: { fontSize: '2rem' },
  cardMeta: { display: 'flex', gap: '0.5rem' },
  memberCount: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: '#6b6b80' },
  cardTitle: { fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '0.4rem' },
  cardDesc: { fontSize: '0.83rem', color: '#6b6b80', marginBottom: '0.75rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  cardDates: { display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: '#9191a8', marginBottom: '0.3rem' },
  cardDays: { display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: '#9191a8', marginBottom: '1rem' },
  memberAvatars: { display: 'flex', gap: '4px' },
  miniAvatar: { width: 26, height: 26, borderRadius: '50%', background: '#2a2050', color: '#7c6ff7', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  miniAvatarMore: { width: 26, height: 26, borderRadius: '50%', background: '#1e1e2e', color: '#6b6b80', fontSize: '0.65rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' },
}
