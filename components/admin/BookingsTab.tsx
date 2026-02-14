'use client'

import { useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

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

interface BookingsTabProps {
  bookings: Booking[]
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>
  supabase: SupabaseClient
  onRefresh: () => void
}

export default function BookingsTab({ bookings, setBookings, supabase, onRefresh }: BookingsTabProps) {
  const [filter, setFilter] = useState<BookingStatus | 'all'>('all')
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<BookingStatus | null>(null)
  const [personalMessage, setPersonalMessage] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)

  const filteredBookings = bookings.filter(b => {
    const matchesFilter = filter === 'all' || b.status === filter
    const matchesSearch = search === '' ||
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.email.toLowerCase().includes(search.toLowerCase()) ||
      b.service.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
  }

  const openStatusModal = (status: BookingStatus) => {
    if (status === 'confirmed' || status === 'cancelled') {
      setPendingStatus(status)
      setPersonalMessage('')
      setShowMessageModal(true)
    } else {
      updateStatus(selectedBooking!.id, status)
    }
  }

  const confirmStatusChange = async () => {
    if (!selectedBooking || !pendingStatus) return
    setSendingEmail(true)
    await updateStatus(selectedBooking.id, pendingStatus, personalMessage)
    setSendingEmail(false)
    setShowMessageModal(false)
    setPendingStatus(null)
    setPersonalMessage('')
  }

  const updateStatus = async (id: string, status: BookingStatus, message?: string) => {
    setSaving(true)
    try {
      // Status direkt über Supabase Client aktualisieren
      const { error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', id)

      if (!error) {
        setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b))
        if (selectedBooking?.id === id) {
          setSelectedBooking(prev => prev ? { ...prev, status } : null)
        }

        // E-Mail-Benachrichtigung im Hintergrund senden
        if (status === 'confirmed' || status === 'cancelled') {
          fetch('/api/booking/send-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookingId: id, status, personalMessage: message || '' }),
          }).catch(() => {
            // E-Mail-Fehler ignorieren - Status wurde bereits aktualisiert
          })
        }
      } else {
        console.error('Status-Update fehlgeschlagen:', error)
      }
    } catch (error) {
      console.error('Status-Update fehlgeschlagen:', error)
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

  const formatDate = (date: string) => new Date(date).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  const formatPreferredDate = (date: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('de-DE', {
      weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      {/* Filter-Karten */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button onClick={() => setFilter('all')} className={`p-4 rounded-xl border transition-all text-left ${filter === 'all' ? 'bg-brand-500/10 border-brand-500/50' : 'bg-dark-900/50 border-dark-800 hover:border-dark-700'}`}>
          <p className={`text-2xl font-black ${filter === 'all' ? 'text-brand-400' : 'text-dark-100'}`}>{stats.total}</p>
          <p className="text-xs text-dark-400 mt-1">Gesamt</p>
        </button>
        <button onClick={() => setFilter('pending')} className={`p-4 rounded-xl border transition-all text-left ${filter === 'pending' ? 'bg-yellow-500/10 border-yellow-500/50' : 'bg-dark-900/50 border-dark-800 hover:border-dark-700'}`}>
          <p className={`text-2xl font-black ${filter === 'pending' ? 'text-yellow-400' : 'text-dark-100'}`}>{stats.pending}</p>
          <p className="text-xs text-dark-400 mt-1">Offen</p>
        </button>
        <button onClick={() => setFilter('confirmed')} className={`p-4 rounded-xl border transition-all text-left ${filter === 'confirmed' ? 'bg-green-500/10 border-green-500/50' : 'bg-dark-900/50 border-dark-800 hover:border-dark-700'}`}>
          <p className={`text-2xl font-black ${filter === 'confirmed' ? 'text-green-400' : 'text-dark-100'}`}>{stats.confirmed}</p>
          <p className="text-xs text-dark-400 mt-1">Bestätigt</p>
        </button>
        <button onClick={() => setFilter('cancelled')} className={`p-4 rounded-xl border transition-all text-left ${filter === 'cancelled' ? 'bg-red-500/10 border-red-500/50' : 'bg-dark-900/50 border-dark-800 hover:border-dark-700'}`}>
          <p className={`text-2xl font-black ${filter === 'cancelled' ? 'text-red-400' : 'text-dark-100'}`}>{stats.cancelled}</p>
          <p className="text-xs text-dark-400 mt-1">Storniert</p>
        </button>
      </div>

      {/* Such-Leiste */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buchung suchen (Name, Email, Service)..."
          className="w-full pl-10 pr-4 py-3 bg-dark-900/50 border border-dark-800 rounded-xl text-dark-100 placeholder:text-dark-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm"
        />
      </div>

      {/* Buchungsliste & Detail */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-dark-900/50 rounded-xl border border-dark-800 overflow-hidden">
            <div className="p-4 border-b border-dark-800 flex items-center justify-between">
              <h2 className="font-bold text-dark-100">
                Buchungen {filter !== 'all' && `(${STATUS_CONFIG[filter].label})`}
                <span className="text-dark-500 font-normal ml-2 text-sm">{filteredBookings.length} Ergebnisse</span>
              </h2>
              <button onClick={onRefresh} className="text-sm text-dark-400 hover:text-brand-500 transition-colors">
                Aktualisieren
              </button>
            </div>

            {filteredBookings.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-dark-500">Keine Buchungen gefunden</p>
              </div>
            ) : (
              <div className="divide-y divide-dark-800">
                {filteredBookings.map((booking) => (
                  <button
                    key={booking.id}
                    onClick={() => {
                      setSelectedBooking(booking)
                      setAdminNotes(booking.admin_notes || '')
                    }}
                    className={`w-full p-4 text-left hover:bg-dark-800/50 transition-colors ${
                      selectedBooking?.id === booking.id ? 'bg-dark-800/50 border-l-2 border-l-brand-500' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-dark-100 truncate">{booking.name}</p>
                          <span className={`px-2 py-0.5 rounded-full text-xs border ${STATUS_CONFIG[booking.status].bg} ${STATUS_CONFIG[booking.status].color}`}>
                            {STATUS_CONFIG[booking.status].label}
                          </span>
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

        {/* Detail-Panel */}
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
                  {selectedBooking.phone && (
                    <a href={`tel:${selectedBooking.phone}`} className="text-sm text-brand-500 hover:underline block">{selectedBooking.phone}</a>
                  )}
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
                    <button onClick={() => openStatusModal('confirmed')} disabled={saving || selectedBooking.status === 'confirmed'} className="flex-1 px-3 py-2 text-sm font-bold rounded-lg bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed">Bestätigen</button>
                    <button onClick={() => openStatusModal('pending')} disabled={saving || selectedBooking.status === 'pending'} className="flex-1 px-3 py-2 text-sm font-bold rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed">Offen</button>
                    <button onClick={() => openStatusModal('cancelled')} disabled={saving || selectedBooking.status === 'cancelled'} className="flex-1 px-3 py-2 text-sm font-bold rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed">Stornieren</button>
                  </div>
                  {(selectedBooking.status !== 'pending') && (
                    <p className="text-xs text-dark-500 mt-2">
                      {selectedBooking.status === 'confirmed' ? 'Kunde wurde per E-Mail benachrichtigt' : 'Kunde wurde per E-Mail informiert'}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-2">Notizen</p>
                  <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={3} className="input-field resize-none text-sm" placeholder="Interne Notizen..." />
                  <button onClick={() => saveNotes(selectedBooking.id)} disabled={saving} className="mt-2 w-full px-3 py-2 text-sm font-bold rounded-lg bg-brand-500/10 text-brand-500 border border-brand-500/30 hover:bg-brand-500/20 transition-all disabled:opacity-50">
                    {saving ? 'Speichert...' : 'Notizen speichern'}
                  </button>
                </div>

                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-2">Aktionen</p>
                  <div className="flex gap-2">
                    <a href={`mailto:${selectedBooking.email}?subject=Deine Buchungsanfrage bei Salim Lee Gym`} className="flex-1 px-3 py-2 text-sm text-center font-bold rounded-lg bg-dark-800 text-dark-300 border border-dark-700 hover:border-brand-500/30 hover:text-brand-500 transition-all">E-Mail</a>
                    {selectedBooking.phone && (
                      <a href={`tel:${selectedBooking.phone}`} className="flex-1 px-3 py-2 text-sm text-center font-bold rounded-lg bg-dark-800 text-dark-300 border border-dark-700 hover:border-brand-500/30 hover:text-brand-500 transition-all">Anrufen</a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-dark-900/50 rounded-xl border border-dark-800 p-8 text-center">
              <svg className="w-12 h-12 text-dark-700 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <p className="text-dark-500 text-sm">Klicke auf eine Buchung, um Details zu sehen</p>
            </div>
          )}
        </div>
      </div>

      {/* Nachrichten-Modal für Bestätigung/Stornierung */}
      {showMessageModal && pendingStatus && selectedBooking && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => !sendingEmail && setShowMessageModal(false)}>
          <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className={`p-5 border-b border-dark-800 flex items-center gap-3`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                pendingStatus === 'confirmed' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {pendingStatus === 'confirmed' ? '\u2713' : '\u2717'}
              </div>
              <div>
                <h3 className="font-bold text-dark-100 text-lg">
                  {pendingStatus === 'confirmed' ? 'Buchung bestätigen' : 'Buchung stornieren'}
                </h3>
                <p className="text-dark-500 text-sm">E-Mail an {selectedBooking.name}</p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-dark-800/50 rounded-xl p-4 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-dark-400">Service</span>
                  <span className="text-dark-100 font-medium">{selectedBooking.service}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">Kunde</span>
                  <span className="text-dark-100">{selectedBooking.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">E-Mail</span>
                  <span className="text-dark-300">{selectedBooking.email}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Persönliche Nachricht <span className="text-dark-500">(optional)</span>
                </label>
                <textarea
                  value={personalMessage}
                  onChange={(e) => setPersonalMessage(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-dark-800/50 border border-dark-700 rounded-xl text-dark-100 placeholder:text-dark-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm resize-none"
                  placeholder={pendingStatus === 'confirmed'
                    ? 'z.B. "Wir freuen uns auf dich! Bitte komm 10 Minuten früher..."'
                    : 'z.B. "Leider ist der Termin bereits ausgebucht. Wie wäre es am Donnerstag?"'
                  }
                  autoFocus
                />
              </div>
            </div>

            <div className="p-5 border-t border-dark-800 flex gap-3">
              <button
                onClick={() => { setShowMessageModal(false); setPendingStatus(null); setPersonalMessage('') }}
                disabled={sendingEmail}
                className="flex-1 px-4 py-3 text-sm font-bold rounded-xl bg-dark-800 text-dark-300 border border-dark-700 hover:border-dark-600 transition-all disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button
                onClick={confirmStatusChange}
                disabled={sendingEmail}
                className={`flex-1 px-4 py-3 text-sm font-bold rounded-xl transition-all disabled:opacity-50 ${
                  pendingStatus === 'confirmed'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                }`}
              >
                {sendingEmail
                  ? 'Wird gesendet...'
                  : pendingStatus === 'confirmed'
                    ? 'Bestätigen & E-Mail senden'
                    : 'Stornieren & E-Mail senden'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
