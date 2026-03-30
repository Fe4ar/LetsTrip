import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Trip, Expense, ExpenseSummary } from '../../types'
import { expensesApi } from '../../services/api'
import { useAuthStore } from '../../store/auth'
import toast from 'react-hot-toast'
import { Plus, Trash2, Edit2, X, Check, Euro } from 'lucide-react'

interface Props { trip: Trip }

const CATEGORIES = ['unterkunft', 'transport', 'essen', 'aktivitäten', 'einkaufen', 'sonstiges']
const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF']
const COLORS = ['#7c6ff7', '#5dade2', '#52be80', '#f39c12', '#e74c3c', '#af7ac5', '#1abc9c']
const CAT_LABELS: Record<string, string> = { unterkunft: 'Unterkunft', transport: 'Transport', essen: 'Essen & Trinken', aktivitäten: 'Aktivitäten', einkaufen: 'Einkaufen', sonstiges: 'Sonstiges' }

export default function BudgetTab({ trip }: Props) {
  const user = useAuthStore(s => s.user)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [summary, setSummary] = useState<ExpenseSummary | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [activeSubTab, setActiveSubTab] = useState<'überblick' | 'personen'>('überblick')

  const emptyForm = { title: '', amount: '', currency: 'EUR', date: '', category: 'sonstiges', notes: '', paid_by: user?.id || 0, participant_ids: trip.members.map(m => m.user_id) }
  const [form, setForm] = useState({ ...emptyForm, participant_ids: trip.members.map(m => m.user_id) })

  useEffect(() => { load() }, [trip.id])

  async function load() {
    try {
      const [eRes, sRes] = await Promise.all([expensesApi.list(trip.id), expensesApi.summary(trip.id)])
      setExpenses(eRes.data)
      setSummary(sRes.data)
    } catch { toast.error('Budget konnte nicht geladen werden') }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.amount) { toast.error('Titel und Betrag sind Pflichtfelder'); return }
    if (form.participant_ids.length === 0) { toast.error('Mindestens eine betroffene Person erforderlich'); return }
    const payload = { ...form, amount: parseFloat(form.amount), paid_by: form.paid_by || null, date: form.date || null }
    try {
      if (editId) {
        await expensesApi.update(trip.id, editId, payload)
        toast.success('Ausgabe aktualisiert')
      } else {
        await expensesApi.create(trip.id, payload)
        toast.success('Ausgabe hinzugefügt')
      }
      setShowForm(false); setEditId(null); setForm({ ...emptyForm, participant_ids: trip.members.map(m => m.user_id) }); load()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Fehler') }
  }

  async function deleteExpense(id: number) {
    if (!confirm('Ausgabe löschen?')) return
    await expensesApi.delete(trip.id, id)
    toast.success('Ausgabe gelöscht'); load()
  }

  function startEdit(e: Expense) {
    setForm({ title: e.title, amount: String(e.amount), currency: e.currency, date: e.date || '', category: e.category, notes: e.notes, paid_by: e.paid_by || 0, participant_ids: e.participants.map(p => p.user_id) })
    setEditId(e.id); setShowForm(true)
  }

  function toggleParticipant(uid: number) {
    setForm(f => ({ ...f, participant_ids: f.participant_ids.includes(uid) ? f.participant_ids.filter(x => x !== uid) : [...f.participant_ids, uid] }))
  }

  const perPerson = form.participant_ids.length > 0 && form.amount ? (parseFloat(form.amount) / form.participant_ids.length).toFixed(2) : '0.00'
  const chartData = summary?.by_category.map(c => ({ name: CAT_LABELS[c.category] || c.category, value: c.amount })) || []

  return (
    <div style={s.page}>
      <div style={s.inner}>
        {/* Summary Cards */}
        {summary && (
          <div style={s.summaryCards}>
            <div style={s.summaryCard}>
              <div style={s.summaryIcon}><Euro size={18} color="#7c6ff7" /></div>
              <div style={s.summaryValue}>{summary.total.toFixed(2)} EUR</div>
              <div style={s.summaryLabel}>Gesamtkosten</div>
            </div>
            <div style={s.summaryCard}>
              <div style={s.summaryIcon}>👥</div>
              <div style={s.summaryValue}>{trip.members.length}</div>
              <div style={s.summaryLabel}>Reisende</div>
            </div>
            <div style={s.summaryCard}>
              <div style={s.summaryIcon}>🧾</div>
              <div style={s.summaryValue}>{expenses.length}</div>
              <div style={s.summaryLabel}>Ausgaben</div>
            </div>
            <div style={s.summaryCard}>
              <div style={s.summaryIcon}>💡</div>
              <div style={s.summaryValue}>{trip.members.length > 0 ? (summary.total / trip.members.length).toFixed(2) : '0.00'} EUR</div>
              <div style={s.summaryLabel}>Ø pro Person</div>
            </div>
          </div>
        )}

        <div style={s.mainGrid}>
          {/* Left: Table + Chart */}
          <div style={s.leftCol}>
            <div style={s.sectionHeader}>
              <div style={s.subTabs}>
                <button style={{ ...s.subTab, ...(activeSubTab === 'überblick' ? s.subTabActive : {}) }} onClick={() => setActiveSubTab('überblick')}>Überblick</button>
                <button style={{ ...s.subTab, ...(activeSubTab === 'personen' ? s.subTabActive : {}) }} onClick={() => setActiveSubTab('personen')}>Pro Person</button>
              </div>
              <button style={s.addBtn} onClick={() => { setShowForm(true); setEditId(null); setForm({ ...emptyForm, participant_ids: trip.members.map(m => m.user_id) }) }}>
                <Plus size={15} /> Ausgabe
              </button>
            </div>

            {activeSubTab === 'überblick' && (
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      {['Titel', 'Kategorie', 'Betrag', 'Bezahlt von', 'Betroffene', 'Pro Person', ''].map(h => (
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.length === 0 ? (
                      <tr><td colSpan={7} style={s.emptyTd}>Noch keine Ausgaben eingetragen</td></tr>
                    ) : expenses.map(e => (
                      <tr key={e.id} style={s.tr}>
                        <td style={s.td}><span style={s.expenseTitle}>{e.title}</span>{e.notes && <span style={s.expenseNote}>{e.notes}</span>}</td>
                        <td style={s.td}><span style={s.catBadge}>{CAT_LABELS[e.category] || e.category}</span></td>
                        <td style={s.td}><strong style={s.amount}>{e.amount.toFixed(2)} {e.currency}</strong></td>
                        <td style={s.td}><span style={s.payerName}>{e.payer_name || '—'}</span></td>
                        <td style={s.td}>{e.participants.map(p => <span key={p.user_id} style={s.participantChip}>{p.name.split(' ')[0]}</span>)}</td>
                        <td style={s.td}><span style={s.share}>{e.participants.length > 0 ? (e.amount / e.participants.length).toFixed(2) : '—'} {e.currency}</span></td>
                        <td style={s.td}>
                          <div style={s.rowActions}>
                            <button style={s.iconBtn} onClick={() => startEdit(e)}><Edit2 size={13} /></button>
                            <button style={s.iconBtn} onClick={() => deleteExpense(e.id)}><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeSubTab === 'personen' && summary && (
              <div style={s.personCards}>
                {summary.by_person.map(p => (
                  <div key={p.user_id} style={s.personCard}>
                    <div style={s.personHeader}>
                      <div style={s.personAvatar}>{p.name[0]?.toUpperCase()}</div>
                      <div>
                        <div style={s.personName}>{p.name}</div>
                        <div style={s.personTotal}>{p.total.toFixed(2)} EUR gesamt</div>
                      </div>
                    </div>
                    <div style={s.personEntries}>
                      {p.entries.map((e: any, i: number) => (
                        <div key={i} style={s.personEntry}>
                          <span style={s.personEntryTitle}>{e.title}</span>
                          <span style={s.personEntryAmt}>{e.share.toFixed(2)} {e.currency}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Donut Chart */}
          <div style={s.rightCol}>
            <div style={s.chartCard}>
              <h3 style={s.chartTitle}>Nach Kategorie</h3>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                      {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => [`${v.toFixed(2)} EUR`]} contentStyle={{ background: '#1a1a28', border: '1px solid #2e2e42', borderRadius: 8, color: '#e2e2e8', fontSize: '0.82rem' }} />
                    <Legend formatter={(v) => <span style={{ color: '#9191a8', fontSize: '0.8rem' }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={s.chartEmpty}>Keine Daten</div>
              )}
            </div>
            {summary && (
              <div style={s.catList}>
                {summary.by_category.map((c, i) => (
                  <div key={c.category} style={s.catRow}>
                    <span style={{ ...s.catDot, background: COLORS[i % COLORS.length] }} />
                    <span style={s.catName}>{CAT_LABELS[c.category] || c.category}</span>
                    <span style={s.catAmt}>{c.amount.toFixed(2)} EUR</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div style={s.overlay} onClick={() => { setShowForm(false); setEditId(null) }}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>{editId ? 'Ausgabe bearbeiten' : 'Neue Ausgabe'}</h3>
              <button style={s.closeBtn} onClick={() => { setShowForm(false); setEditId(null) }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} style={s.form}>
              <div style={s.field}><label style={s.label}>Titel *</label><input style={s.input} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="z.B. Hotelübernachtung" required /></div>
              <div style={s.row}>
                <div style={s.field}><label style={s.label}>Betrag *</label><input style={s.input} type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" required /></div>
                <div style={s.field}><label style={s.label}>Währung</label>
                  <select style={s.input} value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                    {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div style={s.row}>
                <div style={s.field}><label style={s.label}>Datum</label><input style={s.input} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
                <div style={s.field}><label style={s.label}>Kategorie</label>
                  <select style={s.input} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c] || c}</option>)}
                  </select>
                </div>
              </div>
              <div style={s.field}><label style={s.label}>Bezahlt von</label>
                <select style={s.input} value={form.paid_by} onChange={e => setForm(f => ({ ...f, paid_by: +e.target.value }))}>
                  <option value={0}>— Nicht angegeben —</option>
                  {trip.members.map(m => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
                </select>
              </div>
              <div style={s.field}>
                <label style={s.label}>Betroffene Personen *</label>
                <div style={s.chips}>
                  {trip.members.map(m => (
                    <button type="button" key={m.user_id} style={{ ...s.chip, ...(form.participant_ids.includes(m.user_id) ? s.chipActive : {}) }} onClick={() => toggleParticipant(m.user_id)}>
                      {m.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
                {form.participant_ids.length > 0 && form.amount && (
                  <div style={s.splitHint}>
                    ÷ {form.participant_ids.length} Personen = <strong style={{ color: '#7c6ff7' }}>{perPerson} {form.currency}</strong> pro Person
                  </div>
                )}
              </div>
              <div style={s.field}><label style={s.label}>Notiz</label><input style={s.input} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optionale Notiz" /></div>
              <div style={s.modalActions}>
                <button type="button" style={s.cancelBtn} onClick={() => { setShowForm(false); setEditId(null) }}>Abbrechen</button>
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
  page: { padding: '1.5rem', overflowY: 'auto', height: 'calc(100vh - 96px)' },
  inner: { maxWidth: 1200, margin: '0 auto' },
  summaryCards: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' },
  summaryCard: { background: '#14141e', border: '1px solid #1e1e2e', borderRadius: 12, padding: '1.25rem', textAlign: 'center' },
  summaryIcon: { fontSize: '1.5rem', marginBottom: '0.5rem' },
  summaryValue: { fontSize: '1.4rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' },
  summaryLabel: { fontSize: '0.78rem', color: '#6b6b80' },
  mainGrid: { display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem' },
  leftCol: { display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0 },
  rightCol: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  subTabs: { display: 'flex', background: '#14141e', border: '1px solid #1e1e2e', borderRadius: 8, padding: 4, gap: 4 },
  subTab: { padding: '0.4rem 1rem', background: 'transparent', border: 'none', color: '#6b6b80', cursor: 'pointer', fontSize: '0.85rem', borderRadius: 6 },
  subTabActive: { background: '#2a2050', color: '#7c6ff7', fontWeight: 600 },
  addBtn: { display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#7c6ff7', border: 'none', borderRadius: 8, color: '#fff', padding: '0.5rem 1rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' },
  tableWrap: { background: '#14141e', border: '1px solid #1e1e2e', borderRadius: 12, overflow: 'hidden', overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' },
  th: { padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: '#6b6b80', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #1e1e2e', background: '#0f0f1a', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid #1a1a28' },
  td: { padding: '0.75rem 1rem', verticalAlign: 'middle' },
  emptyTd: { padding: '2rem', textAlign: 'center', color: '#4a4a60', fontSize: '0.85rem' },
  expenseTitle: { display: 'block', fontWeight: 500, color: '#e2e2e8' },
  expenseNote: { display: 'block', fontSize: '0.75rem', color: '#6b6b80', fontStyle: 'italic' },
  catBadge: { background: '#2a2050', color: '#9191a8', padding: '2px 8px', borderRadius: 20, fontSize: '0.75rem', whiteSpace: 'nowrap' },
  amount: { color: '#7c6ff7', whiteSpace: 'nowrap' },
  payerName: { color: '#9191a8', fontSize: '0.82rem' },
  participantChip: { display: 'inline-block', background: '#1e1e2e', color: '#9191a8', padding: '1px 6px', borderRadius: 10, fontSize: '0.72rem', marginRight: 3 },
  share: { color: '#52be80', fontSize: '0.82rem', fontWeight: 600, whiteSpace: 'nowrap' },
  rowActions: { display: 'flex', gap: '0.25rem' },
  iconBtn: { background: 'transparent', border: 'none', cursor: 'pointer', color: '#4a4a60', padding: '4px', display: 'flex', borderRadius: 4 },
  personCards: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  personCard: { background: '#14141e', border: '1px solid #1e1e2e', borderRadius: 12, padding: '1rem' },
  personHeader: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' },
  personAvatar: { width: 36, height: 36, borderRadius: '50%', background: '#2a2050', color: '#7c6ff7', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' },
  personName: { fontWeight: 600, color: '#e2e2e8' },
  personTotal: { fontSize: '0.8rem', color: '#7c6ff7', fontWeight: 600 },
  personEntries: { display: 'flex', flexDirection: 'column', gap: '0.3rem', borderTop: '1px solid #1e1e2e', paddingTop: '0.5rem' },
  personEntry: { display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' },
  personEntryTitle: { color: '#9191a8' },
  personEntryAmt: { color: '#e2e2e8', fontWeight: 500 },
  chartCard: { background: '#14141e', border: '1px solid #1e1e2e', borderRadius: 12, padding: '1rem' },
  chartTitle: { fontSize: '0.85rem', fontWeight: 600, color: '#c5c5d8', marginBottom: '0.5rem' },
  chartEmpty: { height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a4a60', fontSize: '0.85rem' },
  catList: { background: '#14141e', border: '1px solid #1e1e2e', borderRadius: 12, padding: '1rem' },
  catRow: { display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.4rem 0', borderBottom: '1px solid #1a1a28', fontSize: '0.82rem' },
  catDot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  catName: { flex: 1, color: '#9191a8' },
  catAmt: { fontWeight: 600, color: '#e2e2e8' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' },
  modal: { background: '#14141e', border: '1px solid #2e2e42', borderRadius: 14, padding: '1.5rem', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' },
  modalTitle: { fontSize: '1.1rem', fontWeight: 700, color: '#fff' },
  closeBtn: { background: 'transparent', border: 'none', color: '#6b6b80', cursor: 'pointer', display: 'flex' },
  form: { display: 'flex', flexDirection: 'column', gap: '0.85rem' },
  row: { display: 'flex', gap: '0.75rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 },
  label: { fontSize: '0.78rem', fontWeight: 500, color: '#9191a8' },
  input: { padding: '0.6rem 0.75rem', background: '#0f0f1a', border: '1px solid #2e2e42', borderRadius: 8, color: '#fff', fontSize: '0.875rem', outline: 'none', width: '100%', fontFamily: 'inherit' },
  chips: { display: 'flex', flexWrap: 'wrap', gap: '0.4rem' },
  chip: { padding: '5px 12px', background: '#1e1e2e', border: '1px solid #2e2e42', borderRadius: 20, color: '#9191a8', cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'inherit' },
  chipActive: { background: '#2a2050', borderColor: '#7c6ff7', color: '#7c6ff7' },
  splitHint: { marginTop: '0.4rem', fontSize: '0.82rem', color: '#9191a8', background: '#1a1428', padding: '0.5rem 0.75rem', borderRadius: 8 },
  modalActions: { display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' },
  cancelBtn: { padding: '0.55rem 1.1rem', background: 'transparent', border: '1px solid #2e2e42', borderRadius: 8, color: '#9191a8', cursor: 'pointer', fontSize: '0.875rem' },
  submitBtn: { padding: '0.55rem 1.25rem', background: '#7c6ff7', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 },
}
