'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { adminDelete } from '@/lib/admin-delete'
import {
  Card, CardHeader, Button, IconButton, Badge, Input, Select, SearchInput, Checkbox,
  Snackbar, EmptyState, SortHeader, useSort, KpiTile, type BadgeTone,
} from './ui'

const PLAN_OPTIONS: { id: string; label: string; price: number }[] = [
  { id: 'erwachsene_6', label: 'Erwachsene & Jugendliche – 6 Monate', price: 90 },
  { id: 'erwachsene_12', label: 'Erwachsene & Jugendliche – 12 Monate', price: 80 },
  { id: 'kinder_12', label: 'Kinder (3–14 Jahre) – 12 Monate', price: 50 },
  { id: 'monatlich', label: 'Monatlich kündbar', price: 120 },
  { id: 'schueler_6', label: 'Schüler/Azubi/Student – 6 Monate', price: 65 },
  { id: 'schueler_12', label: 'Schüler/Azubi/Student – 12 Monate', price: 55 },
]

interface Member { id: string; name: string; email: string; phone: string | null; active: boolean; created_at: string; updated_at: string; notes: string | null; photo_url?: string | null }
interface Subscription { id: string; created_at: string; updated_at: string; member_id: string; name: string; type: string; start_date: string; end_date: string | null; total_units: number | null; remaining_units: number | null; price: number; status: SubStatus; notes: string | null; payment_status?: string | null; stripe_checkout_session_id?: string | null; stripe_subscription_id?: string | null }
type SubStatus = 'active' | 'expired' | 'cancelled' | 'paused' | 'pending'

interface SubscriptionsTabProps {
  subscriptions: Subscription[]
  setSubscriptions: React.Dispatch<React.SetStateAction<Subscription[]>>
  members: Member[]
  supabase: SupabaseClient
  onRefresh: () => void
}

function formatDateDE(d: string | Date): string {
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function isInBindingPeriod(sub: Subscription): boolean {
  if (!sub.end_date || sub.type === 'punch_card') return false
  return new Date(sub.end_date).getTime() > new Date().getTime()
}

const STATUS_META: Record<SubStatus, { label: string; tone: BadgeTone; description: string }> = {
  active:    { label: 'Aktiv',              tone: 'success',  description: 'Abo läuft regulär' },
  pending:   { label: 'Zahlung ausstehend', tone: 'warning',  description: 'Wartet auf erste Zahlung' },
  paused:    { label: 'Pausiert',           tone: 'info',     description: 'Keine Abbuchung' },
  expired:   { label: 'Abgelaufen',         tone: 'danger',   description: 'Vertrag beendet' },
  cancelled: { label: 'Gekündigt',          tone: 'neutral',  description: 'Vom Coach gekündigt oder SEPA geplatzt — reaktivierbar' },
}

/**
 * Klar getrennter "echter" Pending-Status:
 *  - Kunde hat noch nie auf Stripe-Checkout geklickt → 'pending', payment_status null/pending → Erinnerung sinnvoll
 *  - Reaktivierung läuft → 'pending', payment_status 'reactivation_pending' → Erinnerung sinnvoll
 *  - Kunde hat Checkout durchgeführt aber SEPA-Lastschrift braucht 3-5 Werktage → 'processing' → KEINE Erinnerung
 */
function isAwaitingReminder(sub: Subscription): boolean {
  if (sub.status !== 'pending') return false
  if (sub.payment_status === 'processing') return false
  // 10er-Karte ist Einmalzahlung — keine wiederkehrenden Reminder sinnvoll.
  // Falls trotzdem 'pending' → wahrscheinlich Sync-Bug. Coach nutzt 'Als bezahlt'.
  if (sub.type === 'punch_card') return false
  return true
}
function isSepaInProgress(sub: Subscription): boolean {
  return sub.payment_status === 'processing'
}
function isReactivationPending(sub: Subscription): boolean {
  return sub.payment_status === 'reactivation_pending'
}

export default function SubscriptionsTab({ subscriptions, setSubscriptions, members, supabase, onRefresh }: SubscriptionsTabProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<SubStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'monthly' | 'punch_card'>('all')
  const [hideDeadSubs, setHideDeadSubs] = useState(true) // alte tote Fehlversuch-Abos ausblenden
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    member_id: '', name: '', type: 'monthly' as string, start_date: '', end_date: '',
    total_units: '', remaining_units: '', price: '', notes: '',
  })

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [statusModal, setStatusModal] = useState<{ sub: Subscription; newStatus: SubStatus } | null>(null)
  const [personalMessage, setPersonalMessage] = useState('')
  const [sendingStatus, setSendingStatus] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)

  const [sendingReminder, setSendingReminder] = useState<string | null>(null)
  const [reactivating, setReactivating] = useState<string | null>(null)

  const [snackbar, setSnackbar] = useState<{ message: string; tone: 'success' | 'danger' | 'info' } | null>(null)

  const [showRemindAllModal, setShowRemindAllModal] = useState(false)
  const [sendingRemindAll, setSendingRemindAll] = useState(false)
  const [remindAllProgress, setRemindAllProgress] = useState({ sent: 0, failed: 0, total: 0 })

  const [resyncing, setResyncing] = useState(false)

  const [changePlan, setChangePlan] = useState<Subscription | null>(null)
  const [selectedPlanId, setSelectedPlanId] = useState<string>('')
  const [changingPlan, setChangingPlan] = useState(false)
  const [changePlanError, setChangePlanError] = useState<string | null>(null)

  const showSnackbar = useCallback((message: string, tone: 'success' | 'danger' | 'info' = 'success') => setSnackbar({ message, tone }), [])
  useEffect(() => {
    if (!snackbar) return
    const t = setTimeout(() => setSnackbar(null), 4000)
    return () => clearTimeout(t)
  }, [snackbar])

  const memberLookup = useMemo(() => {
    const map = new Map<string, Member>()
    members.forEach(m => map.set(m.id, m))
    return map
  }, [members])
  const getMember = (id: string) => memberLookup.get(id)

  // ── Filter ──
  // Mitglieder, die ein lebendes Abo (aktiv/pending/pausiert) haben. Deren alte
  // gekündigte/abgelaufene Abos sind "tote" Fehlversuch-Reste und können in der
  // Standardansicht ausgeblendet werden.
  const liveMemberIds = useMemo(() => {
    const s = new Set<string>()
    for (const sub of subscriptions) {
      if (sub.status === 'active' || sub.status === 'pending' || sub.status === 'paused') s.add(sub.member_id)
    }
    return s
  }, [subscriptions])

  const filtered = useMemo(() => {
    return subscriptions.filter(s => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false
      if (typeFilter !== 'all' && s.type !== typeFilter) return false
      // Tote Abos ausblenden — nur in der "Alle"-Ansicht. Filtert man explizit nach
      // "Gekündigt"/"Abgelaufen", werden sie trotzdem gezeigt (zum Löschen/Reaktivieren).
      if (hideDeadSubs && statusFilter === 'all'
        && (s.status === 'cancelled' || s.status === 'expired')
        && liveMemberIds.has(s.member_id)) return false
      if (search) {
        const q = search.toLowerCase()
        const memberName = getMember(s.member_id)?.name.toLowerCase() || ''
        if (!memberName.includes(q) && !s.name.toLowerCase().includes(q)) return false
      }
      return true
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptions, statusFilter, typeFilter, search, memberLookup, hideDeadSubs, liveMemberIds])

  const hiddenDeadCount = useMemo(
    () => (hideDeadSubs ? subscriptions.filter(s => (s.status === 'cancelled' || s.status === 'expired') && liveMemberIds.has(s.member_id)).length : 0),
    [hideDeadSubs, subscriptions, liveMemberIds]
  )

  type SortableSub = Subscription & { _memberName: string }
  const sortable: SortableSub[] = filtered.map(s => ({ ...s, _memberName: getMember(s.member_id)?.name || 'Unbekannt' }))
  const { sorted, isActive, dirOf, setSort } = useSort<SortableSub>(sortable, 'created_at', 'desc')

  // ── Stats ──
  const stats = useMemo(() => ({
    total: subscriptions.length,
    active: subscriptions.filter(s => s.status === 'active').length,
    pending: subscriptions.filter(isAwaitingReminder).length, // nur "echte" Pending
    sepaProcessing: subscriptions.filter(isSepaInProgress).length,
    paused: subscriptions.filter(s => s.status === 'paused').length,
    cancelled: subscriptions.filter(s => s.status === 'cancelled').length,
    expired: subscriptions.filter(s => s.status === 'expired').length,
    mrr: subscriptions.filter(s => s.status === 'active' && s.type !== 'punch_card').reduce((sum, s) => sum + Number(s.price), 0),
  }), [subscriptions])

  // ── Aktionen ──
  const resetForm = () => {
    setFormData({ member_id: '', name: '', type: 'monthly', start_date: '', end_date: '', total_units: '', remaining_units: '', price: '', notes: '' })
    setShowForm(false)
  }

  const saveSub = async () => {
    if (!formData.member_id || !formData.name || !formData.start_date || !formData.price) return
    setSaving(true)
    const { data, error } = await supabase.from('subscriptions').insert({
      member_id: formData.member_id,
      name: formData.name,
      type: formData.type,
      start_date: formData.start_date,
      end_date: formData.end_date || null,
      total_units: formData.total_units ? parseInt(formData.total_units) : null,
      remaining_units: formData.remaining_units ? parseInt(formData.remaining_units) : null,
      price: parseFloat(formData.price),
      notes: formData.notes || null,
    }).select().single()
    if (!error && data) {
      setSubscriptions(prev => [data as Subscription, ...prev])
      showSnackbar('Abo erstellt')
    } else if (error) {
      showSnackbar('Fehler beim Erstellen', 'danger')
    }
    setSaving(false)
    resetForm()
  }

  const confirmStatusChange = async () => {
    if (!statusModal) return
    const { sub, newStatus } = statusModal
    setSendingStatus(true)
    setEmailError(null)

    const stripeAction = newStatus === 'paused' ? 'pause' : newStatus === 'active' ? 'resume' : newStatus === 'cancelled' ? 'cancel' : null
    if (stripeAction && sub.stripe_subscription_id) {
      try {
        const r = await fetch('/api/subscription/stripe-action', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: stripeAction, stripeSubscriptionId: sub.stripe_subscription_id }),
        })
        const d = await r.json()
        if (!r.ok) { setEmailError(d.error || 'Stripe-Aktion fehlgeschlagen'); setSendingStatus(false); return }
      } catch { setEmailError('Stripe-Verbindung fehlgeschlagen'); setSendingStatus(false); return }
    }

    const { error } = await supabase.from('subscriptions').update({ status: newStatus }).eq('id', sub.id)
    if (error) { setEmailError('Status konnte nicht aktualisiert werden.'); setSendingStatus(false); return }
    setSubscriptions(prev => prev.map(s => s.id === sub.id ? { ...s, status: newStatus } : s))

    const member = getMember(sub.member_id)
    if (member?.email) {
      try {
        const firstNext = new Date(); firstNext.setMonth(firstNext.getMonth() + 1, 1)
        const effectiveDate = newStatus === 'cancelled' ? 'Sofort' : newStatus === 'paused' ? formatDateDE(firstNext) : undefined
        await fetch('/api/subscription/send-notification', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus, memberName: member.name, memberEmail: member.email, subscriptionName: sub.name, effectiveDate, personalMessage: personalMessage || undefined }),
        })
      } catch { /* silent */ }
    }

    setSendingStatus(false)
    setStatusModal(null)
    setPersonalMessage('')
    showSnackbar(`Status geändert auf "${STATUS_META[newStatus].label}"`)
  }

  const reactivate = async (sub: Subscription) => {
    setReactivating(sub.id)
    const member = getMember(sub.member_id)
    if (!member) { setReactivating(null); return }
    // Vor dem Status-Update merken, ob die Kündigung durch eine geplatzte Zahlung kam —
    // dann geht die "Zahlung fehlgeschlagen"-Mail raus statt der neutralen Reaktivierung.
    const wasPaymentFailed = sub.payment_status === 'failed'

    // 1) Falls eine alte Stripe-Sub noch läuft (z.B. 0 €-Initial-Checkout), CANCELN.
    //    Sonst hätten wir nach der Reaktivierung zwei parallele Stripe-Subs und
    //    der Kunde würde doppelt belastet ab dem nächsten Abrechnungszyklus.
    if (sub.stripe_subscription_id) {
      try {
        await fetch('/api/subscription/stripe-action', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'cancel', stripeSubscriptionId: sub.stripe_subscription_id }),
        })
      } catch (e) {
        console.warn('Alte Stripe-Sub konnte nicht gecancelt werden — Reminder läuft trotzdem:', e)
      }
    }

    // 2) Marker setzen. WICHTIG: Bei 0 €-Initial-Checkout (kein echter Paid > 0 €)
    //    erkennt der Sicherheits-Check im Checkout-API das und fällt automatisch
    //    auf die NORMALE anteilige Erstmonats-Berechnung zurück. Bei echten
    //    Reaktivierungen (Kunde hatte vorher echte Zahlungen) wird hingegen die
    //    Reaktivierungs-Logik genutzt (keine anteilige Berechnung).
    await supabase.from('subscriptions').update({
      status: 'pending',
      payment_status: 'reactivation_pending',
      stripe_subscription_id: null
    }).eq('id', sub.id)
    setSubscriptions(prev => prev.map(s => s.id === sub.id
      ? { ...s, status: 'pending', payment_status: 'reactivation_pending', stripe_subscription_id: null }
      : s))

    // 3) Reminder mit neuem Checkout-Link senden.
    try {
      const res = await fetch('/api/subscription/send-reminder', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId: sub.id, memberEmail: member.email, memberName: member.name, subscriptionName: sub.name, reason: wasPaymentFailed ? 'payment_failed' : undefined }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        showSnackbar(data.error || 'Reaktivierung fehlgeschlagen', 'danger')
      } else {
        showSnackbar(`Reaktivierung gestartet — neuer Zahlungslink an ${member.name} verschickt`)
      }
    } catch {
      showSnackbar('Verbindung fehlgeschlagen', 'danger')
    }
    setReactivating(null)
  }

  const sendReminder = async (sub: Subscription) => {
    setSendingReminder(sub.id)
    const member = getMember(sub.member_id)
    if (!member) { setSendingReminder(null); return }
    try {
      const res = await fetch('/api/subscription/send-reminder', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId: sub.id, memberEmail: member.email, memberName: member.name, subscriptionName: sub.name, reason: sub.payment_status === 'failed' ? 'payment_failed' : undefined }),
      })
      const data = await res.json()
      if (!res.ok || data.error) showSnackbar(data.error || 'Erinnerung fehlgeschlagen', 'danger')
      else showSnackbar(`Erinnerung an ${member.name} versendet`)
    } catch {
      showSnackbar('Erinnerung fehlgeschlagen', 'danger')
    }
    setSendingReminder(null)
  }

  // Nur Subs die wirklich eine Erinnerung brauchen — SEPA-in-Bearbeitung NICHT.
  const pendingSubs = subscriptions.filter(isAwaitingReminder)
  const sepaProcessingSubs = subscriptions.filter(isSepaInProgress)
  const sendRemindAll = async () => {
    setSendingRemindAll(true)
    setRemindAllProgress({ sent: 0, failed: 0, total: pendingSubs.length })
    let sent = 0, failed = 0
    for (const sub of pendingSubs) {
      const member = getMember(sub.member_id)
      if (!member) { failed++; continue }
      try {
        const r = await fetch('/api/subscription/send-reminder', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscriptionId: sub.id, memberEmail: member.email, memberName: member.name, subscriptionName: sub.name }),
        })
        const d = await r.json()
        if (!r.ok || d.error) failed++; else sent++
      } catch { failed++ }
      setRemindAllProgress({ sent, failed, total: pendingSubs.length })
    }
    setSendingRemindAll(false)
    setShowRemindAllModal(false)
    showSnackbar(failed === 0 ? `${sent} Erinnerung${sent !== 1 ? 'en' : ''} versendet` : `${sent} versendet, ${failed} fehlgeschlagen`, failed === 0 ? 'success' : 'danger')
  }

  const confirmChangePlan = async () => {
    if (!changePlan || !selectedPlanId) return
    setChangingPlan(true); setChangePlanError(null)
    try {
      const res = await fetch('/api/subscription/change-plan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId: changePlan.id, newMembershipId: selectedPlanId }),
      })
      const data = await res.json()
      if (!res.ok || data.error) { setChangePlanError(data.error || 'Tarifwechsel fehlgeschlagen'); setChangingPlan(false); return }
      setSubscriptions(prev => prev.map(s => s.id === changePlan.id ? { ...s, name: data.newName, price: data.newPrice, end_date: data.newEndDate } : s))
      showSnackbar(`Tarif gewechselt zu ${data.newName}`)
      setChangePlan(null); setSelectedPlanId('')
    } catch { setChangePlanError('Verbindung fehlgeschlagen') }
    setChangingPlan(false)
  }

  const deleteSub = async (id: string) => {
    setDeleting(true)
    const { error } = await adminDelete(supabase, 'subscriptions', id)
    if (!error) { setSubscriptions(prev => prev.filter(s => s.id !== id)); showSnackbar('Abo gelöscht') }
    else showSnackbar(error, 'danger')
    setDeleting(false); setDeleteConfirm(null)
  }

  const updateUnits = async (id: string, remaining: number) => {
    const { error } = await supabase.from('subscriptions').update({ remaining_units: remaining }).eq('id', id)
    if (!error) setSubscriptions(prev => prev.map(s => s.id === id ? { ...s, remaining_units: remaining } : s))
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const toggleSelectAll = () => {
    if (selectedIds.size === sorted.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(sorted.map(s => s.id)))
  }

  const runStripeResync = async () => {
    setResyncing(true)
    try {
      const r = await fetch('/api/admin/resync-stripe', { method: 'POST' })
      const d = await r.json()
      if (!r.ok || d.error) showSnackbar(d.error || 'Re-Sync fehlgeschlagen', 'danger')
      else {
        const reverted = d.subscriptions.revertedToPending || 0
        const ghosts = d.subscriptions.ghostSubsCleared || 0
        const notes: string[] = []
        if (reverted > 0) notes.push(`${reverted}× fälschlich als SEPA → "Erinnerung fällig"`)
        if (ghosts > 0) notes.push(`${ghosts}× Geister-Abos ohne Stripe → "Erinnerung fällig"`)
        const noteStr = notes.length > 0 ? ` · ${notes.join(' · ')}` : ''
        showSnackbar(`Re-Sync: ${d.subscriptions.updated}/${d.subscriptions.checked} Abos · ${d.invoices.synced} neue Rechnungen${noteStr}`)
        onRefresh()
      }
    } catch { showSnackbar('Re-Sync fehlgeschlagen', 'danger') }
    setResyncing(false)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 animate-fade-in-fast">
      {/* Headline */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="admin-eyebrow">Abonnements</p>
          <h1 className="admin-h1 mt-1">Abos verwalten</h1>
          <p className="admin-body mt-1">Aktivieren, pausieren, kündigen, reaktivieren — alles ein Klick weit weg.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={runStripeResync} disabled={resyncing}
            icon={<svg className={`w-4 h-4 ${resyncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
          >
            {resyncing ? 'Synchronisiert…' : 'Stripe-Sync'}
          </Button>
          <Button variant="primary" onClick={() => { resetForm(); setShowForm(true) }}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}
          >
            Neues Abo
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-7 gap-3">
        <KpiTile label="Aktiv" value={stats.active} onClick={() => setStatusFilter(statusFilter === 'active' ? 'all' : 'active')} />
        <KpiTile label="SEPA läuft" value={stats.sepaProcessing} hint="3–5 Werktage" />
        <KpiTile label="Erinnerung fällig" value={stats.pending} deltaTone={stats.pending > 0 ? 'danger' : 'neutral'} onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')} />
        <KpiTile label="Pausiert" value={stats.paused} onClick={() => setStatusFilter(statusFilter === 'paused' ? 'all' : 'paused')} />
        <KpiTile label="Gekündigt" value={stats.cancelled} onClick={() => setStatusFilter(statusFilter === 'cancelled' ? 'all' : 'cancelled')} />
        <KpiTile label="Abgelaufen" value={stats.expired} onClick={() => setStatusFilter(statusFilter === 'expired' ? 'all' : 'expired')} />
        <KpiTile label="MRR" value={`${stats.mrr.toFixed(0)} €`} hint="Wiederkehrend / Monat" />
      </div>

      {/* Formular */}
      {showForm && (
        <Card>
          <CardHeader
            eyebrow="Neu anlegen"
            title="Abo erstellen"
            description="Coach legt das Abo manuell an. Für die Zahlung wird der Stripe-Checkout separat per Reminder versendet."
            actions={
              <Button variant="ghost" size="sm" onClick={resetForm}
                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>}
              />
            }
          />
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="admin-caption block mb-1">Mitglied *</span>
              <Select value={formData.member_id} onChange={e => setFormData(p => ({ ...p, member_id: e.target.value }))}>
                <option value="">Mitglied wählen</option>
                {members.filter(m => m.active).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </Select>
            </label>
            <label className="block">
              <span className="admin-caption block mb-1">Typ</span>
              <Select value={formData.type} onChange={e => setFormData(p => ({ ...p, type: e.target.value }))}>
                <option value="monthly">Monatsabo</option>
                <option value="punch_card">Mehrfachkarte</option>
              </Select>
            </label>
            <label className="sm:col-span-2 block">
              <span className="admin-caption block mb-1">Bezeichnung *</span>
              <Input type="text" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="z.B. Erwachsene & Jugendliche – 12 Monate" />
            </label>
            <label className="block">
              <span className="admin-caption block mb-1">Startdatum *</span>
              <Input type="date" value={formData.start_date} onChange={e => setFormData(p => ({ ...p, start_date: e.target.value }))} />
            </label>
            {formData.type === 'monthly' ? (
              <label className="block">
                <span className="admin-caption block mb-1">Enddatum (Bindung)</span>
                <Input type="date" value={formData.end_date} onChange={e => setFormData(p => ({ ...p, end_date: e.target.value }))} />
              </label>
            ) : (
              <>
                <label className="block">
                  <span className="admin-caption block mb-1">Gesamteinheiten</span>
                  <Input type="number" value={formData.total_units} onChange={e => setFormData(p => ({ ...p, total_units: e.target.value, remaining_units: e.target.value }))} placeholder="z.B. 10" />
                </label>
                <label className="block">
                  <span className="admin-caption block mb-1">Verbleibend</span>
                  <Input type="number" value={formData.remaining_units} onChange={e => setFormData(p => ({ ...p, remaining_units: e.target.value }))} />
                </label>
              </>
            )}
            <label className="block">
              <span className="admin-caption block mb-1">Preis (€) *</span>
              <Input type="number" step="0.01" value={formData.price} onChange={e => setFormData(p => ({ ...p, price: e.target.value }))} />
            </label>
            <label className="block sm:col-span-2">
              <span className="admin-caption block mb-1">Notizen</span>
              <Input type="text" value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} />
            </label>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={resetForm}>Abbrechen</Button>
            <Button variant="primary" onClick={saveSub} disabled={saving || !formData.member_id || !formData.name || !formData.start_date || !formData.price}>
              {saving ? 'Speichert…' : 'Abo erstellen'}
            </Button>
          </div>
        </Card>
      )}

      {/* Filter Toolbar */}
      <Card padded={false}>
        <div className="p-4 flex items-center gap-2 flex-wrap border-b border-admin-hairline-soft">
          <div className="relative flex-1 min-w-[220px]">
            <SearchInput value={search} onChange={setSearch} placeholder="Mitglied oder Abo-Bezeichnung..." />
          </div>
          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value as SubStatus | 'all')} className="min-w-[180px]">
            <option value="all">Alle Status</option>
            <option value="active">Nur Aktiv</option>
            <option value="pending">Nur Ausstehend</option>
            <option value="paused">Nur Pausiert</option>
            <option value="cancelled">Nur Gekündigt</option>
            <option value="expired">Nur Abgelaufen</option>
          </Select>
          <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value as 'all' | 'monthly' | 'punch_card')} className="min-w-[160px]">
            <option value="all">Alle Typen</option>
            <option value="monthly">Monatsabo</option>
            <option value="punch_card">Mehrfachkarte</option>
          </Select>
          <label className="flex items-center gap-1.5 text-[12px] text-admin-mute cursor-pointer select-none whitespace-nowrap" title="Alte gekündigte Fehlversuch-Abos ausblenden, wenn das Mitglied bereits ein aktives Abo hat">
            <input type="checkbox" checked={hideDeadSubs} onChange={e => setHideDeadSubs(e.target.checked)} className="accent-brand-500" />
            Tote Abos ausblenden{hiddenDeadCount > 0 ? ` (${hiddenDeadCount})` : ''}
          </label>
          {(statusFilter !== 'all' || typeFilter !== 'all' || search) && (
            <Button variant="ghost" size="sm" onClick={() => { setStatusFilter('all'); setTypeFilter('all'); setSearch('') }}>
              Filter zurücksetzen
            </Button>
          )}
        </div>

        {/* Bulk-Action-Bar */}
        {selectedIds.size > 0 && (
          <div className="px-4 py-2.5 bg-admin-surface-soft border-b border-brand-500/30 flex items-center gap-3 flex-wrap">
            <p className="text-[13px] font-semibold text-brand-500">{selectedIds.size} ausgewählt</p>
            <Button size="sm" variant="outline" onClick={async () => {
              const targets = sorted.filter(s => selectedIds.has(s.id) && isAwaitingReminder(s))
              if (targets.length === 0) { showSnackbar('Keine erinnerbaren Abos in Auswahl (SEPA-Zahlungen brauchen 3–5 Werktage)', 'info'); return }
              for (const s of targets) await sendReminder(s)
              setSelectedIds(new Set())
            }}>
              Erinnerung senden
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Auswahl aufheben</Button>
          </div>
        )}
        {selectedIds.size === 0 && (pendingSubs.length > 0 || sepaProcessingSubs.length > 0) && (
          <div className="px-4 py-2.5 border-b border-admin-hairline-soft flex items-center gap-3 flex-wrap">
            {pendingSubs.length > 0 && (
              <>
                <Badge tone="warning" dot>{pendingSubs.length} Erinnerung{pendingSubs.length !== 1 ? 'en' : ''} fällig</Badge>
                <Button size="sm" variant="outline" onClick={() => setShowRemindAllModal(true)}>
                  Alle erinnern
                </Button>
              </>
            )}
            {sepaProcessingSubs.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge tone="info" dot>{sepaProcessingSubs.length} SEPA in Bearbeitung</Badge>
                <span className="admin-caption">automatisch in 3–5 Werktagen abgeschlossen</span>
              </div>
            )}
          </div>
        )}

        {/* Tabelle */}
        {sorted.length === 0 ? (
          <EmptyState
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>}
            title="Keine Abos gefunden"
            description={search || statusFilter !== 'all' || typeFilter !== 'all' ? 'Filter zurücksetzen, um alle Abos zu sehen.' : 'Lege das erste Abo über "Neues Abo" an.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="w-10">
                    <Checkbox
                      checked={selectedIds.size === sorted.length && sorted.length > 0}
                      indeterminate={selectedIds.size > 0 && selectedIds.size < sorted.length}
                      onChange={toggleSelectAll}
                      ariaLabel="Alle auswählen"
                    />
                  </th>
                  <th><SortHeader label="Mitglied" active={isActive('_memberName')} direction={dirOf('_memberName')} onClick={() => setSort('_memberName')} /></th>
                  <th><SortHeader label="Abo" active={isActive('name')} direction={dirOf('name')} onClick={() => setSort('name')} /></th>
                  <th><SortHeader label="Status" active={isActive('status')} direction={dirOf('status')} onClick={() => setSort('status')} /></th>
                  <th className="text-right"><SortHeader label="Preis" active={isActive('price')} direction={dirOf('price')} onClick={() => setSort('price')} align="right" /></th>
                  <th><SortHeader label="Laufzeit" active={isActive('end_date')} direction={dirOf('end_date')} onClick={() => setSort('end_date')} /></th>
                  <th className="text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(sub => {
                  const member = getMember(sub.member_id)
                  const meta = STATUS_META[sub.status]
                  const inBinding = isInBindingPeriod(sub)
                  // Mindestlaufzeit vorbei, Abo läuft aber aktiv weiter → monatlich kündbar
                  // (KEIN "Abgelaufen" — der Vertrag verlängert sich automatisch monatlich).
                  const monthlyRolling = sub.end_date && new Date(sub.end_date) < new Date()
                    && sub.status === 'active' && sub.type !== 'punch_card'
                  return (
                    <tr key={sub.id}>
                      <td>
                        <Checkbox checked={selectedIds.has(sub.id)} onChange={() => toggleSelect(sub.id)} ariaLabel="Auswählen" />
                      </td>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-[11px] font-bold shrink-0 ${member?.photo_url ? 'bg-admin-surface-soft' : 'bg-admin-surface-soft text-brand-500 border border-brand-500/30'}`}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {member?.photo_url ? <img src={member.photo_url} alt={member.name} className="w-full h-full object-cover" /> : (member?.name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-admin-ink truncate">{member?.name || 'Unbekannt'}</p>
                            <p className="admin-caption truncate">{member?.email || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <p className="text-[13px] text-admin-ink">{sub.name}</p>
                        <p className="admin-caption">{sub.type === 'punch_card' ? `${sub.remaining_units}/${sub.total_units} Einheiten` : 'Monatsabo'}</p>
                      </td>
                      <td>
                        {isSepaInProgress(sub) ? (
                          <>
                            <Badge tone="info" dot>SEPA in Bearbeitung</Badge>
                            <p className="admin-caption mt-0.5">3–5 Werktage automatisch</p>
                          </>
                        ) : isReactivationPending(sub) ? (
                          <>
                            <Badge tone="warning" dot>Reaktivierung wartet</Badge>
                            <p className="admin-caption mt-0.5">Karte hinterlegen · ab 1. nächsten Monats</p>
                          </>
                        ) : (
                          <>
                            <Badge tone={meta.tone} dot>{meta.label}</Badge>
                            {/* SEPA-Lastschrift geplatzt — auch bei aktivem Abo sichtbar machen,
                                damit der Coach den Zahlungsausfall sofort erkennt (nicht erst wenn
                                Stripe irgendwann kündigt). */}
                            {sub.payment_status === 'failed' && (
                              <p className="mt-0.5"><Badge tone="danger" dot>Zahlung fehlgeschlagen</Badge></p>
                            )}
                            {sub.status === 'cancelled' && sub.payment_status === 'failed' && (
                              <p className="admin-caption mt-0.5">SEPA geplatzt · reaktivieren</p>
                            )}
                          </>
                        )}
                      </td>
                      <td className="text-right">
                        <p className="text-[13px] font-semibold text-admin-ink">{Number(sub.price).toFixed(0)} €</p>
                        <p className="admin-caption">{sub.type === 'punch_card' ? 'gesamt' : '/Monat'}</p>
                      </td>
                      <td>
                        <p className="admin-caption">
                          {formatDateDE(sub.start_date)}
                          {sub.end_date ? ` → ${formatDateDE(sub.end_date)}` : ' · offen'}
                        </p>
                        {monthlyRolling && <Badge tone="neutral">Monatlich kündbar</Badge>}
                        {inBinding && sub.status === 'active' && <Badge tone="info">Bindung läuft</Badge>}
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          {/* Reaktivieren - nur bei cancelled / expired */}
                          {(sub.status === 'cancelled' || sub.status === 'expired') && (
                            <Button size="sm" variant="success" onClick={() => reactivate(sub)} disabled={reactivating === sub.id}
                              icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
                            >
                              {reactivating === sub.id ? 'Sendet…' : 'Reaktivieren'}
                            </Button>
                          )}
                          {isAwaitingReminder(sub) && (
                            <Button size="sm" variant="outline" onClick={() => sendReminder(sub)} disabled={sendingReminder === sub.id}>
                              {sendingReminder === sub.id ? 'Sendet…' : 'Erinnern'}
                            </Button>
                          )}
                          {/* 10er-Karte ist Einmalzahlung — wenn pending UND Coach weiß
                              dass bezahlt wurde, manuell als aktiv markieren. */}
                          {sub.status === 'pending' && sub.type === 'punch_card' && (
                            <Button size="sm" variant="success"
                              onClick={async () => {
                                await supabase.from('subscriptions').update({ status: 'active', payment_status: 'paid' }).eq('id', sub.id)
                                setSubscriptions(prev => prev.map(s => s.id === sub.id ? { ...s, status: 'active', payment_status: 'paid' } : s))
                                showSnackbar(`${getMember(sub.member_id)?.name || 'Mitglied'}: 10er-Karte als bezahlt markiert`)
                              }}
                              title="Einmalzahlung als bezahlt markieren"
                            >
                              Als bezahlt
                            </Button>
                          )}
                          {sub.status === 'active' && (
                            <Button size="sm" variant="outline" onClick={() => { setStatusModal({ sub, newStatus: 'paused' }); setPersonalMessage(''); setEmailError(null) }}>
                              Pause
                            </Button>
                          )}
                          {sub.status === 'paused' && (
                            <Button size="sm" variant="success" onClick={() => { setStatusModal({ sub, newStatus: 'active' }); setPersonalMessage(''); setEmailError(null) }}>
                              Fortsetzen
                            </Button>
                          )}
                          {sub.status === 'active' && sub.type === 'punch_card' && sub.remaining_units !== null && sub.remaining_units > 0 && (
                            <IconButton onClick={() => updateUnits(sub.id, sub.remaining_units! - 1)} title="Eine Einheit abziehen">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                            </IconButton>
                          )}
                          {(sub.status === 'active' || sub.status === 'paused') && (
                            <IconButton onClick={() => { setChangePlan(sub); setSelectedPlanId(''); setChangePlanError(null) }} title="Tarif wechseln">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                            </IconButton>
                          )}
                          {(sub.status === 'active' || sub.status === 'paused') && (
                            <IconButton onClick={() => { setStatusModal({ sub, newStatus: 'cancelled' }); setPersonalMessage(''); setEmailError(null) }} title={inBinding ? 'Sonderkündigung' : 'Kündigen'}>
                              <svg className="w-4 h-4 text-status-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                            </IconButton>
                          )}
                          {deleteConfirm === sub.id ? (
                            <>
                              <Button size="sm" variant="danger" onClick={() => deleteSub(sub.id)} disabled={deleting}>
                                {deleting ? '…' : 'Löschen'}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(null)}>Abbruch</Button>
                            </>
                          ) : (
                            <IconButton onClick={() => setDeleteConfirm(sub.id)} title="Abo löschen">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M10 7V4a1 1 0 011-1h2a1 1 0 011 1v3" /></svg>
                            </IconButton>
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

      {/* ─── Status-Wechsel Modal ───────────────────────────────────────── */}
      {statusModal && (
        <Modal onClose={() => !sendingStatus && setStatusModal(null)}>
          <div className="p-5 border-b border-admin-hairline flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
              statusModal.newStatus === 'active' ? 'bg-status-success-soft text-status-success' :
              statusModal.newStatus === 'paused' ? 'bg-status-info-soft text-status-info' :
              'bg-status-danger-soft text-status-danger'
            }`}>
              {statusModal.newStatus === 'active' ? '▶' : statusModal.newStatus === 'paused' ? '⏸' : '✕'}
            </div>
            <div>
              <h3 className="admin-h2">{statusModal.newStatus === 'active' ? 'Fortsetzen' : statusModal.newStatus === 'paused' ? 'Pausieren' : 'Kündigen'}</h3>
              <p className="admin-caption">{getMember(statusModal.sub.member_id)?.name} · {statusModal.sub.name}</p>
            </div>
          </div>
          <div className="p-5 space-y-3">
            <div className="bg-admin-surface-soft rounded-btn p-3 space-y-2 text-[13px]">
              {statusModal.newStatus === 'cancelled' && (
                <div className="flex justify-between">
                  <span className="text-admin-mute">Kündigung wirksam ab</span>
                  <strong className="text-status-danger">Sofort</strong>
                </div>
              )}
              {statusModal.newStatus === 'paused' && (
                <div className="flex justify-between">
                  <span className="text-admin-mute">Pause wirksam ab</span>
                  <strong className="text-status-info">{formatDateDE(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1))}</strong>
                </div>
              )}
            </div>

            {statusModal.newStatus === 'cancelled' && isInBindingPeriod(statusModal.sub) && (
              <div className="p-3 bg-status-warning-soft border border-status-warning-border rounded-btn">
                <p className="text-[12px] font-semibold text-status-warning">⚠ Sonderkündigung — Bindung bis {formatDateDE(statusModal.sub.end_date!)}</p>
                <p className="text-[12px] text-status-warning mt-1">Das Abo wird trotz Bindung sofort beendet (z.B. Umzug, Sonderkündigungsrecht).</p>
              </div>
            )}

            <label className="block">
              <span className="admin-caption block mb-1">Persönliche Nachricht (optional)</span>
              <textarea
                value={personalMessage}
                onChange={(e) => setPersonalMessage(e.target.value)}
                rows={3}
                placeholder={statusModal.newStatus === 'cancelled' ? 'z.B. "Wir bedauern deine Kündigung. Du bist jederzeit willkommen!"' : statusModal.newStatus === 'paused' ? 'z.B. "Wir hoffen, dich bald wieder zu sehen!"' : 'z.B. "Willkommen zurück!"'}
                className="admin-input resize-none"
              />
            </label>

            {emailError && (
              <div className="p-2.5 bg-status-danger-soft border border-status-danger-border rounded-btn">
                <p className="text-[12px] text-status-danger font-medium">Fehler: {emailError}</p>
              </div>
            )}
          </div>
          <div className="p-5 border-t border-admin-hairline flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => { setStatusModal(null); setPersonalMessage('') }} disabled={sendingStatus}>Abbrechen</Button>
            <Button variant={statusModal.newStatus === 'cancelled' ? 'danger' : 'primary'} onClick={confirmStatusChange} disabled={sendingStatus}>
              {sendingStatus ? 'Wird gesendet…' :
                statusModal.newStatus === 'active' ? 'Fortsetzen' :
                statusModal.newStatus === 'paused' ? 'Pausieren' : 'Kündigen'}
            </Button>
          </div>
        </Modal>
      )}

      {/* ─── Alle erinnern Modal ────────────────────────────────────────── */}
      {showRemindAllModal && (
        <Modal onClose={() => !sendingRemindAll && setShowRemindAllModal(false)}>
          <div className="p-5 border-b border-admin-hairline flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-status-warning-soft text-status-warning flex items-center justify-center">⚠</div>
            <div>
              <h3 className="admin-h2">Alle erinnern?</h3>
              <p className="admin-caption">{pendingSubs.length} ausstehende Zahlung{pendingSubs.length !== 1 ? 'en' : ''}</p>
            </div>
          </div>
          <div className="p-5 space-y-3">
            <div className="p-3 bg-status-warning-soft border border-status-warning-border rounded-btn">
              <p className="text-[12px] text-status-warning">An <strong>{pendingSubs.length} Mitglied{pendingSubs.length !== 1 ? 'er' : ''}</strong> geht eine Zahlungserinnerung mit neuem Checkout-Link.</p>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {pendingSubs.map(s => (
                <div key={s.id} className="flex items-center justify-between px-3 py-2 bg-admin-surface-soft rounded-btn text-[13px]">
                  <span className="text-admin-ink">{getMember(s.member_id)?.name || 'Unbekannt'}</span>
                  <span className="admin-caption">{s.name}</span>
                </div>
              ))}
            </div>
            {sendingRemindAll && (
              <div>
                <div className="h-1.5 bg-admin-surface-soft rounded-full overflow-hidden">
                  <div className="h-full bg-brand-500 transition-all" style={{ width: `${remindAllProgress.total > 0 ? ((remindAllProgress.sent + remindAllProgress.failed) / remindAllProgress.total) * 100 : 0}%` }} />
                </div>
                <p className="admin-caption text-center mt-1.5">{remindAllProgress.sent + remindAllProgress.failed} / {remindAllProgress.total}</p>
              </div>
            )}
          </div>
          <div className="p-5 border-t border-admin-hairline flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setShowRemindAllModal(false)} disabled={sendingRemindAll}>Abbrechen</Button>
            <Button variant="primary" onClick={sendRemindAll} disabled={sendingRemindAll}>
              {sendingRemindAll ? 'Wird gesendet…' : `Ja, ${pendingSubs.length} erinnern`}
            </Button>
          </div>
        </Modal>
      )}

      {/* ─── Tarifwechsel Modal ─────────────────────────────────────────── */}
      {changePlan && (
        <Modal onClose={() => !changingPlan && setChangePlan(null)}>
          <div className="p-5 border-b border-admin-hairline">
            <h3 className="admin-h2">Tarif wechseln</h3>
            <p className="admin-caption mt-1">{getMember(changePlan.member_id)?.name} · aktuell {changePlan.name}</p>
          </div>
          <div className="p-5 space-y-3">
            <label className="block">
              <span className="admin-caption block mb-1">Neuer Tarif</span>
              <Select value={selectedPlanId} onChange={e => setSelectedPlanId(e.target.value)}>
                <option value="">Tarif wählen</option>
                {PLAN_OPTIONS.map(p => <option key={p.id} value={p.id}>{p.label} · {p.price} €/Monat</option>)}
              </Select>
            </label>
            {changePlanError && (
              <div className="p-2.5 bg-status-danger-soft border border-status-danger-border rounded-btn">
                <p className="text-[12px] text-status-danger">{changePlanError}</p>
              </div>
            )}
          </div>
          <div className="p-5 border-t border-admin-hairline flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setChangePlan(null)} disabled={changingPlan}>Abbrechen</Button>
            <Button variant="primary" onClick={confirmChangePlan} disabled={changingPlan || !selectedPlanId}>
              {changingPlan ? 'Wechselt…' : 'Wechseln'}
            </Button>
          </div>
        </Modal>
      )}

      {snackbar && <Snackbar message={snackbar.message} tone={snackbar.tone} />}
    </div>
  )
}

// Modal helper
function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in-fast" onClick={onClose}>
      <div className="admin-card bg-admin-surface w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}
