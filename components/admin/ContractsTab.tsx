'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import dynamic from 'next/dynamic'
import { pdf } from '@react-pdf/renderer'
import { ContractPDF, MEMBERSHIP_OPTIONS, PAYMENT_OPTIONS } from '@/lib/contract-pdf'
import type { ContractData } from '@/lib/contract-pdf'
import {
  loadOwnerSignature,
  saveOwnerSignature,
  clearOwnerSignature,
  fileToDataUrl,
} from '@/lib/owner-signature'

const SignaturePad = dynamic(
  () => import('./SignaturePad').then((mod) => ({ default: mod.SignaturePad })),
  { ssr: false }
)

const MemberPhotoUpload = dynamic(
  () => import('./MemberPhotoUpload').then((mod) => ({ default: mod.MemberPhotoUpload })),
  { ssr: false }
)

interface Member {
  id: string
  name: string
  email: string
  phone: string | null
}

interface ContractsTabProps {
  members: Member[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
  onRefresh: () => void
}

type Step = 'form' | 'preview' | 'sign' | 'send' | 'done'

const INITIAL_FORM: ContractData = {
  vorname: '',
  nachname: '',
  strasse: '',
  plzOrt: '',
  telefon: '',
  email: '',
  geburtsdatum: '',
  notfallkontakt: '',
  mitgliedschaft: '',
  zahlungsweise: 'stripe',
  abrechnungstag: '1' as const,
  vertragsbeginn: new Date().toISOString().split('T')[0],
  kontoinhaber: '',
  iban: '',
  bic: '',
  bank: '',
  fotoEinwilligung: true,
  ortDatum: `Reutlingen, ${new Date().toLocaleDateString('de-DE')}`,
}

// Map membership IDs to subscription details for Supabase
const MEMBERSHIP_DETAILS: Record<string, { price: number; months: number | null; type: string; units?: number }> = {
  erwachsene_6: { price: 90, months: 6, type: 'monthly' },
  erwachsene_12: { price: 80, months: 12, type: 'monthly' },
  kinder_12: { price: 50, months: 12, type: 'monthly' },
  monatlich: { price: 120, months: null, type: 'monthly' },
  schueler_6: { price: 65, months: 6, type: 'monthly' },
  schueler_12: { price: 55, months: 12, type: 'monthly' },
  schueler_monatlich: { price: 80, months: null, type: 'monthly' },
  '10er_karte': { price: 160, months: 6, type: 'punch_card', units: 10 },
}

// Für das „Individuelles Angebot"-Formular zur Auswahl: nur wiederkehrende Abos
// (10er Karte ist Einmalzahlung und nicht couponfähig im recurring-Sinn).
const CUSTOM_ACTION_BASIS_OPTIONS = [
  { id: 'erwachsene_6', label: 'Erwachsene & Jugendliche – 6 Monate (90 €/Monat)', preis: 90 },
  { id: 'erwachsene_12', label: 'Erwachsene & Jugendliche – 12 Monate (80 €/Monat)', preis: 80 },
  { id: 'kinder_12', label: 'Kinder (3–14 Jahre) – 12 Monate (50 €/Monat)', preis: 50 },
  { id: 'monatlich', label: 'Monatlich kündbar (120 €/Monat)', preis: 120 },
  { id: 'schueler_6', label: 'Schüler / Azubi / Student – 6 Monate (65 €/Monat)', preis: 65 },
  { id: 'schueler_12', label: 'Schüler / Azubi / Student – 12 Monate (55 €/Monat)', preis: 55 },
]

export function ContractsTab({ members, supabase, onRefresh }: ContractsTabProps) {
  const [step, setStep] = useState<Step>('form')
  const [formData, setFormData] = useState<ContractData>(INITIAL_FORM)
  const [selectedMember, setSelectedMember] = useState<string>('')
  const [isSending, setIsSending] = useState(false)
  const [isSendingDraft, setIsSendingDraft] = useState(false)
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [mobileAppRegistrieren, setMobileAppRegistrieren] = useState(false)

  // Mitgliederfoto (optional). Wird nach Member-Insert hochgeladen.
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  // Refs to read signature data on-demand (no event listeners needed)
  const getMemberSig = useRef<(() => string | null) | null>(null)
  const getGuardianSig = useRef<(() => string | null) | null>(null)
  const getOwnerSig = useRef<(() => string | null) | null>(null)

  // Persistent owner signature (localStorage) – damit der Inhaber nicht
  // jedes Mal neu unterschreiben muss. Kann überschrieben oder zurückgesetzt
  // werden.
  const [savedOwnerSig, setSavedOwnerSig] = useState<string | null>(null)
  const [ownerSigNotice, setOwnerSigNotice] = useState<string | null>(null)
  const ownerFileInputRef = useRef<HTMLInputElement | null>(null)

  // Load the saved owner signature once on mount
  useEffect(() => {
    const stored = loadOwnerSignature()
    if (stored) {
      setSavedOwnerSig(stored)
      setFormData((prev) => ({ ...prev, unterschriftInhaber: stored }))
    }
  }, [])

  // Auto-fill from selected member
  useEffect(() => {
    if (!selectedMember) return
    const member = members.find((m) => m.id === selectedMember)
    if (!member) return

    const nameParts = member.name.split(' ')
    const vorname = nameParts[0] || ''
    const nachname = nameParts.slice(1).join(' ') || ''

    setFormData((prev) => ({
      ...prev,
      vorname,
      nachname,
      email: member.email || '',
      telefon: member.phone || '',
    }))
  }, [selectedMember, members])

  const updateField = useCallback((field: keyof ContractData, value: string | boolean) => {
    setFormData((prev) => {
      // Wenn Mitgliedschaft weg von 'individuell' wechselt, die Aktion wieder resetten,
      // damit keine inkonsistenten Daten ins PDF/Checkout gelangen.
      if (field === 'mitgliedschaft' && value !== 'individuell') {
        return { ...prev, [field]: value as string, customAction: undefined }
      }
      return { ...prev, [field]: value }
    })
  }, [])

  const updateCustomActionField = useCallback(
    (field: 'basisId' | 'bezeichnung' | 'aktionsPreis' | 'aktionsMonate', value: string) => {
      setFormData((prev) => {
        const current = prev.customAction ?? {
          basisId: '',
          bezeichnung: '',
          aktionsPreis: 0,
          aktionsMonate: 0,
          basisPreis: 0,
        }
        let next = { ...current, [field]: field === 'aktionsPreis' || field === 'aktionsMonate' ? Number(value) || 0 : value }
        if (field === 'basisId') {
          const basis = CUSTOM_ACTION_BASIS_OPTIONS.find((b) => b.id === value)
          next = { ...next, basisId: value, basisPreis: basis?.preis ?? 0 }
        }
        return { ...prev, customAction: next }
      })
    },
    []
  )

  const isDraftValid = useMemo(() => {
    return formData.vorname.trim() !== '' && formData.nachname.trim() !== '' && formData.email.trim() !== ''
  }, [formData])

  const isCustomActionValid = useMemo(() => {
    const ca = formData.customAction
    if (!ca) return false
    return (
      ca.basisId !== '' &&
      ca.bezeichnung.trim() !== '' &&
      ca.aktionsMonate >= 1 &&
      ca.aktionsPreis > 0 &&
      ca.basisPreis > 0 &&
      ca.aktionsPreis < ca.basisPreis
    )
  }, [formData])

  const isFormValid = useMemo(() => {
    const base =
      formData.vorname.trim() !== '' &&
      formData.nachname.trim() !== '' &&
      formData.email.trim() !== '' &&
      formData.mitgliedschaft !== '' &&
      formData.zahlungsweise !== ''
    if (!base) return false
    if (formData.mitgliedschaft === 'individuell') return isCustomActionValid
    return true
  }, [formData, isCustomActionValid])

  const handlePreview = useCallback(async () => {
    try {
      const blob = await pdf(<ContractPDF data={formData} />).toBlob()
      const url = URL.createObjectURL(blob)
      setPdfUrl(url)
      setStep('preview')
    } catch (err) {
      console.error('PDF generation error:', err)
    }
  }, [formData])

  const handleBackToForm = useCallback(() => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    setPdfUrl(null)
    setStep('form')
  }, [pdfUrl])

  const handleGoToSign = useCallback(() => {
    setStep('sign')
  }, [])

  // Read signatures from canvas refs and move to send step
  // Each read is wrapped in try-catch so navigation always proceeds
  const handleGoToSend = useCallback(() => {
    let memberSig = ''
    let guardianSig = ''
    let ownerSig = ''

    try { memberSig = getMemberSig.current?.() || '' } catch (e) { console.warn('Sig read error (member):', e) }
    try { guardianSig = getGuardianSig.current?.() || '' } catch (e) { console.warn('Sig read error (guardian):', e) }
    try { ownerSig = getOwnerSig.current?.() || '' } catch (e) { console.warn('Sig read error (owner):', e) }

    // Falls eine neue Inhaber-Unterschrift gezeichnet wurde, dauerhaft speichern
    if (ownerSig) {
      saveOwnerSignature(ownerSig)
      setSavedOwnerSig(ownerSig)
    } else if (savedOwnerSig) {
      // Fallback: gespeicherte Unterschrift verwenden
      ownerSig = savedOwnerSig
    }

    setFormData((prev) => ({
      ...prev,
      unterschriftMitglied: memberSig,
      unterschriftErziehungsberechtigter: guardianSig,
      unterschriftInhaber: ownerSig,
    }))

    setStep('send')
  }, [savedOwnerSig])

  const handleUploadOwnerSignature = useCallback(async (file: File) => {
    try {
      const dataUrl = await fileToDataUrl(file)
      saveOwnerSignature(dataUrl)
      setSavedOwnerSig(dataUrl)
      setFormData((prev) => ({ ...prev, unterschriftInhaber: dataUrl }))
      setOwnerSigNotice('Unterschrift gespeichert')
      setTimeout(() => setOwnerSigNotice(null), 2500)
    } catch (e) {
      setOwnerSigNotice(
        e instanceof Error ? e.message : 'Fehler beim Laden der Datei'
      )
    }
  }, [])

  const handleResetOwnerSignature = useCallback(() => {
    clearOwnerSignature()
    setSavedOwnerSig(null)
    setFormData((prev) => ({ ...prev, unterschriftInhaber: '' }))
    setOwnerSigNotice('Unterschrift entfernt')
    setTimeout(() => setOwnerSigNotice(null), 2500)
  }, [])

  const handleSendDraft = useCallback(async () => {
    if (!formData.email || !formData.vorname || !formData.nachname) return
    setIsSendingDraft(true)
    setSendResult(null)
    try {
      const blob = await pdf(<ContractPDF data={formData} />).toBlob()
      const arrayBuffer = await blob.arrayBuffer()
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      )

      const res = await fetch('/api/contract/send-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64: base64,
          memberEmail: formData.email,
          memberName: `${formData.vorname} ${formData.nachname}`,
        }),
      })

      const result = await res.json()
      if (res.ok) {
        setSendResult({ success: true, message: `Vertragsentwurf wurde an ${formData.email} gesendet.` })
      } else {
        setSendResult({ success: false, message: result.error || 'Fehler beim Senden des Entwurfs.' })
      }
    } catch {
      setSendResult({ success: false, message: 'Netzwerkfehler beim Senden.' })
    } finally {
      setIsSendingDraft(false)
    }
  }, [formData])

  const handleSendContract = useCallback(async () => {
    setIsSending(true)
    setSendResult(null)
    try {
      const fullName = `${formData.vorname} ${formData.nachname}`.trim()
      const tempPassword = mobileAppRegistrieren ? Math.random().toString(36).slice(-8) + 'A1!' : undefined

      // 1. Create/update member in Supabase
      let memberId: string | null = null
      try {
        const { data: existing } = await supabase
          .from('members')
          .select('id')
          .eq('email', formData.email)
          .maybeSingle()

        if (existing?.id) {
          await supabase
            .from('members')
            .update({
              name: fullName,
              phone: formData.telefon || null,
              active: true,
              ...(mobileAppRegistrieren ? { is_temp_password: true, temp_password: tempPassword } : {})
            })
            .eq('id', existing.id)
          memberId = existing.id
        } else {
          const { data: newMember } = await supabase
            .from('members')
            .insert({
              name: fullName,
              email: formData.email,
              phone: formData.telefon || null,
              active: true,
              ...(mobileAppRegistrieren ? { is_temp_password: true, temp_password: tempPassword } : {})
            })
            .select('id')
            .single()
          memberId = newMember?.id ?? null
        }
      } catch (e) {
        console.warn('Mitglied Erstellung fehlgeschlagen:', e)
      }

      if (!memberId) {
        setSendResult({ success: false, message: 'Mitglied konnte nicht erstellt werden.' })
        return
      }

      // 1.5 Optional: Mitgliederfoto hochladen
      if (photoFile) {
        try {
          const ext = photoFile.name.split('.').pop()?.toLowerCase() || 'jpg'
          const path = `${memberId}/${Date.now()}.${ext}`
          const { error: upErr } = await supabase.storage
            .from('member-photos')
            .upload(path, photoFile, { upsert: true, contentType: photoFile.type })
          if (!upErr) {
            const { data: { publicUrl } } = supabase.storage
              .from('member-photos')
              .getPublicUrl(path)
            await supabase.from('members').update({ photo_url: `${publicUrl}?t=${Date.now()}` }).eq('id', memberId)
          } else {
            console.warn('Foto-Upload fehlgeschlagen (Vertrag läuft trotzdem weiter):', upErr)
          }
        } catch (e) {
          console.warn('Foto-Upload Exception:', e)
        }
      }

      // 2. Create subscription with status 'pending'
      // Bei individuellen Aktionen läuft die Subscription auf dem Basis-Tarif — alle Laufzeit-,
      // Preis- und Typ-Infos stammen von dort. Die Aktionsdaten (Bezeichnung, Aktionspreis, Dauer)
      // werden im Namen festgehalten und über die Stripe-Metadaten an Checkout/Webhook weitergegeben.
      const isCustomAction = formData.mitgliedschaft === 'individuell'
      const basisId = isCustomAction && formData.customAction ? formData.customAction.basisId : formData.mitgliedschaft
      const details = MEMBERSHIP_DETAILS[basisId]
      const baseLabel =
        MEMBERSHIP_OPTIONS.find((m) => m.id === basisId)?.label ||
        basisId
      const membershipLabel = isCustomAction && formData.customAction
        ? `Aktion: ${formData.customAction.bezeichnung} – ${baseLabel} (${formData.customAction.aktionsPreis}€ für ${formData.customAction.aktionsMonate} Monate, danach ${formData.customAction.basisPreis}€)`
        : baseLabel

      let endDate: string | null = null
      if (details?.months) {
        const end = new Date(formData.vertragsbeginn)
        end.setMonth(end.getMonth() + details.months)
        endDate = end.toISOString().split('T')[0]
      }

      const { data: subscriptionData, error: subError } = await supabase
        .from('subscriptions')
        .insert({
          member_id: memberId,
          name: membershipLabel,
          type: details?.type || 'monthly',
          start_date: formData.vertragsbeginn,
          end_date: endDate,
          total_units: details?.units || null,
          remaining_units: details?.units || null,
          price: details?.price || 0,
          status: 'pending',
          payment_status: 'pending',
        })
        .select('id')
        .single()

      if (subError || !subscriptionData?.id) {
        console.warn('Abo Erstellung fehlgeschlagen:', subError)
        setSendResult({ success: false, message: 'Abo konnte nicht erstellt werden.' })
        return
      }

      // 3. Create Stripe Checkout Session
      let checkoutUrl: string | null = null
      try {
        const checkoutRes = await fetch('/api/stripe/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscriptionId: subscriptionData.id,
            memberEmail: formData.email,
            memberName: fullName,
            membershipId: formData.mitgliedschaft,
            // billingAnchorDay wird vom Server nicht konsumiert — Stripe-Anchor ist
            // grundsätzlich der 1. des Monats. Param-Übergabe entfernt.
            ...(isCustomAction && formData.customAction
              ? {
                  customAction: {
                    basisId: formData.customAction.basisId,
                    bezeichnung: formData.customAction.bezeichnung,
                    aktionsPreis: formData.customAction.aktionsPreis,
                    aktionsMonate: formData.customAction.aktionsMonate,
                  },
                }
              : {}),
          }),
        })
        const checkoutResult = await checkoutRes.json()
        if (checkoutRes.ok) {
          checkoutUrl = checkoutResult.checkoutUrl
        } else {
          console.warn('Stripe Checkout Erstellung fehlgeschlagen:', checkoutResult.error)
        }
      } catch (e) {
        console.warn('Stripe Checkout Fehler:', e)
      }

      // 4. Generate PDF and send email with checkout link
      const blob = await pdf(<ContractPDF data={formData} />).toBlob()
      const arrayBuffer = await blob.arrayBuffer()
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      )

      const res = await fetch('/api/contract/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractData: formData,
          pdfBase64: base64,
          memberEmail: formData.email,
          memberName: fullName,
          tempPassword,
          checkoutUrl,
          membershipLabel,
          abrechnungstag: formData.abrechnungstag,
        }),
      })

      const result = await res.json()
      if (res.ok) {
        // 5. Vertrag automatisch im Archiv ablegen (Best-Effort).
        // Fehler hier blockieren den Success-Flow nicht, werden aber geloggt
        // und in der Success-Message ergänzt.
        let archiveWarning = ''
        try {
          const { data: sessionData } = await supabase.auth.getSession()
          const accessToken = sessionData?.session?.access_token
          if (accessToken) {
            const archiveForm = new FormData()
            const safeFileName = `Vertrag_${fullName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
            archiveForm.append('file', blob, safeFileName)
            archiveForm.append('member_id', memberId)
            archiveForm.append('member_name', fullName)
            archiveForm.append('member_email', formData.email)
            archiveForm.append('membership_label', membershipLabel)
            archiveForm.append('uploaded_manually', 'false')

            const archiveRes = await fetch('/api/admin/contracts/upload', {
              method: 'POST',
              headers: { Authorization: `Bearer ${accessToken}` },
              body: archiveForm,
            })
            if (!archiveRes.ok) {
              const archiveErr = await archiveRes.json().catch(() => ({}))
              console.warn('Archiv-Upload fehlgeschlagen:', archiveErr)
              archiveWarning = ' (Archiv-Upload fehlgeschlagen – bitte manuell nachtragen.)'
            }
          } else {
            archiveWarning = ' (Archiv-Upload übersprungen – keine Session.)'
          }
        } catch (e) {
          console.warn('Archiv-Upload Fehler:', e)
          archiveWarning = ' (Archiv-Upload fehlgeschlagen – bitte manuell nachtragen.)'
        }

        onRefresh()
        setSendResult({
          success: true,
          message: (checkoutUrl
            ? 'Vertrag versendet! Zahlungslink wurde in der E-Mail mitgesendet.'
            : 'Vertrag versendet! Stripe Zahlungslink konnte nicht erstellt werden – bitte manuell nachsenden.') + archiveWarning
        })
        setStep('done')
      } else {
        setSendResult({ success: false, message: result.error || 'Fehler beim Versenden.' })
      }
    } catch (err) {
      setSendResult({ success: false, message: 'Netzwerkfehler beim Versenden.' })
    } finally {
      setIsSending(false)
    }
  }, [formData, supabase, onRefresh, mobileAppRegistrieren])

  const handleReset = useCallback(() => {
    setFormData(INITIAL_FORM)
    setSelectedMember('')
    setSendResult(null)
    setStep('form')
    setMobileAppRegistrieren(false)
    if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    setPdfUrl(null)
  }, [pdfUrl])

  const selectedMembership = MEMBERSHIP_OPTIONS.find((m) => m.id === formData.mitgliedschaft)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black">Verträge</h2>
          <p className="text-dark-400 text-sm mt-1">
            Digitale Mitgliedschaftsverträge erstellen, unterschreiben und per E-Mail versenden.
          </p>
        </div>
        {step !== 'form' && step !== 'done' && (
          <button onClick={handleBackToForm} className="text-sm text-dark-400 hover:text-white transition-colors">
            ← Zurück zum Formular
          </button>
        )}
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 text-sm">
        {[
          { id: 'form', label: '1. Daten eingeben' },
          { id: 'preview', label: '2. Vorschau' },
          { id: 'sign', label: '3. Unterschreiben' },
          { id: 'send', label: '4. Versenden' },
        ].map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            {i > 0 && <div className="w-8 h-[1px] bg-dark-700" />}
            <div
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                step === s.id || (s.id === 'send' && step === 'done')
                  ? 'bg-brand-500 text-white'
                  : 'bg-dark-800 text-dark-500'
              }`}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* STEP 1: Form */}
      {step === 'form' && (
        <div className="space-y-6">
          {/* Member Quick-Select */}
          <div className="bg-dark-900/50 rounded-xl border border-dark-800 p-6">
            <h3 className="text-lg font-bold mb-4">Mitglied auswählen (optional)</h3>
            <select
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-dark-100 focus:border-brand-500 focus:outline-none"
            >
              <option value="">— Neues Mitglied (manuell eingeben) —</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.email})
                </option>
              ))}
            </select>
          </div>

          {/* Mitgliedsdaten */}
          <div className="bg-dark-900/50 rounded-xl border border-dark-800 p-6">
            <h3 className="text-lg font-bold mb-4">Mitgliedsdaten</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'vorname', label: 'Vorname *', type: 'text' },
                { key: 'nachname', label: 'Nachname *', type: 'text' },
                { key: 'strasse', label: 'Straße / Hausnr.', type: 'text' },
                { key: 'plzOrt', label: 'PLZ / Ort', type: 'text' },
                { key: 'telefon', label: 'Telefon', type: 'tel' },
                { key: 'email', label: 'E-Mail *', type: 'email' },
                { key: 'geburtsdatum', label: 'Geburtsdatum', type: 'date' },
                { key: 'notfallkontakt', label: 'Notfallkontakt', type: 'text' },
              ].map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-semibold text-dark-300 mb-1">{field.label}</label>
                  <input
                    type={field.type}
                    value={formData[field.key as keyof ContractData] as string}
                    onChange={(e) => updateField(field.key as keyof ContractData, e.target.value)}
                    className="w-full px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-lg text-dark-100 focus:border-brand-500 focus:outline-none text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Mitgliedschaft */}
          <div className="bg-dark-900/50 rounded-xl border border-dark-800 p-6">
            <h3 className="text-lg font-bold mb-4">Mitgliedschaft wählen *</h3>
            <div className="space-y-2">
              {MEMBERSHIP_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all ${
                    formData.mitgliedschaft === opt.id
                      ? 'border-brand-500 bg-brand-500/10'
                      : 'border-dark-700 hover:border-dark-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="mitgliedschaft"
                      value={opt.id}
                      checked={formData.mitgliedschaft === opt.id}
                      onChange={(e) => updateField('mitgliedschaft', e.target.value)}
                      className="accent-brand-500"
                    />
                    <span className="text-sm font-medium">{opt.label}</span>
                  </div>
                  <span className="text-sm font-bold text-brand-400">{opt.price}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-brand-500 mt-3 font-semibold">
              Hinweis: Zusätzlich wird eine Servicepauschale von 30 Euro alle 6 Monate automatisch eingezogen.
            </p>
            {formData.mitgliedschaft.startsWith('schueler_') && (
              <div className="mt-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-200">
                <p className="font-bold mb-1">⚠ Schüler / Azubi / Student – Nachweis prüfen</p>
                <p className="text-yellow-200/80">
                  Gilt ab 14 Jahren. Bitte vor Vertragsabschluss einen gültigen Nachweis einsehen:
                  Schülerausweis, Immatrikulationsbescheinigung oder Ausbildungs-/Arbeitsvertrag.
                </p>
              </div>
            )}
            {formData.mitgliedschaft === 'individuell' && (
              <div className="mt-4 p-4 rounded-lg bg-brand-500/5 border border-brand-500/30 space-y-3">
                <div>
                  <p className="font-bold text-sm text-brand-300 mb-1">Individuelles Angebot konfigurieren</p>
                  <p className="text-xs text-dark-400">
                    Das Abo läuft technisch auf dem gewählten Basis-Tarif. Für die ersten N Monate wird der Aktionspreis per Stripe-Coupon angewendet, danach gilt automatisch der reguläre Tarifpreis.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-dark-300 mb-1">Bezeichnung der Aktion *</label>
                  <input
                    type="text"
                    placeholder="z. B. Frauen-Aktion 2026"
                    value={formData.customAction?.bezeichnung ?? ''}
                    onChange={(e) => updateCustomActionField('bezeichnung', e.target.value)}
                    className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-dark-100 focus:border-brand-500 focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-dark-300 mb-1">Basis-Tarif *</label>
                  <select
                    value={formData.customAction?.basisId ?? ''}
                    onChange={(e) => updateCustomActionField('basisId', e.target.value)}
                    className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-dark-100 focus:border-brand-500 focus:outline-none text-sm"
                  >
                    <option value="">– Basis-Tarif wählen –</option>
                    {CUSTOM_ACTION_BASIS_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-dark-300 mb-1">Aktionspreis (€/Monat) *</label>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      placeholder="z. B. 65"
                      value={formData.customAction?.aktionsPreis || ''}
                      onChange={(e) => updateCustomActionField('aktionsPreis', e.target.value)}
                      className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-dark-100 focus:border-brand-500 focus:outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-dark-300 mb-1">Aktionsdauer (Monate) *</label>
                    <input
                      type="number"
                      min={1}
                      max={24}
                      step={1}
                      placeholder="z. B. 3"
                      value={formData.customAction?.aktionsMonate || ''}
                      onChange={(e) => updateCustomActionField('aktionsMonate', e.target.value)}
                      className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-dark-100 focus:border-brand-500 focus:outline-none text-sm"
                    />
                  </div>
                </div>

                {formData.customAction && formData.customAction.basisPreis > 0 && (
                  <div className="text-xs text-dark-300 bg-dark-900/60 rounded-lg p-3 border border-dark-700">
                    <p className="font-semibold text-brand-300 mb-1">Vorschau</p>
                    {formData.customAction.aktionsPreis > 0 && formData.customAction.aktionsMonate > 0 && formData.customAction.aktionsPreis < formData.customAction.basisPreis ? (
                      <p>
                        Erste <strong>{formData.customAction.aktionsMonate} {formData.customAction.aktionsMonate === 1 ? 'Monat' : 'Monate'}</strong>:
                        <strong> {formData.customAction.aktionsPreis} €/Monat</strong>
                        <span className="text-dark-400"> (Rabatt: {formData.customAction.basisPreis - formData.customAction.aktionsPreis} € / Monat)</span>
                        <br />
                        Danach regulär: <strong>{formData.customAction.basisPreis} €/Monat</strong>
                      </p>
                    ) : (
                      <p className="text-yellow-300">
                        Aktionspreis muss kleiner sein als der Basis-Tarif ({formData.customAction.basisPreis} €).
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Zahlungsweise */}
          <div className="bg-dark-900/50 rounded-xl border border-dark-800 p-6">
            <h3 className="text-lg font-bold mb-4">Zahlungsweise</h3>
            <label
              className="flex items-center gap-3 p-4 rounded-lg border border-brand-500 bg-brand-500/10 cursor-default"
            >
              <input
                type="radio"
                name="zahlungsweise"
                value="stripe"
                checked
                readOnly
                className="accent-brand-500"
              />
              <span className="text-sm font-medium">Online-Zahlung (Stripe)</span>
            </label>
            <p className="text-xs text-dark-400 mt-3">
              Nach Vertragsabschluss erhält das Mitglied einen Zahlungslink per E-Mail.
            </p>

            {/* Abrechnungstag - nur bei monatlichen Abos. Seit Mai 2026 ausschließlich
                der 1. des Monats. Bestehende Verträge mit 15.-Abrechnung bleiben
                unverändert — Stripe bucht ohnehin am 1., der 15. existierte nur
                kosmetisch im alten Vertrags-PDF. */}
            {formData.mitgliedschaft && formData.mitgliedschaft !== '10er_karte' && (
              <div className="mt-4 pt-4 border-t border-dark-700">
                <label className="block text-sm font-semibold text-dark-300 mb-2">Monatlicher Abrechnungstag</label>
                {/* Form-State bleibt mit Default '1' bestehen, damit Vertrag-PDF
                    und Bestätigungs-Mail (lib/contract-pdf.tsx, /api/contract/send)
                    den Wert weiterhin als String rendern. */}
                <div className="flex items-center gap-2 p-3 rounded-lg border border-admin-hairline bg-admin-surface-soft text-sm">
                  <svg className="w-4 h-4 text-status-info shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span className="text-admin-ink"><strong>1. des Monats</strong></span>
                  <span className="text-admin-mute text-xs">— einheitlich für alle Neu-Verträge</span>
                </div>
              </div>
            )}
          </div>

          {/* Mitgliederfoto */}
          <div className="bg-dark-900/50 rounded-xl border border-dark-800 p-6">
            <h3 className="text-lg font-bold mb-1">Mitgliederfoto</h3>
            <p className="text-sm text-dark-400 mb-4">Optional — direkt aus der Kamera (Web + iPad) oder aus der Galerie. Wird nach Vertragsabschluss am Mitglied gespeichert.</p>
            <MemberPhotoUpload
              memberId={null}
              memberName={`${formData.vorname} ${formData.nachname}`.trim() || 'Neues Mitglied'}
              currentPhotoUrl={null}
              supabase={null}
              localPreview={photoPreview}
              onLocalFile={(file, preview) => {
                setPhotoFile(file)
                setPhotoPreview(preview)
              }}
              size="lg"
            />
          </div>

          {/* Vertragsbeginn */}
          <div className="bg-dark-900/50 rounded-xl border border-dark-800 p-6">
            <h3 className="text-lg font-bold mb-4">Vertragsbeginn & Foto-Einwilligung</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-dark-300 mb-1">Vertragsbeginn</label>
                <input
                  type="date"
                  value={formData.vertragsbeginn}
                  onChange={(e) => updateField('vertragsbeginn', e.target.value)}
                  className="w-full px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-lg text-dark-100 focus:border-brand-500 focus:outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-dark-300 mb-1">Foto-/Video-Einwilligung</label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="foto"
                      checked={formData.fotoEinwilligung === true}
                      onChange={() => updateField('fotoEinwilligung', true)}
                      className="accent-brand-500"
                    />
                    <span className="text-sm">Ja</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="foto"
                      checked={formData.fotoEinwilligung === false}
                      onChange={() => updateField('fotoEinwilligung', false)}
                      className="accent-brand-500"
                    />
                    <span className="text-sm">Nein</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile App Registrierung */}
          <div className="bg-dark-900/50 rounded-xl border border-dark-800 p-6">
            <h3 className="text-lg font-bold mb-4">Mobile App & System</h3>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={mobileAppRegistrieren}
                onChange={(e) => setMobileAppRegistrieren(e.target.checked)}
                className="w-5 h-5 accent-brand-500 rounded border-dark-700 bg-dark-800"
              />
              <span className="text-sm font-medium">Mitglied für die Mobile App registrieren (Zugangsdaten generieren und mitsenden)</span>
            </label>
          </div>

          {/* Submit */}
          <div className="flex gap-4">
            <button
              onClick={handlePreview}
              disabled={!isFormValid}
              className={`flex-1 py-4 rounded-lg font-bold text-lg transition-all ${
                isFormValid
                  ? 'bg-brand-500 text-white hover:bg-brand-400'
                  : 'bg-dark-800 text-dark-500 cursor-not-allowed'
              }`}
            >
              Weiter zur Vorschau →
            </button>
            <button
              onClick={handleSendDraft}
              disabled={!isDraftValid || isSendingDraft}
              className={`py-4 px-6 rounded-lg font-bold text-sm transition-all ${
                isDraftValid && !isSendingDraft
                  ? 'bg-dark-800 text-dark-200 border border-dark-700 hover:border-brand-500/30 hover:text-brand-400'
                  : 'bg-dark-800 text-dark-500 cursor-not-allowed'
              }`}
              title="Vertrag ohne Unterschrift als PDF an den Kunden senden"
            >
              {isSendingDraft ? 'Wird gesendet...' : 'Vorab als PDF senden'}
            </button>
          </div>
          {sendResult && step === 'form' && (
            <div className={`p-3 rounded-lg text-sm ${sendResult.success ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
              {sendResult.message}
            </div>
          )}
        </div>
      )}

      {/* STEP 2: Preview */}
      {step === 'preview' && pdfUrl && (
        <div className="space-y-4">
          <div className="bg-dark-900/50 rounded-xl border border-dark-800 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Vertragsvorschau</h3>
              <div className="flex items-center gap-2 text-sm text-dark-400">
                <span>Mitgliedschaft:</span>
                <span className="text-brand-400 font-bold">{selectedMembership?.label}</span>
              </div>
            </div>
            <iframe src={pdfUrl} className="w-full h-[600px] rounded-lg border border-dark-700" />
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleBackToForm}
              className="flex-1 py-3 rounded-lg font-bold border border-dark-700 text-dark-300 hover:bg-dark-800 transition-all"
            >
              ← Daten ändern
            </button>
            <button
              onClick={handleGoToSign}
              className="flex-1 py-3 rounded-lg font-bold bg-brand-500 text-white hover:bg-brand-400 transition-all"
            >
              Weiter zum Unterschreiben →
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Sign */}
      {step === 'sign' && (
        <div className="space-y-6">
          <div className="bg-dark-900/50 rounded-xl border border-dark-800 p-6">
            <h3 className="text-lg font-bold mb-2">Digitale Unterschriften</h3>
            <p className="text-dark-400 text-sm mb-6">
              Bitte unterschreiben Sie in den Feldern unten. Auf einem Tablet oder Smartphone können Sie mit dem Finger unterschreiben.
            </p>

            <div className="space-y-8">
              <SignaturePad
                label="Unterschrift Mitglied *"
                signatureRef={getMemberSig}
              />

              <SignaturePad
                label="Unterschrift Erziehungsberechtigte/r (nur bei Minderjährigen)"
                signatureRef={getGuardianSig}
              />

              {/* Inhaber-Unterschrift: einmalig speichern, danach automatisch */}
              <div>
                <label className="block text-sm font-semibold text-dark-300 mb-2">
                  Unterschrift Inhaber (Saleem Fahmi Muhammad Shareef)
                </label>

                {savedOwnerSig ? (
                  <div className="space-y-3">
                    <div className="border border-dark-700 rounded-lg bg-white p-3 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={savedOwnerSig}
                        alt="Gespeicherte Unterschrift"
                        className="max-h-[120px] object-contain"
                      />
                    </div>
                    <p className="text-xs text-green-400">
                      ✓ Gespeicherte Unterschrift wird automatisch im Vertrag verwendet
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => ownerFileInputRef.current?.click()}
                        className="text-xs text-dark-400 hover:text-brand-500 transition-colors"
                      >
                        Anderes Bild hochladen
                      </button>
                      <button
                        type="button"
                        onClick={handleResetOwnerSignature}
                        className="text-xs text-dark-400 hover:text-red-400 transition-colors"
                      >
                        Zurücksetzen
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <SignaturePad
                      label=""
                      signatureRef={getOwnerSig}
                    />
                    <div className="flex flex-wrap items-center gap-4">
                      <button
                        type="button"
                        onClick={() => ownerFileInputRef.current?.click()}
                        className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
                      >
                        Oder Unterschrift als Bild hochladen
                      </button>
                      <span className="text-xs text-dark-500">
                        Die gezeichnete bzw. hochgeladene Unterschrift wird
                        dauerhaft gespeichert und für alle zukünftigen Verträge
                        automatisch verwendet.
                      </span>
                    </div>
                  </div>
                )}

                <input
                  ref={ownerFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleUploadOwnerSignature(file)
                    e.target.value = ''
                  }}
                />

                {ownerSigNotice && (
                  <p className="mt-2 text-xs text-brand-400">{ownerSigNotice}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setStep('preview')}
              className="flex-1 py-3 rounded-lg font-bold border border-dark-700 text-dark-300 hover:bg-dark-800 transition-all"
            >
              ← Zurück
            </button>
            <button
              onClick={handleGoToSend}
              className="flex-1 py-3 rounded-lg font-bold bg-brand-500 text-white hover:bg-brand-400 transition-all"
            >
              Weiter →
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Send */}
      {step === 'send' && (
        <div className="space-y-6">
          <div className="bg-dark-900/50 rounded-xl border border-dark-800 p-6">
            <h3 className="text-lg font-bold mb-4">Vertrag versenden</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-dark-800">
                <span className="text-dark-400">Mitglied</span>
                <span className="font-semibold">{formData.vorname} {formData.nachname}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-dark-800">
                <span className="text-dark-400">E-Mail</span>
                <span className="font-semibold">{formData.email}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-dark-800">
                <span className="text-dark-400">Mitgliedschaft</span>
                <span className="font-semibold text-brand-400">{selectedMembership?.label}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-dark-800">
                <span className="text-dark-400">Unterschrift Mitglied</span>
                <span className={`font-semibold ${formData.unterschriftMitglied ? 'text-green-400' : 'text-dark-500'}`}>
                  {formData.unterschriftMitglied ? 'Vorhanden' : 'Fehlt'}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-dark-400">Unterschrift Inhaber</span>
                <span className={`font-semibold ${formData.unterschriftInhaber ? 'text-green-400' : 'text-dark-500'}`}>
                  {formData.unterschriftInhaber ? 'Vorhanden' : 'Fehlt'}
                </span>
              </div>
            </div>

            {sendResult && !sendResult.success && (
              <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {sendResult.message}
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setStep('sign')}
              className="flex-1 py-3 rounded-lg font-bold border border-dark-700 text-dark-300 hover:bg-dark-800 transition-all"
            >
              ← Zurück
            </button>
            <button
              onClick={handleSendContract}
              disabled={isSending}
              className={`flex-1 py-4 rounded-lg font-bold text-lg transition-all ${
                isSending
                  ? 'bg-dark-800 text-dark-500 cursor-not-allowed'
                  : 'bg-brand-500 text-white hover:bg-brand-400'
              }`}
            >
              {isSending ? 'Wird versendet...' : 'Vertrag versenden & abschließen'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: Done */}
      {step === 'done' && (
        <div className="bg-dark-900/50 rounded-xl border border-dark-800 p-8 text-center">
          {sendResult?.success ? (
            <>
              <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Vertrag erfolgreich versendet!</h3>
              <p className="text-dark-400 mb-2">
                Der Vertrag wurde als PDF an <span className="text-white font-semibold">{formData.email}</span> gesendet.
              </p>
              <p className="text-dark-500 text-sm mb-6">
                Eine Kopie wurde auch an die Gym-E-Mail-Adresse geschickt.
              </p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Fehler beim Versenden</h3>
              <p className="text-dark-400 mb-6">{sendResult?.message}</p>
            </>
          )}
          <button
            onClick={handleReset}
            className="px-8 py-3 rounded-lg font-bold bg-brand-500 text-white hover:bg-brand-400 transition-all"
          >
            Neuen Vertrag erstellen
          </button>
        </div>
      )}
    </div>
  )
}
