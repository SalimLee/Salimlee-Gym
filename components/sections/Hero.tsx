'use client'

import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { SITE_CONFIG } from '@/lib/constants'

interface HeroProps {
  onBookingClick?: () => void
}

export function Hero({ onBookingClick }: HeroProps) {
  return (
    <section className="relative pt-32 pb-20 px-4 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-500/20 via-transparent to-transparent" />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-brand-600/10 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <div className="space-y-6 animate-fade-in">
            <div className="inline-block px-4 py-2 bg-brand-600/20 border border-brand-500/30 rounded-full text-brand-400 text-sm font-bold tracking-wider">
              DEIN GYM IN REUTLINGEN
            </div>
            
            <h1 className="text-6xl md:text-7xl font-black leading-none tracking-tighter">
              STARK<br />
              <span className="text-brand-500">WERDEN</span><br />
              BEGINNT HIER
            </h1>
            
            <p className="text-xl text-dark-400 leading-relaxed">
              {SITE_CONFIG.description}
            </p>
            
            <div className="flex flex-wrap gap-4 pt-4">
              <Button onClick={onBookingClick} size="lg">
                JETZT BUCHEN
            <a href="#angebote">
                <Button variant="secondary" size="lg">
                  MEHR ERFAHREN
                </Button>
            </a>

            </div>
          </div>

          {/* Image/Logo */}
          <div className="relative animate-fade-in-delay">
            <div className="aspect-video bg-gradient-to-br from-dark-900 to-dark-800 rounded-2xl border-2 border-brand-600/30 overflow-hidden shadow-2xl shadow-brand-600/20 flex items-center justify-center">
              {/* Placeholder für Logo/Bild */}
              <div className="text-center p-8">
                <div className="w-32 h-32 mx-auto bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl flex items-center justify-center font-black text-dark-950 text-5xl mb-4">
                  SL
                </div>
                <div className="font-black text-2xl tracking-tight">SALIM LEE</div>
                <div className="text-brand-500 tracking-widest">BOXING & FITNESS GYM</div>
              </div>
            </div>
            {/* Glow Effect */}
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-gradient-to-br from-brand-500 to-brand-700 rounded-full blur-3xl opacity-50" />
          </div>
        </div>
      </div>
    </section>
  )
}
