'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import OverviewTab from '@/components/admin/OverviewTab'
import BookingsTab from '@/components/admin/BookingsTab'
import MembersTab from '@/components/admin/MembersTab'
import SubscriptionsTab from '@/components/admin/SubscriptionsTab'
import InvoicesTab from '@/components/admin/InvoicesTab'

// Untyped Supabase client - vermeidet TypeScript-Konflikte mit @supabase/ssr
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Booking {
  id: string
  created_at: string
  updated_at: string
  name: string
  email: string
  phone: string | null
  service: string
  people: number
  preferred_date: string | null
  message: string | null
  status: 'pending' | 'confirmed' | 'cancelled'
  admin_notes: string | null
}

interface Member {
  id: string
  created_at: string
  updated_at: string
  name: string
  email: string
  phone: string | null
  notes: string | null
  active: boolean
}

interface Subscription {
  id: string
  created_at: string
  updated_at: string
  member_id: string
  name: string
  type: string
  start_date: string
  end_date: string | null
  total_units: number | null
  remaining_units: number | null
  price: number
  status: 'active' | 'expired' | 'cancelled' | 'paused'
  notes: string | null
}

interface Invoice {
  id: string
  created_at: string
  updated_at: string
  member_id: string
  invoice_number: string
  description: string
  amount: number
  status: 'open' | 'paid' | 'overdue' | 'cancelled'
  due_date: string
  paid_date: string | null
  notes: string | null
}

type TabId = 'overview' | 'bookings' | 'members' | 'subscriptions' | 'invoices'

const TABS: { id: TabId; label: string; icon: JSX.Element }[] = [
  {
    id: 'overview', label: 'Übersicht',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
  },
  {
    id: 'bookings', label: 'Buchungen',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  },
  {
    id: 'members', label: 'Mitglieder',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  },
  {
    id: 'subscriptions', label: 'Abos',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>,
  },
  {
    id: 'invoices', label: 'Rechnungen',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>,
  },
]

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  // Data states
  const [bookings, setBookings] = useState<Booking[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])

  // Search
  const [globalSearch, setGlobalSearch] = useState('')
  const [showSearchResults, setShowSearchResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // Auth prüfen mit onAuthStateChange (zuverlässiger als getSession)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setAuthenticated(true)
      } else {
        window.location.href = '/admin/login'
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // Alle Daten laden
  const loadData = useCallback(async () => {
    setLoading(true)

    const [bookingsRes, membersRes, subsRes, invoicesRes] = await Promise.all([
      supabase.from('bookings').select('*').order('created_at', { ascending: false }),
      supabase.from('members').select('*').order('name', { ascending: true }),
      supabase.from('subscriptions').select('*').order('created_at', { ascending: false }),
      supabase.from('invoices').select('*').order('created_at', { ascending: false }),
    ])

    if (bookingsRes.data) setBookings(bookingsRes.data as Booking[])
    if (membersRes.data) setMembers(membersRes.data as Member[])
    if (subsRes.data) setSubscriptions(subsRes.data as Subscription[])
    if (invoicesRes.data) setInvoices(invoicesRes.data as Invoice[])

    setLoading(false)
  }, [])

  useEffect(() => {
    if (authenticated) loadData()
  }, [authenticated, loadData])

  // Klick außerhalb Suche schließt Dropdown
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Logout
  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/admin/login'
  }

  // Globale Suche
  const searchResults = globalSearch.length >= 2 ? {
    members: members.filter(m =>
      m.name.toLowerCase().includes(globalSearch.toLowerCase()) ||
      m.email.toLowerCase().includes(globalSearch.toLowerCase())
    ).slice(0, 5),
    bookings: bookings.filter(b =>
      b.name.toLowerCase().includes(globalSearch.toLowerCase()) ||
      b.email.toLowerCase().includes(globalSearch.toLowerCase())
    ).slice(0, 5),
  } : { members: [], bookings: [] }

  const hasSearchResults = searchResults.members.length > 0 || searchResults.bookings.length > 0

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Header */}
      <header className="bg-dark-900/80 border-b border-dark-800 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Logo */}
            <div className="shrink-0">
              <h1 className="text-xl font-black">
                <span className="bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">SALIM LEE</span>
                <span className="text-dark-400 text-sm ml-2 font-normal">Admin</span>
              </h1>
            </div>

            {/* Globale Suche */}
            <div ref={searchRef} className="relative flex-1 max-w-md hidden sm:block">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => { setGlobalSearch(e.target.value); setShowSearchResults(true) }}
                onFocus={() => setShowSearchResults(true)}
                placeholder="Person suchen..."
                className="w-full pl-10 pr-4 py-2 bg-dark-800/50 border border-dark-700 rounded-lg text-dark-100 placeholder:text-dark-500 focus:border-brand-500 focus:outline-none text-sm"
              />

              {/* Suchergebnisse Dropdown */}
              {showSearchResults && globalSearch.length >= 2 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-dark-900 border border-dark-700 rounded-xl shadow-2xl overflow-hidden z-50">
                  {!hasSearchResults ? (
                    <div className="p-4 text-center text-dark-500 text-sm">Keine Ergebnisse für &ldquo;{globalSearch}&rdquo;</div>
                  ) : (
                    <>
                      {searchResults.members.length > 0 && (
                        <div>
                          <p className="px-4 py-2 text-xs text-dark-500 uppercase tracking-wider bg-dark-800/50">Mitglieder</p>
                          {searchResults.members.map(m => (
                            <button
                              key={m.id}
                              onClick={() => {
                                setActiveTab('members')
                                setGlobalSearch('')
                                setShowSearchResults(false)
                              }}
                              className="w-full px-4 py-3 text-left hover:bg-dark-800 transition-colors flex items-center gap-3"
                            >
                              <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-sm font-bold text-brand-500">
                                {m.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-dark-100">{m.name}</p>
                                <p className="text-xs text-dark-500">{m.email}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {searchResults.bookings.length > 0 && (
                        <div>
                          <p className="px-4 py-2 text-xs text-dark-500 uppercase tracking-wider bg-dark-800/50">Buchungen</p>
                          {searchResults.bookings.map(b => (
                            <button
                              key={b.id}
                              onClick={() => {
                                setActiveTab('bookings')
                                setGlobalSearch('')
                                setShowSearchResults(false)
                              }}
                              className="w-full px-4 py-3 text-left hover:bg-dark-800 transition-colors flex items-center gap-3"
                            >
                              <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center text-sm font-bold text-yellow-400">
                                {b.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-dark-100">{b.name}</p>
                                <p className="text-xs text-dark-500">{b.service} &middot; {b.email}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Aktionen */}
            <div className="flex items-center gap-3 shrink-0">
              <a href="/" className="text-dark-400 hover:text-brand-500 text-sm transition-colors hidden sm:block">
                Webseite
              </a>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm text-dark-400 hover:text-red-400 border border-dark-700 rounded-lg hover:border-red-400/30 transition-all"
              >
                Abmelden
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="flex gap-1 mt-3 -mb-[1px] overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border border-b-0 transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-dark-950 border-dark-800 text-brand-500'
                    : 'bg-transparent border-transparent text-dark-400 hover:text-dark-200'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.id === 'bookings' && bookings.filter(b => b.status === 'pending').length > 0 && (
                  <span className="w-5 h-5 rounded-full bg-yellow-400/20 text-yellow-400 text-xs flex items-center justify-center font-bold">
                    {bookings.filter(b => b.status === 'pending').length}
                  </span>
                )}
                {tab.id === 'invoices' && invoices.filter(i => i.status === 'open' || i.status === 'overdue').length > 0 && (
                  <span className="w-5 h-5 rounded-full bg-red-400/20 text-red-400 text-xs flex items-center justify-center font-bold">
                    {invoices.filter(i => i.status === 'open' || i.status === 'overdue').length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full" />
            <p className="text-dark-500 mt-4 text-sm">Lade Daten...</p>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <OverviewTab
                bookings={bookings}
                members={members}
                subscriptions={subscriptions}
                invoices={invoices}
                onTabChange={(tab) => setActiveTab(tab as TabId)}
              />
            )}
            {activeTab === 'bookings' && (
              <BookingsTab
                bookings={bookings}
                setBookings={setBookings}
                supabase={supabase}
                onRefresh={loadData}
              />
            )}
            {activeTab === 'members' && (
              <MembersTab
                members={members}
                setMembers={setMembers}
                subscriptions={subscriptions}
                invoices={invoices}
                bookings={bookings}
                supabase={supabase}
                onRefresh={loadData}
                initialSearch={globalSearch}
              />
            )}
            {activeTab === 'subscriptions' && (
              <SubscriptionsTab
                subscriptions={subscriptions}
                setSubscriptions={setSubscriptions}
                members={members}
                supabase={supabase}
                onRefresh={loadData}
              />
            )}
            {activeTab === 'invoices' && (
              <InvoicesTab
                invoices={invoices}
                setInvoices={setInvoices}
                members={members}
                supabase={supabase}
                onRefresh={loadData}
              />
            )}
          </>
        )}
      </main>
    </div>
  )
}
