'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { pdf } from '@react-pdf/renderer'
import { ContractPDF, MEMBERSHIP_OPTIONS, PAYMENT_OPTIONS } from '@/lib/contract-pdf'
import type { ContractData } from '@/lib/contract-pdf'

const SignaturePad = dynamic(
  () => import('./SignaturePad').then((mod) => ({ default: mod.SignaturePad })),
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
}

type Step = 'form' | 'preview' | 'sign' | 'done'

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
  zahlungsweise: '',
  vertragsbeginn: new Date().toISOString().split('T')[0],
  kontoinhaber: '',
  iban: '',
  bic: '',
  bank: '',
  fotoEinwilligung: true,
  ortDatum: `Reutlingen, ${new Date().toLocaleDateString('de-DE')}`,
}

export function ContractsTab({ members }: ContractsTabProps) {
  const [step, setStep] = useState<Step>('form')
  const [formData, setFormData] = useState<ContractData>(INITIAL_FORM)
  const [selectedMember, setSelectedMember] = useState<string>('')
  const [isSending, setIsSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

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
    setFormData((prev) => ({ ...prev, [field]: value }))
  }, [])

  const isFormValid = useMemo(() => {
    return (
      formData.vorname.trim() !== '' &&
      formData.nachname.trim() !== '' &&
      formData.email.trim() !== '' &&
      formData.mitgliedschaft !== '' &&
      formData.zahlungsweise !== ''
    )
  }, [formData])

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

  const handleSendContract = useCallback(async () => {
    setIsSending(true)
    setSendResult(null)
    try {
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
          memberName: `${formData.vorname} ${formData.nachname}`,
        }),
      })

      const result = await res.json()
      if (res.ok) {
        setSendResult({ success: true, message: 'Vertrag wurde erfolgreich per E-Mail versendet!' })
        setStep('done')
      } else {
        setSendResult({ success: false, message: result.error || 'Fehler beim Versenden.' })
      }
    } catch (err) {
      setSendResult({ success: false, message: 'Netzwerkfehler beim Versenden.' })
    } finally {
      setIsSending(false)
    }
  }, [formData])

  const handleReset = useCallback(() => {
    setFormData(INITIAL_FORM)
    setSelectedMember('')
    setSendResult(null)
    setStep('form')
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
          { id: 'done', label: '4. Versenden' },
        ].map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            {i > 0 && <div className="w-8 h-[1px] bg-dark-700" />}
            <div
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                step === s.id
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
          </div>

          {/* Zahlungsweise */}
          <div className="bg-dark-900/50 rounded-xl border border-dark-800 p-6">
            <h3 className="text-lg font-bold mb-4">Zahlungsweise *</h3>
            <div className="space-y-2">
              {PAYMENT_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                    formData.zahlungsweise === opt.id
                      ? 'border-brand-500 bg-brand-500/10'
                      : 'border-dark-700 hover:border-dark-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="zahlungsweise"
                    value={opt.id}
                    checked={formData.zahlungsweise === opt.id}
                    onChange={(e) => updateField('zahlungsweise', e.target.value)}
                    className="accent-brand-500"
                  />
                  <span className="text-sm font-medium">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* SEPA - nur bei Lastschrift */}
          {(formData.zahlungsweise === 'sepa_monatlich' || formData.zahlungsweise === 'sepa_vorauszahlung') && (
            <div className="bg-dark-900/50 rounded-xl border border-dark-800 p-6">
              <h3 className="text-lg font-bold mb-4">SEPA-Lastschriftmandat</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'kontoinhaber', label: 'Kontoinhaber' },
                  { key: 'iban', label: 'IBAN' },
                  { key: 'bic', label: 'BIC' },
                  { key: 'bank', label: 'Bank' },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-semibold text-dark-300 mb-1">{field.label}</label>
                    <input
                      type="text"
                      value={formData[field.key as keyof ContractData] as string}
                      onChange={(e) => updateField(field.key as keyof ContractData, e.target.value)}
                      className="w-full px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-lg text-dark-100 focus:border-brand-500 focus:outline-none text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

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

          {/* Submit */}
          <button
            onClick={handlePreview}
            disabled={!isFormValid}
            className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
              isFormValid
                ? 'bg-brand-500 text-white hover:bg-brand-400'
                : 'bg-dark-800 text-dark-500 cursor-not-allowed'
            }`}
          >
            Weiter zur Vorschau →
          </button>
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
                onSignatureChange={(sig) => updateField('unterschriftMitglied', sig || '')}
              />

              <SignaturePad
                label="Unterschrift Erziehungsberechtigte/r (nur bei Minderjährigen)"
                onSignatureChange={(sig) => updateField('unterschriftErziehungsberechtigter', sig || '')}
              />

              <SignaturePad
                label="Unterschrift Inhaber (Saleem Fahmi Muhammad Shareef)"
                onSignatureChange={(sig) => updateField('unterschriftInhaber', sig || '')}
              />
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
              onClick={handleSendContract}
              disabled={!formData.unterschriftMitglied || isSending}
              className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                formData.unterschriftMitglied && !isSending
                  ? 'bg-brand-500 text-white hover:bg-brand-400'
                  : 'bg-dark-800 text-dark-500 cursor-not-allowed'
              }`}
            >
              {isSending ? 'Wird versendet...' : 'Vertrag versenden & abschließen ✉'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Done */}
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
