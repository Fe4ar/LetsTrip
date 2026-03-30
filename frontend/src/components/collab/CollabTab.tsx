import { useEffect, useState } from 'react'
import { Trip, ActivityLog } from '../../types'
import { tripsApi, usersApi, activityApi } from '../../services/api'
import { useAuthStore } from '../../store/auth'
import toast from 'react-hot-toast'
import { UserPlus, Trash2, Clock, Users } from 'lucide-react'

interface Props { trip: Trip; onTripUpdate: (t: Trip) => void }

const ROLE_LABELS: Record<string, string> = { teamleiter: 'Teamleiter', reisender: 'Reisender', admin: 'Administrator' }

export default function CollabTab({ trip, onTripUpdate }: Props) {
  const user = useAuthStore(s => s.user)
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [activity, setActivity] = useState<ActivityLog[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRole, setSelectedRole] = useState('reisender')

  const canManage = user?.role === 'admin' || user?.role === 'teamleiter'

  useEffect(() => { load() }, [trip.id])

  async function load() {
    try {
      const [aRes, actRes] = await Promise.all([activityApi.list(trip.id), canManage ? usersApi.list() : Promise.resolve({ data: [] })])
      setActivity(actRes.data)
      const memberIds = new Set(trip.members.map(m => m.user_id))
      setAllUsers((aRes.data || []).filter((u: any) => !memberIds.has(u.id)))
    } catch {}
  }

  async function addMember() {
    if (!selectedUserId) return
    try {
      await tripsApi.addMember(trip.id, { user_id: +selectedUserId, role: selectedRole })
      toast.success('Mitglied hinzugefügt')
      const tripRes = await tripsApi.get(trip.id)
      onTripUpdate(tripRes.data)
      setShowAddForm(false); load()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Fehler') }
  }

  async function removeMember(userId: number) {
    if (!confirm('Mitglied entfernen?')) return
    try {
      await tripsApi.removeMember(trip.id, userId)
      toast.success('Mitglied entfernt')
      const tripRes = await tripsApi.get(trip.id)
      onTripUpdate(tripRes.data)
    } catch { toast.error('Fehler') }
  }

  return (
    <div style={s.page}>
      <div style={s.inner}>
        <div style={s.grid}>
          {/* Members */}
          <div>
            <div style={s.sectionHeader}>
              <h2 style={s.sectionTitle}><Users size={18} /> Mitglieder</h2>
              {canManage && (
                <button style={s.addBtn} onClick={() => setShowAddForm(v => !v)}>
                  <UserPlus size={14} /> Hinzufügen
                </button>
              )}
            </div>

            {showAddForm && (
              <div style={s.addForm}>
                <select style={s.select} value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}>
                  <option value="">— Benutzer auswählen —</option>
                  {allUsers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                </select>
                <select style={s.select} value={selectedRole} onChange={e => setSelectedRole(e.target.value)}>
                  <option value="reisender">Reisender</option>
                  <option value="teamleiter">Teamleiter</option>
                </select>
                <div style={s.addActions}>
                  <button style={s.cancelBtn} onClick={() => setShowAddForm(false)}>Abbrechen</button>
                  <button style={s.submitBtn} onClick={addMember} disabled={!selectedUserId}>Hinzufügen</button>
                </div>
              </div>
            )}

            <div style={s.memberList}>
              {trip.members.map(m => (
                <div key={m.id} style={s.memberCard}>
                  <div style={s.memberAvatar}>{m.name[0]?.toUpperCase()}</div>
                  <div style={s.memberInfo}>
                    <div style={s.memberName}>{m.name}</div>
                    <div style={s.memberEmail}>{m.email}</div>
                  </div>
                  <span style={{ ...s.roleBadge, ...(m.role === 'teamleiter' ? s.roleLead : s.roleTravel) }}>
                    {ROLE_LABELS[m.role] || m.role}
                  </span>
                  {canManage && m.user_id !== user?.id && (
                    <button style={s.removeBtn} onClick={() => removeMember(m.user_id)}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Activity Log */}
          <div>
            <div style={s.sectionHeader}>
              <h2 style={s.sectionTitle}><Clock size={18} /> Aktivitäten</h2>
            </div>
            <div style={s.activityList}>
              {activity.length === 0 ? (
                <p style={s.noActivity}>Noch keine Aktivitäten</p>
              ) : activity.map(a => (
                <div key={a.id} style={s.activityItem}>
                  <div style={s.activityDot} />
                  <div style={s.activityContent}>
                    <span style={s.activityUser}>{a.user_name}</span>
                    <span style={s.activityDesc}>{a.description}</span>
                    <div style={s.activityTime}>{new Date(a.created_at).toLocaleString('de-DE')}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { padding: '2rem', overflowY: 'auto', height: 'calc(100vh - 96px)' },
  inner: { maxWidth: 1000, margin: '0 auto' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  sectionTitle: { display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', fontWeight: 700, color: '#fff' },
  addBtn: { display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#7c6ff7', border: 'none', borderRadius: 8, color: '#fff', padding: '0.45rem 0.875rem', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' },
  addForm: { background: '#14141e', border: '1px solid #2e2e42', borderRadius: 10, padding: '1rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  select: { padding: '0.6rem 0.75rem', background: '#0f0f1a', border: '1px solid #2e2e42', borderRadius: 8, color: '#fff', fontSize: '0.875rem', outline: 'none' },
  addActions: { display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' },
  cancelBtn: { padding: '0.45rem 0.875rem', background: 'transparent', border: '1px solid #2e2e42', borderRadius: 8, color: '#9191a8', cursor: 'pointer', fontSize: '0.82rem' },
  submitBtn: { padding: '0.45rem 0.875rem', background: '#7c6ff7', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 },
  memberList: { display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  memberCard: { display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#14141e', border: '1px solid #1e1e2e', borderRadius: 10, padding: '0.875rem' },
  memberAvatar: { width: 38, height: 38, borderRadius: '50%', background: '#2a2050', color: '#7c6ff7', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0 },
  memberInfo: { flex: 1, minWidth: 0 },
  memberName: { fontWeight: 600, color: '#e2e2e8', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  memberEmail: { fontSize: '0.78rem', color: '#6b6b80', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  roleBadge: { padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600, flexShrink: 0 },
  roleLead: { background: '#2a2050', color: '#7c6ff7' },
  roleTravel: { background: '#1e2e1e', color: '#52be80' },
  removeBtn: { background: 'transparent', border: 'none', cursor: 'pointer', color: '#4a4a60', padding: '4px', display: 'flex', flexShrink: 0 },
  activityList: { display: 'flex', flexDirection: 'column', gap: '0' },
  noActivity: { color: '#4a4a60', fontSize: '0.85rem', fontStyle: 'italic', padding: '1rem 0' },
  activityItem: { display: 'flex', gap: '0.75rem', paddingBottom: '1rem', position: 'relative' },
  activityDot: { width: 10, height: 10, borderRadius: '50%', background: '#7c6ff7', flexShrink: 0, marginTop: 4 },
  activityContent: { flex: 1 },
  activityUser: { fontWeight: 600, color: '#c5c5d8', fontSize: '0.85rem', marginRight: '0.3rem' },
  activityDesc: { color: '#9191a8', fontSize: '0.85rem' },
  activityTime: { fontSize: '0.75rem', color: '#4a4a60', marginTop: 2 },
}
