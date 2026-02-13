'use client'

import { useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

interface Member { id: string; created_at: string; updated_at: string; name: string; email: string; phone: string | null; notes: string | null; active: boolean }
interface Subscription { id: string; created_at: string; updated_at: string; member_id: string; name: string; type: string; start_date: string; end_date: string | null; total_units: number | null; remaining_units: number | null; price: number; status: 'active' | 'expired' | 'cancelled' | 'paused'; notes: string | null }
interface Invoice { id: string; created_at: string; updated_at: string; member_id: string; invoice_number: string; description: string; amount: number; status: 'open' | 'paid' | 'overdue' | 'cancelled'; due_date: string; paid_date: string | null; notes: string | null }
interface Booking { id: string; created_at: string; updated_at: string; name: string; email: string; phone: string | null; service: string; people: number; preferred_date: string | null; message: string | null; status: 'pending' | 'confirmed' | 'cancelled'; admin_notes: string | null }

interface MembersTabProps {
  members: Member[]
  setMembers: React.Dispatch<React.SetStateAction<Member[]>>
  subscriptions: Subscription[]
  invoices: Invoice[]
  bookings: Booking[]
  supabase: SupabaseClient
  onRefresh: () => void
  initialSearch?: string
}

export default function MembersTab({ members, setMembers, subscriptions, invoices, bookings, supabase, onRefresh, initialSearch = '' }: MembersTabProps) {
  const [search, setSearch] = useState(initialSearch)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', notes: '' })
  const [editingId, setEditingId] = useState<string | null>(null)

  const filteredMembers = members.filter(m =>
    search === '' ||
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase()) ||
    (m.phone && m.phone.includes(search))
  )

  const getMemberSubs = (memberId: string) => subscriptions.filter(s => s.member_id === memberId)
  const getMemberInvoices = (memberId: string) => invoices.filter(i => i.member_id === memberId)
  const getMemberBookings = (email: string) => bookings.filter(b => b.email.toLowerCase() === email.toLowerCase())

  const getActiveSub = (memberId: string) => subscriptions.find(s => s.member_id === memberId && s.status === 'active')
  const getOpenInvoiceCount = (memberId: string) => invoices.filter(i => i.member_id === memberId && (i.status === 'open' || i.status === 'overdue')).length

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', notes: '' })
    setEditingId(null)
    setShowForm(false)
  }

  const saveMember = async () => {
    if (!formData.name || !formData.email) return
    setSaving(true)

    if (editingId) {
      const { data, error } = await supabase
        .from('members')
        .update({ name: formData.name, email: formData.email, phone: formData.phone || null, notes: formData.notes || null })
        .eq('id', editingId)
        .select()
        .single()
      if (!error && data) {
        setMembers(prev => prev.map(m => m.id === editingId ? data : m))
        if (selectedMember?.id === editingId) setSelectedMember(data)
      }
    } else {
      const { data, error } = await supabase
        .from('members')
        .insert({ name: formData.name, email: formData.email, phone: formData.phone || null, notes: formData.notes || null })
        .select()
        .single()
      if (!error && data) {
        setMembers(prev => [data, ...prev])
      }
    }
    setSaving(false)
    resetForm()
  }

  const toggleActive = async (member: Member) => {
    const { error } = await supabase
      .from('members')
      .update({ active: !member.active })
      .eq('id', member.id)
    if (!error) {
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, active: !m.active } : m))
      if (selectedMember?.id === member.id) setSelectedMember({ ...member, active: !member.active })
    }
  }

  const startEdit = (member: Member) => {
    setFormData({ name: member.name, email: member.email, phone: member.phone || '', notes: member.notes || '' })
    setEditingId(member.id)
    setShowForm(true)
  }

  const formatDate = (date: string) => new Date(date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const daysUntil = (date: string) => {
    const diff = new Date(date).getTime() - new Date().getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="space-y-6">
      {/* Header mit Suche und Hinzufügen */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Mitglied suchen (Name, Email, Telefon)..."
            className="w-full pl-10 pr-4 py-3 bg-dark-900/50 border border-dark-800 rounded-xl text-dark-100 placeholder:text-dark-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm"
          />
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true) }}
          className="px-5 py-3 bg-brand-500 text-dark-950 font-bold rounded-xl hover:bg-brand-400 transition-colors text-sm whitespace-nowrap"
        >
          + Mitglied hinzufügen
        </button>
      </div>

      {/* Formular */}
      {showForm && (
        <div className="bg-dark-900/50 rounded-xl border border-brand-500/30 p-5">
          <h3 className="font-bold text-dark-100 mb-4">{editingId ? 'Mitglied bearbeiten' : 'Neues Mitglied'}</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <input type="text" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Name *" className="input-field text-sm" />
            <input type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} placeholder="E-Mail *" className="input-field text-sm" />
            <input type="tel" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} placeholder="Telefon" className="input-field text-sm" />
            <input type="text" value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} placeholder="Notizen" className="input-field text-sm" />
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={saveMember} disabled={saving || !formData.name || !formData.email} className="px-5 py-2 bg-brand-500 text-dark-950 font-bold rounded-lg hover:bg-brand-400 transition-colors text-sm disabled:opacity-50">
              {saving ? 'Speichert...' : editingId ? 'Speichern' : 'Hinzufügen'}
            </button>
            <button onClick={resetForm} className="px-5 py-2 text-dark-400 border border-dark-700 rounded-lg hover:border-dark-600 transition-colors text-sm">Abbrechen</button>
          </div>
        </div>
      )}

      {/* Mitgliederliste und Detail */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-dark-900/50 rounded-xl border border-dark-800 overflow-hidden">
            <div className="p-4 border-b border-dark-800 flex items-center justify-between">
              <h2 className="font-bold text-dark-100">
                Mitglieder
                <span className="text-dark-500 font-normal ml-2 text-sm">{filteredMembers.length} Ergebnisse</span>
              </h2>
              <button onClick={onRefresh} className="text-sm text-dark-400 hover:text-brand-500 transition-colors">Aktualisieren</button>
            </div>

            {filteredMembers.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-dark-500">{search ? 'Kein Mitglied gefunden' : 'Noch keine Mitglieder angelegt'}</p>
              </div>
            ) : (
              <div className="divide-y divide-dark-800">
                {filteredMembers.map(member => {
                  const activeSub = getActiveSub(member.id)
                  const openInvCount = getOpenInvoiceCount(member.id)
                  return (
                    <button
                      key={member.id}
                      onClick={() => setSelectedMember(member)}
                      className={`w-full p-4 text-left hover:bg-dark-800/50 transition-colors ${
                        selectedMember?.id === member.id ? 'bg-dark-800/50 border-l-2 border-l-brand-500' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${member.active ? 'bg-brand-500/20 text-brand-500' : 'bg-dark-700 text-dark-500'}`}>
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className={`font-bold truncate ${member.active ? 'text-dark-100' : 'text-dark-500'}`}>{member.name}</p>
                              <p className="text-xs text-dark-500">{member.email}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {activeSub && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-blue-400/10 text-blue-400 border border-blue-400/30">
                              Abo aktiv
                            </span>
                          )}
                          {openInvCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-red-400/10 text-red-400 border border-red-400/30">
                              {openInvCount} offen
                            </span>
                          )}
                          {!member.active && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-dark-700 text-dark-500 border border-dark-600">
                              Inaktiv
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Detail-Panel */}
        <div className="lg:col-span-1">
          {selectedMember ? (
            <div className="bg-dark-900/50 rounded-xl border border-dark-800 sticky top-24">
              <div className="p-4 border-b border-dark-800 flex items-center justify-between">
                <h3 className="font-bold text-dark-100">Mitglied-Details</h3>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(selectedMember)} className="text-xs text-brand-500 hover:underline">Bearbeiten</button>
                  <button onClick={() => toggleActive(selectedMember)} className="text-xs text-dark-400 hover:text-dark-200">
                    {selectedMember.active ? 'Deaktivieren' : 'Aktivieren'}
                  </button>
                </div>
              </div>
              <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Kontaktdaten */}
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-brand-500/20 flex items-center justify-center text-lg font-bold text-brand-500">
                      {selectedMember.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-dark-100 font-bold text-lg">{selectedMember.name}</p>
                      <p className={`text-xs ${selectedMember.active ? 'text-green-400' : 'text-dark-500'}`}>
                        {selectedMember.active ? 'Aktives Mitglied' : 'Inaktiv'}
                      </p>
                    </div>
                  </div>
                  <a href={`mailto:${selectedMember.email}`} className="text-sm text-brand-500 hover:underline block">{selectedMember.email}</a>
                  {selectedMember.phone && <a href={`tel:${selectedMember.phone}`} className="text-sm text-brand-500 hover:underline block">{selectedMember.phone}</a>}
                  {selectedMember.notes && <p className="text-xs text-dark-400 mt-2 bg-dark-800/50 rounded-lg p-2">{selectedMember.notes}</p>}
                  <p className="text-xs text-dark-500 mt-2">Mitglied seit {formatDate(selectedMember.created_at)}</p>
                </div>

                {/* Abos */}
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-2">Abonnements</p>
                  {getMemberSubs(selectedMember.id).length === 0 ? (
                    <p className="text-xs text-dark-600">Keine Abos</p>
                  ) : (
                    <div className="space-y-2">
                      {getMemberSubs(selectedMember.id).map(sub => {
                        const statusColors: Record<string, string> = {
                          active: 'text-green-400 bg-green-400/10 border-green-400/30',
                          expired: 'text-red-400 bg-red-400/10 border-red-400/30',
                          cancelled: 'text-dark-500 bg-dark-700/50 border-dark-600',
                          paused: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
                        }
                        const statusLabels: Record<string, string> = {
                          active: 'Aktiv', expired: 'Abgelaufen', cancelled: 'Gekündigt', paused: 'Pausiert',
                        }
                        return (
                          <div key={sub.id} className="bg-dark-800/50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm font-bold text-dark-100">{sub.name}</p>
                              <span className={`px-2 py-0.5 rounded-full text-xs border ${statusColors[sub.status]}`}>{statusLabels[sub.status]}</span>
                            </div>
                            <p className="text-xs text-dark-400">
                              {sub.type === 'punch_card' && sub.remaining_units !== null && sub.total_units !== null
                                ? `${sub.remaining_units}/${sub.total_units} Einheiten übrig`
                                : sub.end_date
                                  ? `${daysUntil(sub.end_date) > 0 ? `Noch ${daysUntil(sub.end_date)} Tage` : 'Abgelaufen'} (bis ${formatDate(sub.end_date)})`
                                  : `Seit ${formatDate(sub.start_date)}`
                              }
                            </p>
                            {sub.status === 'active' && sub.end_date && (
                              <div className="mt-2 h-1.5 bg-dark-700 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${daysUntil(sub.end_date) <= 7 ? 'bg-red-500' : daysUntil(sub.end_date) <= 30 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                  style={{ width: `${Math.max(0, Math.min(100, (daysUntil(sub.end_date) / Math.max(1, Math.ceil((new Date(sub.end_date).getTime() - new Date(sub.start_date).getTime()) / (1000 * 60 * 60 * 24)))) * 100))}%` }}
                                />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Rechnungen */}
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-2">Rechnungen</p>
                  {getMemberInvoices(selectedMember.id).length === 0 ? (
                    <p className="text-xs text-dark-600">Keine Rechnungen</p>
                  ) : (
                    <div className="space-y-2">
                      {getMemberInvoices(selectedMember.id).slice(0, 5).map(inv => {
                        const statusColors: Record<string, string> = {
                          open: 'text-yellow-400', paid: 'text-green-400', overdue: 'text-red-400', cancelled: 'text-dark-500',
                        }
                        return (
                          <div key={inv.id} className="flex items-center justify-between bg-dark-800/50 rounded-lg p-2">
                            <div>
                              <p className="text-xs font-medium text-dark-200">{inv.description}</p>
                              <p className="text-xs text-dark-500">{inv.invoice_number}</p>
                            </div>
                            <p className={`text-sm font-bold ${statusColors[inv.status]}`}>{Number(inv.amount).toFixed(0)}€</p>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Buchungen (über Email verknüpft) */}
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-2">Buchungen</p>
                  {getMemberBookings(selectedMember.email).length === 0 ? (
                    <p className="text-xs text-dark-600">Keine Buchungen</p>
                  ) : (
                    <div className="space-y-2">
                      {getMemberBookings(selectedMember.email).slice(0, 5).map(b => (
                        <div key={b.id} className="flex items-center justify-between bg-dark-800/50 rounded-lg p-2">
                          <div>
                            <p className="text-xs font-medium text-dark-200">{b.service}</p>
                            <p className="text-xs text-dark-500">{formatDate(b.created_at)}</p>
                          </div>
                          <span className={`text-xs ${b.status === 'confirmed' ? 'text-green-400' : b.status === 'pending' ? 'text-yellow-400' : 'text-red-400'}`}>
                            {b.status === 'confirmed' ? 'Bestätigt' : b.status === 'pending' ? 'Offen' : 'Storniert'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-dark-900/50 rounded-xl border border-dark-800 p-8 text-center">
              <svg className="w-12 h-12 text-dark-700 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              <p className="text-dark-500 text-sm">Klicke auf ein Mitglied, um Details zu sehen</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
