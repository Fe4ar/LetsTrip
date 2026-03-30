import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../services/api'
import { useAuthStore } from '../store/auth'
import toast from 'react-hot-toast'
import { MapPin, Plane } from 'lucide-react'

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore(s => s.setAuth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await authApi.login(email, password)
      const { access_token, user_id, name, email: userEmail, role } = res.data
      setAuth({ id: user_id, name, email: userEmail, role }, access_token)
      navigate('/')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Anmeldung fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.left}>
        <div style={styles.hero}>
          <div style={styles.heroIcon}><Plane size={40} color="#7c6ff7" /></div>
          <h1 style={styles.heroTitle}>LetsTrip</h1>
          <p style={styles.heroSub}>Kollaborative Reiseplanung für Teams und Gruppen</p>
          <div style={styles.features}>
            {['🗺️ Weltweite Kartenplanung', '💰 Kostenaufteilung', '📋 Buchungsverwaltung', '👥 Teamzusammenarbeit'].map(f => (
              <div key={f} style={styles.featureItem}>{f}</div>
            ))}
          </div>
        </div>
      </div>
      <div style={styles.right}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <MapPin size={28} color="#7c6ff7" />
            <h2 style={styles.cardTitle}>Anmelden</h2>
            <p style={styles.cardSub}>Willkommen zurück bei LetsTrip</p>
          </div>
          <form onSubmit={handleLogin} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>E-Mail-Adresse</label>
              <input style={styles.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" required autoFocus />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Passwort</label>
              <input style={styles.input} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <button type="submit" disabled={loading} style={styles.btn}>
              {loading ? 'Anmelden...' : 'Anmelden'}
            </button>
          </form>
          <div style={styles.demoBox}>
            <p style={styles.demoTitle}>Demo-Zugänge</p>
            {[
              { label: 'Admin', email: 'admin@letstrip.local', pw: 'Admin123!' },
              { label: 'Teamleiter', email: 'lead@letstrip.local', pw: 'Lead123!' },
              { label: 'Reisender', email: 'traveler@letstrip.local', pw: 'Travel123!' },
            ].map(d => (
              <button key={d.email} style={styles.demoBtn} onClick={() => { setEmail(d.email); setPassword(d.pw) }}>
                <span style={styles.demoBadge}>{d.label}</span>
                <span style={styles.demoEmail}>{d.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { display: 'flex', height: '100vh', background: '#0f0f13' },
  left: { flex: 1, background: 'linear-gradient(135deg, #12121a 0%, #1a1428 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem' },
  hero: { maxWidth: 420 },
  heroIcon: { marginBottom: '1rem' },
  heroTitle: { fontSize: '3rem', fontWeight: 800, color: '#fff', letterSpacing: '-1px', marginBottom: '0.5rem' },
  heroSub: { fontSize: '1.1rem', color: '#9191a8', marginBottom: '2.5rem', lineHeight: 1.6 },
  features: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  featureItem: { color: '#c5c5d8', fontSize: '1rem', padding: '0.5rem 0', borderBottom: '1px solid #1e1e2e' },
  right: { width: 480, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: '#0f0f13' },
  card: { width: '100%', maxWidth: 400 },
  cardHeader: { marginBottom: '2rem', textAlign: 'center' },
  cardTitle: { fontSize: '1.75rem', fontWeight: 700, color: '#fff', margin: '0.75rem 0 0.25rem' },
  cardSub: { color: '#9191a8', fontSize: '0.9rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  label: { fontSize: '0.85rem', fontWeight: 500, color: '#c5c5d8' },
  input: { padding: '0.75rem 1rem', background: '#1a1a28', border: '1px solid #2e2e42', borderRadius: 8, color: '#fff', fontSize: '0.95rem', outline: 'none', width: '100%' },
  btn: { padding: '0.85rem', background: 'linear-gradient(135deg, #7c6ff7, #6057e0)', border: 'none', borderRadius: 8, color: '#fff', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', marginTop: '0.5rem' },
  demoBox: { background: '#1a1a28', borderRadius: 10, padding: '1rem', border: '1px solid #2e2e42' },
  demoTitle: { fontSize: '0.75rem', color: '#6b6b80', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', fontWeight: 600 },
  demoBtn: { display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.5rem', borderRadius: 6, marginBottom: '0.25rem', textAlign: 'left' },
  demoBadge: { fontSize: '0.7rem', background: '#2a2050', color: '#7c6ff7', padding: '2px 8px', borderRadius: 20, fontWeight: 600, whiteSpace: 'nowrap' },
  demoEmail: { fontSize: '0.82rem', color: '#8888a0' },
}
