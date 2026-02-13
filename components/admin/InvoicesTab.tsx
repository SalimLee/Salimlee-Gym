'use client'

import { useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

interface Member { id: string; created_at: string; updated_at: string; name: string; email: string; phone: string | null; notes: string | null; active: boolean }
interface Invoice { id: string; created_at: string; updated_at: string; member_id: string; invoice_number: string; description: string; amount: number; status: 'open' | 'paid' | 'overdue' | 'cancelled'; due_date: string; paid_date: string | null; notes: string | null }
type InvoiceStatus = 'open' | 'paid' | 'overdue' | 'cancelled'

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; bg: string }> = {
  open: { label: 'Offen', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30' },
  paid: { label: 'Bezahlt', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30' },
  overdue: { label: 'Überfällig', color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/30' },
  cancelled: { label: 'Storniert', color: 'text-dark-500', bg: 'bg-dark-700/50 border-dark-600' },
}

interface InvoicesTabProps {
  invoices: Invoice[]
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>
  members: Member[]
  supabase: SupabaseClient
  onRefresh: () => void
}

export default function InvoicesTab({ invoices, setInvoices, members, supabase, onRefresh }: InvoicesTabProps) {
  const [filter, setFilter] = useState<InvoiceStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    member_id: '', description: '', amount: '', due_date: '', notes: '',
  })

  const getMemberName = (memberId: string) => members.find(m => m.id === memberId)?.name || 'Unbekannt'

  const filteredInvoices = invoices.filter(inv => {
    const matchesFilter = filter === 'all' || inv.status === filter
    const memberName = getMemberName(inv.member_id)
    const matchesSearch = search === '' ||
      memberName.toLowerCase().includes(search.toLowerCase()) ||
      inv.description.toLowerCase().includes(search.toLowerCase()) ||
      inv.invoice_number.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const openAmount = invoices.filter(i => i.status === 'open' || i.status === 'overdue').reduce((s, i) => s + Number(i.amount), 0)
  const paidAmount = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0)

  const stats = {
    open: invoices.filter(i => i.status === 'open').length,
    paid: invoices.filter(i => i.status === 'paid').length,
    overdue: invoices.filter(i => i.status === 'overdue').length,
  }

  const formatDate = (date: string) => new Date(date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const generateInvoiceNumber = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const count = invoices.filter(i => i.invoice_number.startsWith(`RE-${year}${month}`)).length + 1
    return `RE-${year}${month}-${String(count).padStart(3, '0')}`
  }

  const resetForm = () => {
    setFormData({ member_id: '', description: '', amount: '', due_date: '', notes: '' })
    setShowForm(false)
  }

  const saveInvoice = async () => {
    if (!formData.member_id || !formData.description || !formData.amount || !formData.due_date) return
    setSaving(true)

    const { data, error } = await supabase.from('invoices').insert({
      member_id: formData.member_id,
      invoice_number: generateInvoiceNumber(),
      description: formData.description,
      amount: parseFloat(formData.amount),
      due_date: formData.due_date,
      notes: formData.notes || null,
    }).select().single()

    if (!error && data) {
      setInvoices(prev => [data, ...prev])
    }
    setSaving(false)
    resetForm()
  }

  const markAsPaid = async (id: string) => {
    const today = new Date().toISOString().split('T')[0]
    const { error } = await supabase.from('invoices').update({ status: 'paid' as InvoiceStatus, paid_date: today }).eq('id', id)
    if (!error) {
      setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: 'paid' as InvoiceStatus, paid_date: today } : i))
    }
  }

  const markAsOverdue = async (id: string) => {
    const { error } = await supabase.from('invoices').update({ status: 'overdue' as InvoiceStatus }).eq('id', id)
    if (!error) {
      setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: 'overdue' as InvoiceStatus } : i))
    }
  }

  const cancelInvoice = async (id: string) => {
    const { error } = await supabase.from('invoices').update({ status: 'cancelled' as InvoiceStatus }).eq('id', id)
    if (!error) {
      setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: 'cancelled' as InvoiceStatus } : i))
    }
  }

  return (
    <div className="space-y-6">
      {/* Übersicht */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button onClick={() => setFilter(filter === 'open' ? 'all' : 'open')} className={`p-4 rounded-xl border transition-all text-left ${filter === 'open' ? 'bg-yellow-500/10 border-yellow-500/50' : 'bg-dark-900/50 border-dark-800'}`}>
          <p className="text-2xl font-black text-yellow-400">{stats.open}</p>
          <p className="text-xs text-dark-400">Offen</p>
        </button>
        <button onClick={() => setFilter(filter === 'overdue' ? 'all' : 'overdue')} className={`p-4 rounded-xl border transition-all text-left ${filter === 'overdue' ? 'bg-red-500/10 border-red-500/50' : 'bg-dark-900/50 border-dark-800'}`}>
          <p className="text-2xl font-black text-red-400">{stats.overdue}</p>
          <p className="text-xs text-dark-400">Überfällig</p>
        </button>
        <button onClick={() => setFilter(filter === 'paid' ? 'all' : 'paid')} className={`p-4 rounded-xl border transition-all text-left ${filter === 'paid' ? 'bg-green-500/10 border-green-500/50' : 'bg-dark-900/50 border-dark-800'}`}>
          <p className="text-2xl font-black text-green-400">{stats.paid}</p>
          <p className="text-xs text-dark-400">Bezahlt</p>
        </button>
        <div className="p-4 rounded-xl bg-dark-900/50 border border-dark-800 text-left">
          <p className="text-2xl font-black text-dark-100">{openAmount.toFixed(0)}€</p>
          <p className="text-xs text-dark-400">Ausstehend</p>
        </div>
      </div>

      {/* Gesamtumsatz Info */}
      {paidAmount > 0 && (
        <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500/5 to-emerald-600/5 border border-emerald-500/20 flex items-center justify-between">
          <span className="text-sm text-dark-400">Gesamtumsatz (bezahlt)</span>
          <span className="font-black text-emerald-400">{paidAmount.toFixed(2)}€</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechnung suchen (Mitglied, Nr., Beschreibung)..." className="w-full pl-10 pr-4 py-3 bg-dark-900/50 border border-dark-800 rounded-xl text-dark-100 placeholder:text-dark-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm" />
        </div>
        <button onClick={() => { resetForm(); setShowForm(true) }} className="px-5 py-3 bg-brand-500 text-dark-950 font-bold rounded-xl hover:bg-brand-400 transition-colors text-sm whitespace-nowrap">
          + Neue Rechnung
        </button>
      </div>

      {/* Formular */}
      {showForm && (
        <div className="bg-dark-900/50 rounded-xl border border-brand-500/30 p-5">
          <h3 className="font-bold text-dark-100 mb-4">Neue Rechnung</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <select value={formData.member_id} onChange={e => setFormData(p => ({ ...p, member_id: e.target.value }))} className="input-field text-sm">
              <option value="">Mitglied wählen *</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <input type="number" step="0.01" value={formData.amount} onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))} placeholder="Betrag (€) *" className="input-field text-sm" />
            <input type="text" value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Beschreibung (z.B. Monatskarte Februar) *" className="input-field text-sm sm:col-span-2" />
            <div>
              <label className="text-xs text-dark-500 block mb-1">Fällig am *</label>
              <input type="date" value={formData.due_date} onChange={e => setFormData(p => ({ ...p, due_date: e.target.value }))} className="input-field text-sm" />
            </div>
            <input type="text" value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} placeholder="Notizen" className="input-field text-sm" />
          </div>
          <p className="text-xs text-dark-500 mt-3">Rechnungsnummer wird automatisch generiert: {generateInvoiceNumber()}</p>
          <div className="flex gap-3 mt-4">
            <button onClick={saveInvoice} disabled={saving || !formData.member_id || !formData.description || !formData.amount || !formData.due_date} className="px-5 py-2 bg-brand-500 text-dark-950 font-bold rounded-lg hover:bg-brand-400 transition-colors text-sm disabled:opacity-50">
              {saving ? 'Speichert...' : 'Rechnung erstellen'}
            </button>
            <button onClick={resetForm} className="px-5 py-2 text-dark-400 border border-dark-700 rounded-lg hover:border-dark-600 transition-colors text-sm">Abbrechen</button>
          </div>
        </div>
      )}

      {/* Rechnungsliste */}
      <div className="bg-dark-900/50 rounded-xl border border-dark-800 overflow-hidden">
        <div className="p-4 border-b border-dark-800 flex items-center justify-between">
          <h2 className="font-bold text-dark-100">
            Rechnungen
            <span className="text-dark-500 font-normal ml-2 text-sm">{filteredInvoices.length} Ergebnisse</span>
          </h2>
          <button onClick={onRefresh} className="text-sm text-dark-400 hover:text-brand-500 transition-colors">Aktualisieren</button>
        </div>

        {filteredInvoices.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-dark-500">{search ? 'Keine Rechnung gefunden' : 'Noch keine Rechnungen erstellt'}</p>
          </div>
        ) : (
          <div className="divide-y divide-dark-800">
            {filteredInvoices.map(inv => {
              const member = members.find(m => m.id === inv.member_id)
              const isOverdue = inv.status === 'open' && new Date(inv.due_date) < new Date()

              return (
                <div key={inv.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-dark-100">{member?.name || 'Unbekannt'}</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs border ${isOverdue ? STATUS_CONFIG.overdue.bg + ' ' + STATUS_CONFIG.overdue.color : STATUS_CONFIG[inv.status].bg + ' ' + STATUS_CONFIG[inv.status].color}`}>
                          {isOverdue ? 'Überfällig' : STATUS_CONFIG[inv.status].label}
                        </span>
                      </div>
                      <p className="text-sm text-dark-300">{inv.description}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-dark-500">
                        <span>{inv.invoice_number}</span>
                        <span>Fällig: {formatDate(inv.due_date)}</span>
                        {inv.paid_date && <span className="text-green-400">Bezahlt: {formatDate(inv.paid_date)}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <p className={`text-lg font-black ${inv.status === 'paid' ? 'text-green-400' : isOverdue ? 'text-red-400' : 'text-dark-100'}`}>
                        {Number(inv.amount).toFixed(2)}€
                      </p>
                      <div className="flex gap-1">
                        {(inv.status === 'open' || inv.status === 'overdue') && (
                          <button onClick={() => markAsPaid(inv.id)} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20 transition-all">
                            Bezahlt
                          </button>
                        )}
                        {inv.status === 'open' && !isOverdue && (
                          <button onClick={() => markAsOverdue(inv.id)} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-all">
                            Mahnen
                          </button>
                        )}
                        {inv.status !== 'cancelled' && inv.status !== 'paid' && (
                          <button onClick={() => cancelInvoice(inv.id)} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-dark-700/50 text-dark-400 border border-dark-600 hover:border-dark-500 transition-all">
                            Stornieren
                          </button>
                        )}
                      </div>
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
