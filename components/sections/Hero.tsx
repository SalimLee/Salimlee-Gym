'use client'

import { Dumbbell, Shield, Users } from 'lucide-react'

interface HeroProps {
  onBookingClick?: () => void
}

export function Hero({ onBookingClick }: HeroProps) {
  const features = [
    {
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 4a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-1V6h-2V4h3z" />
          <path d="M6 4a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h1V6h2V4H6z" />
          <rect x="9" y="4" width="6" height="6" rx="1" />
          <path d="M12 10v4" />
          <path d="M8 14h8" />
          <path d="M8 14v4a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-4" />
        </svg>
      ),
      title: 'Boxen & Fitness',
    },
    {
      icon: <Dumbbell className="w-8 h-8" />,
      title: 'Kraft & Ausdauer',
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: 'Selbstvertrauen & Disziplin',
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: 'Alle Level willkommen',
    },
  ]

  return (
    <section className="relative pt-24 pb-8 px-4 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-900/20 via-transparent to-dark-950" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand-600/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Main Hero Content */}
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter mb-6 leading-none">
            SALIM LEE<br />
            <span className="text-brand-500">BOXING & FITNESS</span>
          </h1>
        </div>

        {/* Boxing Image Area */}
        <div className="relative mb-12 animate-fade-in-delay">
          <div className="max-w-3xl mx-auto aspect-[16/9] bg-gradient-to-br from-dark-800 via-dark-900 to-dark-950 rounded-2xl border border-brand-600/30 overflow-hidden shadow-2xl shadow-brand-900/30 flex items-center justify-center relative">
            {/* Boxing ring ropes effect */}
            <div className="absolute top-[25%] left-0 right-0 h-[2px] bg-brand-500/30" />
            <div className="absolute top-[50%] left-0 right-0 h-[2px] bg-brand-500/20" />
            <div className="absolute top-[75%] left-0 right-0 h-[2px] bg-brand-500/10" />

            {/* Boxing Gloves SVG */}
            <div className="text-center">
              <svg className="w-32 h-32 md:w-40 md:h-40 mx-auto text-brand-500 drop-shadow-lg" viewBox="0 0 100 100" fill="currentColor">
                <path d="M30 25 C30 15, 45 10, 50 20 C55 10, 70 15, 70 25 L70 50 C70 65, 55 75, 50 75 C45 75, 30 65, 30 50 Z" opacity="0.9"/>
                <rect x="42" y="72" width="16" height="12" rx="3" opacity="0.7"/>
                <rect x="38" y="82" width="24" height="8" rx="4" opacity="0.5"/>
                <path d="M35 35 C35 30, 40 28, 45 30 L45 50 C40 52, 35 48, 35 42 Z" opacity="0.6"/>
              </svg>
              <div className="mt-4 text-2xl md:text-3xl font-black tracking-wider text-dark-300">
                TRAIN HARD
              </div>
            </div>

            {/* Corner glow */}
            <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-brand-500/20 rounded-full blur-3xl" />
            <div className="absolute -top-4 -left-4 w-24 h-24 bg-brand-600/10 rounded-full blur-2xl" />
          </div>
        </div>

        {/* 4 Feature Icons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-10">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="text-center p-4 md:p-6 bg-dark-900/60 rounded-xl border border-brand-600/20 hover:border-brand-500/40 transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-14 h-14 md:w-16 md:h-16 mx-auto bg-brand-500/15 rounded-xl flex items-center justify-center text-brand-500 mb-3">
                {feature.icon}
              </div>
              <div className="text-sm md:text-base font-bold text-dark-200">
                {feature.title}
              </div>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <div className="text-center animate-fade-in">
          <button
            onClick={onBookingClick}
            className="px-12 py-4 bg-gradient-to-r from-brand-500 to-brand-600 text-white font-black text-xl rounded-lg hover:shadow-lg hover:shadow-brand-500/40 transition-all duration-300 transform hover:scale-105 tracking-wider"
          >
            JETZT BUCHEN
          </button>
        </div>
      </div>
    </section>
  )
}
