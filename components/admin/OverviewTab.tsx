'use client'

interface Booking { id: string; created_at: string; updated_at: string; name: string; email: string; phone: string | null; service: string; people: number; preferred_date: string | null; message: string | null; status: 'pending' | 'confirmed' | 'cancelled'; admin_notes: string | null }
interface Member { id: string; created_at: string; updated_at: string; name: string; email: string; phone: string | null; notes: string | null; active: boolean }
interface Subscription { id: string; created_at: string; updated_at: string; member_id: string; name: string; type: string; start_date: string; end_date: string | null; total_units: number | null; remaining_units: number | null; price: number; status: 'active' | 'expired' | 'cancelled' | 'paused'; notes: string | null }
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
  const pendingBookings = bookings.filter(b => b.status === 'pending').length
  const openInvoices = invoices.filter(i => i.status === 'open' || i.status === 'overdue')
  const openInvoiceAmount = openInvoices.reduce((sum, i) => sum + Number(i.amount), 0)
  const paidThisMonth = invoices.filter(i => {
    if (i.status !== 'paid' || !i.paid_date) return false
    const paid = new Date(i.paid_date)
    const now = new Date()
    return paid.getMonth() === now.getMonth() && paid.getFullYear() === now.getFullYear()
  }).reduce((sum, i) => sum + Number(i.amount), 0)

  // Bald ablaufende Abos (nächste 30 Tage)
  const now = new Date()
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

      {/* Umsatz-Info */}
      {paidThisMonth > 0 && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-brand-500/5 to-brand-600/5 border border-brand-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-dark-400">Umsatz diesen Monat</p>
              <p className="text-2xl font-black text-brand-500">{paidThisMonth.toFixed(2)}€</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            </div>
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
