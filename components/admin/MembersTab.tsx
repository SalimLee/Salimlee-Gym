'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { adminDelete } from '@/lib/admin-delete'
import {
  Card, CardHeader, Button, IconButton, Badge, Input, Select, SearchInput, Checkbox,
  Snackbar, EmptyState, SortHeader, useSort, type BadgeTone,
} from './ui'
import { MemberPhotoUpload } from './MemberPhotoUpload'

interface Member { id: string; created_at: string; updated_at: string; name: string; email: string; phone: string | null; notes: string | null; active: boolean; photo_url?: string | null }
interface Subscription { id: string; created_at: string; updated_at: string; member_id: string; name: string; type: string; start_date: string; end_date: string | null; total_units: number | null; remaining_units: number | null; price: number; status: 'active' | 'expired' | 'cancelled' | 'paused' | 'pending'; notes: string | null }
interface Invoice { id: string; created_at: string; updated_at: string; member_id: string; invoice_number: string; description: string; amount: number; status: 'open' | 'paid' | 'overdue' | 'cancelled'; due_date: string; paid_date: string | null; notes: string | null }
interface Booking { id: string; created_at: string; updated_at: string; name: string; email: string; phone: string | null; service: string; preferred_date: string | null; message: string | null; status: 'pending' | 'confirmed' | 'cancelled'; admin_notes: string | null }

interface MembersTabProps {
  members: Member[]
  setMembers: React.Dispatch<React.SetStateAction<Member[]>>
  subscriptions: Subscription[]
  invoices: Invoice[]
  bookings: Booking[]
  supabase: SupabaseClient
  onRefresh: () => void
  initialSearch?: string
}

const SUB_STATUS_META: Record<string, { label: string; tone: BadgeTone }> = {
  active:    { label: 'Aktiv',              tone: 'success' },
  pending:   { label: 'Zahlung ausstehend', tone: 'warning' },
  paused:    { label: 'Pausiert',           tone: 'info' },
  expired:   { label: 'Abgelaufen',         tone: 'danger' },
  cancelled: { label: 'Gekündigt',          tone: 'neutral' },
}

function formatDateDE(d: string): string {
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function MembersTab({ members, setMembers, subscriptions, invoices, bookings, supabase, onRefresh: _onRefresh, initialSearch = '' }: MembersTabProps) {
  void _onRefresh
  const [search, setSearch] = useState(initialSearch)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'has_active_sub' | 'has_open_invoice'>('all')
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', notes: '' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [snackbar, setSnackbar] = useState<{ message: string; tone: 'success' | 'danger' | 'info' } | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const showSnackbar = useCallback((message: string, tone: 'success' | 'danger' | 'info' = 'success') => setSnackbar({ message, tone }), [])
  useEffect(() => {
    if (!snackbar) return
    const t = setTimeout(() => setSnackbar(null), 4000)
    return () => clearTimeout(t)
  }, [snackbar])

  // Lookup-Helpers ────────────────────────────────────────────────────────────
  const subsByMember = useMemo(() => {
    const m = new Map<string, Subscription[]>()
    subscriptions.forEach(s => {
      const arr = m.get(s.member_id) || []
      arr.push(s)
      m.set(s.member_id, arr)
    })
    return m
  }, [subscriptions])

  const invoicesByMember = useMemo(() => {
    const m = new Map<string, Invoice[]>()
    invoices.forEach(i => {
      const arr = m.get(i.member_id) || []
      arr.push(i)
      m.set(i.member_id, arr)
    })
    return m
  }, [invoices])

  const bookingsByEmail = useMemo(() => {
    const m = new Map<string, Booking[]>()
    bookings.forEach(b => {
      const k = b.email.toLowerCase()
      const arr = m.get(k) || []
      arr.push(b)
      m.set(k, arr)
    })
    return m
  }, [bookings])

  const memberDerived = (m: Member) => {
    const subs = subsByMember.get(m.id) || []
    const activeSub = subs.find(s => s.status === 'active')
    const pendingSub = subs.find(s => s.status === 'pending')
    const pausedSub = subs.find(s => s.status === 'paused')
    const invs = invoicesByMember.get(m.id) || []
    const openCount = invs.filter(i => i.status === 'open' || i.status === 'overdue').length
    return { subs, activeSub, pendingSub, pausedSub, openCount, totalSubs: subs.length }
  }

  // Filter ───────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return members.filter(m => {
      if (search) {
        const q = search.toLowerCase()
        if (!m.name.toLowerCase().includes(q) && !m.email.toLowerCase().includes(q) && !(m.phone || '').includes(search)) return false
      }
      if (statusFilter === 'active' && !m.active) return false
      if (statusFilter === 'inactive' && m.active) return false
      if (statusFilter === 'has_active_sub' && !memberDerived(m).activeSub) return false
      if (statusFilter === 'has_open_invoice' && memberDerived(m).openCount === 0) return false
      return true
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, search, statusFilter, subsByMember, invoicesByMember])

  const { sorted, isActive, dirOf, setSort } = useSort<Member>(filtered, 'name', 'asc')

  // Aktionen ─────────────────────────────────────────────────────────────────
  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', notes: '' })
    setEditingId(null)
    setShowForm(false)
  }

  const saveMember = async () => {
    if (!formData.name || !formData.email) return
    setSaving(true)
    if (editingId) {
      const { data, error } = await supabase.from('members').update({ name: formData.name, email: formData.email, phone: formData.phone || null, notes: formData.notes || null }).eq('id', editingId).select().single()
      if (!error && data) {
        setMembers(prev => prev.map(m => m.id === editingId ? data : m))
        if (selectedMember?.id === editingId) setSelectedMember(data)
        showSnackbar('Mitglied aktualisiert')
      } else if (error) showSnackbar('Aktualisierung fehlgeschlagen', 'danger')
    } else {
      const { data, error } = await supabase.from('members').insert({ name: formData.name, email: formData.email, phone: formData.phone || null, notes: formData.notes || null }).select().single()
      if (!error && data) { setMembers(prev => [data, ...prev]); showSnackbar('Mitglied angelegt') }
      else if (error) showSnackbar('Anlegen fehlgeschlagen', 'danger')
    }
    setSaving(false)
    resetForm()
  }

  const toggleActive = async (m: Member) => {
    const { error } = await supabase.from('members').update({ active: !m.active }).eq('id', m.id)
    if (!error) {
      setMembers(prev => prev.map(x => x.id === m.id ? { ...x, active: !x.active } : x))
      if (selectedMember?.id === m.id) setSelectedMember({ ...m, active: !m.active })
      showSnackbar(m.active ? 'Mitglied deaktiviert' : 'Mitglied reaktiviert')
    }
  }

  const deleteMember = async (m: Member) => {
    setDeleting(true)
    const subsRes = await adminDelete(supabase, 'subscriptions', m.id, 'member_id')
    if (subsRes.error) { showSnackbar(subsRes.error, 'danger'); setDeleting(false); return }
    const invRes = await adminDelete(supabase, 'invoices', m.id, 'member_id')
    if (invRes.error) { showSnackbar(invRes.error, 'danger'); setDeleting(false); return }
    const { error } = await adminDelete(supabase, 'members', m.id)
    if (!error) {
      setMembers(prev => prev.filter(x => x.id !== m.id))
      if (selectedMember?.id === m.id) setSelectedMember(null)
      setDeleteConfirm(null)
      showSnackbar('Mitglied gelöscht')
    } else showSnackbar(error, 'danger')
    setDeleting(false)
  }

  const startEdit = (m: Member) => {
    setFormData({ name: m.name, email: m.email, phone: m.phone || '', notes: m.notes || '' })
    setEditingId(m.id)
    setShowForm(true)
  }

  // Bulk
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const toggleSelectAll = () => {
    if (selectedIds.size === sorted.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(sorted.map(m => m.id)))
  }

  const bulkSetActive = async (active: boolean) => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    await supabase.from('members').update({ active }).in('id', ids)
    setMembers(prev => prev.map(m => ids.includes(m.id) ? { ...m, active } : m))
    setSelectedIds(new Set())
    showSnackbar(`${ids.length} Mitglied${ids.length !== 1 ? 'er' : ''} ${active ? 'reaktiviert' : 'deaktiviert'}`)
  }

  // Stats
  const stats = useMemo(() => {
    const active = members.filter(m => m.active).length
    const withSub = members.filter(m => memberDerived(m).activeSub).length
    const withOpen = members.filter(m => memberDerived(m).openCount > 0).length
    const newThisMonth = members.filter(m => {
      const d = new Date(m.created_at)
      const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length
    return { active, withSub, withOpen, newThisMonth, total: members.length }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, subscriptions, invoices])

  return (
    <div className="space-y-5 animate-fade-in-fast">
      {/* Headline */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="admin-eyebrow">Mitglieder</p>
          <h1 className="admin-h1 mt-1">Mitgliederverwaltung</h1>
          <p className="admin-body mt-1">Alle Personen die im Gym trainieren — mit Abo-Status, offenen Rechnungen und letzten Buchungen.</p>
        </div>
        <Button variant="primary" onClick={() => { resetForm(); setShowForm(true) }}
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}
        >
          Neues Mitglied
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card padded className="!p-4">
          <p className="admin-eyebrow">Gesamt</p>
          <p className="text-[26px] leading-[32px] font-semibold tracking-[-0.4px] text-admin-ink-strong mt-1">{stats.total}</p>
          <p className="admin-caption">Mitglieder insgesamt</p>
        </Card>
        <Card padded className="!p-4">
          <p className="admin-eyebrow">Aktiv</p>
          <p className="text-[26px] leading-[32px] font-semibold tracking-[-0.4px] text-status-success mt-1">{stats.active}</p>
          <p className="admin-caption">{stats.withSub} davon mit aktivem Abo</p>
        </Card>
        <Card padded className="!p-4">
          <p className="admin-eyebrow">Offene Rechnungen</p>
          <p className={`text-[26px] leading-[32px] font-semibold tracking-[-0.4px] mt-1 ${stats.withOpen > 0 ? 'text-status-warning' : 'text-admin-ink-strong'}`}>{stats.withOpen}</p>
          <p className="admin-caption">Mitglieder mit Zahlungsbedarf</p>
        </Card>
        <Card padded className="!p-4">
          <p className="admin-eyebrow">Neu diesen Monat</p>
          <p className="text-[26px] leading-[32px] font-semibold tracking-[-0.4px] text-status-info mt-1">{stats.newThisMonth}</p>
          <p className="admin-caption">Neu-Anmeldungen</p>
        </Card>
      </div>

      {/* Form */}
      {showForm && (
        <Card>
          <CardHeader
            eyebrow={editingId ? 'Bearbeiten' : 'Neu anlegen'}
            title={editingId ? 'Mitglied bearbeiten' : 'Neues Mitglied'}
            actions={<Button variant="ghost" size="sm" onClick={resetForm}
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>}
            />}
          />
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="admin-caption block mb-1">Name *</span>
              <Input type="text" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
            </label>
            <label className="block">
              <span className="admin-caption block mb-1">E-Mail *</span>
              <Input type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} />
            </label>
            <label className="block">
              <span className="admin-caption block mb-1">Telefon</span>
              <Input type="tel" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} />
            </label>
            <label className="block">
              <span className="admin-caption block mb-1">Notizen</span>
              <Input type="text" value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} />
            </label>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={resetForm}>Abbrechen</Button>
            <Button variant="primary" onClick={saveMember} disabled={saving || !formData.name || !formData.email}>
              {saving ? 'Speichert…' : editingId ? 'Speichern' : 'Anlegen'}
            </Button>
          </div>
        </Card>
      )}

      {/* Mitglieder + Detail */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Liste */}
        <div className="lg:col-span-2">
          <Card padded={false}>
            {/* Filter */}
            <div className="p-4 flex items-center gap-2 flex-wrap border-b border-admin-hairline-soft">
              <div className="flex-1 min-w-[200px]">
                <SearchInput value={search} onChange={setSearch} placeholder="Name, E-Mail, Telefon..." />
              </div>
              <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)} className="min-w-[200px]">
                <option value="all">Alle Mitglieder</option>
                <option value="active">Nur Aktiv</option>
                <option value="inactive">Nur Inaktiv</option>
                <option value="has_active_sub">Mit aktivem Abo</option>
                <option value="has_open_invoice">Mit offener Rechnung</option>
              </Select>
            </div>

            {/* Bulk-Bar */}
            {selectedIds.size > 0 && (
              <div className="px-4 py-2.5 bg-admin-surface-soft border-b border-brand-500/30 flex items-center gap-3 flex-wrap">
                <p className="text-[13px] font-semibold text-brand-500">{selectedIds.size} ausgewählt</p>
                <Button size="sm" variant="outline" onClick={() => bulkSetActive(true)}>Reaktivieren</Button>
                <Button size="sm" variant="outline" onClick={() => bulkSetActive(false)}>Deaktivieren</Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Auswahl aufheben</Button>
              </div>
            )}

            {sorted.length === 0 ? (
              <EmptyState
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                title="Keine Mitglieder gefunden"
                description={search || statusFilter !== 'all' ? 'Filter zurücksetzen, um alle zu sehen.' : 'Lege das erste Mitglied an.'}
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
                          ariaLabel="Alle"
                        />
                      </th>
                      <th><SortHeader label="Name" active={isActive('name')} direction={dirOf('name')} onClick={() => setSort('name')} /></th>
                      <th>Abo-Status</th>
                      <th className="text-right">Offen</th>
                      <th><SortHeader label="Mitglied seit" active={isActive('created_at')} direction={dirOf('created_at')} onClick={() => setSort('created_at')} /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map(m => {
                      const d = memberDerived(m)
                      // Eindeutige Sub-Status-Zusammenfassung
                      const subBadge = d.activeSub ? SUB_STATUS_META.active
                        : d.pausedSub ? SUB_STATUS_META.paused
                        : d.pendingSub ? SUB_STATUS_META.pending
                        : d.totalSubs > 0 ? { label: 'Kein aktives Abo', tone: 'neutral' as BadgeTone }
                        : { label: '— kein Abo —', tone: 'neutral' as BadgeTone }
                      return (
                        <tr key={m.id} className={selectedMember?.id === m.id ? 'bg-admin-surface-soft' : ''}>
                          <td><Checkbox checked={selectedIds.has(m.id)} onChange={() => toggleSelect(m.id)} ariaLabel="Auswählen" /></td>
                          <td>
                            <button onClick={() => setSelectedMember(m)} className="flex items-center gap-2.5 w-full text-left group">
                              <div className={`w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-[11px] font-bold shrink-0 ${m.photo_url ? 'bg-admin-surface-soft' : m.active ? 'bg-admin-surface-soft text-brand-500 border border-brand-500/30' : 'bg-admin-surface-soft text-admin-mute'}`}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                {m.photo_url ? <img src={m.photo_url} alt={m.name} className="w-full h-full object-cover" /> : m.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className={`text-[13px] font-semibold truncate group-hover:text-brand-600 ${m.active ? 'text-admin-ink' : 'text-admin-mute'}`}>{m.name}</p>
                                <p className="admin-caption truncate">{m.email}</p>
                              </div>
                            </button>
                          </td>
                          <td>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge tone={subBadge.tone} dot>{subBadge.label}</Badge>
                              {!m.active && <Badge tone="neutral">Inaktiv</Badge>}
                            </div>
                          </td>
                          <td className="text-right">
                            {d.openCount > 0 ? <Badge tone="danger">{d.openCount}</Badge> : <span className="text-admin-mute text-[12px]">—</span>}
                          </td>
                          <td>
                            <p className="admin-caption">{formatDateDE(m.created_at)}</p>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Detail */}
        <div className="lg:col-span-1">
          {selectedMember ? (
            <Card padded={false} className="lg:sticky lg:top-20">
              <div className="p-4 border-b border-admin-hairline flex items-center justify-between">
                <p className="admin-eyebrow">Details</p>
                <div className="flex gap-1">
                  <IconButton onClick={() => startEdit(selectedMember)} title="Bearbeiten">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </IconButton>
                  <IconButton onClick={() => toggleActive(selectedMember)} title={selectedMember.active ? 'Deaktivieren' : 'Aktivieren'}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={selectedMember.active ? "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" : "M5 13l4 4L19 7"} /></svg>
                  </IconButton>
                </div>
              </div>
              <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                <div>
                  <div className="mb-3">
                    <p className="text-[15px] font-semibold text-admin-ink-strong">{selectedMember.name}</p>
                    <Badge tone={selectedMember.active ? 'success' : 'neutral'} dot>
                      {selectedMember.active ? 'Aktives Mitglied' : 'Deaktiviert'}
                    </Badge>
                  </div>
                  <div className="bg-admin-surface-soft rounded-btn p-3 border border-admin-hairline-soft mb-3">
                    <p className="admin-eyebrow mb-2">Mitgliederfoto</p>
                    <MemberPhotoUpload
                      memberId={selectedMember.id}
                      memberName={selectedMember.name}
                      currentPhotoUrl={selectedMember.photo_url || null}
                      supabase={supabase}
                      size="md"
                      onPhotoChange={(newUrl) => {
                        setMembers(prev => prev.map(m => m.id === selectedMember.id ? { ...m, photo_url: newUrl } : m))
                        setSelectedMember({ ...selectedMember, photo_url: newUrl })
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <a href={`mailto:${selectedMember.email}`} className="block text-[13px] text-brand-600 hover:underline">{selectedMember.email}</a>
                    {selectedMember.phone && <a href={`tel:${selectedMember.phone}`} className="block text-[13px] text-brand-600 hover:underline">{selectedMember.phone}</a>}
                    {selectedMember.notes && <p className="admin-caption mt-2 bg-admin-surface-soft rounded-btn p-2">{selectedMember.notes}</p>}
                    <p className="admin-caption">Mitglied seit {formatDateDE(selectedMember.created_at)}</p>
                  </div>
                </div>

                <div>
                  <p className="admin-eyebrow mb-2">Abonnements</p>
                  {(subsByMember.get(selectedMember.id) || []).length === 0 ? (
                    <p className="admin-caption">Keine Abos</p>
                  ) : (
                    <div className="space-y-2">
                      {(subsByMember.get(selectedMember.id) || []).map(sub => {
                        const meta = SUB_STATUS_META[sub.status] || { label: sub.status, tone: 'neutral' as BadgeTone }
                        return (
                          <div key={sub.id} className="bg-admin-surface-soft rounded-btn p-3 border border-admin-hairline-soft">
                            <div className="flex items-center justify-between mb-1 gap-2">
                              <p className="text-[13px] font-semibold text-admin-ink truncate">{sub.name}</p>
                              <Badge tone={meta.tone} dot>{meta.label}</Badge>
                            </div>
                            <p className="admin-caption">
                              {sub.type === 'punch_card' && sub.remaining_units !== null && sub.total_units !== null
                                ? `${sub.remaining_units}/${sub.total_units} Einheiten übrig`
                                : sub.end_date ? `Bis ${formatDateDE(sub.end_date)}` : `Seit ${formatDateDE(sub.start_date)}`}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <p className="admin-eyebrow mb-2">Rechnungen</p>
                  {(invoicesByMember.get(selectedMember.id) || []).length === 0 ? (
                    <p className="admin-caption">Keine Rechnungen</p>
                  ) : (
                    <div className="space-y-1.5">
                      {(invoicesByMember.get(selectedMember.id) || []).slice(0, 5).map(inv => {
                        const tone: BadgeTone = inv.status === 'paid' ? 'success' : inv.status === 'overdue' ? 'danger' : inv.status === 'cancelled' ? 'neutral' : 'warning'
                        return (
                          <div key={inv.id} className="flex items-center justify-between bg-admin-surface-soft rounded-btn p-2">
                            <div className="min-w-0">
                              <p className="text-[12px] font-medium text-admin-ink truncate">{inv.description}</p>
                              <p className="admin-caption">{inv.invoice_number}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-[13px] font-semibold text-admin-ink">{Number(inv.amount).toFixed(0)} €</p>
                              <Badge tone={tone}>{inv.status === 'paid' ? 'Bezahlt' : inv.status === 'overdue' ? 'Überfällig' : inv.status === 'cancelled' ? 'Storniert' : 'Offen'}</Badge>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <p className="admin-eyebrow mb-2">Buchungen</p>
                  {(bookingsByEmail.get(selectedMember.email.toLowerCase()) || []).length === 0 ? (
                    <p className="admin-caption">Keine Buchungen</p>
                  ) : (
                    <div className="space-y-1.5">
                      {(bookingsByEmail.get(selectedMember.email.toLowerCase()) || []).slice(0, 5).map(b => {
                        const tone: BadgeTone = b.status === 'confirmed' ? 'success' : b.status === 'cancelled' ? 'neutral' : 'warning'
                        return (
                          <div key={b.id} className="flex items-center justify-between bg-admin-surface-soft rounded-btn p-2">
                            <div className="min-w-0">
                              <p className="text-[12px] font-medium text-admin-ink truncate">{b.service}</p>
                              <p className="admin-caption">{formatDateDE(b.created_at)}</p>
                            </div>
                            <Badge tone={tone}>{b.status === 'confirmed' ? 'Bestätigt' : b.status === 'cancelled' ? 'Storniert' : 'Offen'}</Badge>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-admin-hairline-soft">
                  {deleteConfirm === selectedMember.id ? (
                    <div className="flex gap-2">
                      <Button size="sm" variant="danger" onClick={() => deleteMember(selectedMember)} disabled={deleting} className="flex-1">
                        {deleting ? 'Löscht…' : 'Endgültig löschen'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(null)}>Abbruch</Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(selectedMember.id)} className="text-status-danger w-full">
                      Mitglied löschen
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ) : (
            <Card padded>
              <EmptyState
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                title="Wähle ein Mitglied"
                description="Klicke links auf einen Namen, um Abos, Rechnungen und Buchungen zu sehen."
              />
            </Card>
          )}
        </div>
      </div>

      {snackbar && <Snackbar message={snackbar.message} tone={snackbar.tone} />}
    </div>
  )
}
