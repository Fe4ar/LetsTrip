import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usersApi } from '../services/api'
import { User } from '../types'
import toast from 'react-hot-toast'
import { ArrowLeft, Plus, Trash2, Edit2, X, Check, Shield } from 'lucide-react'

export default function AdminPage() {
  const navigate = useNavigate()
  const [users, setUsers] = useState<User[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const emptyForm = { name: '', email: '', password: '', role: 'reisender' }
  const [form, setForm] = useState({ ...emptyForm })

  useEffect(() => { load() }, [])
  async function load() { const r = await usersApi.list(); setUsers(r.data) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (editId) { await usersApi.update(editId, { name: form.name, role: form.role, ...(form.password ? { password: form.password } : {}) }); toast.success('Benutzer aktualisiert') }
      else { await usersApi.create(form); toast.success('Benutzer erstellt') }
      setShowForm(false); setEditId(null); setForm({ ...emptyForm }); load()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Fehler') }
  }

  async function deleteUser(id: number) {
    if (!confirm('Benutzer löschen?')) return
    await usersApi.delete(id); toast.success('Benutzer gelöscht'); load()
  }

  const ROLE_LABELS: Record<string, string> = { admin: 'Administrator', teamleiter: 'Teamleiter', reisender: 'Reisender' }
  const roleColor = (r: string) => r === 'admin' ? { background: '#2e1e1e', color: '#e74c3c' } : r === 'teamleiter' ? { background: '#2a2050', color: '#7c6ff7' } : { background: '#1e2e1e', color: '#52be80' }

  return (
    <div style={s.page}>
      <header style={s.header}>
        <button style={s.backBtn} onClick={() => navigate('/')}><ArrowLeft size={18} /></button>
        <Shield size={20} color="#7c6ff7" />
        <h1 style={s.headerTitle}>Benutzerverwaltung</h1>
      </header>
      <div style={s.main}>
        <div style={s.sectionHeader}>
          <p style={s.subtitle}>{users.length} Benutzer im System</p>
          <button style={s.addBtn} onClick={() => { setShowForm(true); setEditId(null); setForm({ ...emptyForm }) }}><Plus size={15} /> Benutzer anlegen</button>
        </div>
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>{['Name', 'E-Mail', 'Rolle', 'Status', 'Aktionen'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={s.tr}>
                  <td style={s.td}>
                    <div style={s.userCell}>
                      <div style={s.avatar}>{u.name[0]?.toUpperCase()}</div>
                      <span style={s.userName}>{u.name}</span>
                    </div>
                  </td>
                  <td style={s.td}><span style={s.email}>{u.email}</span></td>
                  <td style={s.td}><span style={{ ...s.roleBadge, ...roleColor(u.role) }}>{ROLE_LABELS[u.role] || u.role}</span></td>
                  <td style={s.td}><span style={{ ...s.statusBadge, ...(u.is_active ? s.statusActive : s.statusInactive) }}>{u.is_active ? 'Aktiv' : 'Inaktiv'}</span></td>
                  <td style={s.td}>
                    <div style={s.actions}>
                      <button style={s.iconBtn} onClick={() => { setForm({ name: u.name, email: u.email, password: '', role: u.role }); setEditId(u.id); setShowForm(true) }}><Edit2 size={13} /></button>
                      <button style={s.iconBtn} onClick={() => deleteUser(u.id)}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div style={s.overlay} onClick={() => setShowForm(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>{editId ? 'Benutzer bearbeiten' : 'Neuer Benutzer'}</h3>
              <button style={s.closeBtn} onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} style={s.form}>
              <div style={s.field}><label style={s.label}>Name *</label><input style={s.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Max Mustermann" required /></div>
              {!editId && <div style={s.field}><label style={s.label}>E-Mail *</label><input style={s.input} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="max@example.com" required /></div>}
              <div style={s.field}><label style={s.label}>{editId ? 'Neues Passwort (leer = unverändert)' : 'Passwort *'}</label><input style={s.input} type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" required={!editId} /></div>
              <div style={s.field}><label style={s.label}>Rolle</label>
                <select style={s.input} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="reisender">Reisender</option>
                  <option value="teamleiter">Teamleiter</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <div style={s.modalActions}>
                <button type="button" style={s.cancelBtn} onClick={() => setShowForm(false)}>Abbrechen</button>
                <button type="submit" style={s.submitBtn}>{editId ? 'Speichern' : 'Anlegen'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#0f0f13' },
  header: { height: 56, background: '#14141e', borderBottom: '1px solid #1e1e2e', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0 1.5rem' },
  backBtn: { background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b6b80', display: 'flex', padding: 4 },
  headerTitle: { fontSize: '1.1rem', fontWeight: 700, color: '#fff' },
  main: { maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' },
  subtitle: { color: '#6b6b80', fontSize: '0.9rem' },
  addBtn: { display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#7c6ff7', border: 'none', borderRadius: 8, color: '#fff', padding: '0.55rem 1rem', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' },
  tableWrap: { background: '#14141e', border: '1px solid #1e1e2e', borderRadius: 12, overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' },
  th: { padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: '#6b6b80', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #1e1e2e', background: '#0f0f1a' },
  tr: { borderBottom: '1px solid #1a1a28' },
  td: { padding: '0.75rem 1rem', verticalAlign: 'middle' },
  userCell: { display: 'flex', alignItems: 'center', gap: '0.6rem' },
  avatar: { width: 30, height: 30, borderRadius: '50%', background: '#2a2050', color: '#7c6ff7', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  userName: { fontWeight: 500, color: '#e2e2e8' },
  email: { color: '#9191a8', fontSize: '0.85rem' },
  roleBadge: { padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600 },
  statusBadge: { padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600 },
  statusActive: { background: '#1e2e1e', color: '#52be80' },
  statusInactive: { background: '#2e1e1e', color: '#e74c3c' },
  actions: { display: 'flex', gap: '0.25rem' },
  iconBtn: { background: 'transparent', border: 'none', cursor: 'pointer', color: '#4a4a60', padding: '5px', display: 'flex', borderRadius: 4 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' },
  modal: { background: '#14141e', border: '1px solid #2e2e42', borderRadius: 14, padding: '1.5rem', width: '100%', maxWidth: 440 },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' },
  modalTitle: { fontSize: '1.1rem', fontWeight: 700, color: '#fff' },
  closeBtn: { background: 'transparent', border: 'none', color: '#6b6b80', cursor: 'pointer', display: 'flex' },
  form: { display: 'flex', flexDirection: 'column', gap: '0.875rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.35rem' },
  label: { fontSize: '0.78rem', fontWeight: 500, color: '#9191a8' },
  input: { padding: '0.6rem 0.75rem', background: '#0f0f1a', border: '1px solid #2e2e42', borderRadius: 8, color: '#fff', fontSize: '0.875rem', outline: 'none', width: '100%', fontFamily: 'inherit' },
  modalActions: { display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' },
  cancelBtn: { padding: '0.55rem 1.1rem', background: 'transparent', border: '1px solid #2e2e42', borderRadius: 8, color: '#9191a8', cursor: 'pointer', fontSize: '0.875rem' },
  submitBtn: { padding: '0.55rem 1.25rem', background: '#7c6ff7', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 },
}
