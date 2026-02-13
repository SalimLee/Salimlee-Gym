'use client'

import { useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

interface Member { id: string; created_at: string; updated_at: string; name: string; email: string; phone: string | null; notes: string | null; active: boolean }
interface Subscription { id: string; created_at: string; updated_at: string; member_id: string; name: string; type: string; start_date: string; end_date: string | null; total_units: number | null; remaining_units: number | null; price: number; status: 'active' | 'expired' | 'cancelled' | 'paused'; notes: string | null }
type SubStatus = 'active' | 'expired' | 'cancelled' | 'paused'

const STATUS_CONFIG: Record<SubStatus, { label: string; color: string; bg: string }> = {
  active: { label: 'Aktiv', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30' },
  expired: { label: 'Abgelaufen', color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/30' },
  cancelled: { label: 'Gekündigt', color: 'text-dark-500', bg: 'bg-dark-700/50 border-dark-600' },
  paused: { label: 'Pausiert', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30' },
}

interface SubscriptionsTabProps {
  subscriptions: Subscription[]
  setSubscriptions: React.Dispatch<React.SetStateAction<Subscription[]>>
  members: Member[]
  supabase: SupabaseClient
  onRefresh: () => void
}

export default function SubscriptionsTab({ subscriptions, setSubscriptions, members, supabase, onRefresh }: SubscriptionsTabProps) {
  const [filter, setFilter] = useState<SubStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    member_id: '', name: '', type: 'monthly' as string, start_date: '', end_date: '',
    total_units: '', remaining_units: '', price: '', notes: '',
  })

  const getMemberName = (memberId: string) => members.find(m => m.id === memberId)?.name || 'Unbekannt'

  const filteredSubs = subscriptions.filter(s => {
    const matchesFilter = filter === 'all' || s.status === filter
    const memberName = getMemberName(s.member_id)
    const matchesSearch = search === '' ||
      memberName.toLowerCase().includes(search.toLowerCase()) ||
      s.name.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const stats = {
    active: subscriptions.filter(s => s.status === 'active').length,
    expired: subscriptions.filter(s => s.status === 'expired').length,
    paused: subscriptions.filter(s => s.status === 'paused').length,
  }

  const now = new Date()

  const daysUntil = (date: string) => {
    const diff = new Date(date).getTime() - now.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const formatDate = (date: string) => new Date(date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const resetForm = () => {
    setFormData({ member_id: '', name: '', type: 'monthly', start_date: '', end_date: '', total_units: '', remaining_units: '', price: '', notes: '' })
    setShowForm(false)
  }

  const saveSub = async () => {
    if (!formData.member_id || !formData.name || !formData.start_date || !formData.price) return
    setSaving(true)

    const insertData = {
      member_id: formData.member_id,
      name: formData.name,
      type: formData.type,
      start_date: formData.start_date,
      end_date: formData.end_date || null,
      total_units: formData.total_units ? parseInt(formData.total_units) : null,
      remaining_units: formData.remaining_units ? parseInt(formData.remaining_units) : null,
      price: parseFloat(formData.price),
      notes: formData.notes || null,
    }

    const { data, error } = await supabase.from('subscriptions').insert(insertData).select().single()
    if (!error && data) {
      setSubscriptions(prev => [data as Subscription, ...prev])
    }
    setSaving(false)
    resetForm()
  }

  const updateStatus = async (id: string, status: SubStatus) => {
    const { error } = await supabase.from('subscriptions').update({ status }).eq('id', id)
    if (!error) {
      setSubscriptions(prev => prev.map(s => s.id === id ? { ...s, status } : s))
    }
  }

  const updateUnits = async (id: string, remaining: number) => {
    const { error } = await supabase.from('subscriptions').update({ remaining_units: remaining }).eq('id', id)
    if (!error) {
      setSubscriptions(prev => prev.map(s => s.id === id ? { ...s, remaining_units: remaining } : s))
    }
  }

  return (
    <div className="space-y-6">
      {/* Statistiken */}
      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => setFilter(filter === 'active' ? 'all' : 'active')} className={`p-4 rounded-xl border transition-all text-left ${filter === 'active' ? 'bg-green-500/10 border-green-500/50' : 'bg-dark-900/50 border-dark-800'}`}>
          <p className="text-2xl font-black text-green-400">{stats.active}</p>
          <p className="text-xs text-dark-400">Aktiv</p>
        </button>
        <button onClick={() => setFilter(filter === 'paused' ? 'all' : 'paused')} className={`p-4 rounded-xl border transition-all text-left ${filter === 'paused' ? 'bg-yellow-500/10 border-yellow-500/50' : 'bg-dark-900/50 border-dark-800'}`}>
          <p className="text-2xl font-black text-yellow-400">{stats.paused}</p>
          <p className="text-xs text-dark-400">Pausiert</p>
        </button>
        <button onClick={() => setFilter(filter === 'expired' ? 'all' : 'expired')} className={`p-4 rounded-xl border transition-all text-left ${filter === 'expired' ? 'bg-red-500/10 border-red-500/50' : 'bg-dark-900/50 border-dark-800'}`}>
          <p className="text-2xl font-black text-red-400">{stats.expired}</p>
          <p className="text-xs text-dark-400">Abgelaufen</p>
        </button>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Abo suchen (Mitglied, Name)..." className="w-full pl-10 pr-4 py-3 bg-dark-900/50 border border-dark-800 rounded-xl text-dark-100 placeholder:text-dark-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm" />
        </div>
        <button onClick={() => { resetForm(); setShowForm(true) }} className="px-5 py-3 bg-brand-500 text-dark-950 font-bold rounded-xl hover:bg-brand-400 transition-colors text-sm whitespace-nowrap">
          + Neues Abo
        </button>
      </div>

      {/* Formular */}
      {showForm && (
        <div className="bg-dark-900/50 rounded-xl border border-brand-500/30 p-5">
          <h3 className="font-bold text-dark-100 mb-4">Neues Abonnement</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <select value={formData.member_id} onChange={e => setFormData(p => ({ ...p, member_id: e.target.value }))} className="input-field text-sm">
              <option value="">Mitglied wählen *</option>
              {members.filter(m => m.active).map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <select value={formData.type} onChange={e => setFormData(p => ({ ...p, type: e.target.value }))} className="input-field text-sm">
              <option value="monthly">Monatsabo</option>
              <option value="punch_card">Mehrfachkarte</option>
            </select>
            <input type="text" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Bezeichnung (z.B. Monatskarte Gruppenkurse) *" className="input-field text-sm sm:col-span-2" />
            <div>
              <label className="text-xs text-dark-500 block mb-1">Startdatum *</label>
              <input type="date" value={formData.start_date} onChange={e => setFormData(p => ({ ...p, start_date: e.target.value }))} className="input-field text-sm" />
            </div>
            {formData.type === 'monthly' && (
              <div>
                <label className="text-xs text-dark-500 block mb-1">Enddatum</label>
                <input type="date" value={formData.end_date} onChange={e => setFormData(p => ({ ...p, end_date: e.target.value }))} className="input-field text-sm" />
              </div>
            )}
            {formData.type === 'punch_card' && (
              <>
                <input type="number" value={formData.total_units} onChange={e => setFormData(p => ({ ...p, total_units: e.target.value, remaining_units: e.target.value }))} placeholder="Gesamteinheiten (z.B. 10)" className="input-field text-sm" />
                <input type="number" value={formData.remaining_units} onChange={e => setFormData(p => ({ ...p, remaining_units: e.target.value }))} placeholder="Verbleibende Einheiten" className="input-field text-sm" />
              </>
            )}
            <input type="number" step="0.01" value={formData.price} onChange={e => setFormData(p => ({ ...p, price: e.target.value }))} placeholder="Preis (€) *" className="input-field text-sm" />
            <input type="text" value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} placeholder="Notizen" className="input-field text-sm" />
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={saveSub} disabled={saving || !formData.member_id || !formData.name || !formData.start_date || !formData.price} className="px-5 py-2 bg-brand-500 text-dark-950 font-bold rounded-lg hover:bg-brand-400 transition-colors text-sm disabled:opacity-50">
              {saving ? 'Speichert...' : 'Abo erstellen'}
            </button>
            <button onClick={resetForm} className="px-5 py-2 text-dark-400 border border-dark-700 rounded-lg hover:border-dark-600 transition-colors text-sm">Abbrechen</button>
          </div>
        </div>
      )}

      {/* Abo-Liste */}
      <div className="bg-dark-900/50 rounded-xl border border-dark-800 overflow-hidden">
        <div className="p-4 border-b border-dark-800 flex items-center justify-between">
          <h2 className="font-bold text-dark-100">
            Abonnements
            <span className="text-dark-500 font-normal ml-2 text-sm">{filteredSubs.length} Ergebnisse</span>
          </h2>
          <button onClick={onRefresh} className="text-sm text-dark-400 hover:text-brand-500 transition-colors">Aktualisieren</button>
        </div>

        {filteredSubs.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-dark-500">{search ? 'Kein Abo gefunden' : 'Noch keine Abos angelegt'}</p>
          </div>
        ) : (
          <div className="divide-y divide-dark-800">
            {filteredSubs.map(sub => {
              const member = members.find(m => m.id === sub.member_id)
              const isExpiringSoon = sub.status === 'active' && sub.end_date && daysUntil(sub.end_date) <= 30 && daysUntil(sub.end_date) > 0
              const isExpired = sub.end_date && daysUntil(sub.end_date) <= 0 && sub.status === 'active'

              return (
                <div key={sub.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-dark-100">{member?.name || 'Unbekannt'}</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs border ${STATUS_CONFIG[sub.status].bg} ${STATUS_CONFIG[sub.status].color}`}>
                          {STATUS_CONFIG[sub.status].label}
                        </span>
                        {isExpiringSoon && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-orange-400/10 text-orange-400 border border-orange-400/30">
                            {daysUntil(sub.end_date!)} Tage
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-brand-500">{sub.name}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-dark-400">
                        <span>{formatDate(sub.start_date)}{sub.end_date ? ` - ${formatDate(sub.end_date)}` : ''}</span>
                        <span className="font-bold text-dark-300">{Number(sub.price).toFixed(0)}€</span>
                        {sub.type === 'punch_card' && sub.total_units && (
                          <span>{sub.remaining_units}/{sub.total_units} Einheiten</span>
                        )}
                      </div>

                      {/* Progress bar für Monatsabos */}
                      {sub.status === 'active' && sub.end_date && sub.type === 'monthly' && (
                        <div className="mt-2 h-1.5 bg-dark-700 rounded-full overflow-hidden max-w-xs">
                          <div
                            className={`h-full rounded-full transition-all ${daysUntil(sub.end_date) <= 7 ? 'bg-red-500' : daysUntil(sub.end_date) <= 30 ? 'bg-yellow-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.max(0, Math.min(100, (daysUntil(sub.end_date) / Math.max(1, Math.ceil((new Date(sub.end_date).getTime() - new Date(sub.start_date).getTime()) / (1000 * 60 * 60 * 24)))) * 100))}%` }}
                          />
                        </div>
                      )}

                      {/* Progress bar für Punch Cards */}
                      {sub.status === 'active' && sub.type === 'punch_card' && sub.total_units && sub.remaining_units !== null && (
                        <div className="mt-2 h-1.5 bg-dark-700 rounded-full overflow-hidden max-w-xs">
                          <div
                            className={`h-full rounded-full transition-all ${(sub.remaining_units / sub.total_units) <= 0.2 ? 'bg-red-500' : (sub.remaining_units / sub.total_units) <= 0.4 ? 'bg-yellow-500' : 'bg-blue-500'}`}
                            style={{ width: `${(sub.remaining_units / sub.total_units) * 100}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Aktionen */}
                    <div className="flex items-center gap-1 shrink-0">
                      {sub.status === 'active' && sub.type === 'punch_card' && sub.remaining_units !== null && sub.remaining_units > 0 && (
                        <button
                          onClick={() => updateUnits(sub.id, sub.remaining_units! - 1)}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 transition-all"
                          title="Eine Einheit abziehen"
                        >
                          -1
                        </button>
                      )}
                      {sub.status === 'active' && (
                        <button onClick={() => updateStatus(sub.id, 'paused')} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/20 transition-all">
                          Pause
                        </button>
                      )}
                      {sub.status === 'paused' && (
                        <button onClick={() => updateStatus(sub.id, 'active')} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20 transition-all">
                          Fortsetzen
                        </button>
                      )}
                      {(sub.status === 'active' || sub.status === 'paused') && (
                        <button onClick={() => updateStatus(sub.id, 'cancelled')} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-all">
                          Kündigen
                        </button>
                      )}
                      {isExpired && (
                        <button onClick={() => updateStatus(sub.id, 'expired')} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-all">
                          Als abgelaufen markieren
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
