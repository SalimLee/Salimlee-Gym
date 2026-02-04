'use client'

import { useState } from 'react'
import {
  Header,
  Hero,
  Stats,
  Services,
  Pricing,
  Contact,
  Footer,
  BookingModal,
} from '@/components/sections'
import { Service } from '@/types'

export default function HomePage() {
  const [isBookingOpen, setIsBookingOpen] = useState(false)
  const [selectedService, setSelectedService] = useState<Service | null>(null)

  const openBooking = (service?: Service) => {
    setSelectedService(service || null)
    setIsBookingOpen(true)
  }

  const closeBooking = () => {
    setIsBookingOpen(false)
    setSelectedService(null)
  }

  return (
    <>
      <Header onBookingClick={() => openBooking()} />
      
      <main>
        <Hero onBookingClick={() => openBooking()} />
        <Stats />
        <Services onServiceSelect={openBooking} />
        <Pricing />
        <Contact />
      </main>
      
      <Footer />

      <BookingModal
        isOpen={isBookingOpen}
        onClose={closeBooking}
        selectedService={selectedService}
      />
    </>
  )
}
