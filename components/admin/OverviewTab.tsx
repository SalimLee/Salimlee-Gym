'use client'

interface Booking { id: string; created_at: string; updated_at: string; name: string; email: string; phone: string | null; service: string; preferred_date: string | null; message: string | null; status: 'pending' | 'confirmed' | 'cancelled'; admin_notes: string | null }
interface Member { id: string; created_at: string; updated_at: string; name: string; email: string; phone: string | null; notes: string | null; active: boolean }
interface Subscription { id: string; created_at: string; updated_at: string; member_id: string; name: string; type: string; start_date: string; end_date: string | null; total_units: number | null; remaining_units: number | null; price: number; status: 'active' | 'expired' | 'cancelled' | 'paused' | 'pending'; notes: string | null }
interface Invoice { id: string; created_at: string; updated_at: string; member_id: string; invoice_number: string; description: string; amount: number; status: 'open' | 'paid' | 'overdue' | 'cancelled'; due_date: string; paid_date: string | null; notes: string | null }

interface OverviewTabProps {
  bookings: Booking[]
  members: Member[]
  subscriptions: Subscription[]
  invoices: Invoice[]
  onTabChange: (tab: string) => void
}

export default function OverviewTab({ bookings, members, subscriptions, invoices, onTabChange }: OverviewTabProps) {
  const activeMembers = members.filter(m => m.active).length
  const activeSubs = subscriptions.filter(s => s.status === 'active').length
  const pausedSubs = subscriptions.filter(s => s.status === 'paused').length
  const pendingBookings = bookings.filter(b => b.status === 'pending').length
  const openInvoices = invoices.filter(i => i.status === 'open' || i.status === 'overdue')
  const openInvoiceAmount = openInvoices.reduce((sum, i) => sum + Number(i.amount), 0)
  const paidThisMonth = invoices.filter(i => {
    if (i.status !== 'paid' || !i.paid_date) return false
    const paid = new Date(i.paid_date)
    const now = new Date()
    return paid.getMonth() === now.getMonth() && paid.getFullYear() === now.getFullYear()
  }).reduce((sum, i) => sum + Number(i.amount), 0)

  const now = new Date()

  // --- Monatlicher Umsatzverlauf (letzte 6 Monate) ---
  const monthlyRevenueHistory: { label: string; revenue: number; month: number; year: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const m = d.getMonth()
    const y = d.getFullYear()
    // Bezahlte Rechnungen in diesem Monat
    const invoiceRevenue = invoices
      .filter(inv => {
        if (inv.status !== 'paid' || !inv.paid_date) return false
        const pd = new Date(inv.paid_date)
        return pd.getMonth() === m && pd.getFullYear() === y
      })
      .reduce((sum, inv) => sum + Number(inv.amount), 0)
    // Aktive Abos die in diesem Monat existierten (als Basis-Umsatz)
    const aboRevenue = subscriptions
      .filter(s => {
        if (s.status === 'pending') return false
        const start = new Date(s.start_date)
        const end = s.end_date ? new Date(s.end_date) : new Date(9999, 0)
        const monthStart = new Date(y, m, 1)
        const monthEnd = new Date(y, m + 1, 0)
        return start <= monthEnd && end >= monthStart && s.type !== 'punch_card'
      })
      .reduce((sum, s) => sum + Number(s.price), 0)
    // Nehme den höheren Wert (Rechnungen wenn vorhanden, sonst Abo-Prognose)
    const revenue = invoiceRevenue > 0 ? invoiceRevenue : aboRevenue
    const label = d.toLocaleDateString('de-DE', { month: 'short' })
    monthlyRevenueHistory.push({ label, revenue, month: m, year: y })
  }

  // --- Umsatz nach Abo-Typ ---
  const activeSubsByType: Record<string, { count: number; monthlyRevenue: number }> = {}
  subscriptions.filter(s => s.status === 'active').forEach(s => {
    const key = s.name || 'Sonstige'
    if (!activeSubsByType[key]) activeSubsByType[key] = { count: 0, monthlyRevenue: 0 }
    activeSubsByType[key].count += 1
    activeSubsByType[key].monthlyRevenue += Number(s.price)
  })
  const totalMonthlyRevenue = Object.values(activeSubsByType).reduce((sum, v) => sum + v.monthlyRevenue, 0)

  // --- Erweiterte KPIs ---
  const cancelledSubs = subscriptions.filter(s => s.status === 'cancelled').length
  const totalSubs = subscriptions.length
  const churnRate = totalSubs > 0 ? (cancelledSubs / totalSubs) * 100 : 0
  const avgRevenuePerMember = activeMembers > 0 ? totalMonthlyRevenue / activeMembers : 0
  const pendingPayments = subscriptions.filter(s => s.status === 'pending').length

  // --- Bald ablaufende Verträge (60 Tage) ---
  const in60Days = new Date()
  in60Days.setDate(in60Days.getDate() + 60)
  const expiringContracts = subscriptions.filter(s => {
    if ((s.status !== 'active' && s.status !== 'paused') || !s.end_date) return false
    const endDate = new Date(s.end_date)
    return endDate >= now && endDate <= in60Days
  }).sort((a, b) => new Date(a.end_date!).getTime() - new Date(b.end_date!).getTime())

  // Bald ablaufende Abos (nächste 30 Tage) — für Warnungen
  const in30Days = new Date()
  in30Days.setDate(in30Days.getDate() + 30)
  const expiringSoon = subscriptions.filter(s => {
    if (s.status !== 'active' || !s.end_date) return false
    const endDate = new Date(s.end_date)
    return endDate >= now && endDate <= in30Days
  })

  // Niedrige verbleibende Einheiten (10er Karten mit <= 2 übrig)
  const lowUnits = subscriptions.filter(s =>
    s.status === 'active' && s.type === 'punch_card' && s.remaining_units !== null && s.remaining_units <= 2
  )

  // Letzte 5 Buchungen
  const recentBookings = [...bookings].slice(0, 5)

  // Überfällige Rechnungen
  const overdueInvoices = invoices.filter(i => {
    if (i.status === 'paid' || i.status === 'cancelled') return false
    return new Date(i.due_date) < now
  })

  const formatDate = (date: string) => new Date(date).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })

  const getMemberName = (memberId: string) => {
    const member = members.find(m => m.id === memberId)
    return member?.name || 'Unbekannt'
  }

  const getMemberEmail = (memberId: string) => {
    const member = members.find(m => m.id === memberId)
    return member?.email || ''
  }

  const getMemberPhone = (memberId: string) => {
    const member = members.find(m => m.id === memberId)
    return member?.phone || ''
  }

  const daysUntil = (date: string) => {
    const diff = new Date(date).getTime() - now.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button onClick={() => onTabChange('members')} className="p-5 rounded-xl bg-dark-900/50 border border-dark-800 hover:border-brand-500/30 transition-all text-left group">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
          </div>
          <p className="text-3xl font-black text-dark-100">{activeMembers}</p>
          <p className="text-sm text-dark-400 mt-1">Aktive Mitglieder</p>
        </button>

        <button onClick={() => onTabChange('subscriptions')} className="p-5 rounded-xl bg-dark-900/50 border border-dark-800 hover:border-blue-500/30 transition-all text-left group">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
            </div>
          </div>
          <p className="text-3xl font-black text-blue-400">{activeSubs}</p>
          <p className="text-sm text-dark-400 mt-1">Aktive Abos</p>
        </button>

        <button onClick={() => onTabChange('bookings')} className="p-5 rounded-xl bg-dark-900/50 border border-dark-800 hover:border-yellow-500/30 transition-all text-left group">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
          </div>
          <p className="text-3xl font-black text-yellow-400">{pendingBookings}</p>
          <p className="text-sm text-dark-400 mt-1">Offene Buchungen</p>
        </button>

        <button onClick={() => onTabChange('invoices')} className="p-5 rounded-xl bg-dark-900/50 border border-dark-800 hover:border-emerald-500/30 transition-all text-left group">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-400">{openInvoiceAmount.toFixed(0)}€</p>
          <p className="text-sm text-dark-400 mt-1">Offene Rechnungen ({openInvoices.length})</p>
        </button>
      </div>

      {/* Umsatz-Kurvendiagramm + KPIs */}
      {(() => {
        const maxRev = Math.max(...monthlyRevenueHistory.map(m => m.revenue), 1)
        const chartW = 400
        const chartH = 120
        const padL = 40
        const padR = 16
        const padT = 16
        const padB = 22
        const innerW = chartW - padL - padR
        const innerH = chartH - padT - padB
        const points = monthlyRevenueHistory.map((m, i) => ({
          x: padL + (i / Math.max(monthlyRevenueHistory.length - 1, 1)) * innerW,
          y: padT + innerH - (m.revenue / maxRev) * innerH,
          ...m,
        }))
        const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
        const areaPath = `${linePath} L${points[points.length - 1].x},${padT + innerH} L${points[0].x},${padT + innerH} Z`
        const gridSteps = 3
        const gridLines = Array.from({ length: gridSteps + 1 }, (_, i) => {
          const val = (maxRev / gridSteps) * i
          const y = padT + innerH - (val / maxRev) * innerH
          return { y, label: val >= 1000 ? `${(val / 1000).toFixed(1)}k` : `${Math.round(val)}` }
        })
        const currentMonth = points[points.length - 1]
        const prevMonth = points.length > 1 ? points[points.length - 2] : null
        const trend = prevMonth && prevMonth.revenue > 0
          ? ((currentMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 100
          : 0

        return (
          <div className="bg-dark-900/50 rounded-xl border border-dark-800 overflow-hidden">
            <div className="p-4 pb-1">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-dark-400">Monatlicher Umsatz</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-black text-emerald-400">{totalMonthlyRevenue.toFixed(0)}€</p>
                    {trend !== 0 && (
                      <span className={`text-xs font-bold ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {trend > 0 ? '+' : ''}{trend.toFixed(0)}%
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-dark-500">Jahr: {(totalMonthlyRevenue * 12).toFixed(0)}€</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-dark-500">Ø / Mitglied</p>
                  <p className="text-lg font-black text-blue-400">{avgRevenuePerMember.toFixed(0)}€</p>
                </div>
              </div>
            </div>
            <div className="px-2 pb-2">
              <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-auto max-h-[160px]" preserveAspectRatio="xMidYMid meet">
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {gridLines.map((g, i) => (
                  <g key={i}>
                    <line x1={padL} y1={g.y} x2={chartW - padR} y2={g.y} stroke="#27272a" strokeWidth="0.7" />
                    <text x={padL - 5} y={g.y + 3} textAnchor="end" fill="#52525b" fontSize="8" fontFamily="system-ui">{g.label}€</text>
                  </g>
                ))}
                <path d={areaPath} fill="url(#revenueGradient)" />
                <path d={linePath} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                {points.map((p, i) => (
                  <g key={i}>
                    <circle cx={p.x} cy={p.y} r={i === points.length - 1 ? 4 : 2.5} fill={i === points.length - 1 ? '#10b981' : '#18181b'} stroke="#10b981" strokeWidth="1.5" />
                    {p.revenue > 0 && (
                      <text x={p.x} y={p.y - 8} textAnchor="middle" fill="#a1a1aa" fontSize="8" fontFamily="system-ui" fontWeight="600">{p.revenue.toFixed(0)}€</text>
                    )}
                    <text x={p.x} y={chartH - 4} textAnchor="middle" fill="#71717a" fontSize="8" fontFamily="system-ui">{p.label}</text>
                  </g>
                ))}
              </svg>
            </div>
          </div>
        )
      })()}

      {/* Erweiterte KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-dark-900/50 border border-dark-800">
          <p className="text-2xl font-black text-yellow-400">{pausedSubs}</p>
          <p className="text-xs text-dark-400 mt-1">Pausierte Abos</p>
        </div>
        <div className="p-4 rounded-xl bg-dark-900/50 border border-dark-800">
          <p className="text-2xl font-black text-orange-400">{pendingPayments}</p>
          <p className="text-xs text-dark-400 mt-1">Zahlung ausstehend</p>
        </div>
        <div className="p-4 rounded-xl bg-dark-900/50 border border-dark-800">
          <p className={`text-2xl font-black ${churnRate > 20 ? 'text-red-400' : churnRate > 10 ? 'text-orange-400' : 'text-green-400'}`}>{churnRate.toFixed(1)}%</p>
          <p className="text-xs text-dark-400 mt-1">Kündigungsrate</p>
        </div>
        <div className="p-4 rounded-xl bg-dark-900/50 border border-dark-800">
          <p className="text-2xl font-black text-emerald-400">{paidThisMonth.toFixed(0)}€</p>
          <p className="text-xs text-dark-400 mt-1">Bezahlt diesen Monat</p>
        </div>
      </div>

      {/* Umsatz nach Abo-Typ */}
      {Object.keys(activeSubsByType).length > 0 && (
        <div className="bg-dark-900/50 rounded-xl border border-dark-800 overflow-hidden">
          <div className="p-4 border-b border-dark-800">
            <h3 className="font-bold text-dark-100 flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              Umsatz nach Abo-Typ
            </h3>
          </div>
          <div className="divide-y divide-dark-800">
            {Object.entries(activeSubsByType)
              .sort(([, a], [, b]) => b.monthlyRevenue - a.monthlyRevenue)
              .map(([name, data]) => (
                <div key={name} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-bold text-dark-100">{name}</p>
                      <p className="text-xs text-dark-400">{data.count} {data.count === 1 ? 'Abo' : 'Abos'}</p>
                    </div>
                    <p className="text-lg font-black text-emerald-400">{data.monthlyRevenue.toFixed(0)}€<span className="text-xs text-dark-500 font-normal">/Monat</span></p>
                  </div>
                  <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
                      style={{ width: `${totalMonthlyRevenue > 0 ? (data.monthlyRevenue / totalMonthlyRevenue) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            <div className="p-4 bg-dark-800/30">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-dark-300">Gesamt monatlich</p>
                <p className="text-xl font-black text-emerald-400">{totalMonthlyRevenue.toFixed(0)}€</p>
              </div>
              <p className="text-xs text-dark-500 mt-1">Hochrechnung Jahr: {(totalMonthlyRevenue * 12).toFixed(0)}€</p>
            </div>
          </div>
        </div>
      )}

      {/* Auslaufende Verträge — Coach Warn-Panel */}
      {expiringContracts.length > 0 && (
        <div className="bg-dark-900/50 rounded-xl border border-orange-500/30 overflow-hidden">
          <div className="p-4 border-b border-orange-500/20 bg-orange-500/5">
            <h3 className="font-bold text-orange-400 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Auslaufende Verträge
              <span className="ml-auto px-2 py-0.5 rounded-full text-xs bg-orange-500/20 border border-orange-500/30">{expiringContracts.length}</span>
            </h3>
            <p className="text-xs text-dark-400 mt-1">Verträge die in den nächsten 60 Tagen auslaufen — jetzt Gespräche führen!</p>
          </div>
          <div className="divide-y divide-dark-800">
            {expiringContracts.map(sub => {
              const days = daysUntil(sub.end_date!)
              const urgent = days <= 14
              const memberPhone = getMemberPhone(sub.member_id)
              const memberEmail = getMemberEmail(sub.member_id)
              return (
                <div key={sub.id} className={`p-4 ${urgent ? 'bg-red-500/5' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-dark-100">{getMemberName(sub.member_id)}</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs border ${urgent ? 'bg-red-400/10 text-red-400 border-red-400/30' : 'bg-orange-400/10 text-orange-400 border-orange-400/30'}`}>
                          {days <= 0 ? 'Abgelaufen!' : days === 1 ? 'Morgen!' : `${days} Tage`}
                        </span>
                      </div>
                      <p className="text-xs text-dark-400 mt-1">{sub.name} — {Number(sub.price).toFixed(0)}€/Monat</p>
                      <p className="text-xs text-dark-500 mt-0.5">Vertragsende: {formatDate(sub.end_date!)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {memberPhone && (
                        <a href={`tel:${memberPhone}`} className="p-2 rounded-lg bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20 transition-all" title={`Anrufen: ${memberPhone}`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                        </a>
                      )}
                      {memberEmail && (
                        <a href={`mailto:${memberEmail}`} className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 transition-all" title={`E-Mail: ${memberEmail}`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        </a>
                      )}
                      {memberPhone && (
                        <a href={`https://wa.me/${memberPhone.replace(/[^0-9+]/g, '').replace(/^0/, '+49')}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all" title="WhatsApp">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.612.616l4.54-1.472A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.347 0-4.522-.802-6.252-2.148l-.346-.282-3.587 1.162 1.185-3.537-.308-.367A9.96 9.96 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z" /></svg>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Warnungen */}
        {(expiringSoon.length > 0 || lowUnits.length > 0 || overdueInvoices.length > 0) && (
          <div className="bg-dark-900/50 rounded-xl border border-dark-800 overflow-hidden">
            <div className="p-4 border-b border-dark-800">
              <h3 className="font-bold text-dark-100 flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                Aufmerksamkeit erforderlich
              </h3>
            </div>
            <div className="divide-y divide-dark-800">
              {expiringSoon.map(sub => (
                <div key={sub.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-dark-100">{getMemberName(sub.member_id)}</p>
                    <p className="text-xs text-dark-400">{sub.name}</p>
                  </div>
                  <span className="px-2 py-1 rounded-full text-xs bg-orange-400/10 text-orange-400 border border-orange-400/30">
                    {daysUntil(sub.end_date!)} Tage übrig
                  </span>
                </div>
              ))}
              {lowUnits.map(sub => (
                <div key={sub.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-dark-100">{getMemberName(sub.member_id)}</p>
                    <p className="text-xs text-dark-400">{sub.name}</p>
                  </div>
                  <span className="px-2 py-1 rounded-full text-xs bg-red-400/10 text-red-400 border border-red-400/30">
                    {sub.remaining_units} Einh. übrig
                  </span>
                </div>
              ))}
              {overdueInvoices.map(inv => (
                <div key={inv.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-dark-100">{getMemberName(inv.member_id)}</p>
                    <p className="text-xs text-dark-400">{inv.invoice_number} - {inv.description}</p>
                  </div>
                  <span className="px-2 py-1 rounded-full text-xs bg-red-400/10 text-red-400 border border-red-400/30">
                    {Number(inv.amount).toFixed(0)}€ überfällig
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Letzte Buchungen */}
        <div className="bg-dark-900/50 rounded-xl border border-dark-800 overflow-hidden">
          <div className="p-4 border-b border-dark-800 flex items-center justify-between">
            <h3 className="font-bold text-dark-100">Letzte Buchungen</h3>
            <button onClick={() => onTabChange('bookings')} className="text-xs text-brand-500 hover:underline">
              Alle anzeigen
            </button>
          </div>
          {recentBookings.length === 0 ? (
            <div className="p-8 text-center text-dark-500 text-sm">Keine Buchungen vorhanden</div>
          ) : (
            <div className="divide-y divide-dark-800">
              {recentBookings.map(booking => {
                const statusColors: Record<string, string> = {
                  pending: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/30',
                  confirmed: 'bg-green-400/10 text-green-400 border-green-400/30',
                  cancelled: 'bg-red-400/10 text-red-400 border-red-400/30',
                }
                const statusLabels: Record<string, string> = {
                  pending: 'Offen', confirmed: 'Bestätigt', cancelled: 'Storniert',
                }
                return (
                  <div key={booking.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-dark-100">{booking.name}</p>
                      <p className="text-xs text-dark-400">{booking.service} &middot; {formatDate(booking.created_at)}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs border ${statusColors[booking.status]}`}>
                      {statusLabels[booking.status]}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
