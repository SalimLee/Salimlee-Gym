'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Service } from '@/types'

const COURSES = [
  { id: 'personal', label: 'Personaltraining' },
  { id: 'group', label: 'Erwachsenenkurse' },
  { id: 'kids', label: 'Kinderkurse' },
]

const TRIAL_COURSES = [
  { id: 'personal', label: 'Personaltraining (einmalig 40€)' },
  { id: 'group', label: 'Erwachsenenkurse (kostenlos, max. 2 Kurse)' },
  { id: 'kids', label: 'Kinderkurse (kostenlos, max. 2 Kurse)' },
]

const MEMBERSHIP_OPTIONS: Record<string, { value: string; label: string }[]> = {
  Personaltraining: [
    { value: 'Einzelstunde (60€)', label: 'Einzelstunde (60€)' },
    { value: '10er Karte (Auf Anfrage)', label: '10er Karte (Vorauszahlung)' },
  ],
  Erwachsenenkurse: [
    { value: '6 Monate (90€/mtl.)', label: '6 Monate (90€/mtl.)' },
    { value: '12 Monate (80€/mtl.)', label: '12 Monate (80€/mtl.)' },
    { value: 'Monatlich kündbar (120€/mtl.)', label: 'Monatlich kündbar (120€/mtl.)' },
    { value: '10er Karte (160€)', label: '10er Karte – 6 Monate gültig (160€)' },
  ],
  Kinderkurse: [
    { value: '12 Monate (50€/mtl.)', label: '12 Monate (50€/mtl.)' },
  ],
}

function getInitialIntent(selectedService?: Service | null): string {
  if (!selectedService) return ''
  if (selectedService.id === 'trial') return 'probetraining'
  return 'mitgliedschaft'
}

function getInitialCourse(selectedService?: Service | null): string {
  if (!selectedService || selectedService.id === 'trial') return ''
  const map: Record<string, string> = { personal: 'Personaltraining', group: 'Erwachsenenkurse', kids: 'Kinderkurse' }
  return map[selectedService.id] || ''
}

// Validation Schema
const bookingSchema = z.object({
  name: z.string().min(2, 'Name muss mindestens 2 Zeichen lang sein'),
  email: z.string().email('Bitte gültige E-Mail eingeben'),
  phone: z.string().optional(),
  intent: z.string().min(1, 'Bitte Anliegen auswählen'),
  course: z.string().min(1, 'Bitte Kurs auswählen'),
  membership: z.string().optional(),
  date: z.string().optional(),
  message: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.intent === 'mitgliedschaft' && !data.membership) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Bitte Mitgliedschaft auswählen',
      path: ['membership'],
    })
  }
})

type BookingFormData = z.infer<typeof bookingSchema>

interface BookingModalProps {
  isOpen: boolean
  onClose: () => void
  selectedService?: Service | null
}

export function BookingModal({ isOpen, onClose, selectedService }: BookingModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      intent: getInitialIntent(selectedService),
      course: getInitialCourse(selectedService),
    },
  })

  const selectedIntent = watch('intent')
  const selectedCourse = watch('course')

  const courseOptions = selectedIntent === 'probetraining' ? TRIAL_COURSES : COURSES
  const membershipOptions = selectedIntent === 'mitgliedschaft' && selectedCourse ? MEMBERSHIP_OPTIONS[selectedCourse] || [] : []

  const onSubmit = async (data: BookingFormData) => {
    setIsSubmitting(true)
    setSubmitError(null)

    const intentLabel = data.intent === 'probetraining' ? 'Probetraining' : 'Mitgliedschaft anfragen'
    const service = data.membership
      ? `${intentLabel} – ${data.course} – ${data.membership}`
      : `${intentLabel} – ${data.course}`

    try {
      // API aufrufen für Email-Versand
      const response = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone,
          service,
          date: data.date,
          message: data.message,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Fehler beim Senden')
      }

      setSubmitSuccess(true)
      
      setTimeout(() => {
        reset()
        setSubmitSuccess(false)
        onClose()
      }, 3000)
    } catch (error) {
      console.error('Buchungsfehler:', error)
      setSubmitError(
        error instanceof Error 
          ? error.message 
          : 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    reset()
    setSubmitSuccess(false)
    setSubmitError(null)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={selectedService ? selectedService.title : 'KURS BUCHEN'}
    >
      {submitSuccess ? (
        <div className="p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-green-500/20 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-2xl font-black mb-2">Vielen Dank!</h3>
          <p className="text-dark-400">
            Wir haben dir eine Bestätigung per E-Mail geschickt.<br />
            Wir melden uns in Kürze bei dir!
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* Error Message */}
          {submitError && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              ⚠️ {submitError}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-bold mb-2 text-dark-300">
              Name *
            </label>
            <input
              {...register('name')}
              className="input-field"
              placeholder="Dein vollständiger Name"
            />
            {errors.name && (
              <p className="text-red-400 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>

          {/* Email & Phone */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-2 text-dark-300">
                E-Mail *
              </label>
              <input
                {...register('email')}
                type="email"
                className="input-field"
                placeholder="deine@email.de"
              />
              {errors.email && (
                <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-bold mb-2 text-dark-300">
                Telefon
              </label>
              <input
                {...register('phone')}
                type="tel"
                className="input-field"
                placeholder="+49 123 456789"
              />
            </div>
          </div>

          {/* Anliegen */}
          <div>
            <label className="block text-sm font-bold mb-2 text-dark-300">
              Anliegen *
            </label>
            <select
              {...register('intent', {
                onChange: () => { setValue('course', ''); setValue('membership', '') },
              })}
              className="input-field"
            >
              <option value="">Bitte wählen...</option>
              <option value="probetraining">Probetraining</option>
              <option value="mitgliedschaft">Mitgliedschaft anfragen</option>
            </select>
            {errors.intent && (
              <p className="text-red-400 text-sm mt-1">{errors.intent.message}</p>
            )}
          </div>

          {/* Kurs */}
          {selectedIntent && (
            <div>
              <label className="block text-sm font-bold mb-2 text-dark-300">
                Kurs *
              </label>
              <select
                {...register('course', {
                  onChange: () => setValue('membership', ''),
                })}
                className="input-field"
              >
                <option value="">Bitte wählen...</option>
                {courseOptions.map((c) => (
                  <option key={c.id} value={c.label.split(' (')[0]}>
                    {c.label}
                  </option>
                ))}
              </select>
              {errors.course && (
                <p className="text-red-400 text-sm mt-1">{errors.course.message}</p>
              )}
            </div>
          )}

          {/* Mitgliedschaft */}
          {membershipOptions.length > 0 && (
            <div>
              <label className="block text-sm font-bold mb-2 text-dark-300">
                Mitgliedschaft *
              </label>
              <select
                {...register('membership')}
                className="input-field"
              >
                <option value="">Bitte wählen...</option>
                {membershipOptions.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              {errors.membership && (
                <p className="text-red-400 text-sm mt-1">{errors.membership.message}</p>
              )}
            </div>
          )}

          {/* Date */}
          <div>
            <label className="block text-sm font-bold mb-2 text-dark-300">
              Wunschtermin
            </label>
            <input
              {...register('date')}
              type="date"
              className="input-field"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-bold mb-2 text-dark-300">
              Nachricht
            </label>
            <textarea
              {...register('message')}
              rows={4}
              className="input-field resize-none"
              placeholder="Zusätzliche Informationen oder Fragen..."
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-4 pt-4">
            <Button
              type="submit"
              className="flex-1"
              size="lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  WIRD GESENDET...
                </span>
              ) : (
                'BUCHUNG ABSENDEN'
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={handleClose}
            >
              ABBRECHEN
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
