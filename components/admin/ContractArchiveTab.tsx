'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

interface Member {
  id: string
  name: string
  email: string
}

interface ArchivedContract {
  id: string
  created_at: string
  member_id: string | null
  member_name: string
  member_email: string | null
  membership_label: string | null
  file_path: string
  file_name: string
  file_size: number | null
  uploaded_manually: boolean
  note: string | null
  signed_url: string | null
}

interface ContractArchiveTabProps {
  members: Member[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return '–'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export default function ContractArchiveTab({ members, supabase }: ContractArchiveTabProps) {
  const [contracts, setContracts] = useState<ArchivedContract[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // Resend-State
  const [resendId, setResendId] = useState<string | null>(null)
  const [resendEmail, setResendEmail] = useState('')
  const [resendUpdateMember, setResendUpdateMember] = useState(true)
  const [isResending, setIsResending] = useState(false)
  const [resendResult, setResendResult] = useState<{ success: boolean; message: string } | null>(null)

  // Upload-State
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadMemberId, setUploadMemberId] = useState<string>('')
  const [uploadName, setUploadName] = useState('')
  const [uploadEmail, setUploadEmail] = useState('')
  const [uploadLabel, setUploadLabel] = useState('')
  const [uploadNote, setUploadNote] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const { data } = await supabase.auth.getSession()
    return data?.session?.access_token ?? null
  }, [supabase])

  const loadContracts = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const token = await getAccessToken()
      if (!token) {
        setLoadError('Keine gültige Session.')
        setLoading(false)
        return
      }
      const res = await fetch('/api/admin/contracts/list', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = await res.json()
      if (!res.ok) {
        setLoadError(result.error || 'Fehler beim Laden des Archivs.')
        setContracts([])
      } else {
        setContracts(result.contracts || [])
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Netzwerkfehler beim Laden')
      setContracts([])
    } finally {
      setLoading(false)
    }
  }, [getAccessToken])

  useEffect(() => {
    loadContracts()
  }, [loadContracts])

  // Wenn ein Mitglied ausgewählt wird, Name/Email vorbefüllen
  useEffect(() => {
    if (!uploadMemberId) return
    const m = members.find((x) => x.id === uploadMemberId)
    if (m) {
      if (!uploadName) setUploadName(m.name)
      if (!uploadEmail) setUploadEmail(m.email)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadMemberId])

  const resetUploadForm = useCallback(() => {
    setUploadFile(null)
    setUploadMemberId('')
    setUploadName('')
    setUploadEmail('')
    setUploadLabel('')
    setUploadNote('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const handleFileSelected = useCallback((file: File | null) => {
    if (!file) return
    if (file.type && file.type !== 'application/pdf') {
      setUploadResult({ success: false, message: 'Nur PDF-Dateien sind erlaubt.' })
      return
    }
    setUploadResult(null)
    setUploadFile(file)
    // Fallback-Name aus Dateiname ableiten, falls leer
    if (!uploadName) {
      const base = file.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim()
      if (base) setUploadName(base)
    }
  }, [uploadName])

  const handleUpload = useCallback(async () => {
    if (!uploadFile) {
      setUploadResult({ success: false, message: 'Bitte zuerst eine PDF-Datei auswählen.' })
      return
    }
    if (!uploadName.trim()) {
      setUploadResult({ success: false, message: 'Bitte einen Mitgliedsnamen angeben.' })
      return
    }

    setIsUploading(true)
    setUploadResult(null)
    try {
      const token = await getAccessToken()
      if (!token) {
        setUploadResult({ success: false, message: 'Keine gültige Session.' })
        setIsUploading(false)
        return
      }

      const form = new FormData()
      form.append('file', uploadFile, uploadFile.name)
      if (uploadMemberId) form.append('member_id', uploadMemberId)
      form.append('member_name', uploadName.trim())
      if (uploadEmail.trim()) form.append('member_email', uploadEmail.trim())
      if (uploadLabel.trim()) form.append('membership_label', uploadLabel.trim())
      if (uploadNote.trim()) form.append('note', uploadNote.trim())
      form.append('uploaded_manually', 'true')

      const res = await fetch('/api/admin/contracts/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })
      const result = await res.json()
      if (!res.ok) {
        setUploadResult({ success: false, message: result.error || 'Upload fehlgeschlagen.' })
      } else {
        setUploadResult({ success: true, message: 'Vertrag erfolgreich archiviert.' })
        resetUploadForm()
        loadContracts()
      }
    } catch (e) {
      setUploadResult({ success: false, message: e instanceof Error ? e.message : 'Netzwerkfehler' })
    } finally {
      setIsUploading(false)
    }
  }, [uploadFile, uploadMemberId, uploadName, uploadEmail, uploadLabel, uploadNote, getAccessToken, resetUploadForm, loadContracts])

  const handleDelete = useCallback(async (id: string, name: string) => {
    if (!window.confirm(`Vertrag von ${name} wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
      return
    }
    try {
      const token = await getAccessToken()
      if (!token) {
        alert('Keine gültige Session.')
        return
      }
      const res = await fetch('/api/admin/contracts/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      })
      const result = await res.json()
      if (!res.ok) {
        alert(result.error || 'Löschen fehlgeschlagen.')
        return
      }
      setContracts((prev) => prev.filter((c) => c.id !== id))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Netzwerkfehler beim Löschen')
    }
  }, [getAccessToken])

  const openResend = useCallback((contract: ArchivedContract) => {
    setResendId(contract.id)
    setResendEmail(contract.member_email || '')
    setResendUpdateMember(true)
    setResendResult(null)
  }, [])

  const closeResend = useCallback(() => {
    setResendId(null)
    setResendEmail('')
    setResendResult(null)
  }, [])

  const handleResend = useCallback(async () => {
    if (!resendId || !resendEmail.trim()) return
    setIsResending(true)
    setResendResult(null)
    try {
      const token = await getAccessToken()
      if (!token) {
        setResendResult({ success: false, message: 'Keine gültige Session.' })
        setIsResending(false)
        return
      }
      const res = await fetch('/api/admin/contracts/resend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          archive_id: resendId,
          new_email: resendEmail.trim(),
          update_member_email: resendUpdateMember,
        }),
      })
      const result = await res.json()
      if (!res.ok) {
        setResendResult({ success: false, message: result.error || 'Versand fehlgeschlagen.' })
      } else {
        const extra = result.has_checkout_url
          ? ' Stripe-Zahlungslink wurde mitgesendet.'
          : ' Kein Stripe-Link erstellt (kein passendes Abo gefunden).'
        setResendResult({ success: true, message: `Vertrag an ${resendEmail.trim()} gesendet.${extra}` })
        if (resendUpdateMember) {
          loadContracts()
        }
      }
    } catch (e) {
      setResendResult({ success: false, message: e instanceof Error ? e.message : 'Netzwerkfehler' })
    } finally {
      setIsResending(false)
    }
  }, [resendId, resendEmail, resendUpdateMember, getAccessToken, loadContracts])

  const filtered = useMemo(() => {
    if (!search.trim()) return contracts
    const q = search.toLowerCase()
    return contracts.filter((c) =>
      c.member_name.toLowerCase().includes(q) ||
      (c.member_email || '').toLowerCase().includes(q) ||
      (c.membership_label || '').toLowerCase().includes(q) ||
      (c.note || '').toLowerCase().includes(q)
    )
  }, [contracts, search])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black">Vertragsarchiv</h2>
        <p className="text-dark-400 text-sm mt-1">
          Alle abgeschlossenen Verträge werden hier dauerhaft gespeichert. Du kannst auch Altverträge manuell als PDF hochladen.
        </p>
      </div>

      {/* Upload-Box */}
      <div className="bg-dark-900 border border-dark-800 rounded-2xl p-6 space-y-4">
        <div>
          <h3 className="text-lg font-bold">Vertrag manuell hochladen</h3>
          <p className="text-dark-400 text-xs mt-1">
            Für Altverträge oder nachträglich digitalisierte Unterlagen. Nur PDF, max. 10 MB.
          </p>
        </div>

        {/* Drag & Drop */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragging(false)
            const f = e.dataTransfer.files?.[0]
            if (f) handleFileSelected(f)
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer border-2 border-dashed rounded-xl p-8 text-center transition-all ${
            isDragging
              ? 'border-brand-500 bg-brand-500/10'
              : uploadFile
                ? 'border-green-500/50 bg-green-500/5'
                : 'border-dark-700 hover:border-brand-500/50 hover:bg-dark-800/30'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => handleFileSelected(e.target.files?.[0] || null)}
          />
          {uploadFile ? (
            <div>
              <svg className="w-10 h-10 mx-auto text-green-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm font-bold text-dark-100">{uploadFile.name}</p>
              <p className="text-xs text-dark-500 mt-1">{formatBytes(uploadFile.size)} · Klicken um zu ändern</p>
            </div>
          ) : (
            <div>
              <svg className="w-10 h-10 mx-auto text-dark-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-dark-300 font-medium">PDF hier ablegen oder klicken</p>
              <p className="text-xs text-dark-500 mt-1">Max. 10 MB</p>
            </div>
          )}
        </div>

        {/* Metadaten */}
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-dark-400 mb-1">Mitglied auswählen (optional)</label>
            <select
              value={uploadMemberId}
              onChange={(e) => {
                setUploadMemberId(e.target.value)
                if (!e.target.value) return
                const m = members.find((x) => x.id === e.target.value)
                if (m) {
                  setUploadName(m.name)
                  setUploadEmail(m.email)
                }
              }}
              className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-sm text-dark-100 focus:border-brand-500 focus:outline-none"
            >
              <option value="">— Kein verknüpftes Mitglied —</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-dark-400 mb-1">Name *</label>
            <input
              type="text"
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
              placeholder="Max Mustermann"
              className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-sm text-dark-100 focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-dark-400 mb-1">E-Mail</label>
            <input
              type="email"
              value={uploadEmail}
              onChange={(e) => setUploadEmail(e.target.value)}
              placeholder="max@example.com"
              className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-sm text-dark-100 focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-dark-400 mb-1">Mitgliedschaft</label>
            <input
              type="text"
              value={uploadLabel}
              onChange={(e) => setUploadLabel(e.target.value)}
              placeholder="z.B. Erwachsene 12 Monate"
              className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-sm text-dark-100 focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-dark-400 mb-1">Notiz (optional)</label>
            <textarea
              value={uploadNote}
              onChange={(e) => setUploadNote(e.target.value)}
              rows={2}
              placeholder="z.B. Altvertrag von 2023, nachträglich digitalisiert"
              className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-sm text-dark-100 focus:border-brand-500 focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Upload-Feedback */}
        {uploadResult && (
          <div
            className={`p-3 rounded-lg text-sm ${
              uploadResult.success
                ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                : 'bg-red-500/10 border border-red-500/30 text-red-400'
            }`}
          >
            {uploadResult.message}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleUpload}
            disabled={isUploading || !uploadFile || !uploadName.trim()}
            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:bg-dark-700 disabled:text-dark-500 text-white text-sm font-bold rounded-lg transition-colors"
          >
            {isUploading ? 'Lädt hoch…' : 'Vertrag archivieren'}
          </button>
          <button
            onClick={resetUploadForm}
            disabled={isUploading}
            className="px-4 py-2 bg-dark-800 hover:bg-dark-700 text-dark-300 text-sm font-bold rounded-lg transition-colors"
          >
            Zurücksetzen
          </button>
        </div>
      </div>

      {/* Liste */}
      <div className="bg-dark-900 border border-dark-800 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-dark-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold">Archivierte Verträge</h3>
            <p className="text-dark-400 text-xs mt-1">
              {contracts.length} {contracts.length === 1 ? 'Vertrag' : 'Verträge'} gespeichert
            </p>
          </div>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Suchen…"
              className="pl-10 pr-4 py-2 bg-dark-800 border border-dark-700 rounded-lg text-sm text-dark-100 placeholder:text-dark-500 focus:border-brand-500 focus:outline-none w-full sm:w-64"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin h-6 w-6 border-2 border-brand-500 border-t-transparent rounded-full mx-auto" />
            <p className="text-dark-500 text-sm mt-3">Lade Archiv…</p>
          </div>
        ) : loadError ? (
          <div className="p-6 text-center text-red-400 text-sm">
            {loadError}
            <button onClick={loadContracts} className="block mx-auto mt-2 text-xs text-brand-500 hover:underline">
              Erneut versuchen
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-12 h-12 mx-auto text-dark-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-dark-400 text-sm">
              {search ? 'Keine Verträge gefunden.' : 'Noch keine archivierten Verträge.'}
            </p>
            {!search && (
              <p className="text-dark-500 text-xs mt-1">
                Neu erstellte Verträge werden automatisch hier abgelegt.
              </p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-dark-800">
            {filtered.map((c) => (
              <div key={c.id} className="p-4 sm:p-6 hover:bg-dark-800/30 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-dark-100 truncate">{c.member_name}</p>
                      {c.uploaded_manually ? (
                        <span className="px-2 py-0.5 text-[10px] rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 uppercase tracking-wider font-bold">
                          Manuell
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 uppercase tracking-wider font-bold">
                          Auto
                        </span>
                      )}
                    </div>
                    {c.member_email && (
                      <p className="text-xs text-dark-500 mt-1 truncate">{c.member_email}</p>
                    )}
                    {c.membership_label && (
                      <p className="text-xs text-dark-400 mt-1">{c.membership_label}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-dark-500">
                      <span>{formatDate(c.created_at)}</span>
                      <span>·</span>
                      <span>{formatBytes(c.file_size)}</span>
                    </div>
                    {c.note && (
                      <p className="text-xs text-dark-400 mt-2 italic">„{c.note}"</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {c.signed_url ? (
                      <a
                        href={c.signed_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-dark-800 hover:bg-dark-700 text-dark-200 text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Ansehen
                      </a>
                    ) : (
                      <span className="text-xs text-dark-600">Kein Link</span>
                    )}
                    {c.signed_url && (
                      <a
                        href={c.signed_url}
                        download={c.file_name}
                        className="px-3 py-1.5 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                      </a>
                    )}
                    <button
                      onClick={() => openResend(c)}
                      className="px-3 py-1.5 bg-dark-800 hover:bg-dark-700 text-dark-200 text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5"
                      title="An andere E-Mail erneut senden"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Erneut senden
                    </button>
                    <button
                      onClick={() => handleDelete(c.id, c.member_name)}
                      className="p-1.5 text-dark-500 hover:text-red-400 transition-colors"
                      title="Vertrag löschen"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Resend Inline-Form */}
                {resendId === c.id && (
                  <div className="mt-3 p-4 bg-dark-800/50 border border-dark-700 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-dark-200">Vertrag erneut senden</p>
                      <button onClick={closeResend} className="text-dark-500 hover:text-dark-300 text-xs">Abbrechen</button>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-dark-400 mb-1">Neue E-Mail-Adresse *</label>
                        <input
                          type="email"
                          value={resendEmail}
                          onChange={(e) => setResendEmail(e.target.value)}
                          placeholder="neue@email.de"
                          className="w-full px-3 py-2 bg-dark-900 border border-dark-700 rounded-lg text-sm text-dark-100 focus:border-brand-500 focus:outline-none"
                        />
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 text-xs text-dark-300 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={resendUpdateMember}
                            onChange={(e) => setResendUpdateMember(e.target.checked)}
                            className="rounded border-dark-600 bg-dark-800 text-brand-500 focus:ring-brand-500"
                          />
                          E-Mail auch beim Mitglied aktualisieren
                        </label>
                      </div>
                    </div>

                    {resendResult && (
                      <div className={`p-3 rounded-lg text-xs ${
                        resendResult.success
                          ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                          : 'bg-red-500/10 border border-red-500/30 text-red-400'
                      }`}>
                        {resendResult.message}
                      </div>
                    )}

                    <button
                      onClick={handleResend}
                      disabled={isResending || !resendEmail.trim()}
                      className="px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:bg-dark-700 disabled:text-dark-500 text-white text-xs font-bold rounded-lg transition-colors"
                    >
                      {isResending ? 'Wird gesendet…' : 'Vertrag senden'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
