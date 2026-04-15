'use client'

import { useState, useCallback, useEffect } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import TaxExportModal from './TaxExportModal'

interface Member { id: string; created_at: string; updated_at: string; name: string; email: string; phone: string | null; notes: string | null; active: boolean }
interface Invoice { id: string; created_at: string; updated_at: string; member_id: string; invoice_number: string; description: string; amount: number; status: 'open' | 'paid' | 'overdue' | 'cancelled'; due_date: string; paid_date: string | null; notes: string | null; source?: 'manual' | 'stripe'; stripe_invoice_id?: string | null; stripe_invoice_pdf_url?: string | null }
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
  const [sourceFilter, setSourceFilter] = useState<'all' | 'manual' | 'stripe'>('all')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    member_id: '', description: '', amount: '', due_date: '', notes: '',
  })
  const [syncing, setSyncing] = useState(false)
  const [snackbar, setSnackbar] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [showExportModal, setShowExportModal] = useState(false)
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null)

  useEffect(() => {
    if (!snackbar) return
    const t = setTimeout(() => setSnackbar(null), 4000)
    return () => clearTimeout(t)
  }, [snackbar])

  const getMemberName = (memberId: string) => members.find(m => m.id === memberId)?.name || 'Unbekannt'

  const filteredInvoices = invoices.filter(inv => {
    const matchesFilter = filter === 'all' || inv.status === filter
    const matchesSource = sourceFilter === 'all' || (inv.source || 'manual') === sourceFilter
    const memberName = getMemberName(inv.member_id)
    const matchesSearch = search === '' ||
      memberName.toLowerCase().includes(search.toLowerCase()) ||
      inv.description.toLowerCase().includes(search.toLowerCase()) ||
      inv.invoice_number.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSource && matchesSearch
  })

  const openAmount = invoices.filter(i => i.status === 'open' || i.status === 'overdue').reduce((s, i) => s + Number(i.amount), 0)
  const paidAmount = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0)
  const stripeCount = invoices.filter(i => (i.source || 'manual') === 'stripe').length

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
      source: 'manual',
    }).select().single()
    if (!error && data) {
      setInvoices(prev => [data, ...prev])
    }
    setSaving(false)
    resetForm()
  }

  const [sendingPaid, setSendingPaid] = useState<string | null>(null)

  const markAsPaid = async (id: string) => {
    const inv = invoices.find(i => i.id === id)
    if (!inv) return

    setSendingPaid(id)
    const today = new Date().toISOString().split('T')[0]

    const { error } = await supabase.from('invoices').update({ status: 'paid' as InvoiceStatus, paid_date: today }).eq('id', id)
    if (!error) setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: 'paid' as InvoiceStatus, paid_date: today } : i))

    // Zahlungsbestätigung mit PDF senden
    const memberEmail = members.find(m => m.id === inv.member_id)?.email
    const memberName = getMemberName(inv.member_id)
    if (memberEmail) {
      try {
        const res = await fetch('/api/invoice/send-paid', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            memberName,
            memberEmail,
            invoiceNumber: inv.invoice_number,
            description: inv.description,
            amount: inv.amount,
            dueDate: inv.due_date,
            paidDate: today,
            createdAt: inv.created_at,
            notes: inv.notes,
          }),
        })
        const data = await res.json()
        if (res.ok && !data.error) {
          setSnackbar({ message: `Zahlungsbestätigung versendet an ${memberName}`, type: 'success' })
        } else {
          setSnackbar({ message: data.error || 'E-Mail fehlgeschlagen', type: 'error' })
        }
      } catch {
        setSnackbar({ message: 'E-Mail fehlgeschlagen', type: 'error' })
      }
    }

    setSendingPaid(null)
  }

  const [sendingDunning, setSendingDunning] = useState<string | null>(null)

  const markAsOverdue = async (id: string) => {
    const inv = invoices.find(i => i.id === id)
    if (!inv) return

    setSendingDunning(id)

    // Status auf overdue setzen
    const { error } = await supabase.from('invoices').update({ status: 'overdue' as InvoiceStatus }).eq('id', id)
    if (!error) setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: 'overdue' as InvoiceStatus } : i))

    // Mahn-E-Mail senden
    const memberEmail = members.find(m => m.id === inv.member_id)?.email
    const memberName = getMemberName(inv.member_id)
    if (memberEmail) {
      try {
        const res = await fetch('/api/invoice/send-dunning', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            memberName,
            memberEmail,
            invoiceNumber: inv.invoice_number,
            description: inv.description,
            amount: inv.amount,
            dueDate: inv.due_date,
            createdAt: inv.created_at,
            notes: inv.notes,
          }),
        })
        const data = await res.json()
        if (res.ok && !data.error) {
          setSnackbar({ message: `Mahnung versendet an ${memberName}`, type: 'success' })
        } else {
          setSnackbar({ message: data.error || 'Mahnung fehlgeschlagen', type: 'error' })
        }
      } catch {
        setSnackbar({ message: 'Mahnung fehlgeschlagen', type: 'error' })
      }
    } else {
      setSnackbar({ message: 'Keine E-Mail-Adresse hinterlegt', type: 'error' })
    }

    setSendingDunning(null)
  }

  const cancelInvoice = async (id: string) => {
    const { error } = await supabase.from('invoices').update({ status: 'cancelled' as InvoiceStatus }).eq('id', id)
    if (!error) setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: 'cancelled' as InvoiceStatus } : i))
  }

  const syncStripe = useCallback(async () => {
    setSyncing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/admin/invoices/sync-stripe', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      const data = await res.json()
      if (res.ok) {
        setSnackbar({ message: `${data.synced} neue, ${data.updated} aktualisiert`, type: 'success' })
        onRefresh()
      } else {
        setSnackbar({ message: data.error || 'Sync fehlgeschlagen', type: 'error' })
      }
    } catch {
      setSnackbar({ message: 'Stripe-Verbindung fehlgeschlagen', type: 'error' })
    }
    setSyncing(false)
  }, [supabase, onRefresh])

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

      {/* Gesamtumsatz + Steuer-Export */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {paidAmount > 0 && (
          <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500/5 to-emerald-600/5 border border-emerald-500/20 flex items-center gap-4 flex-1 min-w-0">
            <span className="text-sm text-dark-400">Gesamtumsatz (bezahlt)</span>
            <span className="font-black text-emerald-400">{paidAmount.toFixed(2)}€</span>
          </div>
        )}
        <button
          onClick={() => setShowExportModal(true)}
          className="px-5 py-3 bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 font-bold rounded-xl hover:bg-indigo-500/20 transition-all text-sm whitespace-nowrap flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          Steuer-Export
        </button>
      </div>

      {/* Source Filter */}
      <div className="flex items-center gap-2">
        {(['all', 'manual', 'stripe'] as const).map(s => (
          <button
            key={s}
            onClick={() => setSourceFilter(s)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${sourceFilter === s ? 'bg-brand-500/10 text-brand-500 border-brand-500/30' : 'bg-dark-900/50 text-dark-400 border-dark-700 hover:border-dark-600'}`}
          >
            {s === 'all' ? 'Alle' : s === 'manual' ? 'Manuell' : `Stripe (${stripeCount})`}
          </button>
        ))}
      </div>

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
          <div className="flex items-center gap-2">
            <button
              onClick={syncStripe}
              disabled={syncing}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/30 hover:bg-purple-500/20 transition-all disabled:opacity-50"
            >
              {syncing ? 'Synchronisiert...' : 'Stripe synchronisieren'}
            </button>
            <button onClick={onRefresh} className="text-sm text-dark-400 hover:text-brand-500 transition-colors">Aktualisieren</button>
          </div>
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
              const isStripe = (inv.source || 'manual') === 'stripe'

              return (
                <div key={inv.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-bold text-dark-100">{member?.name || 'Unbekannt'}</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs border ${isOverdue ? STATUS_CONFIG.overdue.bg + ' ' + STATUS_CONFIG.overdue.color : STATUS_CONFIG[inv.status].bg + ' ' + STATUS_CONFIG[inv.status].color}`}>
                          {isOverdue ? 'Überfällig' : STATUS_CONFIG[inv.status].label}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs border ${isStripe ? 'bg-purple-400/10 text-purple-400 border-purple-400/30' : 'bg-dark-700/50 text-dark-500 border-dark-600'}`}>
                          {isStripe ? 'Stripe' : 'Manuell'}
                        </span>
                      </div>
                      <p className="text-sm text-dark-300">{inv.description}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-dark-500 flex-wrap">
                        <span>{inv.invoice_number}</span>
                        <span>Fällig: {formatDate(inv.due_date)}</span>
                        {inv.paid_date && <span className="text-green-400">Bezahlt: {formatDate(inv.paid_date)}</span>}
                        {inv.notes && <span className="text-dark-600">{inv.notes}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <p className={`text-lg font-black ${inv.status === 'paid' ? 'text-green-400' : isOverdue ? 'text-red-400' : 'text-dark-100'}`}>
                        {Number(inv.amount).toFixed(2)}€
                      </p>
                      <div className="flex gap-1">
                        <button onClick={() => setViewInvoice(inv)} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-dark-700/50 text-dark-300 border border-dark-600 hover:border-dark-500 hover:text-dark-100 transition-all">
                          Ansehen
                        </button>
                        {!isStripe && (inv.status === 'open' || inv.status === 'overdue') && (
                          <button onClick={() => markAsPaid(inv.id)} disabled={sendingPaid === inv.id} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20 transition-all disabled:opacity-50">
                            {sendingPaid === inv.id ? 'Sendet...' : 'Bezahlt'}
                          </button>
                        )}
                        {!isStripe && inv.status === 'open' && !isOverdue && (
                          <button onClick={() => markAsOverdue(inv.id)} disabled={sendingDunning === inv.id} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-all disabled:opacity-50">
                            {sendingDunning === inv.id ? 'Sendet...' : 'Mahnen'}
                          </button>
                        )}
                        {!isStripe && inv.status !== 'cancelled' && inv.status !== 'paid' && (
                          <button onClick={() => cancelInvoice(inv.id)} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-dark-700/50 text-dark-400 border border-dark-600 hover:border-dark-500 transition-all">
                            Stornieren
                          </button>
                        )}
                        {isStripe && inv.stripe_invoice_pdf_url && (
                          <a href={inv.stripe_invoice_pdf_url} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-xs font-bold rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/30 hover:bg-purple-500/20 transition-all">
                            PDF
                          </a>
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

      {/* Rechnungsdetail Modal */}
      {viewInvoice && (() => {
        const inv = viewInvoice
        const member = members.find(m => m.id === inv.member_id)
        const isStripe = (inv.source || 'manual') === 'stripe'
        const isOverdue = inv.status === 'open' && new Date(inv.due_date) < new Date()
        const statusInfo = isOverdue ? STATUS_CONFIG.overdue : STATUS_CONFIG[inv.status]

        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setViewInvoice(null)}>
            <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="p-5 border-b border-dark-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-dark-100 text-lg">{inv.invoice_number}</h3>
                  <p className="text-dark-500 text-sm">{member?.name || 'Unbekannt'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusInfo.bg} ${statusInfo.color}`}>
                    {isOverdue ? 'Überfällig' : statusInfo.label}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${isStripe ? 'bg-purple-400/10 text-purple-400 border-purple-400/30' : 'bg-dark-700/50 text-dark-500 border-dark-600'}`}>
                    {isStripe ? 'Stripe' : 'Manuell'}
                  </span>
                </div>
              </div>

              {/* Details */}
              <div className="p-5 space-y-4">
                <div className="bg-dark-800/50 rounded-xl p-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-dark-400">Beschreibung</span>
                    <span className="text-dark-100 font-medium text-right max-w-[60%]">{inv.description}</span>
                  </div>
                  <div className="flex justify-between border-t border-dark-700 pt-3">
                    <span className="text-dark-400">Betrag</span>
                    <span className="text-xl font-black text-dark-100">{Number(inv.amount).toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between border-t border-dark-700 pt-3">
                    <span className="text-dark-400">Rechnungsdatum</span>
                    <span className="text-dark-200">{formatDate(inv.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dark-400">Fällig am</span>
                    <span className={isOverdue ? 'text-red-400 font-bold' : 'text-dark-200'}>{formatDate(inv.due_date)}</span>
                  </div>
                  {inv.paid_date && (
                    <div className="flex justify-between">
                      <span className="text-dark-400">Bezahlt am</span>
                      <span className="text-green-400 font-bold">{formatDate(inv.paid_date)}</span>
                    </div>
                  )}
                  {inv.notes && (
                    <div className="flex justify-between border-t border-dark-700 pt-3">
                      <span className="text-dark-400">Notizen</span>
                      <span className="text-dark-300 text-right max-w-[60%]">{inv.notes}</span>
                    </div>
                  )}
                  {member?.email && (
                    <div className="flex justify-between border-t border-dark-700 pt-3">
                      <span className="text-dark-400">E-Mail</span>
                      <a href={`mailto:${member.email}`} className="text-brand-500 hover:underline">{member.email}</a>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-5 border-t border-dark-800 flex gap-3">
                {isStripe && inv.stripe_invoice_pdf_url && (
                  <a href={inv.stripe_invoice_pdf_url} target="_blank" rel="noopener noreferrer" className="flex-1 px-4 py-3 text-sm font-bold rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 transition-all text-center">
                    Stripe-PDF öffnen
                  </a>
                )}
                <button
                  onClick={() => setViewInvoice(null)}
                  className="flex-1 px-4 py-3 text-sm font-bold rounded-xl bg-dark-800 text-dark-300 border border-dark-700 hover:border-dark-600 transition-all"
                >
                  Schließen
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Steuer-Export Modal */}
      {showExportModal && (
        <TaxExportModal
          supabase={supabase}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {/* Snackbar */}
      {snackbar && (
        <div
          className={`fixed bottom-6 left-6 z-50 px-5 py-3 rounded-xl shadow-2xl border backdrop-blur-sm ${
            snackbar.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
          style={{ animation: 'snackbarSlideIn 0.3s ease-out' }}
        >
          <style>{`@keyframes snackbarSlideIn { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }`}</style>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{snackbar.type === 'success' ? '✓' : '✕'}</span>
            <p className="text-sm font-medium">{snackbar.message}</p>
          </div>
        </div>
      )}
    </div>
  )
}
