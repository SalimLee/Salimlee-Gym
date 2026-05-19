'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { adminDelete } from '@/lib/admin-delete'
import {
  Card, CardHeader, Button, IconButton, Badge, Input, Select, SearchInput,
  Snackbar, EmptyState, SortHeader, useSort, type BadgeTone,
} from './ui'

type BookingStatus = 'pending' | 'confirmed' | 'cancelled'

interface Booking {
  id: string; created_at: string; updated_at: string
  name: string; email: string; phone: string | null
  service: string; preferred_date: string | null
  message: string | null; status: BookingStatus; admin_notes: string | null
}

const STATUS_META: Record<BookingStatus, { label: string; tone: BadgeTone }> = {
  pending:   { label: 'Offen',     tone: 'warning' },
  confirmed: { label: 'Bestätigt', tone: 'success' },
  cancelled: { label: 'Storniert', tone: 'neutral' },
}

interface BookingsTabProps {
  bookings: Booking[]
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>
  supabase: SupabaseClient
  onRefresh: () => void
}

function formatDateDE(d: string) { return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
function formatPref(d: string | null) { return d ? new Date(d).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—' }

export default function BookingsTab({ bookings, setBookings, supabase, onRefresh: _onRefresh }: BookingsTabProps) {
  void _onRefresh
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>('all')
  const [serviceFilter, setServiceFilter] = useState<string>('all')
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<BookingStatus | null>(null)
  const [personalMessage, setPersonalMessage] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [snackbar, setSnackbar] = useState<{ message: string; tone: 'success' | 'danger' | 'info' } | null>(null)

  const showSnackbar = useCallback((message: string, tone: 'success' | 'danger' | 'info' = 'success') => setSnackbar({ message, tone }), [])
  useEffect(() => { if (!snackbar) return; const t = setTimeout(() => setSnackbar(null), 4000); return () => clearTimeout(t) }, [snackbar])

  const allServices = useMemo(() => Array.from(new Set(bookings.map(b => b.service))).sort(), [bookings])

  const filtered = useMemo(() => bookings.filter(b => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false
    if (serviceFilter !== 'all' && b.service !== serviceFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!b.name.toLowerCase().includes(q) && !b.email.toLowerCase().includes(q) && !b.service.toLowerCase().includes(q)) return false
    }
    return true
  }), [bookings, search, statusFilter, serviceFilter])

  const { sorted, isActive, dirOf, setSort } = useSort<Booking>(filtered, 'created_at', 'desc')

  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
  }

  const updateStatus = async (id: string, status: BookingStatus, message?: string) => {
    setSaving(true)
    const { error } = await supabase.from('bookings').update({ status }).eq('id', id)
    if (!error) {
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b))
      if (selectedBooking?.id === id) setSelectedBooking(prev => prev ? { ...prev, status } : null)
      if (status === 'confirmed' || status === 'cancelled') {
        try {
          const booking = bookings.find(b => b.id === id)
          await fetch('/api/booking/send-notification', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookingId: id, status, personalMessage: message || '', booking: booking ? { name: booking.name, email: booking.email, service: booking.service, preferred_date: booking.preferred_date } : undefined }),
          })
          showSnackbar(`Buchung ${status === 'confirmed' ? 'bestätigt' : 'storniert'} · E-Mail versendet`)
        } catch {
          showSnackbar('E-Mail-Versand fehlgeschlagen', 'danger')
        }
      } else {
        showSnackbar('Status aktualisiert')
      }
    } else showSnackbar('Status-Update fehlgeschlagen', 'danger')
    setSaving(false)
  }

  const openStatusModal = (status: BookingStatus) => {
    if (!selectedBooking) return
    if (status === 'confirmed' || status === 'cancelled') {
      setPendingStatus(status); setPersonalMessage(''); setShowMessageModal(true)
    } else updateStatus(selectedBooking.id, status)
  }
  const confirmStatusChange = async () => {
    if (!selectedBooking || !pendingStatus) return
    setSendingEmail(true)
    await updateStatus(selectedBooking.id, pendingStatus, personalMessage)
    setSendingEmail(false); setShowMessageModal(false); setPendingStatus(null); setPersonalMessage('')
  }

  const saveNotes = async (id: string) => {
    setSaving(true)
    const { error } = await supabase.from('bookings').update({ admin_notes: adminNotes }).eq('id', id)
    if (!error) {
      setBookings(prev => prev.map(b => b.id === id ? { ...b, admin_notes: adminNotes } : b))
      if (selectedBooking) setSelectedBooking({ ...selectedBooking, admin_notes: adminNotes })
      showSnackbar('Notizen gespeichert')
    }
    setSaving(false)
  }

  const deleteBooking = async (id: string) => {
    setDeleting(true)
    const { error } = await adminDelete(supabase, 'bookings', id)
    if (!error) {
      setBookings(prev => prev.filter(b => b.id !== id))
      if (selectedBooking?.id === id) setSelectedBooking(null)
      setDeleteConfirm(null); showSnackbar('Buchung gelöscht')
    } else showSnackbar(error, 'danger')
    setDeleting(false)
  }

  return (
    <div className="space-y-5 animate-fade-in-fast">
      {/* Headline */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="admin-eyebrow">Buchungen</p>
          <h1 className="admin-h1 mt-1">Anfragen verwalten</h1>
          <p className="admin-body mt-1">Alle eingehenden Buchungsanfragen — bestätigen oder stornieren mit automatischer E-Mail.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="!p-4"><p className="admin-eyebrow">Gesamt</p><p className="text-[26px] leading-[32px] font-semibold tracking-[-0.4px] text-admin-ink-strong mt-1">{stats.total}</p></Card>
        <Card className="!p-4"><p className="admin-eyebrow">Offen</p><p className={`text-[26px] leading-[32px] font-semibold tracking-[-0.4px] mt-1 ${stats.pending > 0 ? 'text-status-warning' : 'text-admin-ink-strong'}`}>{stats.pending}</p><p className="admin-caption">Antwort fällig</p></Card>
        <Card className="!p-4"><p className="admin-eyebrow">Bestätigt</p><p className="text-[26px] leading-[32px] font-semibold tracking-[-0.4px] text-status-success mt-1">{stats.confirmed}</p></Card>
        <Card className="!p-4"><p className="admin-eyebrow">Storniert</p><p className="text-[26px] leading-[32px] font-semibold tracking-[-0.4px] text-admin-mute mt-1">{stats.cancelled}</p></Card>
      </div>

      {/* Liste + Detail */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card padded={false}>
            <div className="p-4 flex items-center gap-2 flex-wrap border-b border-admin-hairline-soft">
              <div className="flex-1 min-w-[200px]"><SearchInput value={search} onChange={setSearch} placeholder="Name, E-Mail, Service..." /></div>
              <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value as BookingStatus | 'all')} className="min-w-[140px]">
                <option value="all">Alle Status</option>
                <option value="pending">Nur Offen</option>
                <option value="confirmed">Bestätigt</option>
                <option value="cancelled">Storniert</option>
              </Select>
              <Select value={serviceFilter} onChange={e => setServiceFilter(e.target.value)} className="min-w-[160px]">
                <option value="all">Alle Services</option>
                {allServices.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>

            {sorted.length === 0 ? (
              <EmptyState
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                title="Keine Buchungen gefunden"
                description={search || statusFilter !== 'all' || serviceFilter !== 'all' ? 'Filter zurücksetzen.' : 'Es liegen aktuell keine Anfragen vor.'}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th><SortHeader label="Kunde" active={isActive('name')} direction={dirOf('name')} onClick={() => setSort('name')} /></th>
                      <th><SortHeader label="Service" active={isActive('service')} direction={dirOf('service')} onClick={() => setSort('service')} /></th>
                      <th>Status</th>
                      <th><SortHeader label="Wunschtermin" active={isActive('preferred_date')} direction={dirOf('preferred_date')} onClick={() => setSort('preferred_date')} /></th>
                      <th><SortHeader label="Eingang" active={isActive('created_at')} direction={dirOf('created_at')} onClick={() => setSort('created_at')} /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map(b => (
                      <tr key={b.id} className={selectedBooking?.id === b.id ? 'bg-brand-50/50' : 'cursor-pointer'} onClick={() => { setSelectedBooking(b); setAdminNotes(b.admin_notes || '') }}>
                        <td>
                          <p className="text-[13px] font-semibold text-admin-ink">{b.name}</p>
                          <p className="admin-caption">{b.email}</p>
                        </td>
                        <td><p className="text-[13px] text-brand-600 font-medium">{b.service}</p></td>
                        <td><Badge tone={STATUS_META[b.status].tone} dot>{STATUS_META[b.status].label}</Badge></td>
                        <td><p className="admin-caption">{formatPref(b.preferred_date)}</p></td>
                        <td><p className="admin-caption">{formatDateDE(b.created_at)}</p></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Detail */}
        <div className="lg:col-span-1">
          {selectedBooking ? (
            <Card padded={false} className="lg:sticky lg:top-20">
              <div className="p-4 border-b border-admin-hairline">
                <p className="admin-eyebrow">Buchung</p>
                <h3 className="admin-h2 mt-0.5">{selectedBooking.name}</h3>
              </div>
              <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="space-y-1.5">
                  <a href={`mailto:${selectedBooking.email}`} className="block text-[13px] text-brand-600 hover:underline">{selectedBooking.email}</a>
                  {selectedBooking.phone && <a href={`tel:${selectedBooking.phone}`} className="block text-[13px] text-brand-600 hover:underline">{selectedBooking.phone}</a>}
                </div>

                <div className="bg-admin-surface-soft rounded-btn p-3 space-y-1.5 text-[13px]">
                  <div className="flex justify-between"><span className="text-admin-mute">Service</span><span className="text-admin-ink font-medium">{selectedBooking.service}</span></div>
                  <div className="flex justify-between"><span className="text-admin-mute">Wunschtermin</span><span>{formatPref(selectedBooking.preferred_date)}</span></div>
                  <div className="flex justify-between"><span className="text-admin-mute">Eingegangen</span><span className="admin-caption">{formatDateDE(selectedBooking.created_at)}</span></div>
                </div>

                {selectedBooking.message && (
                  <div>
                    <p className="admin-eyebrow mb-1.5">Nachricht</p>
                    <p className="text-[13px] text-admin-body bg-admin-surface-soft rounded-btn p-3">{selectedBooking.message}</p>
                  </div>
                )}

                <div>
                  <p className="admin-eyebrow mb-2">Status ändern</p>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="success" onClick={() => openStatusModal('confirmed')} disabled={saving || selectedBooking.status === 'confirmed'} className="flex-1">Bestätigen</Button>
                    <Button size="sm" variant="outline" onClick={() => openStatusModal('pending')} disabled={saving || selectedBooking.status === 'pending'} className="flex-1">Offen</Button>
                    <Button size="sm" variant="danger" onClick={() => openStatusModal('cancelled')} disabled={saving || selectedBooking.status === 'cancelled'} className="flex-1">Stornieren</Button>
                  </div>
                </div>

                <div>
                  <p className="admin-eyebrow mb-1.5">Interne Notizen</p>
                  <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={3} className="admin-input resize-none" placeholder="Coach-Notizen..." />
                  <Button size="sm" variant="outline" onClick={() => saveNotes(selectedBooking.id)} disabled={saving} className="mt-2 w-full">
                    {saving ? 'Speichert…' : 'Notizen speichern'}
                  </Button>
                </div>

                <div className="flex gap-2">
                  <a href={`mailto:${selectedBooking.email}?subject=Deine Buchungsanfrage`} className="admin-btn admin-btn-outline flex-1 justify-center">E-Mail</a>
                  {selectedBooking.phone && <a href={`tel:${selectedBooking.phone}`} className="admin-btn admin-btn-outline flex-1 justify-center">Anrufen</a>}
                </div>

                <div className="pt-3 border-t border-admin-hairline-soft">
                  {deleteConfirm === selectedBooking.id ? (
                    <div className="flex gap-2">
                      <Button size="sm" variant="danger" onClick={() => deleteBooking(selectedBooking.id)} disabled={deleting} className="flex-1">{deleting ? 'Löscht…' : 'Endgültig löschen'}</Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(null)}>Abbruch</Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(selectedBooking.id)} className="text-status-danger w-full">Buchung löschen</Button>
                  )}
                </div>
              </div>
            </Card>
          ) : (
            <Card padded>
              <EmptyState
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                title="Wähle eine Buchung"
                description="Klicke links auf einen Eintrag, um Details zu sehen."
              />
            </Card>
          )}
        </div>
      </div>

      {/* Status-Modal */}
      {showMessageModal && pendingStatus && selectedBooking && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in-fast" onClick={() => !sendingEmail && setShowMessageModal(false)}>
          <div className="admin-card bg-admin-surface w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-admin-hairline flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${pendingStatus === 'confirmed' ? 'bg-status-success-soft text-status-success' : 'bg-status-danger-soft text-status-danger'}`}>
                {pendingStatus === 'confirmed' ? '✓' : '✕'}
              </div>
              <div>
                <h3 className="admin-h2">{pendingStatus === 'confirmed' ? 'Buchung bestätigen' : 'Buchung stornieren'}</h3>
                <p className="admin-caption">E-Mail an {selectedBooking.name}</p>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <div className="bg-admin-surface-soft rounded-btn p-3 space-y-1.5 text-[13px]">
                <div className="flex justify-between"><span className="text-admin-mute">Service</span><span className="text-admin-ink font-medium">{selectedBooking.service}</span></div>
                <div className="flex justify-between"><span className="text-admin-mute">Kunde</span><span>{selectedBooking.name}</span></div>
                <div className="flex justify-between"><span className="text-admin-mute">E-Mail</span><span>{selectedBooking.email}</span></div>
              </div>
              <label className="block">
                <span className="admin-caption block mb-1">Persönliche Nachricht (optional)</span>
                <textarea value={personalMessage} onChange={e => setPersonalMessage(e.target.value)} rows={4}
                  placeholder={pendingStatus === 'confirmed' ? 'z.B. "Wir freuen uns auf dich! Bitte komm 10 Minuten früher…"' : 'z.B. "Leider ist der Termin ausgebucht. Alternativvorschlag…"'}
                  className="admin-input resize-none" autoFocus />
              </label>
            </div>
            <div className="p-5 border-t border-admin-hairline flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => { setShowMessageModal(false); setPendingStatus(null); setPersonalMessage('') }} disabled={sendingEmail}>Abbrechen</Button>
              <Button variant={pendingStatus === 'confirmed' ? 'success' : 'danger'} onClick={confirmStatusChange} disabled={sendingEmail}>
                {sendingEmail ? 'Wird gesendet…' : pendingStatus === 'confirmed' ? 'Bestätigen & senden' : 'Stornieren & senden'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {snackbar && <Snackbar message={snackbar.message} tone={snackbar.tone} />}
    </div>
  )
}
