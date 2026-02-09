'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type BookingStatus = 'pending' | 'confirmed' | 'cancelled'

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
  status: BookingStatus
  admin_notes: string | null
}

const STATUS_CONFIG: Record<BookingStatus, { label: string; color: string; bg: string }> = {
  pending: { label: 'Offen', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30' },
  confirmed: { label: 'Bestätigt', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30' },
  cancelled: { label: 'Storniert', color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/30' },
}

export default function AdminDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [filter, setFilter] = useState<BookingStatus | 'all'>('all')
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/admin/login')
        return
      }
      setAuthenticated(true)
    }
    checkAuth()
  }, [router])

  const loadBookings = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Fehler beim Laden:', error)
    } else {
      setBookings((data as Booking[]) || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (authenticated) {
      loadBookings()
    }
  }, [authenticated, loadBookings])

  const updateStatus = async (id: string, newStatus: BookingStatus) => {
    setSaving(true)
    const { error } = await supabase
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', id)

    if (!error) {
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b))
      if (selectedBooking?.id === id) {
        setSelectedBooking(prev => prev ? { ...prev, status: newStatus } : null)
      }
    }
    setSaving(false)
  }

  const saveNotes = async (id: string) => {
    setSaving(true)
    const { error } = await supabase
      .from('bookings')
      .update({ admin_notes: adminNotes })
      .eq('id', id)

    if (!error) {
      setBookings(prev => prev.map(b => b.id === id ? { ...b, admin_notes: adminNotes } : b))
      if (selectedBooking) {
        setSelectedBooking({ ...selectedBooking, admin_notes: adminNotes })
      }
    }
    setSaving(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  const filteredBookings = filter === 'all' ? bookings : bookings.filter(b => b.status === filter)

  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatPreferredDate = (date: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('de-DE', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-950">
      <header className="bg-dark-900/80 border-b border-dark-800 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black">
              <span className="bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">SALIM LEE</span>
              <span className="text-dark-400 text-sm ml-2 font-normal">Admin</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <a href="/" className="text-dark-400 hover:text-brand-500 text-sm transition-colors">Webseite</a>
            <button onClick={handleLogout} className="px-4 py-2 text-sm text-dark-400 hover:text-red-400 border border-dark-700 rounded-lg hover:border-red-400/30 transition-all">Abmelden</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <button onClick={() => setFilter('all')} className={`p-4 rounded-xl border transition-all text-left ${filter === 'all' ? 'bg-brand-500/10 border-brand-500/50' : 'bg-dark-900/50 border-dark-800 hover:border-dark-700'}`}>
            <p className="text-3xl font-black text-dark-100">{stats.total}</p>
            <p className="text-sm text-dark-400 mt-1">Gesamt</p>
          </button>
          <button onClick={() => setFilter('pending')} className={`p-4 rounded-xl border transition-all text-left ${filter === 'pending' ? 'bg-yellow-400/10 border-yellow-400/50' : 'bg-dark-900/50 border-dark-800 hover:border-dark-700'}`}>
            <p className="text-3xl font-black text-yellow-400">{stats.pending}</p>
            <p className="text-sm text-dark-400 mt-1">Offen</p>
          </button>
          <button onClick={() => setFilter('confirmed')} className={`p-4 rounded-xl border transition-all text-left ${filter === 'confirmed' ? 'bg-green-400/10 border-green-400/50' : 'bg-dark-900/50 border-dark-800 hover:border-dark-700'}`}>
            <p className="text-3xl font-black text-green-400">{stats.confirmed}</p>
            <p className="text-sm text-dark-400 mt-1">Bestätigt</p>
          </button>
          <button onClick={() => setFilter('cancelled')} className={`p-4 rounded-xl border transition-all text-left ${filter === 'cancelled' ? 'bg-red-400/10 border-red-400/50' : 'bg-dark-900/50 border-dark-800 hover:border-dark-700'}`}>
            <p className="text-3xl font-black text-red-400">{stats.cancelled}</p>
            <p className="text-sm text-dark-400 mt-1">Storniert</p>
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-dark-900/50 rounded-xl border border-dark-800 overflow-hidden">
              <div className="p-4 border-b border-dark-800 flex items-center justify-between">
                <h2 className="font-bold text-dark-100">Buchungen {filter !== 'all' && `(${STATUS_CONFIG[filter].label})`}</h2>
                <button onClick={loadBookings} className="text-sm text-dark-400 hover:text-brand-500 transition-colors">Aktualisieren</button>
              </div>

              {loading ? (
                <div className="p-12 text-center">
                  <div className="animate-spin h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full mx-auto" />
                  <p className="text-dark-500 mt-4 text-sm">Lade Buchungen...</p>
                </div>
              ) : filteredBookings.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-dark-500">Keine Buchungen vorhanden</p>
                </div>
              ) : (
                <div className="divide-y divide-dark-800">
                  {filteredBookings.map((booking) => (
                    <button key={booking.id} onClick={() => { setSelectedBooking(booking); setAdminNotes(booking.admin_notes || '') }} className={`w-full p-4 text-left hover:bg-dark-800/50 transition-colors ${selectedBooking?.id === booking.id ? 'bg-dark-800/50' : ''}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-dark-100 truncate">{booking.name}</p>
                            <span className={`px-2 py-0.5 rounded-full text-xs border ${STATUS_CONFIG[booking.status].bg} ${STATUS_CONFIG[booking.status].color}`}>{STATUS_CONFIG[booking.status].label}</span>
                          </div>
                          <p className="text-sm text-brand-500 font-medium">{booking.service}</p>
                          <p className="text-xs text-dark-500 mt-1">{formatDate(booking.created_at)}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm text-dark-400">{booking.people} Pers.</p>
                          <p className="text-xs text-dark-500">{formatPreferredDate(booking.preferred_date)}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            {selectedBooking ? (
              <div className="bg-dark-900/50 rounded-xl border border-dark-800 sticky top-24">
                <div className="p-4 border-b border-dark-800">
                  <h3 className="font-bold text-dark-100">Buchungsdetails</h3>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <p className="text-xs text-dark-500 uppercase tracking-wider mb-2">Kontakt</p>
                    <p className="text-dark-100 font-bold">{selectedBooking.name}</p>
                    <a href={`mailto:${selectedBooking.email}`} className="text-sm text-brand-500 hover:underline block">{selectedBooking.email}</a>
                    {selectedBooking.phone && (<a href={`tel:${selectedBooking.phone}`} className="text-sm text-brand-500 hover:underline block">{selectedBooking.phone}</a>)}
                  </div>
                  <div>
                    <p className="text-xs text-dark-500 uppercase tracking-wider mb-2">Buchung</p>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between"><span className="text-dark-400">Service</span><span className="text-dark-100 font-medium">{selectedBooking.service}</span></div>
                      <div className="flex justify-between"><span className="text-dark-400">Personen</span><span className="text-dark-100">{selectedBooking.people}</span></div>
                      <div className="flex justify-between"><span className="text-dark-400">Wunschtermin</span><span className="text-dark-100">{formatPreferredDate(selectedBooking.preferred_date)}</span></div>
                      <div className="flex justify-between"><span className="text-dark-400">Eingegangen</span><span className="text-dark-100">{formatDate(selectedBooking.created_at)}</span></div>
                    </div>
                  </div>
                  {selectedBooking.message && (
                    <div>
                      <p className="text-xs text-dark-500 uppercase tracking-wider mb-2">Nachricht</p>
                      <p className="text-sm text-dark-300 bg-dark-800/50 rounded-lg p-3">{selectedBooking.message}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-dark-500 uppercase tracking-wider mb-2">Status ändern</p>
                    <div className="flex gap-2">
                      <button onClick={() => updateStatus(selectedBooking.id, 'confirmed')} disabled={saving || selectedBooking.status === 'confirmed'} className="flex-1 px-3 py-2 text-sm font-bold rounded-lg bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed">Bestätigen</button>
                      <button onClick={() => updateStatus(selectedBooking.id, 'pending')} disabled={saving || selectedBooking.status === 'pending'} className="flex-1 px-3 py-2 text-sm font-bold rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed">Offen</button>
                      <button onClick={() => updateStatus(selectedBooking.id, 'cancelled')} disabled={saving || selectedBooking.status === 'cancelled'} className="flex-1 px-3 py-2 text-sm font-bold rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed">Stornieren</button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-dark-500 uppercase tracking-wider mb-2">Notizen</p>
                    <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={3} className="input-field resize-none text-sm" placeholder="Interne Notizen zur Buchung..." />
                    <button onClick={() => saveNotes(selectedBooking.id)} disabled={saving} className="mt-2 w-full px-3 py-2 text-sm font-bold rounded-lg bg-brand-500/10 text-brand-500 border border-brand-500/30 hover:bg-brand-500/20 transition-all disabled:opacity-50">{saving ? 'Speichert...' : 'Notizen speichern'}</button>
                  </div>
                  <div>
                    <p className="text-xs text-dark-500 uppercase tracking-wider mb-2">Aktionen</p>
                    <div className="flex gap-2">
                      <a href={`mailto:${selectedBooking.email}?subject=Deine Buchungsanfrage bei Salim Lee Gym`} className="flex-1 px-3 py-2 text-sm text-center font-bold rounded-lg bg-dark-800 text-dark-300 border border-dark-700 hover:border-brand-500/30 hover:text-brand-500 transition-all">E-Mail</a>
                      {selectedBooking.phone && (<a href={`tel:${selectedBooking.phone}`} className="flex-1 px-3 py-2 text-sm text-center font-bold rounded-lg bg-dark-800 text-dark-300 border border-dark-700 hover:border-brand-500/30 hover:text-brand-500 transition-all">Anrufen</a>)}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-dark-900/50 rounded-xl border border-dark-800 p-8 text-center">
                <p className="text-dark-500 text-sm">Klicke auf eine Buchung, um Details zu sehen</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
```

**Strg+A → Entf → Einfügen → Commit changes.** Dann sollte der Build durchlaufen!
