'use client'

import { useMemo } from 'react'
import { Card, CardHeader, Badge, KpiTile, Button, EmptyState } from './ui'

interface Booking { id: string; created_at: string; updated_at: string; name: string; email: string; phone: string | null; service: string; preferred_date: string | null; message: string | null; status: 'pending' | 'confirmed' | 'cancelled'; admin_notes: string | null }
interface Member { id: string; created_at: string; updated_at: string; name: string; email: string; phone: string | null; notes: string | null; active: boolean }
interface Subscription { id: string; created_at: string; updated_at: string; member_id: string; name: string; type: string; start_date: string; end_date: string | null; total_units: number | null; remaining_units: number | null; price: number; status: 'active' | 'expired' | 'cancelled' | 'paused' | 'pending'; notes: string | null; payment_status?: string | null; stripe_subscription_id?: string | null }
interface Invoice { id: string; created_at: string; updated_at: string; member_id: string; invoice_number: string; description: string; amount: number; status: 'open' | 'paid' | 'overdue' | 'cancelled'; due_date: string; paid_date: string | null; notes: string | null }

interface OverviewTabProps {
  bookings: Booking[]
  members: Member[]
  subscriptions: Subscription[]
  invoices: Invoice[]
  onTabChange: (tab: string) => void
}

function formatDateDE(d: string) {
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function getMemberName(members: Member[], id: string) {
  return members.find(m => m.id === id)?.name || 'Unbekannt'
}

export default function OverviewTab({ bookings, members, subscriptions, invoices, onTabChange }: OverviewTabProps) {
  const now = new Date()

  // ── KPI-Berechnungen ──────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const activeMembers = members.filter(m => m.active).length
    const activeSubs = subscriptions.filter(s => s.status === 'active').length
    const pausedSubs = subscriptions.filter(s => s.status === 'paused').length
    // Nur "echte" pending: Coach muss handeln. SEPA in Bearbeitung wird separat gezählt.
    const sepaProcessing = subscriptions.filter(s => s.payment_status === 'processing').length
    const pendingPayments = subscriptions.filter(s => s.status === 'pending' && s.payment_status !== 'processing').length
    const cancelledSubs = subscriptions.filter(s => s.status === 'cancelled').length
    const pendingBookings = bookings.filter(b => b.status === 'pending').length

    const openInvoices = invoices.filter(i => i.status === 'open' || i.status === 'overdue')
    const openInvoiceAmount = openInvoices.reduce((s, i) => s + Number(i.amount), 0)

    const paidThisMonth = invoices.filter(i => {
      if (i.status !== 'paid' || !i.paid_date) return false
      const d = new Date(i.paid_date)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).reduce((s, i) => s + Number(i.amount), 0)

    // monthly recurring revenue (basis aktive Abos)
    const activeMonthlyByType: Record<string, { count: number; revenue: number }> = {}
    subscriptions.filter(s => s.status === 'active' && s.type !== 'punch_card').forEach(s => {
      const k = s.name || 'Sonstige'
      if (!activeMonthlyByType[k]) activeMonthlyByType[k] = { count: 0, revenue: 0 }
      activeMonthlyByType[k].count += 1
      activeMonthlyByType[k].revenue += Number(s.price)
    })
    const mrr = Object.values(activeMonthlyByType).reduce((s, v) => s + v.revenue, 0)

    const arpu = activeMembers > 0 ? mrr / activeMembers : 0
    const totalSubs = subscriptions.length
    const churnRate = totalSubs > 0 ? (cancelledSubs / totalSubs) * 100 : 0

    return {
      activeMembers, activeSubs, pausedSubs, pendingPayments, sepaProcessing, cancelledSubs,
      pendingBookings, openInvoiceCount: openInvoices.length, openInvoiceAmount,
      paidThisMonth, mrr, arpu, churnRate, activeMonthlyByType,
    }
  }, [members, subscriptions, invoices, bookings, now])

  // Überfällige Rechnungen: SEPA-in-Bearbeitung NICHT mitzählen, sonst alarmiert es falsch.
  const stripeSubsInProcessing = useMemo(() => new Set(
    subscriptions.filter(s => s.payment_status === 'processing' && s.stripe_subscription_id).map(s => s.stripe_subscription_id as string)
  ), [subscriptions])

  // ── 12-Monats Umsatzverlauf ──────────────────────────────────────────────
  const revenueHistory = useMemo(() => {
    const months: { label: string; revenue: number; month: number; year: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const m = d.getMonth()
      const y = d.getFullYear()
      const invoiceRev = invoices
        .filter(inv => {
          if (inv.status !== 'paid' || !inv.paid_date) return false
          const pd = new Date(inv.paid_date)
          return pd.getMonth() === m && pd.getFullYear() === y
        })
        .reduce((s, inv) => s + Number(inv.amount), 0)
      const aboRev = subscriptions
        .filter(s => {
          if (s.status === 'pending' || s.status === 'cancelled') return false
          const start = new Date(s.start_date)
          const end = s.end_date ? new Date(s.end_date) : new Date(9999, 0)
          const monthStart = new Date(y, m, 1)
          const monthEnd = new Date(y, m + 1, 0)
          return start <= monthEnd && end >= monthStart && s.type !== 'punch_card'
        })
        .reduce((s, sub) => s + Number(sub.price), 0)
      months.push({ label: d.toLocaleDateString('de-DE', { month: 'short' }), revenue: invoiceRev > 0 ? invoiceRev : aboRev, month: m, year: y })
    }
    return months
  }, [invoices, subscriptions, now])

  const currentMonth = revenueHistory[revenueHistory.length - 1]
  const prevMonth = revenueHistory.length > 1 ? revenueHistory[revenueHistory.length - 2] : null
  const trend = prevMonth && prevMonth.revenue > 0 ? ((currentMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 100 : 0
  const yearlyProjection = stats.mrr * 12

  // ── Mitglieder-Wachstum ───────────────────────────────────────────────────
  const memberGrowth = useMemo(() => {
    const months: { label: string; total: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i + 1, 1) // bis zum Anfang des nächsten Monats zählen
      const total = members.filter(m => new Date(m.created_at) < d).length
      const label = new Date(now.getFullYear(), now.getMonth() - i, 1).toLocaleDateString('de-DE', { month: 'short' })
      months.push({ label, total })
    }
    return months
  }, [members, now])

  // ── Auslaufende Verträge ──────────────────────────────────────────────────
  const expiringContracts = useMemo(() => {
    const in60 = new Date(); in60.setDate(in60.getDate() + 60)
    return subscriptions
      .filter(s => (s.status === 'active' || s.status === 'paused') && s.end_date && new Date(s.end_date) >= now && new Date(s.end_date) <= in60)
      .sort((a, b) => new Date(a.end_date!).getTime() - new Date(b.end_date!).getTime())
  }, [subscriptions, now])

  // ── Punch Cards niedriger Bestand ─────────────────────────────────────────
  const lowUnits = useMemo(() =>
    subscriptions.filter(s => s.status === 'active' && s.type === 'punch_card' && s.remaining_units !== null && s.remaining_units <= 2)
  , [subscriptions])

  // ── Überfällige Rechnungen ────────────────────────────────────────────────
  // SEPA-Lastschriften brauchen 3-5 Werktage → 7-Tage-Karenz nach Fälligkeit. Außerdem
  // werden Invoices, deren Subscription auf 'processing' steht, hier gar nicht alarmiert.
  const SEPA_GRACE_DAYS = 7
  const overdueInvoices = useMemo(() => {
    const cutoff = new Date(now.getTime() - SEPA_GRACE_DAYS * 24 * 60 * 60 * 1000)
    return invoices.filter(i => {
      if (i.status === 'paid' || i.status === 'cancelled') return false
      if (new Date(i.due_date) > cutoff) return false
      return true
    })
  }, [invoices, now])

  // SEPA-Lastschriften, die gerade verarbeitet werden — für eigene Warn-Karte
  const sepaInProgressList = useMemo(() =>
    subscriptions.filter(s => s.payment_status === 'processing')
  , [subscriptions])
  void stripeSubsInProcessing

  const recentBookings = bookings.slice(0, 5)
  const daysUntil = (date: string) => Math.ceil((new Date(date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  return (
    <div className="space-y-6 animate-fade-in-fast">
      {/* ─── Headline ──────────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="admin-eyebrow">Dashboard</p>
          <h1 className="admin-h1 mt-1">Willkommen zurück.</h1>
          <p className="admin-body mt-1">Alle wichtigen Kennzahlen, Warnungen und Aktivitäten auf einen Blick.</p>
        </div>
        <div className="text-right">
          <p className="admin-caption">Heute</p>
          <p className="text-[13px] font-semibold text-admin-ink">{now.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      {/* ─── Hauptkennzahlen ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile
          label="Aktive Mitglieder"
          value={stats.activeMembers}
          hint={`${stats.activeSubs} aktive Abos`}
          onClick={() => onTabChange('members')}
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
        />
        <KpiTile
          label="MRR"
          value={`${stats.mrr.toFixed(0)} €`}
          delta={trend !== 0 ? `${trend > 0 ? '+' : ''}${trend.toFixed(0)}%` : undefined}
          deltaTone={trend > 0 ? 'success' : trend < 0 ? 'danger' : 'neutral'}
          hint={`Jahreshochrechnung ${yearlyProjection.toFixed(0)} €`}
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <KpiTile
          label="Ø pro Mitglied"
          value={`${stats.arpu.toFixed(0)} €`}
          hint="ARPU"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
        />
        <KpiTile
          label="Offene Rechnungen"
          value={`${stats.openInvoiceAmount.toFixed(0)} €`}
          deltaTone={stats.openInvoiceCount > 0 ? 'danger' : 'neutral'}
          delta={stats.openInvoiceCount > 0 ? `${stats.openInvoiceCount} offen` : undefined}
          hint="Stripe + Manuell"
          onClick={() => onTabChange('invoices')}
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>}
        />
      </div>

      {/* ─── Sekundär-KPIs ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiTile label="Pausiert" value={stats.pausedSubs} hint="Pausierte Abos" />
        <KpiTile label="SEPA in Bearbeitung" value={stats.sepaProcessing} hint="3–5 Werktage warten" />
        <KpiTile label="Erinnerung fällig" value={stats.pendingPayments} hint="Coach soll erinnern" deltaTone={stats.pendingPayments > 0 ? 'danger' : 'neutral'} onClick={() => onTabChange('subscriptions')} />
        <KpiTile label="Offene Buchungen" value={stats.pendingBookings} hint="Anfragen unbeantwortet" onClick={() => onTabChange('bookings')} />
        <KpiTile
          label="Kündigungsrate"
          value={`${stats.churnRate.toFixed(1)}%`}
          deltaTone={stats.churnRate > 20 ? 'danger' : stats.churnRate > 10 ? 'neutral' : 'success'}
          hint={`${stats.cancelledSubs} insgesamt`}
        />
      </div>

      {/* ─── SEPA in Bearbeitung Info ──────────────────────────────────────── */}
      {sepaInProgressList.length > 0 && (
        <Card padded={false} className="border-status-info-border">
          <div className="p-4 border-b border-admin-hairline-soft flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-status-info-soft text-status-info flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <p className="admin-eyebrow text-status-info">Kein Handlungsbedarf</p>
              <h3 className="admin-h3 text-admin-ink-strong mt-0.5">{sepaInProgressList.length} SEPA-Lastschrift{sepaInProgressList.length !== 1 ? 'en' : ''} in Bearbeitung</h3>
              <p className="admin-caption mt-0.5">Diese Mitglieder haben den Checkout durchgeführt — SEPA-Einzug dauert 3–5 Werktage. Automatischer Abschluss durch Stripe, keine Erinnerung nötig.</p>
            </div>
          </div>
        </Card>
      )}

      {/* ─── Charts Row ────────────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Revenue Line Chart */}
        <Card padded={false} className="lg:col-span-2 overflow-hidden">
          <div className="p-5 pb-2 flex items-start justify-between">
            <div>
              <p className="admin-eyebrow">Umsatzverlauf · letzte 12 Monate</p>
              <p className="text-[28px] leading-[34px] font-semibold tracking-[-0.4px] text-admin-ink-strong mt-1">{currentMonth.revenue.toFixed(0)} €</p>
              <p className="admin-caption mt-0.5">Aktueller Monat</p>
            </div>
            {trend !== 0 && (
              <Badge tone={trend > 0 ? 'success' : 'danger'}>
                {trend > 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(0)}% vs. Vormonat
              </Badge>
            )}
          </div>
          <LineChart data={revenueHistory.map(m => ({ label: m.label, value: m.revenue }))} colorClass="text-brand-500" />
        </Card>

        {/* Mitglieder-Wachstum */}
        <Card padded={false} className="overflow-hidden">
          <div className="p-5 pb-2">
            <p className="admin-eyebrow">Mitglieder · 12 Monate</p>
            <p className="text-[28px] leading-[34px] font-semibold tracking-[-0.4px] text-admin-ink-strong mt-1">{stats.activeMembers}</p>
            <p className="admin-caption mt-0.5">Aktive Mitglieder gesamt</p>
          </div>
          <LineChart data={memberGrowth.map(m => ({ label: m.label, value: m.total }))} colorClass="text-status-info" valueFormatter={(v) => `${v}`} />
        </Card>
      </div>

      {/* ─── Umsatz nach Abo-Typ ──────────────────────────────────────────── */}
      {Object.keys(stats.activeMonthlyByType).length > 0 && (
        <Card padded={false}>
          <div className="p-5">
            <CardHeader
              eyebrow="Aufschlüsselung"
              title="Umsatz nach Abo-Typ"
              description="Verteilung des wiederkehrenden Monatsumsatzes."
            />
            <div className="space-y-3">
              {Object.entries(stats.activeMonthlyByType)
                .sort(([, a], [, b]) => b.revenue - a.revenue)
                .map(([name, data]) => {
                  const pct = stats.mrr > 0 ? (data.revenue / stats.mrr) * 100 : 0
                  return (
                    <div key={name}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div>
                          <p className="text-[13px] font-semibold text-admin-ink">{name}</p>
                          <p className="admin-caption">{data.count} {data.count === 1 ? 'Abo' : 'Abos'} · {pct.toFixed(1)}%</p>
                        </div>
                        <p className="text-[15px] font-semibold text-admin-ink-strong">{data.revenue.toFixed(0)} €<span className="text-[11px] text-admin-mute font-normal">/Monat</span></p>
                      </div>
                      <div className="h-1.5 bg-admin-surface-soft rounded-full overflow-hidden">
                        <div className="h-full bg-brand-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              <div className="pt-3 border-t border-admin-hairline-soft flex items-center justify-between">
                <p className="text-[13px] font-semibold text-admin-body">Gesamt</p>
                <p className="text-[16px] font-semibold text-admin-ink-strong">{stats.mrr.toFixed(0)} € <span className="text-[11px] text-admin-mute font-normal">/Monat</span></p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ─── Auslaufende Verträge ──────────────────────────────────────────── */}
      {expiringContracts.length > 0 && (
        <Card padded={false} className="border-status-warning-border">
          <div className="p-5 border-b border-admin-hairline-soft flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-status-warning-soft text-status-warning flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div className="flex-1">
              <p className="admin-eyebrow text-status-warning">Action Required</p>
              <h3 className="admin-h3 text-admin-ink-strong mt-0.5">Auslaufende Verträge · {expiringContracts.length}</h3>
              <p className="admin-caption mt-1">Verträge die in den nächsten 60 Tagen enden — jetzt Gespräche führen.</p>
            </div>
          </div>
          <div className="divide-y divide-admin-hairline-soft">
            {expiringContracts.map(sub => {
              const days = daysUntil(sub.end_date!)
              const urgent = days <= 14
              const member = members.find(m => m.id === sub.member_id)
              return (
                <div key={sub.id} className={`px-5 py-3 flex items-center justify-between gap-3 ${urgent ? 'bg-status-danger-soft/40' : ''}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[13px] font-semibold text-admin-ink">{member?.name || 'Unbekannt'}</p>
                      <Badge tone={urgent ? 'danger' : 'warning'} dot>
                        {days <= 0 ? 'Heute!' : days === 1 ? 'Morgen' : `${days} Tage`}
                      </Badge>
                    </div>
                    <p className="admin-caption mt-0.5">{sub.name} · {Number(sub.price).toFixed(0)} €/Monat · Ende {formatDateDE(sub.end_date!)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {member?.phone && (
                      <a href={`tel:${member.phone}`} className="admin-btn-icon" title={`Anrufen ${member.phone}`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                      </a>
                    )}
                    {member?.email && (
                      <a href={`mailto:${member.email}`} className="admin-btn-icon" title={`E-Mail ${member.email}`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      </a>
                    )}
                    {member?.phone && (
                      <a href={`https://wa.me/${member.phone.replace(/[^0-9+]/g, '').replace(/^0/, '+49')}`} target="_blank" rel="noopener noreferrer" className="admin-btn-icon" title="WhatsApp">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.612.616l4.54-1.472A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.347 0-4.522-.802-6.252-2.148l-.346-.282-3.587 1.162 1.185-3.537-.308-.367A9.96 9.96 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z" /></svg>
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* ─── Warnungen + Letzte Buchungen ──────────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card padded={false}>
          <div className="p-5 pb-3 flex items-start justify-between">
            <CardHeader eyebrow="Heute prüfen" title="Aufmerksamkeit" className="mb-0" />
          </div>
          {(overdueInvoices.length === 0 && lowUnits.length === 0) ? (
            <EmptyState
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
              title="Alles im grünen Bereich"
              description="Keine überfälligen Rechnungen oder leeren Punch-Cards."
            />
          ) : (
            <div className="divide-y divide-admin-hairline-soft">
              {overdueInvoices.map(inv => (
                <div key={inv.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-admin-ink">{getMemberName(members, inv.member_id)}</p>
                    <p className="admin-caption">{inv.invoice_number} · {inv.description}</p>
                  </div>
                  <Badge tone="danger">{Number(inv.amount).toFixed(0)} € überfällig</Badge>
                </div>
              ))}
              {lowUnits.map(sub => (
                <div key={sub.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-admin-ink">{getMemberName(members, sub.member_id)}</p>
                    <p className="admin-caption">{sub.name}</p>
                  </div>
                  <Badge tone="warning">{sub.remaining_units} Einh. übrig</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card padded={false}>
          <div className="p-5 pb-3">
            <CardHeader
              eyebrow="Aktivität"
              title="Letzte Buchungen"
              actions={<Button variant="ghost" size="sm" onClick={() => onTabChange('bookings')}>Alle ansehen</Button>}
              className="mb-0"
            />
          </div>
          {recentBookings.length === 0 ? (
            <EmptyState title="Keine Buchungen" description="Es liegen aktuell keine Anfragen vor." />
          ) : (
            <div className="divide-y divide-admin-hairline-soft">
              {recentBookings.map(b => {
                const tone = b.status === 'pending' ? 'warning' : b.status === 'confirmed' ? 'success' : 'neutral'
                const label = b.status === 'pending' ? 'Offen' : b.status === 'confirmed' ? 'Bestätigt' : 'Storniert'
                return (
                  <div key={b.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-admin-ink">{b.name}</p>
                      <p className="admin-caption">{b.service} · {formatDateDE(b.created_at)}</p>
                    </div>
                    <Badge tone={tone}>{label}</Badge>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

// ── Mini Line Chart (SVG, animiert via stroke-dasharray) ──────────────────

function LineChart({ data, colorClass = 'text-brand-500', valueFormatter = (v: number) => `${v.toFixed(0)} €` }: { data: { label: string; value: number }[]; colorClass?: string; valueFormatter?: (v: number) => string }) {
  const w = 600
  const h = 160
  const padL = 44
  const padR = 16
  const padT = 14
  const padB = 26
  const innerW = w - padL - padR
  const innerH = h - padT - padB
  const max = Math.max(...data.map(d => d.value), 1)
  const points = data.map((d, i) => ({
    x: padL + (i / Math.max(data.length - 1, 1)) * innerW,
    y: padT + innerH - (d.value / max) * innerH,
    ...d,
  }))
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const areaPath = `${linePath} L${points[points.length - 1].x},${padT + innerH} L${points[0].x},${padT + innerH} Z`
  const grid = 4
  const gridLines = Array.from({ length: grid + 1 }, (_, i) => {
    const val = (max / grid) * i
    const y = padT + innerH - (val / max) * innerH
    return { y, label: val >= 1000 ? `${(val / 1000).toFixed(1)}k` : `${Math.round(val)}` }
  })

  return (
    <div className="w-full px-2 pb-3 overflow-hidden">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="line-area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" className={colorClass} />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" className={colorClass} />
          </linearGradient>
        </defs>
        {/* Gridlines */}
        {gridLines.map((g, i) => (
          <g key={i}>
            <line x1={padL} y1={g.y} x2={w - padR} y2={g.y} stroke="#2a2828" strokeWidth="1" />
            <text x={padL - 6} y={g.y + 3} textAnchor="end" fill="#8b949e" fontSize="9" fontFamily="Inter, system-ui">{valueFormatter(Number(g.label) * (max >= 1000 ? 1000 : 1))}</text>
          </g>
        ))}
        {/* Area */}
        <path d={areaPath} fill="url(#line-area-grad)" className={colorClass} />
        {/* Animated stroke */}
        <path
          d={linePath}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={colorClass}
          style={{ strokeDasharray: 2000, strokeDashoffset: 2000, animation: 'drawLine 1.4s ease-out forwards' }}
        />
        {/* Points + month labels */}
        {points.map((p, i) => {
          const isLast = i === points.length - 1
          return (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={isLast ? 4 : 2.5} fill={isLast ? '#b00000' : '#101010'} stroke="#b00000" strokeWidth={isLast ? 0 : 1.5} className={colorClass} />
              <text x={p.x} y={h - 8} textAnchor="middle" fill="#8b949e" fontSize="10" fontFamily="Inter, system-ui">{p.label}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
