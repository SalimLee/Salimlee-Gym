'use client'

import { useEffect, useState, useCallback, useRef, type JSX } from 'react'
import { createClient } from '@supabase/supabase-js'
import OverviewTab from '@/components/admin/OverviewTab'
import BookingsTab from '@/components/admin/BookingsTab'
import MembersTab from '@/components/admin/MembersTab'
import SubscriptionsTab from '@/components/admin/SubscriptionsTab'
import InvoicesTab from '@/components/admin/InvoicesTab'
import { ContractsTab } from '@/components/admin/ContractsTab'
import ContractArchiveTab from '@/components/admin/ContractArchiveTab'
import TrainingTab from '@/components/admin/TrainingTab'
import type { Exercise, WorkoutWithExercises } from '@/types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Booking { id: string; created_at: string; updated_at: string; name: string; email: string; phone: string | null; service: string; preferred_date: string | null; message: string | null; status: 'pending' | 'confirmed' | 'cancelled'; admin_notes: string | null }
interface Member { id: string; created_at: string; updated_at: string; name: string; email: string; phone: string | null; notes: string | null; active: boolean; photo_url?: string | null }
interface Subscription { id: string; created_at: string; updated_at: string; member_id: string; name: string; type: string; start_date: string; end_date: string | null; total_units: number | null; remaining_units: number | null; price: number; status: 'active' | 'expired' | 'cancelled' | 'paused' | 'pending'; notes: string | null; payment_status?: string | null; stripe_checkout_session_id?: string | null; stripe_subscription_id?: string | null }
interface Invoice { id: string; created_at: string; updated_at: string; member_id: string; invoice_number: string; description: string; amount: number; status: 'open' | 'paid' | 'overdue' | 'cancelled'; due_date: string; paid_date: string | null; notes: string | null; source?: 'manual' | 'stripe'; stripe_invoice_id?: string | null; stripe_invoice_pdf_url?: string | null }

type TabId = 'overview' | 'bookings' | 'members' | 'subscriptions' | 'invoices' | 'contracts' | 'contract_archive' | 'training'

interface NavItem {
  id: TabId
  label: string
  group: 'main' | 'business' | 'content'
  icon: JSX.Element
  badge?: () => number | null
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false) // mobile drawer

  const [bookings, setBookings] = useState<Booking[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [workouts, setWorkouts] = useState<WorkoutWithExercises[]>([])
  const [userId, setUserId] = useState<string>('')

  const [globalSearch, setGlobalSearch] = useState('')
  const [showSearchResults, setShowSearchResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setAuthenticated(true)
        setUserId(session.user.id)
      } else {
        window.location.href = '/admin/login'
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    const [bookingsRes, membersRes, subsRes, invoicesRes, exercisesRes, workoutsRes] = await Promise.all([
      supabase.from('bookings').select('*').order('created_at', { ascending: false }),
      supabase.from('members').select('*').order('name', { ascending: true }),
      supabase.from('subscriptions').select('*').order('created_at', { ascending: false }),
      supabase.from('invoices').select('*').order('created_at', { ascending: false }),
      supabase.from('exercises').select('*').order('name', { ascending: true }),
      supabase.from('workouts').select('*, workout_exercises(*, exercise:exercises(*))').order('created_at', { ascending: false }),
    ])
    if (bookingsRes.data) setBookings(bookingsRes.data as Booking[])
    if (membersRes.data) setMembers(membersRes.data as Member[])
    if (subsRes.data) setSubscriptions(subsRes.data as Subscription[])
    if (invoicesRes.data) setInvoices(invoicesRes.data as Invoice[])
    if (exercisesRes.data) setExercises(exercisesRes.data as Exercise[])
    if (workoutsRes.data) setWorkouts(workoutsRes.data as WorkoutWithExercises[])
    setLoading(false)
  }, [])

  useEffect(() => { if (authenticated) loadData() }, [authenticated, loadData])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/admin/login'
  }

  const pendingBookings = bookings.filter(b => b.status === 'pending').length
  // Invoices die wirklich überfällig sind (SEPA-Karenz 7 Tage) — sonst alarmiert das Badge falsch.
  const SEPA_GRACE_MS = 7 * 24 * 60 * 60 * 1000
  const openInvoices = invoices.filter(i => {
    if (i.status === 'overdue') return true
    if (i.status === 'open' && new Date(i.due_date).getTime() + SEPA_GRACE_MS < Date.now()) return true
    return false
  }).length
  // Nur "echte" pending Subs zählen — SEPA-Lastschriften in Bearbeitung sind kein Handlungsbedarf.
  const pendingSubs = subscriptions.filter(s => s.status === 'pending' && s.payment_status !== 'processing').length

  const NAV_ITEMS: NavItem[] = [
    { id: 'overview', label: 'Übersicht', group: 'main',
      icon: <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
    },
    { id: 'bookings', label: 'Buchungen', group: 'business',
      icon: <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
      badge: () => (pendingBookings > 0 ? pendingBookings : null),
    },
    { id: 'members', label: 'Mitglieder', group: 'business',
      icon: <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    },
    { id: 'subscriptions', label: 'Abos', group: 'business',
      icon: <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>,
      badge: () => (pendingSubs > 0 ? pendingSubs : null),
    },
    { id: 'invoices', label: 'Rechnungen', group: 'business',
      icon: <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>,
      badge: () => (openInvoices > 0 ? openInvoices : null),
    },
    { id: 'contracts', label: 'Verträge', group: 'content',
      icon: <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    },
    { id: 'contract_archive', label: 'Vertragsarchiv', group: 'content',
      icon: <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>,
    },
    { id: 'training', label: 'Trainingsdaten', group: 'content',
      icon: <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M3 10h2l1-2h2l1 2h6l1-2h2l1 2h2M5 14h14M7 18h10" /></svg>,
    },
  ]

  const searchResults = globalSearch.length >= 2 ? {
    members: members.filter(m => m.name.toLowerCase().includes(globalSearch.toLowerCase()) || m.email.toLowerCase().includes(globalSearch.toLowerCase())).slice(0, 5),
    bookings: bookings.filter(b => b.name.toLowerCase().includes(globalSearch.toLowerCase()) || b.email.toLowerCase().includes(globalSearch.toLowerCase())).slice(0, 5),
  } : { members: [], bookings: [] }
  const hasSearchResults = searchResults.members.length > 0 || searchResults.bookings.length > 0

  if (!authenticated) {
    return (
      <div className="admin-shell min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  const activeNavItem = NAV_ITEMS.find(n => n.id === activeTab)

  return (
    <div className="admin-shell min-h-screen">
      {/* ─── Sidebar (Desktop) ────────────────────────────────────────────── */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-[244px] flex-col bg-admin-surface border-r border-admin-hairline z-30">
        <div className="px-5 py-5 border-b border-admin-hairline">
          <div className="font-display font-black tracking-tight text-[20px] leading-none">
            <span className="text-brand-500">SALIM LEE</span>
            <span className="block text-[10px] text-admin-mute font-semibold tracking-[3px] uppercase mt-1">Admin Console</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {(['main', 'business', 'content'] as const).map(group => {
            const items = NAV_ITEMS.filter(n => n.group === group)
            const groupLabel = group === 'main' ? 'Allgemein' : group === 'business' ? 'Geschäft' : 'Inhalte'
            return (
              <div key={group}>
                <p className="admin-eyebrow px-3 mb-2">{groupLabel}</p>
                <div className="space-y-0.5">
                  {items.map(item => {
                    const isActive = activeTab === item.id
                    const badgeCount = item.badge?.()
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`admin-sidebar-item w-full text-left ${isActive ? 'admin-sidebar-item-active' : ''}`}
                      >
                        <span className={isActive ? 'text-brand-500' : 'text-admin-mute'}>{item.icon}</span>
                        <span className="flex-1">{item.label}</span>
                        {badgeCount != null && (
                          <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-pill bg-brand-500 text-white">{badgeCount}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>

        <div className="px-3 py-3 border-t border-admin-hairline space-y-1">
          <a
            href="/"
            className="admin-sidebar-item w-full"
          >
            <svg className="w-[18px] h-[18px] text-admin-mute" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            <span>Zur Webseite</span>
          </a>
          <button
            onClick={handleLogout}
            className="admin-sidebar-item w-full text-left"
          >
            <svg className="w-[18px] h-[18px] text-admin-mute" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            <span>Abmelden</span>
          </button>
        </div>
      </aside>

      {/* ─── Mobile Sidebar Drawer ────────────────────────────────────────── */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-admin-ink/30 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[260px] bg-admin-surface border-r border-admin-hairline flex flex-col">
            <div className="px-5 py-5 border-b border-admin-hairline flex items-center justify-between">
              <div className="font-display font-black tracking-tight text-[20px]">
                <span className="text-brand-500">SALIM LEE</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="admin-btn-icon">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
              {NAV_ITEMS.map(item => {
                const isActive = activeTab === item.id
                const badgeCount = item.badge?.()
                return (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); setSidebarOpen(false) }}
                    className={`admin-sidebar-item w-full text-left ${isActive ? 'admin-sidebar-item-active' : ''}`}
                  >
                    <span className={isActive ? 'text-brand-500' : 'text-admin-mute'}>{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {badgeCount != null && (
                      <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-pill bg-brand-500 text-white">{badgeCount}</span>
                    )}
                  </button>
                )
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* ─── Main Area ────────────────────────────────────────────────────── */}
      <div className="lg:pl-[244px]">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 bg-admin-canvas/90 backdrop-blur border-b border-admin-hairline">
          <div className="flex items-center justify-between gap-3 px-4 lg:px-8 h-14">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden admin-btn-icon"
              aria-label="Menü öffnen"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>

            <div className="hidden lg:block">
              <p className="admin-eyebrow">{activeNavItem ? (activeNavItem.group === 'main' ? 'Allgemein' : activeNavItem.group === 'business' ? 'Geschäft' : 'Inhalte') : ''}</p>
              <h1 className="text-[15px] font-semibold text-admin-ink-strong leading-tight">{activeNavItem?.label || 'Admin'}</h1>
            </div>

            <div ref={searchRef} className="relative flex-1 max-w-md ml-auto">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-admin-mute" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => { setGlobalSearch(e.target.value); setShowSearchResults(true) }}
                onFocus={() => setShowSearchResults(true)}
                placeholder="Mitglied oder Buchung suchen..."
                className="admin-input pl-9 py-1.5 h-9"
              />
              {showSearchResults && globalSearch.length >= 2 && (
                <div className="absolute top-full left-0 right-0 mt-1 admin-card overflow-hidden">
                  {!hasSearchResults ? (
                    <p className="p-4 admin-body text-center">Keine Ergebnisse für &ldquo;{globalSearch}&rdquo;</p>
                  ) : (
                    <div className="divide-y divide-admin-hairline-soft">
                      {searchResults.members.length > 0 && (
                        <div>
                          <p className="admin-eyebrow px-4 py-2 bg-admin-surface-soft">Mitglieder</p>
                          {searchResults.members.map(m => (
                            <button
                              key={m.id}
                              onClick={() => { setActiveTab('members'); setGlobalSearch(''); setShowSearchResults(false) }}
                              className="w-full px-4 py-2.5 text-left hover:bg-admin-surface-soft flex items-center gap-3"
                            >
                              <div className={`w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-[11px] font-bold ${m.photo_url ? 'bg-admin-surface-soft' : 'bg-admin-surface-soft text-brand-500 border border-brand-500/30'}`}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                {m.photo_url ? <img src={m.photo_url} alt={m.name} className="w-full h-full object-cover" /> : m.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-[13px] font-semibold text-admin-ink">{m.name}</p>
                                <p className="admin-caption">{m.email}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {searchResults.bookings.length > 0 && (
                        <div>
                          <p className="admin-eyebrow px-4 py-2 bg-admin-surface-soft">Buchungen</p>
                          {searchResults.bookings.map(b => (
                            <button
                              key={b.id}
                              onClick={() => { setActiveTab('bookings'); setGlobalSearch(''); setShowSearchResults(false) }}
                              className="w-full px-4 py-2.5 text-left hover:bg-admin-surface-soft flex items-center gap-3"
                            >
                              <div className="w-7 h-7 rounded-full bg-status-warning-soft text-status-warning flex items-center justify-center text-[11px] font-bold">
                                {b.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-[13px] font-semibold text-admin-ink">{b.name}</p>
                                <p className="admin-caption">{b.service} · {b.email}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="px-4 lg:px-8 py-6 lg:py-8 max-w-[1400px] mx-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin h-7 w-7 border-2 border-brand-500 border-t-transparent rounded-full" />
              <p className="admin-body mt-4">Lade Daten...</p>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <OverviewTab bookings={bookings} members={members} subscriptions={subscriptions} invoices={invoices} onTabChange={(tab) => setActiveTab(tab as TabId)} />
              )}
              {activeTab === 'bookings' && (
                <BookingsTab bookings={bookings} setBookings={setBookings} supabase={supabase} onRefresh={loadData} />
              )}
              {activeTab === 'members' && (
                <MembersTab members={members} setMembers={setMembers} subscriptions={subscriptions} invoices={invoices} bookings={bookings} supabase={supabase} onRefresh={loadData} initialSearch={globalSearch} />
              )}
              {activeTab === 'subscriptions' && (
                <SubscriptionsTab subscriptions={subscriptions} setSubscriptions={setSubscriptions} members={members} supabase={supabase} onRefresh={loadData} />
              )}
              {activeTab === 'invoices' && (
                <InvoicesTab invoices={invoices} setInvoices={setInvoices} members={members} supabase={supabase} onRefresh={loadData} />
              )}
              {activeTab === 'contracts' && (
                <ContractsTab members={members} supabase={supabase} onRefresh={loadData} />
              )}
              {activeTab === 'contract_archive' && (
                <ContractArchiveTab members={members} supabase={supabase} />
              )}
              {activeTab === 'training' && (
                <TrainingTab exercises={exercises} workouts={workouts} supabase={supabase} onRefresh={loadData} userId={userId} />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
