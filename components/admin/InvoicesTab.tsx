'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import TaxExportModal from './TaxExportModal'
import {
  Card, CardHeader, Button, IconButton, Badge, Input, Select, SearchInput,
  Snackbar, EmptyState, SortHeader, useSort, type BadgeTone,
} from './ui'

interface Member { id: string; name: string; email: string; phone: string | null; created_at: string; updated_at: string; notes: string | null; active: boolean; photo_url?: string | null }
interface Invoice { id: string; created_at: string; updated_at: string; member_id: string; invoice_number: string; description: string; amount: number; status: InvoiceStatus; due_date: string; paid_date: string | null; notes: string | null; source?: 'manual' | 'stripe'; stripe_invoice_id?: string | null; stripe_invoice_pdf_url?: string | null }
type InvoiceStatus = 'open' | 'paid' | 'overdue' | 'cancelled'

const STATUS_META: Record<InvoiceStatus, { label: string; tone: BadgeTone }> = {
  open:      { label: 'Offen',     tone: 'warning' },
  paid:      { label: 'Bezahlt',   tone: 'success' },
  overdue:   { label: 'Überfällig', tone: 'danger' },
  cancelled: { label: 'Storniert', tone: 'neutral' },
}

interface InvoicesTabProps {
  invoices: Invoice[]
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>
  members: Member[]
  supabase: SupabaseClient
  onRefresh: () => void
}

function formatDateDE(d: string): string {
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function InvoicesTab({ invoices, setInvoices, members, supabase, onRefresh }: InvoicesTabProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all')
  const [sourceFilter, setSourceFilter] = useState<'all' | 'manual' | 'stripe'>('all')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({ member_id: '', description: '', amount: '', due_date: '', notes: '' })
  const [snackbar, setSnackbar] = useState<{ message: string; tone: 'success' | 'danger' | 'info' } | null>(null)
  const [showExportModal, setShowExportModal] = useState(false)
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null)
  const [sendingPaid, setSendingPaid] = useState<string | null>(null)
  const [sendingDunning, setSendingDunning] = useState<string | null>(null)
  const [stripeActing, setStripeActing] = useState<string | null>(null)

  const showSnackbar = useCallback((message: string, tone: 'success' | 'danger' | 'info' = 'success') => setSnackbar({ message, tone }), [])
  useEffect(() => { if (!snackbar) return; const t = setTimeout(() => setSnackbar(null), 4000); return () => clearTimeout(t) }, [snackbar])

  const memberLookup = useMemo(() => {
    const m = new Map<string, Member>()
    members.forEach(x => m.set(x.id, x))
    return m
  }, [members])
  const getMember = (id: string) => memberLookup.get(id)
  const getMemberName = (id: string) => getMember(id)?.name || 'Unbekannt'

  // Filter
  const filtered = useMemo(() => {
    return invoices.filter(inv => {
      if (statusFilter !== 'all' && inv.status !== statusFilter) return false
      if (sourceFilter !== 'all' && (inv.source || 'manual') !== sourceFilter) return false
      if (search) {
        const q = search.toLowerCase()
        if (!getMemberName(inv.member_id).toLowerCase().includes(q)
          && !inv.description.toLowerCase().includes(q)
          && !inv.invoice_number.toLowerCase().includes(q)) return false
      }
      return true
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoices, statusFilter, sourceFilter, search, memberLookup])

  type Sortable = Invoice & { _memberName: string }
  const sortable: Sortable[] = filtered.map(i => ({ ...i, _memberName: getMemberName(i.member_id) }))
  const { sorted, isActive, dirOf, setSort } = useSort<Sortable>(sortable, 'created_at', 'desc')

  // Stats — 7-Tage-Karenz für SEPA-Lastschriften
  const SEPA_GRACE_MS = 7 * 24 * 60 * 60 * 1000
  const openAmount = invoices.filter(i => i.status === 'open' || i.status === 'overdue').reduce((s, i) => s + Number(i.amount), 0)
  const paidAmount = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0)
  const stats = {
    open: invoices.filter(i => i.status === 'open' && new Date(i.due_date).getTime() + SEPA_GRACE_MS >= Date.now()).length,
    sepaPending: invoices.filter(i => (i.source || 'manual') === 'stripe' && i.status === 'open' && new Date(i.due_date).getTime() + SEPA_GRACE_MS >= Date.now()).length,
    paid: invoices.filter(i => i.status === 'paid').length,
    overdue: invoices.filter(i => i.status === 'overdue' || (i.status === 'open' && new Date(i.due_date).getTime() + SEPA_GRACE_MS < Date.now())).length,
    stripe: invoices.filter(i => (i.source || 'manual') === 'stripe').length,
  }

  // Aktionen
  const generateInvoiceNumber = () => {
    const now = new Date()
    const y = now.getFullYear(); const m = String(now.getMonth() + 1).padStart(2, '0')
    const count = invoices.filter(i => i.invoice_number.startsWith(`RE-${y}${m}`)).length + 1
    return `RE-${y}${m}-${String(count).padStart(3, '0')}`
  }
  const resetForm = () => { setFormData({ member_id: '', description: '', amount: '', due_date: '', notes: '' }); setShowForm(false) }

  const saveInvoice = async () => {
    if (!formData.member_id || !formData.description || !formData.amount || !formData.due_date) return
    setSaving(true)
    const { data, error } = await supabase.from('invoices').insert({
      member_id: formData.member_id, invoice_number: generateInvoiceNumber(),
      description: formData.description, amount: parseFloat(formData.amount),
      due_date: formData.due_date, notes: formData.notes || null, source: 'manual',
    }).select().single()
    if (!error && data) { setInvoices(prev => [data, ...prev]); showSnackbar('Rechnung erstellt') }
    else if (error) showSnackbar('Erstellung fehlgeschlagen', 'danger')
    setSaving(false); resetForm()
  }

  const markAsPaid = async (id: string) => {
    const inv = invoices.find(i => i.id === id); if (!inv) return
    setSendingPaid(id)
    const today = new Date().toISOString().split('T')[0]
    await supabase.from('invoices').update({ status: 'paid' as InvoiceStatus, paid_date: today }).eq('id', id)
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: 'paid' as InvoiceStatus, paid_date: today } : i))
    const member = getMember(inv.member_id)
    if (member?.email) {
      try {
        const res = await fetch('/api/invoice/send-paid', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ memberName: member.name, memberEmail: member.email, invoiceNumber: inv.invoice_number, description: inv.description, amount: inv.amount, dueDate: inv.due_date, paidDate: today, createdAt: inv.created_at, notes: inv.notes }),
        })
        const data = await res.json()
        if (res.ok && !data.error) showSnackbar(`Zahlungsbestätigung versendet an ${member.name}`)
        else showSnackbar(data.error || 'E-Mail fehlgeschlagen', 'danger')
      } catch { showSnackbar('E-Mail fehlgeschlagen', 'danger') }
    }
    setSendingPaid(null)
  }

  const markAsOverdue = async (id: string) => {
    const inv = invoices.find(i => i.id === id); if (!inv) return
    setSendingDunning(id)
    await supabase.from('invoices').update({ status: 'overdue' as InvoiceStatus }).eq('id', id)
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: 'overdue' as InvoiceStatus } : i))
    const member = getMember(inv.member_id)
    if (member?.email) {
      try {
        const res = await fetch('/api/invoice/send-dunning', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ memberName: member.name, memberEmail: member.email, invoiceNumber: inv.invoice_number, description: inv.description, amount: inv.amount, dueDate: inv.due_date, createdAt: inv.created_at, notes: inv.notes }),
        })
        const data = await res.json()
        if (res.ok && !data.error) showSnackbar(`Mahnung versendet an ${member.name}`)
        else showSnackbar(data.error || 'Mahnung fehlgeschlagen', 'danger')
      } catch { showSnackbar('Mahnung fehlgeschlagen', 'danger') }
    } else showSnackbar('Keine E-Mail hinterlegt', 'danger')
    setSendingDunning(null)
  }

  const cancelInvoice = async (id: string) => {
    await supabase.from('invoices').update({ status: 'cancelled' as InvoiceStatus }).eq('id', id)
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: 'cancelled' as InvoiceStatus } : i))
    showSnackbar('Rechnung storniert')
  }

  // Stripe-Aktionen (Einziehen / Stornieren) brauchen den Server (Stripe-Secret).
  // Token mitschicken — die Routen prüfen die Admin-Session.
  const stripeInvoiceAction = async (inv: Invoice, action: 'collect' | 'void') => {
    if (!inv.stripe_invoice_id) { showSnackbar('Keine Stripe-Rechnung', 'danger'); return }
    setStripeActing(inv.id)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) { showSnackbar('Keine aktive Session. Bitte neu anmelden.', 'danger'); setStripeActing(null); return }
      const res = await fetch(`/api/invoice/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ stripeInvoiceId: inv.stripe_invoice_id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data.error) {
        showSnackbar(data.error || (action === 'collect' ? 'Einzug fehlgeschlagen' : 'Stornierung fehlgeschlagen'), 'danger')
      } else {
        showSnackbar(action === 'collect' ? 'Einzug ausgelöst — Status folgt via Stripe' : 'Rechnung storniert (uneinbringlich)')
        onRefresh()
      }
    } catch {
      showSnackbar('Verbindung fehlgeschlagen', 'danger')
    }
    setStripeActing(null)
  }

  // Hinweis: Stripe-Sync gibt es zentral im Abos-Tab. Hier wird er bewusst nicht angeboten,
  // um Doppelung und Verwirrung zu vermeiden.
  void onRefresh
  void supabase

  return (
    <div className="space-y-5 animate-fade-in-fast">
      {/* Headline */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="admin-eyebrow">Rechnungen</p>
          <h1 className="admin-h1 mt-1">Buchhaltung & Zahlungen</h1>
          <p className="admin-body mt-1">Stripe-Rechnungen + manuelle Belege an einem Ort. Mit Steuer-Export für den Berater.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setShowExportModal(true)}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
          >
            Steuer-Export
          </Button>
          <Button variant="primary" onClick={() => { resetForm(); setShowForm(true) }}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}
          >
            Neue Rechnung
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="!p-4">
          <p className="admin-eyebrow">Offen</p>
          <p className="text-[26px] leading-[32px] font-semibold tracking-[-0.4px] text-status-warning mt-1">{stats.open}</p>
          <p className="admin-caption">{openAmount.toFixed(0)} € ausstehend</p>
        </Card>
        <Card className="!p-4">
          <p className="admin-eyebrow">SEPA in Bearbeitung</p>
          <p className="text-[26px] leading-[32px] font-semibold tracking-[-0.4px] text-status-info mt-1">{stats.sepaPending}</p>
          <p className="admin-caption">3–5 Werktage</p>
        </Card>
        <Card className="!p-4">
          <p className="admin-eyebrow">Überfällig</p>
          <p className={`text-[26px] leading-[32px] font-semibold tracking-[-0.4px] mt-1 ${stats.overdue > 0 ? 'text-status-danger' : 'text-admin-ink-strong'}`}>{stats.overdue}</p>
          <p className="admin-caption">Mahnung möglich</p>
        </Card>
        <Card className="!p-4">
          <p className="admin-eyebrow">Bezahlt</p>
          <p className="text-[26px] leading-[32px] font-semibold tracking-[-0.4px] text-status-success mt-1">{stats.paid}</p>
          <p className="admin-caption">Gesamt {paidAmount.toFixed(0)} €</p>
        </Card>
        <Card className="!p-4">
          <p className="admin-eyebrow">Stripe-Anteil</p>
          <p className="text-[26px] leading-[32px] font-semibold tracking-[-0.4px] text-admin-ink-strong mt-1">{stats.stripe}</p>
          <p className="admin-caption">Automatisch geholt</p>
        </Card>
      </div>

      {/* Form */}
      {showForm && (
        <Card>
          <CardHeader
            eyebrow="Manuelle Rechnung"
            title="Neue Rechnung anlegen"
            description={`Rechnungsnummer wird automatisch generiert: ${generateInvoiceNumber()}`}
            actions={<Button variant="ghost" size="sm" onClick={resetForm}
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>}
            />}
          />
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="admin-caption block mb-1">Mitglied *</span>
              <Select value={formData.member_id} onChange={e => setFormData(p => ({ ...p, member_id: e.target.value }))}>
                <option value="">Mitglied wählen</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </Select>
            </label>
            <label className="block">
              <span className="admin-caption block mb-1">Betrag (€) *</span>
              <Input type="number" step="0.01" value={formData.amount} onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))} />
            </label>
            <label className="sm:col-span-2 block">
              <span className="admin-caption block mb-1">Beschreibung *</span>
              <Input type="text" value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="z.B. Personal-Training Mai 2026" />
            </label>
            <label className="block">
              <span className="admin-caption block mb-1">Fällig am *</span>
              <Input type="date" value={formData.due_date} onChange={e => setFormData(p => ({ ...p, due_date: e.target.value }))} />
            </label>
            <label className="block">
              <span className="admin-caption block mb-1">Notizen</span>
              <Input type="text" value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} />
            </label>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={resetForm}>Abbrechen</Button>
            <Button variant="primary" onClick={saveInvoice} disabled={saving || !formData.member_id || !formData.description || !formData.amount || !formData.due_date}>
              {saving ? 'Speichert…' : 'Rechnung erstellen'}
            </Button>
          </div>
        </Card>
      )}

      {/* Filter + Tabelle */}
      <Card padded={false}>
        <div className="p-4 flex items-center gap-2 flex-wrap border-b border-admin-hairline-soft">
          <div className="flex-1 min-w-[220px]">
            <SearchInput value={search} onChange={setSearch} placeholder="Mitglied, Nr. oder Beschreibung..." />
          </div>
          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value as InvoiceStatus | 'all')} className="min-w-[160px]">
            <option value="all">Alle Status</option>
            <option value="open">Nur Offen</option>
            <option value="overdue">Nur Überfällig</option>
            <option value="paid">Nur Bezahlt</option>
            <option value="cancelled">Nur Storniert</option>
          </Select>
          <Select value={sourceFilter} onChange={e => setSourceFilter(e.target.value as 'all' | 'manual' | 'stripe')} className="min-w-[160px]">
            <option value="all">Manuell + Stripe</option>
            <option value="manual">Nur Manuell</option>
            <option value="stripe">Nur Stripe</option>
          </Select>
          {(statusFilter !== 'all' || sourceFilter !== 'all' || search) && (
            <Button variant="ghost" size="sm" onClick={() => { setStatusFilter('all'); setSourceFilter('all'); setSearch('') }}>Reset</Button>
          )}
        </div>

        {sorted.length === 0 ? (
          <EmptyState
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>}
            title="Keine Rechnungen gefunden"
            description={search || statusFilter !== 'all' || sourceFilter !== 'all' ? 'Filter zurücksetzen, um alle zu sehen.' : 'Lege die erste Rechnung an oder synchronisiere Stripe.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th><SortHeader label="Mitglied" active={isActive('_memberName')} direction={dirOf('_memberName')} onClick={() => setSort('_memberName')} /></th>
                  <th><SortHeader label="Rechnung" active={isActive('invoice_number')} direction={dirOf('invoice_number')} onClick={() => setSort('invoice_number')} /></th>
                  <th>Status</th>
                  <th><SortHeader label="Fällig" active={isActive('due_date')} direction={dirOf('due_date')} onClick={() => setSort('due_date')} /></th>
                  <th className="text-right"><SortHeader label="Betrag" active={isActive('amount')} direction={dirOf('amount')} onClick={() => setSort('amount')} align="right" /></th>
                  <th className="text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(inv => {
                  const meta = STATUS_META[inv.status]
                  const isStripe = (inv.source || 'manual') === 'stripe'
                  // 7-Tage-Karenz für SEPA-Lastschriften — nicht sofort als überfällig markieren
                  const SEPA_GRACE_MS = 7 * 24 * 60 * 60 * 1000
                  const isOverdueByDate = inv.status === 'open' && new Date(inv.due_date).getTime() + SEPA_GRACE_MS < Date.now()
                  const isAwaitingSepa = isStripe && inv.status === 'open' && new Date(inv.due_date).getTime() + SEPA_GRACE_MS >= Date.now()
                  const displayMeta = isOverdueByDate ? STATUS_META.overdue : isAwaitingSepa ? { label: 'SEPA in Bearbeitung', tone: 'info' as BadgeTone } : meta
                  const member = getMember(inv.member_id)
                  return (
                    <tr key={inv.id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-[11px] font-bold shrink-0 ${member?.photo_url ? 'bg-admin-surface-soft' : 'bg-admin-surface-soft text-brand-500 border border-brand-500/30'}`}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {member?.photo_url ? <img src={member.photo_url} alt={member.name} className="w-full h-full object-cover" /> : (member?.name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-admin-ink truncate">{member?.name || 'Unbekannt'}</p>
                            <p className="admin-caption truncate">{inv.description}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <p className="font-mono text-[12px] text-admin-ink">{inv.invoice_number}</p>
                        <Badge tone={isStripe ? 'brand' : 'neutral'}>{isStripe ? 'Stripe' : 'Manuell'}</Badge>
                      </td>
                      <td>
                        <Badge tone={displayMeta.tone} dot>{displayMeta.label}</Badge>
                        {inv.paid_date && <p className="admin-caption mt-0.5">am {formatDateDE(inv.paid_date)}</p>}
                      </td>
                      <td><p className="admin-caption">{formatDateDE(inv.due_date)}</p></td>
                      <td className="text-right">
                        <p className={`text-[14px] font-semibold ${inv.status === 'paid' ? 'text-status-success' : isOverdueByDate ? 'text-status-danger' : 'text-admin-ink'}`}>
                          {Number(inv.amount).toFixed(2)} €
                        </p>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <IconButton onClick={() => setViewInvoice(inv)} title="Ansehen">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          </IconButton>
                          {isStripe && inv.stripe_invoice_pdf_url && (
                            <a href={inv.stripe_invoice_pdf_url} target="_blank" rel="noopener noreferrer" className="admin-btn-icon" title="Stripe-PDF">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </a>
                          )}
                          {isStripe && inv.stripe_invoice_id && (inv.status === 'open' || inv.status === 'overdue') && (
                            <>
                              <Button size="sm" variant="success" onClick={() => stripeInvoiceAction(inv, 'collect')} disabled={stripeActing === inv.id} title="Erneut per SEPA-Lastschrift einziehen">
                                {stripeActing === inv.id ? '…' : 'Einziehen'}
                              </Button>
                              <IconButton onClick={() => stripeInvoiceAction(inv, 'void')} disabled={stripeActing === inv.id} title="Als uneinbringlich stornieren">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" /></svg>
                              </IconButton>
                            </>
                          )}
                          {!isStripe && (inv.status === 'open' || inv.status === 'overdue') && (
                            <>
                              <Button size="sm" variant="success" onClick={() => markAsPaid(inv.id)} disabled={sendingPaid === inv.id}>
                                {sendingPaid === inv.id ? '…' : 'Bezahlt'}
                              </Button>
                              {inv.status === 'open' && !isOverdueByDate && (
                                <Button size="sm" variant="outline" onClick={() => markAsOverdue(inv.id)} disabled={sendingDunning === inv.id}>
                                  {sendingDunning === inv.id ? '…' : 'Mahnen'}
                                </Button>
                              )}
                              <IconButton onClick={() => cancelInvoice(inv.id)} title="Stornieren">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" /></svg>
                              </IconButton>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* View Modal */}
      {viewInvoice && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setViewInvoice(null)}>
          <div className="admin-card bg-admin-surface w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-admin-hairline flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[12px] text-admin-mute">{viewInvoice.invoice_number}</p>
                <h3 className="admin-h2 mt-0.5">{getMemberName(viewInvoice.member_id)}</h3>
              </div>
              <div className="flex flex-col gap-1 items-end">
                <Badge tone={STATUS_META[viewInvoice.status].tone} dot>{STATUS_META[viewInvoice.status].label}</Badge>
                <Badge tone={(viewInvoice.source || 'manual') === 'stripe' ? 'brand' : 'neutral'}>{(viewInvoice.source || 'manual') === 'stripe' ? 'Stripe' : 'Manuell'}</Badge>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <div className="bg-admin-surface-soft rounded-btn p-3 space-y-2 text-[13px]">
                <div className="flex justify-between"><span className="text-admin-mute">Beschreibung</span><span className="text-admin-ink text-right max-w-[60%]">{viewInvoice.description}</span></div>
                <div className="flex justify-between pt-2 border-t border-admin-hairline-soft"><span className="text-admin-mute">Betrag</span><span className="text-[18px] font-semibold text-admin-ink-strong">{Number(viewInvoice.amount).toFixed(2)} €</span></div>
                <div className="flex justify-between pt-2 border-t border-admin-hairline-soft"><span className="text-admin-mute">Rechnungsdatum</span><span>{formatDateDE(viewInvoice.created_at)}</span></div>
                <div className="flex justify-between"><span className="text-admin-mute">Fällig am</span><span>{formatDateDE(viewInvoice.due_date)}</span></div>
                {viewInvoice.paid_date && <div className="flex justify-between"><span className="text-admin-mute">Bezahlt am</span><span className="text-status-success font-semibold">{formatDateDE(viewInvoice.paid_date)}</span></div>}
                {viewInvoice.notes && <div className="flex justify-between pt-2 border-t border-admin-hairline-soft"><span className="text-admin-mute">Notizen</span><span className="text-right max-w-[60%]">{viewInvoice.notes}</span></div>}
              </div>
            </div>
            <div className="p-5 border-t border-admin-hairline flex gap-2 justify-end">
              {(viewInvoice.source || 'manual') === 'stripe' && viewInvoice.stripe_invoice_pdf_url && (
                <a href={viewInvoice.stripe_invoice_pdf_url} target="_blank" rel="noopener noreferrer" className="admin-btn-outline admin-btn flex-1 text-center">Stripe-PDF</a>
              )}
              <Button variant="ghost" onClick={() => setViewInvoice(null)}>Schließen</Button>
            </div>
          </div>
        </div>
      )}

      {showExportModal && <TaxExportModal supabase={supabase} onClose={() => setShowExportModal(false)} />}
      {snackbar && <Snackbar message={snackbar.message} tone={snackbar.tone} />}
    </div>
  )
}
