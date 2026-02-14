'use client'

import { MapPin, Phone, Mail, Clock } from 'lucide-react'
import { CONTACT_INFO } from '@/lib/constants'

export function Contact() {
  const contactCards = [
    {
      icon: MapPin,
      title: 'Adresse',
      content: (
        <>
          {CONTACT_INFO.address.street}<br />
          {CONTACT_INFO.address.zip} {CONTACT_INFO.address.city}<br />
          {CONTACT_INFO.address.country}
        </>
      ),
    },
    {
      icon: Phone,
      title: 'Telefon',
      content: (
        <a
          href={`tel:${CONTACT_INFO.phone.replace(/\s/g, '')}`}
          className="hover:text-brand-500 transition-colors"
        >
          {CONTACT_INFO.phone}
        </a>
      ),
    },
    {
      icon: Mail,
      title: 'E-Mail',
      content: (
        <a
          href={`mailto:${CONTACT_INFO.email}`}
          className="hover:text-brand-500 transition-colors"
        >
          {CONTACT_INFO.email}
        </a>
      ),
    },
    {
      icon: Clock,
      title: 'Öffnungszeiten',
      content: (
        <>
          {CONTACT_INFO.hours.weekdays}<br />
          {CONTACT_INFO.hours.weekend}
        </>
      ),
    },
  ]

  return (
    <section id="kontakt" className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="section-title mb-4">
            KONTAKT & <span className="text-brand-500">STANDORT</span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Cards */}
          <div className="grid sm:grid-cols-2 gap-6">
            {contactCards.map((card) => (
              <div
                key={card.title}
                className="p-6 bg-dark-900/50 rounded-xl border border-brand-600/20 hover:border-brand-500/50 transition-all duration-300"
              >
                <div className="w-12 h-12 bg-brand-500/20 rounded-lg flex items-center justify-center mb-4">
                  <card.icon className="w-6 h-6 text-brand-500" />
                </div>
                <h3 className="font-bold text-lg mb-2">{card.title}</h3>
                <div className="text-dark-400">{card.content}</div>
              </div>
            ))}
          </div>

          {/* Map */}
          <div className="h-[400px] bg-dark-900/50 rounded-2xl border border-brand-600/20 overflow-hidden">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2634.5!2d9.2048!3d48.4912!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4799e9a3c9d3b7f7%3A0x0!2sW%C3%B6rthstra%C3%9Fe+17%2C+72764+Reutlingen!5e0!3m2!1sde!2sde"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Standort Salim Lee Gym"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
