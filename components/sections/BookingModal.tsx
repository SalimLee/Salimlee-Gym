'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { SERVICES } from '@/lib/constants'
import { Service } from '@/types'
// import { getSupabaseClient } from '@/lib/supabase/client'

// Validation Schema
const bookingSchema = z.object({
  name: z.string().min(2, 'Name muss mindestens 2 Zeichen lang sein'),
  email: z.string().email('Bitte gültige E-Mail eingeben'),
  phone: z.string().optional(),
  service: z.string().min(1, 'Bitte Service auswählen'),
  people: z.string().default('1'),
  date: z.string().optional(),
  message: z.string().optional(),
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

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      service: selectedService?.title || '',
      people: '1',
    },
  })

  const onSubmit = async (data: BookingFormData) => {
    setIsSubmitting(true)
    
    try {
      // TODO: Supabase Integration
      // const supabase = getSupabaseClient()
      // const { error } = await supabase.from('bookings').insert({
      //   name: data.name,
      //   email: data.email,
      //   phone: data.phone || null,
      //   service: data.service,
      //   people: parseInt(data.people),
      //   preferred_date: data.date || null,
      //   message: data.message || null,
      //   status: 'pending',
      // })
      // if (error) throw error

      // Temporär: Alert anzeigen
      console.log('Buchung:', data)
      setSubmitSuccess(true)
      
      setTimeout(() => {
        reset()
        setSubmitSuccess(false)
        onClose()
      }, 2000)
    } catch (error) {
      console.error('Buchungsfehler:', error)
      alert('Ein Fehler ist aufgetreten. Bitte versuche es erneut.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    reset()
    setSubmitSuccess(false)
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
          <p className="text-dark-400">Wir melden uns in Kürze bei dir.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
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

          {/* Service */}
          <div>
            <label className="block text-sm font-bold mb-2 text-dark-300">
              Service *
            </label>
            <select
              {...register('service')}
              className="input-field"
              defaultValue={selectedService?.title || ''}
            >
              <option value="">Bitte wählen...</option>
              {SERVICES.map((service) => (
                <option key={service.id} value={service.title}>
                  {service.title}
                </option>
              ))}
            </select>
            {errors.service && (
              <p className="text-red-400 text-sm mt-1">{errors.service.message}</p>
            )}
          </div>

          {/* People & Date */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-2 text-dark-300">
                Anzahl Personen
              </label>
              <select {...register('people')} className="input-field">
                <option value="1">1 Person</option>
                <option value="2">2 Personen</option>
                <option value="3">3 Personen</option>
                <option value="4">4 Personen</option>
              </select>
            </div>
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
              {isSubmitting ? 'WIRD GESENDET...' : 'BUCHUNG ABSENDEN'}
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
