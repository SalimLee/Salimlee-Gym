'use client'

import { useRef, useState, useCallback } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

interface MemberPhotoUploadProps {
  /**
   * Wenn vorhanden: Upload landet direkt im Bucket unter member_id-Path und
   * members.photo_url wird aktualisiert. Wenn null (z.B. Vertragsformular vor
   * Member-Anlage): nur lokale Vorschau, Parent kümmert sich um Persistierung
   * via `onLocalFile`.
   */
  memberId: string | null
  memberName: string
  currentPhotoUrl: string | null
  supabase: SupabaseClient | null
  /** Callback nach erfolgreichem Upload (memberId vorhanden). */
  onPhotoChange?: (newUrl: string | null) => void
  /** Callback für lokale Datei vor Member-Anlage (memberId == null). */
  onLocalFile?: (file: File | null, previewUrl: string | null) => void
  /** Lokale Vorschau (für ContractsTab vor Submit). */
  localPreview?: string | null
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Mitglieder-Foto Upload — funktioniert auf Web + iPad/iOS Safari.
 *
 * - "Foto aufnehmen"-Button öffnet die native Kamera (via `capture="user"`).
 *   Auf iPad/iPhone bietet Safari direkt die Kamera-App an.
 * - "Aus Galerie"-Button öffnet den normalen Datei-Picker (Bilderbibliothek).
 * - Funktioniert offline-tolerant: lokale Vorschau via FileReader, Upload erst
 *   nach Member-Anlage (für ContractsTab Workflow).
 */
export function MemberPhotoUpload({
  memberId,
  memberName,
  currentPhotoUrl,
  supabase,
  onPhotoChange,
  onLocalFile,
  localPreview,
  size = 'md',
}: MemberPhotoUploadProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingPreview, setPendingPreview] = useState<string | null>(null)

  const displayUrl = pendingPreview || localPreview || currentPhotoUrl
  const initials = memberName ? memberName.charAt(0).toUpperCase() : '?'

  const sizeClass =
    size === 'sm' ? 'w-12 h-12 text-base' :
    size === 'lg' ? 'w-32 h-32 text-4xl' :
    'w-20 h-20 text-2xl'

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    if (!file.type.startsWith('image/')) {
      setError('Bitte ein Bild auswählen.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Datei ist größer als 10 MB.')
      return
    }

    // Lokale Vorschau sofort generieren
    const reader = new FileReader()
    reader.onload = () => {
      const preview = reader.result as string
      setPendingPreview(preview)
      if (onLocalFile) onLocalFile(file, preview)
    }
    reader.readAsDataURL(file)

    // Wenn memberId + supabase Client: sofort hochladen
    if (memberId && supabase) {
      setUploading(true)
      try {
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
        const path = `${memberId}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('member-photos')
          .upload(path, file, { upsert: true, contentType: file.type })
        if (upErr) {
          setError(`Upload fehlgeschlagen: ${upErr.message}`)
          setUploading(false)
          return
        }
        const { data: { publicUrl } } = supabase.storage
          .from('member-photos')
          .getPublicUrl(path)
        // Cache-busting query damit das Frontend sofort das neue Bild lädt
        const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`
        const { error: updErr } = await supabase
          .from('members')
          .update({ photo_url: cacheBustedUrl })
          .eq('id', memberId)
        if (updErr) {
          setError(`DB-Update fehlgeschlagen: ${updErr.message}`)
        } else if (onPhotoChange) {
          onPhotoChange(cacheBustedUrl)
        }
        setPendingPreview(null) // wir haben jetzt die echte URL
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Upload fehlgeschlagen')
      }
      setUploading(false)
    }
  }, [memberId, supabase, onLocalFile, onPhotoChange])

  const handleRemove = async () => {
    setError(null)
    setPendingPreview(null)
    if (onLocalFile) onLocalFile(null, null)
    if (memberId && supabase) {
      setUploading(true)
      const { error: updErr } = await supabase
        .from('members')
        .update({ photo_url: null })
        .eq('id', memberId)
      if (updErr) setError(`Löschen fehlgeschlagen: ${updErr.message}`)
      else if (onPhotoChange) onPhotoChange(null)
      setUploading(false)
    }
  }

  return (
    <div className="flex items-start gap-3">
      <div className={`${sizeClass} rounded-full overflow-hidden flex items-center justify-center font-bold shrink-0 ${displayUrl ? 'bg-admin-surface-soft' : 'bg-brand-500/10 text-brand-500 border border-brand-500/30'}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {displayUrl ? <img src={displayUrl} alt={memberName} className="w-full h-full object-cover" /> : <span>{initials}</span>}
      </div>

      <div className="flex flex-col gap-1.5 min-w-0 flex-1">
        <div className="flex gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading}
            className="admin-btn admin-btn-outline admin-btn-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            {uploading ? 'Lädt…' : 'Foto aufnehmen'}
          </button>
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            disabled={uploading}
            className="admin-btn admin-btn-outline admin-btn-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Aus Galerie
          </button>
          {displayUrl && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={uploading}
              className="admin-btn admin-btn-ghost admin-btn-sm text-status-danger"
              title="Foto entfernen"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
        <p className="admin-caption">
          {displayUrl ? 'Klicke zum Tauschen oder Entfernen.' : 'Kein Foto · iPad/Handy: direkt aus der Kamera, sonst Galerie.'}
        </p>
        {error && <p className="text-[12px] text-status-danger font-medium">{error}</p>}
      </div>

      {/* Hidden inputs — der `capture` Attribute öffnet auf iOS/Android die native Kamera */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
          e.target.value = '' // gleiche Datei nochmal wählbar machen
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
          e.target.value = ''
        }}
      />
    </div>
  )
}
