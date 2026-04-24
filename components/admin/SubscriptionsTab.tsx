'use client'

import { useState, useEffect, useCallback } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { adminDelete } from '@/lib/admin-delete'

const PLAN_OPTIONS: { id: string; label: string; price: number }[] = [
  { id: 'erwachsene_6', label: 'Erwachsene & Jugendliche – 6 Monate', price: 90 },
  { id: 'erwachsene_12', label: 'Erwachsene & Jugendliche – 12 Monate', price: 80 },
  { id: 'kinder_12', label: 'Kinder (3–14 Jahre) – 12 Monate', price: 50 },
  { id: 'monatlich', label: 'Monatlich kündbar', price: 120 },
  { id: 'schueler_6', label: 'Schüler/Azubi/Student – 6 Monate', price: 55 },
  { id: 'schueler_monatlich', label: 'Schüler/Azubi/Student – Monatlich', price: 80 },
]

interface Member { id: string; created_at: string; updated_at: string; name: string; email: string; phone: string | null; notes: string | null; active: boolean }
interface Subscription { id: string; created_at: string; updated_at: string; member_id: string; name: string; type: string; start_date: string; end_date: string | null; total_units: number | null; remaining_units: number | null; price: number; status: 'active' | 'expired' | 'cancelled' | 'paused' | 'pending'; notes: string | null; payment_status?: string | null; stripe_checkout_session_id?: string | null; stripe_subscription_id?: string | null }
type SubStatus = 'active' | 'expired' | 'cancelled' | 'paused' | 'pending'

const STATUS_CONFIG: Record<SubStatus, { label: string; color: string; bg: string }> = {
  active: { label: 'Aktiv', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30' },
  pending: { label: 'Zahlung ausstehend', color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/30' },
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

function getFirstOfNextMonth(): Date {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth() + 1, 1)
}

function formatDateDE(date: string | Date): string {
  return new Date(date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Check if a subscription is still in its binding period (6/12 month contract) */
function isInBindingPeriod(sub: Subscription): boolean {
  if (!sub.end_date || sub.type === 'punch_card') return false
  return new Date(sub.end_date).getTime() > new Date().getTime()
}

/** 14-Tage-Widerrufsfrist ab Vertragserstellung (created_at) */
const REVOCATION_DAYS = 14
function getRevocationDeadline(sub: Subscription): Date {
  const d = new Date(sub.created_at)
  d.setDate(d.getDate() + REVOCATION_DAYS)
  return d
}
function isWithinRevocationPeriod(sub: Subscription): boolean {
  return new Date().getTime() <= getRevocationDeadline(sub).getTime()
}
function daysLeftInRevocation(sub: Subscription): number {
  const diff = getRevocationDeadline(sub).getTime() - new Date().getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
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
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [sendingReminder, setSendingReminder] = useState<string | null>(null)

  // Modal state for status changes with email
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [pendingAction, setPendingAction] = useState<{ sub: Subscription; newStatus: SubStatus } | null>(null)
  const [personalMessage, setPersonalMessage] = useState('')
  const [sendingStatus, setSendingStatus] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)

  // Snackbar
  const [snackbar, setSnackbar] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Alle erinnern
  const [showRemindAllModal, setShowRemindAllModal] = useState(false)
  const [sendingRemindAll, setSendingRemindAll] = useState(false)
  const [remindAllProgress, setRemindAllProgress] = useState({ sent: 0, failed: 0, total: 0 })

  // Stripe Re-Sync
  const [resyncing, setResyncing] = useState(false)

  // Tarifwechsel
  const [showChangePlanModal, setShowChangePlanModal] = useState(false)
  const [changePlanSub, setChangePlanSub] = useState<Subscription | null>(null)
  const [selectedPlanId, setSelectedPlanId] = useState<string>('')
  const [changingPlan, setChangingPlan] = useState(false)
  const [changePlanError, setChangePlanError] = useState<string | null>(null)

  const showSnackbar = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setSnackbar({ message, type })
  }, [])

  useEffect(() => {
    if (!snackbar) return
    const timer = setTimeout(() => setSnackbar(null), 4000)
    return () => clearTimeout(timer)
  }, [snackbar])

  const getMemberName = (memberId: string) => members.find(m => m.id === memberId)?.name || 'Unbekannt'
  const getMemberEmail = (memberId: string) => members.find(m => m.id === memberId)?.email || ''

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
    pending: subscriptions.filter(s => s.status === 'pending').length,
    expired: subscriptions.filter(s => s.status === 'expired').length,
    paused: subscriptions.filter(s => s.status === 'paused').length,
  }

  const now = new Date()

  const daysUntil = (date: string) => {
    const diff = new Date(date).getTime() - now.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

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

  // Open confirmation modal before changing status
  const openStatusModal = (sub: Subscription, newStatus: SubStatus) => {
    setPendingAction({ sub, newStatus })
    setPersonalMessage('')
    setEmailError(null)
    setShowStatusModal(true)
  }

  // Execute status change + send email
  const confirmStatusChange = async () => {
    if (!pendingAction) return
    const { sub, newStatus } = pendingAction
    setSendingStatus(true)
    setEmailError(null)

    // Sync with Stripe first (pause/resume/cancel)
    const stripeAction = newStatus === 'paused' ? 'pause' : newStatus === 'active' ? 'resume' : newStatus === 'cancelled' ? 'cancel' : null
    if (stripeAction) {
      try {
        const stripeRes = await fetch('/api/subscription/stripe-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: stripeAction,
            stripeSubscriptionId: sub.stripe_subscription_id,
          }),
        })
        const stripeData = await stripeRes.json()
        if (!stripeRes.ok) {
          setEmailError(stripeData.error || 'Stripe-Aktion fehlgeschlagen')
          setSendingStatus(false)
          return
        }
      } catch {
        setEmailError('Stripe-Verbindung fehlgeschlagen')
        setSendingStatus(false)
        return
      }
    }

    // Update status in Supabase
    const { error } = await supabase.from('subscriptions').update({ status: newStatus }).eq('id', sub.id)
    if (error) {
      setEmailError('Status konnte nicht aktualisiert werden.')
      setSendingStatus(false)
      return
    }

    setSubscriptions(prev => prev.map(s => s.id === sub.id ? { ...s, status: newStatus } : s))

    // Send notification email
    const memberEmail = getMemberEmail(sub.member_id)
    const memberName = getMemberName(sub.member_id)
    if (memberEmail) {
      try {
        const effectiveDate = newStatus === 'cancelled' ? 'Sofort' : newStatus === 'paused' ? formatDateDE(getFirstOfNextMonth()) : undefined
        const res = await fetch('/api/subscription/send-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: newStatus,
            memberName,
            memberEmail,
            subscriptionName: sub.name,
            effectiveDate,
            personalMessage: personalMessage || undefined,
          }),
        })
        const data = await res.json()
        if (!res.ok || data.error) {
          setEmailError(data.error || 'E-Mail konnte nicht gesendet werden')
        }
      } catch {
        setEmailError('E-Mail-Versand fehlgeschlagen.')
      }
    }

    setSendingStatus(false)
    setShowStatusModal(false)
    setPendingAction(null)
    setPersonalMessage('')
  }

  const deleteSub = async (id: string) => {
    setDeleting(true)
    const { error } = await adminDelete(supabase, 'subscriptions', id)
    if (!error) {
      setSubscriptions(prev => prev.filter(s => s.id !== id))
    } else {
      setEmailError(error)
    }
    setDeleting(false)
    setDeleteConfirm(null)
  }

  const sendReminder = async (sub: Subscription) => {
    setSendingReminder(sub.id)
    setEmailError(null)
    const memberEmail = getMemberEmail(sub.member_id)
    const memberName = getMemberName(sub.member_id)
    try {
      const res = await fetch('/api/subscription/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: sub.id,
          memberEmail,
          memberName,
          subscriptionName: sub.name,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        showSnackbar(data.error || 'Erinnerung fehlgeschlagen', 'error')
      } else {
        showSnackbar(`Erinnerung versendet an ${memberName}`)
      }
    } catch {
      showSnackbar('Erinnerung fehlgeschlagen', 'error')
    }
    setSendingReminder(null)
  }

  const pendingSubs = subscriptions.filter(s => s.status === 'pending')

  const sendRemindAll = async () => {
    setSendingRemindAll(true)
    setRemindAllProgress({ sent: 0, failed: 0, total: pendingSubs.length })

    let sent = 0
    let failed = 0
    for (const sub of pendingSubs) {
      const memberEmail = getMemberEmail(sub.member_id)
      const memberName = getMemberName(sub.member_id)
      try {
        const res = await fetch('/api/subscription/send-reminder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscriptionId: sub.id,
            memberEmail,
            memberName,
            subscriptionName: sub.name,
          }),
        })
        const data = await res.json()
        if (!res.ok || data.error) {
          failed++
        } else {
          sent++
        }
      } catch {
        failed++
      }
      setRemindAllProgress({ sent, failed, total: pendingSubs.length })
    }

    setSendingRemindAll(false)
    setShowRemindAllModal(false)
    if (failed === 0) {
      showSnackbar(`${sent} Erinnerung${sent !== 1 ? 'en' : ''} erfolgreich versendet`)
    } else {
      showSnackbar(`${sent} versendet, ${failed} fehlgeschlagen`, 'error')
    }
  }

  const openChangePlanModal = (sub: Subscription) => {
    setChangePlanSub(sub)
    setSelectedPlanId('')
    setChangePlanError(null)
    setShowChangePlanModal(true)
  }

  const confirmChangePlan = async () => {
    if (!changePlanSub || !selectedPlanId) return
    setChangingPlan(true)
    setChangePlanError(null)
    try {
      const res = await fetch('/api/subscription/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: changePlanSub.id,
          newMembershipId: selectedPlanId,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setChangePlanError(data.error || 'Tarifwechsel fehlgeschlagen')
        setChangingPlan(false)
        return
      }
      setSubscriptions(prev => prev.map(s => s.id === changePlanSub.id
        ? { ...s, name: data.newName, price: data.newPrice, end_date: data.newEndDate }
        : s))
      showSnackbar(`Tarif gewechselt zu ${data.newName}`)
      setShowChangePlanModal(false)
      setChangePlanSub(null)
      setSelectedPlanId('')
    } catch {
      setChangePlanError('Verbindung fehlgeschlagen')
    } finally {
      setChangingPlan(false)
    }
  }

  const updateUnits = async (id: string, remaining: number) => {
    const { error } = await supabase.from('subscriptions').update({ remaining_units: remaining }).eq('id', id)
    if (!error) {
      setSubscriptions(prev => prev.map(s => s.id === id ? { ...s, remaining_units: remaining } : s))
    }
  }

  const updateStatus = async (id: string, status: SubStatus) => {
    const { error } = await supabase.from('subscriptions').update({ status }).eq('id', id)
    if (!error) {
      setSubscriptions(prev => prev.map(s => s.id === id ? { ...s, status } : s))
    }
  }

  return (
    <div className="space-y-6">
      {/* Statistiken */}
      <div className="grid grid-cols-4 gap-3">
        <button onClick={() => setFilter(filter === 'active' ? 'all' : 'active')} className={`p-4 rounded-xl border transition-all text-left ${filter === 'active' ? 'bg-green-500/10 border-green-500/50' : 'bg-dark-900/50 border-dark-800'}`}>
          <p className="text-2xl font-black text-green-400">{stats.active}</p>
          <p className="text-xs text-dark-400">Aktiv</p>
        </button>
        <button onClick={() => setFilter(filter === 'pending' ? 'all' : 'pending')} className={`p-4 rounded-xl border transition-all text-left ${filter === 'pending' ? 'bg-orange-500/10 border-orange-500/50' : 'bg-dark-900/50 border-dark-800'}`}>
          <p className="text-2xl font-black text-orange-400">{stats.pending}</p>
          <p className="text-xs text-dark-400">Ausstehend</p>
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
        <button
          onClick={async () => {
            setResyncing(true)
            try {
              const res = await fetch('/api/admin/resync-stripe', { method: 'POST' })
              const data = await res.json()
              if (!res.ok || data.error) {
                showSnackbar(data.error || 'Re-Sync fehlgeschlagen', 'error')
              } else {
                showSnackbar(`Re-Sync: ${data.subscriptions.updated}/${data.subscriptions.checked} Abos aktualisiert, ${data.invoices.synced} neue Rechnungen`)
                onRefresh()
              }
            } catch {
              showSnackbar('Re-Sync fehlgeschlagen', 'error')
            } finally {
              setResyncing(false)
            }
          }}
          disabled={resyncing}
          className="px-5 py-3 bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 font-bold rounded-xl transition-colors text-sm whitespace-nowrap disabled:opacity-50"
          title="Status aller Stripe-Abos und Rechnungen neu synchronisieren"
        >
          {resyncing ? 'Synchronisiert…' : '↻ Stripe sync'}
        </button>
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

      {/* Email-Fehler Hinweis */}
      {emailError && !showStatusModal && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
          <p className="text-sm text-red-400">E-Mail nicht gesendet: {emailError}</p>
        </div>
      )}

      {/* Abo-Liste */}
      <div className="bg-dark-900/50 rounded-xl border border-dark-800 overflow-hidden">
        <div className="p-4 border-b border-dark-800 flex items-center justify-between">
          <h2 className="font-bold text-dark-100">
            Abonnements
            <span className="text-dark-500 font-normal ml-2 text-sm">{filteredSubs.length} Ergebnisse</span>
          </h2>
          <div className="flex items-center gap-2">
            {pendingSubs.length > 0 && (
              <button
                onClick={() => setShowRemindAllModal(true)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/30 hover:bg-orange-500/20 transition-all"
              >
                Alle erinnern ({pendingSubs.length})
              </button>
            )}
            <button onClick={onRefresh} className="text-sm text-dark-400 hover:text-brand-500 transition-colors">Aktualisieren</button>
          </div>
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
              const inBinding = isInBindingPeriod(sub)
              const cancelDate = formatDateDE(getFirstOfNextMonth())

              return (
                <div key={sub.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-bold text-dark-100">{member?.name || 'Unbekannt'}</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs border ${STATUS_CONFIG[sub.status].bg} ${STATUS_CONFIG[sub.status].color}`}>
                          {STATUS_CONFIG[sub.status].label}
                        </span>
                        {isExpiringSoon && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-orange-400/10 text-orange-400 border border-orange-400/30">
                            {daysUntil(sub.end_date!)} Tage
                          </span>
                        )}
                        {inBinding && sub.status === 'active' && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-blue-400/10 text-blue-400 border border-blue-400/30">
                            Bindung bis {formatDateDE(sub.end_date!)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-brand-500">{sub.name}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-dark-400 flex-wrap">
                        <span>{formatDateDE(sub.start_date)}{sub.end_date ? ` - ${formatDateDE(sub.end_date)}` : ' – Monatlich kündbar'}</span>
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
                    <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                      {sub.status === 'active' && sub.type === 'punch_card' && sub.remaining_units !== null && sub.remaining_units > 0 && (
                        <button
                          onClick={() => updateUnits(sub.id, sub.remaining_units! - 1)}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 transition-all"
                          title="Eine Einheit abziehen"
                        >
                          -1
                        </button>
                      )}
                      {(sub.status === 'active' || sub.status === 'paused' || sub.status === 'pending') && sub.type !== 'punch_card' && (
                        <button
                          onClick={() => openChangePlanModal(sub)}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/30 hover:bg-purple-500/20 transition-all"
                          title="Auf anderen Tarif wechseln"
                        >
                          Tarif wechseln
                        </button>
                      )}
                      {sub.status === 'active' && (
                        <button onClick={() => openStatusModal(sub, 'paused')} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/20 transition-all">
                          Pause
                        </button>
                      )}
                      {sub.status === 'paused' && (
                        <button onClick={() => openStatusModal(sub, 'active')} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20 transition-all">
                          Fortsetzen
                        </button>
                      )}
                      {(sub.status === 'active' || sub.status === 'paused') && (
                        <button
                          onClick={() => openStatusModal(sub, 'cancelled')}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${inBinding ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30 hover:bg-orange-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20'}`}
                          title={inBinding ? `Sonderkündigung – Vertragslaufzeit bis ${formatDateDE(sub.end_date!)}` : 'Kündigung sofort wirksam'}
                        >
                          {inBinding ? 'Sonderkündigung' : 'Kündigen'}
                        </button>
                      )}
                      {isExpired && (
                        <button onClick={() => updateStatus(sub.id, 'expired')} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-all">
                          Als abgelaufen markieren
                        </button>
                      )}
                      {sub.status === 'pending' && (
                        <button
                          onClick={() => sendReminder(sub)}
                          disabled={sendingReminder === sub.id}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/30 hover:bg-orange-500/20 transition-all disabled:opacity-50"
                          title="Zahlungserinnerung senden"
                        >
                          {sendingReminder === sub.id ? 'Sendet...' : 'Erinnerung'}
                        </button>
                      )}
                      {deleteConfirm === sub.id ? (
                        <>
                          <button onClick={() => deleteSub(sub.id)} disabled={deleting} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-500 transition-all disabled:opacity-50">
                            {deleting ? '...' : 'Bestätigen'}
                          </button>
                          <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-dark-800 text-dark-400 border border-dark-700 hover:border-dark-600 transition-all">
                            Abbruch
                          </button>
                        </>
                      ) : (
                        <button onClick={() => setDeleteConfirm(sub.id)} className="px-3 py-1.5 text-xs font-bold rounded-lg text-red-400/50 border border-dark-800 hover:border-red-500/30 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Abo löschen">
                          ✕
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

      {/* Status-Änderung Modal */}
      {showStatusModal && pendingAction && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => !sendingStatus && setShowStatusModal(false)}>
          <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-dark-800 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                pendingAction.newStatus === 'active' ? 'bg-green-500/20 text-green-400' :
                pendingAction.newStatus === 'paused' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {pendingAction.newStatus === 'active' ? '▶' : pendingAction.newStatus === 'paused' ? '⏸' : '✕'}
              </div>
              <div>
                <h3 className="font-bold text-dark-100 text-lg">
                  {pendingAction.newStatus === 'active' ? 'Abo fortsetzen' :
                   pendingAction.newStatus === 'paused' ? 'Abo pausieren' :
                   'Abo kündigen'}
                </h3>
                <p className="text-dark-500 text-sm">
                  {getMemberName(pendingAction.sub.member_id)} – {pendingAction.sub.name}
                </p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Info-Box */}
              <div className="bg-dark-800/50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-dark-400">Mitglied</span>
                  <span className="text-dark-100 font-medium">{getMemberName(pendingAction.sub.member_id)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">E-Mail</span>
                  <span className="text-dark-300">{getMemberEmail(pendingAction.sub.member_id) || 'Keine E-Mail'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">Abo</span>
                  <span className="text-dark-100">{pendingAction.sub.name}</span>
                </div>
                {pendingAction.newStatus === 'cancelled' && (
                  <div className="flex justify-between pt-2 border-t border-dark-700">
                    <span className="text-dark-400">Kündigung wirksam ab</span>
                    <span className="text-red-400 font-bold">Sofort</span>
                  </div>
                )}
                {pendingAction.newStatus === 'paused' && (
                  <div className="flex justify-between pt-2 border-t border-dark-700">
                    <span className="text-dark-400">Pause wirksam ab</span>
                    <span className="text-yellow-400 font-bold">{formatDateDE(getFirstOfNextMonth())}</span>
                  </div>
                )}
              </div>

              {pendingAction.newStatus === 'cancelled' && (
                <>
                  {isInBindingPeriod(pendingAction.sub) && (
                    <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                      <p className="text-xs text-orange-400 font-bold">
                        ⚠ Sonderkündigung — Vertragslaufzeit bis {formatDateDE(pendingAction.sub.end_date!)}
                      </p>
                      <p className="text-xs text-orange-400 mt-1">
                        Das Abo wird trotz laufender Bindung sofort gekündigt (z.B. Umzug, Sonderkündigungsrecht). Stripe bucht ab sofort nichts mehr ab.
                      </p>
                    </div>
                  )}
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-xs text-red-400">
                      Die Kündigung wird <strong>sofort wirksam</strong>. Stripe bucht ab sofort nichts mehr ab.
                    </p>
                  </div>
                </>
              )}

              {pendingAction.newStatus === 'paused' && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-xs text-yellow-400">
                    Die Pause wird zum <strong>{formatDateDE(getFirstOfNextMonth())}</strong> wirksam. Bis dahin bleibt das Abo aktiv.
                  </p>
                </div>
              )}

              {/* Persönliche Nachricht */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Persönliche Nachricht <span className="text-dark-500">(optional)</span>
                </label>
                <textarea
                  value={personalMessage}
                  onChange={(e) => setPersonalMessage(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-dark-800/50 border border-dark-700 rounded-xl text-dark-100 placeholder:text-dark-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm resize-none"
                  placeholder={
                    pendingAction.newStatus === 'paused' ? 'z.B. "Wir hoffen, dich bald wieder zu sehen!"' :
                    pendingAction.newStatus === 'active' ? 'z.B. "Willkommen zurück! Wir freuen uns auf dich."' :
                    'z.B. "Wir bedauern deine Kündigung. Du bist jederzeit willkommen!"'
                  }
                  autoFocus
                />
              </div>

              {emailError && (
                <div className="p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-xs text-red-400 font-medium">E-Mail-Fehler: {emailError}</p>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-dark-800 flex gap-3">
              <button
                onClick={() => { setShowStatusModal(false); setPendingAction(null); setPersonalMessage('') }}
                disabled={sendingStatus}
                className="flex-1 px-4 py-3 text-sm font-bold rounded-xl bg-dark-800 text-dark-300 border border-dark-700 hover:border-dark-600 transition-all disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button
                onClick={confirmStatusChange}
                disabled={sendingStatus}
                className={`flex-1 px-4 py-3 text-sm font-bold rounded-xl transition-all disabled:opacity-50 ${
                  pendingAction.newStatus === 'active'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                    : pendingAction.newStatus === 'paused'
                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                }`}
              >
                {sendingStatus
                  ? 'Wird gesendet...'
                  : pendingAction.newStatus === 'active'
                  ? 'Fortsetzen & E-Mail senden'
                  : pendingAction.newStatus === 'paused'
                  ? 'Pausieren & E-Mail senden'
                  : 'Kündigen & E-Mail senden'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alle erinnern Modal */}
      {showRemindAllModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => !sendingRemindAll && setShowRemindAllModal(false)}>
          <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-dark-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-lg">
                ⚠
              </div>
              <div>
                <h3 className="font-bold text-dark-100 text-lg">Alle erinnern?</h3>
                <p className="text-dark-500 text-sm">{pendingSubs.length} ausstehende Zahlung{pendingSubs.length !== 1 ? 'en' : ''}</p>
              </div>
            </div>

            <div className="p-5 space-y-3">
              <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <p className="text-xs text-orange-400">
                  Es wird an <strong>{pendingSubs.length} Mitglied{pendingSubs.length !== 1 ? 'er' : ''}</strong> eine Zahlungserinnerung mit neuem Checkout-Link gesendet.
                </p>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {pendingSubs.map(sub => (
                  <div key={sub.id} className="flex items-center justify-between p-2 bg-dark-800/50 rounded-lg text-sm">
                    <span className="text-dark-200">{getMemberName(sub.member_id)}</span>
                    <span className="text-dark-400 text-xs">{sub.name}</span>
                  </div>
                ))}
              </div>

              {sendingRemindAll && (
                <div className="space-y-2">
                  <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-orange-500 transition-all"
                      style={{ width: `${remindAllProgress.total > 0 ? ((remindAllProgress.sent + remindAllProgress.failed) / remindAllProgress.total) * 100 : 0}%` }}
                    />
                  </div>
                  <p className="text-xs text-dark-400 text-center">{remindAllProgress.sent + remindAllProgress.failed} / {remindAllProgress.total} verarbeitet</p>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-dark-800 flex gap-3">
              <button
                onClick={() => setShowRemindAllModal(false)}
                disabled={sendingRemindAll}
                className="flex-1 px-4 py-3 text-sm font-bold rounded-xl bg-dark-800 text-dark-300 border border-dark-700 hover:border-dark-600 transition-all disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button
                onClick={sendRemindAll}
                disabled={sendingRemindAll}
                className="flex-1 px-4 py-3 text-sm font-bold rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30 transition-all disabled:opacity-50"
              >
                {sendingRemindAll ? 'Wird gesendet...' : `Ja, alle ${pendingSubs.length} erinnern`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tarifwechsel Modal */}
      {showChangePlanModal && changePlanSub && (() => {
        const canChange = isWithinRevocationPeriod(changePlanSub)
        const daysLeft = daysLeftInRevocation(changePlanSub)
        const deadline = getRevocationDeadline(changePlanSub)
        return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => !changingPlan && setShowChangePlanModal(false)}>
          <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-dark-800 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${canChange ? 'bg-purple-500/20 text-purple-400' : 'bg-red-500/20 text-red-400'}`}>
                {canChange ? '⇄' : '✕'}
              </div>
              <div>
                <h3 className="font-bold text-dark-100 text-lg">
                  {canChange ? 'Tarif wechseln' : 'Wechsel nicht möglich'}
                </h3>
                <p className="text-dark-500 text-sm">
                  {getMemberName(changePlanSub.member_id)} – aktuell: {changePlanSub.name}
                </p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-dark-800/50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-dark-400">Vertrag erstellt</span>
                  <span className="text-dark-100 font-medium">{formatDateDE(changePlanSub.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">Widerrufsfrist bis</span>
                  <span className={`font-medium ${canChange ? 'text-dark-100' : 'text-red-400'}`}>{formatDateDE(deadline)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">Aktueller Tarif</span>
                  <span className="text-dark-100 font-medium">{changePlanSub.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">Aktueller Preis</span>
                  <span className="text-dark-100 font-medium">{Number(changePlanSub.price).toFixed(0)} €</span>
                </div>
              </div>

              {!canChange ? (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-400 font-bold mb-1">
                    Dieser Benutzer ist in der Vertragslaufzeit und kann nicht wechseln und widerrufen.
                  </p>
                  <p className="text-xs text-red-400/80">
                    Die 14-tägige Widerrufsfrist endete am {formatDateDE(deadline)}.
                    Ein Tarifwechsel ist nur innerhalb der gesetzlichen Widerrufsfrist möglich.
                  </p>
                </div>
              ) : (
                <>
                  <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <p className="text-xs text-green-400">
                      <strong>In Widerrufsfrist:</strong> Noch {daysLeft} Tag{daysLeft !== 1 ? 'e' : ''}
                      bis zum Ende am {formatDateDE(deadline)}. Wechsel ist möglich.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-2">
                      Neuer Tarif
                    </label>
                    <select
                      value={selectedPlanId}
                      onChange={(e) => setSelectedPlanId(e.target.value)}
                      className="w-full px-4 py-3 bg-dark-800/50 border border-dark-700 rounded-xl text-dark-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm"
                    >
                      <option value="">Tarif wählen…</option>
                      {PLAN_OPTIONS.map(p => (
                        <option key={p.id} value={p.id}>{p.label} — {p.price} €/Monat</option>
                      ))}
                    </select>
                  </div>

                  <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    {changePlanSub.status === 'pending' ? (
                      <p className="text-xs text-purple-400">
                        <strong>Hinweis:</strong> Dieses Abo ist noch nicht aktiv — der alte Zahlungslink wird
                        deaktiviert und das Abo auf den neuen Tarif umgestellt. Danach bitte auf
                        <strong> „Erinnerung"</strong> klicken, um den neuen Zahlungslink an das Mitglied zu senden.
                      </p>
                    ) : (
                      <p className="text-xs text-purple-400">
                        <strong>Hinweis:</strong> Der Wechsel wird sofort auf Stripe übertragen.
                        Während einer laufenden Trial wird nichts abgebucht.
                        Nach Trial-Ende gilt der neue Preis ab der nächsten Abrechnungsperiode (keine Proration).
                      </p>
                    )}
                  </div>
                </>
              )}

              {changePlanError && (
                <div className="p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-xs text-red-400 font-medium">{changePlanError}</p>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-dark-800 flex gap-3">
              <button
                onClick={() => { setShowChangePlanModal(false); setChangePlanSub(null); setSelectedPlanId('') }}
                disabled={changingPlan}
                className="flex-1 px-4 py-3 text-sm font-bold rounded-xl bg-dark-800 text-dark-300 border border-dark-700 hover:border-dark-600 transition-all disabled:opacity-50"
              >
                {canChange ? 'Abbrechen' : 'Schließen'}
              </button>
              {canChange && (
                <button
                  onClick={confirmChangePlan}
                  disabled={changingPlan || !selectedPlanId}
                  className="flex-1 px-4 py-3 text-sm font-bold rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 transition-all disabled:opacity-50"
                >
                  {changingPlan ? 'Wird gewechselt…' : 'Tarif wechseln'}
                </button>
              )}
            </div>
          </div>
        </div>
        )
      })()}

      {/* Snackbar */}
      {snackbar && (
        <div
          className={`fixed bottom-6 left-6 z-50 px-5 py-3 rounded-xl shadow-2xl border backdrop-blur-sm ${
            snackbar.type === 'success'
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
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
