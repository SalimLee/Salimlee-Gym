'use client'

import { Dumbbell, Shield, Users, Swords } from 'lucide-react'

interface HeroProps {
  onBookingClick?: () => void
}

export function Hero({ onBookingClick }: HeroProps) {
  const features = [
    {
      icon: <Swords className="w-7 h-7" />,
      title: 'Boxen & Fitness',
    },
    {
      icon: <Dumbbell className="w-7 h-7" />,
      title: 'Kraft & Ausdauer',
    },
    {
      icon: <Shield className="w-7 h-7" />,
      title: 'Selbstvertrauen & Disziplin',
    },
    {
      icon: <Users className="w-7 h-7" />,
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
        <div className="text-center mb-10 animate-fade-in">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter mb-6 leading-none">
            SALIM LEE<br />
            <span className="text-brand-500">BOXING & FITNESS</span>
          </h1>
        </div>

        {/* Boxing Gym Image Area - atmospheric CSS illustration */}
        <div className="relative mb-12 animate-fade-in-delay">
          <div className="max-w-3xl mx-auto aspect-[16/9] rounded-2xl border border-brand-700/40 overflow-hidden shadow-2xl shadow-brand-900/40 relative">
            {/* Dark gym background with dramatic lighting */}
            <div className="absolute inset-0 bg-gradient-to-br from-dark-900 via-[#1a0a0a] to-dark-950" />

            {/* Spotlight from above */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-[70%] bg-gradient-to-b from-brand-500/12 via-brand-600/5 to-transparent rounded-full blur-2xl" />

            {/* Ring floor effect */}
            <div className="absolute bottom-0 left-0 right-0 h-[35%] bg-gradient-to-t from-brand-900/15 to-transparent" />

            {/* Boxing ring ropes */}
            <div className="absolute top-[22%] left-[8%] right-[8%] h-[1px] bg-gradient-to-r from-transparent via-brand-400/40 to-transparent" />
            <div className="absolute top-[38%] left-[5%] right-[5%] h-[1px] bg-gradient-to-r from-transparent via-brand-400/25 to-transparent" />
            <div className="absolute top-[54%] left-[3%] right-[3%] h-[1px] bg-gradient-to-r from-transparent via-brand-400/15 to-transparent" />

            {/* Ring posts - left and right */}
            <div className="absolute top-[18%] left-[8%] w-[3px] h-[40%] bg-gradient-to-b from-brand-400/50 via-brand-500/30 to-transparent rounded-full" />
            <div className="absolute top-[18%] right-[8%] w-[3px] h-[40%] bg-gradient-to-b from-brand-400/50 via-brand-500/30 to-transparent rounded-full" />

            {/* Boxing gloves - left glove */}
            <div className="absolute top-[28%] left-[28%] md:left-[32%]">
              <div className="relative">
                <div className="w-16 h-20 md:w-20 md:h-24 bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 rounded-[40%_40%_45%_45%] shadow-lg shadow-brand-900/50 transform -rotate-12">
                  <div className="absolute top-[15%] left-[15%] w-[35%] h-[40%] bg-brand-400/30 rounded-full blur-[2px]" />
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] h-[15%] bg-brand-800/60 rounded-b-lg" />
                </div>
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-[50%] h-4 bg-gradient-to-b from-brand-800 to-dark-900 rounded-b-lg" />
              </div>
            </div>

            {/* Boxing gloves - right glove */}
            <div className="absolute top-[28%] right-[28%] md:right-[32%]">
              <div className="relative">
                <div className="w-16 h-20 md:w-20 md:h-24 bg-gradient-to-bl from-brand-500 via-brand-600 to-brand-700 rounded-[40%_40%_45%_45%] shadow-lg shadow-brand-900/50 transform rotate-12">
                  <div className="absolute top-[15%] right-[15%] w-[35%] h-[40%] bg-brand-400/30 rounded-full blur-[2px]" />
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] h-[15%] bg-brand-800/60 rounded-b-lg" />
                </div>
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-[50%] h-4 bg-gradient-to-b from-brand-800 to-dark-900 rounded-b-lg" />
              </div>
            </div>

            {/* Hanging laces between gloves */}
            <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[1px] h-[12%] bg-gradient-to-b from-dark-400/60 to-transparent" />
            <div className="absolute top-[16%] left-1/2 -translate-x-1/2 w-8 h-[1px] bg-dark-400/30" />

            {/* Central text */}
            <div className="absolute bottom-[18%] left-0 right-0 text-center">
              <div className="text-2xl md:text-3xl font-black tracking-[0.2em] text-dark-300/80">
                TRAIN HARD
              </div>
            </div>

            {/* Atmospheric particles/dust */}
            <div className="absolute top-[15%] left-[20%] w-1 h-1 bg-brand-400/20 rounded-full" />
            <div className="absolute top-[35%] right-[18%] w-1.5 h-1.5 bg-brand-400/15 rounded-full" />
            <div className="absolute top-[60%] left-[15%] w-1 h-1 bg-brand-400/10 rounded-full" />
            <div className="absolute top-[45%] right-[25%] w-0.5 h-0.5 bg-brand-300/20 rounded-full" />

            {/* Edge vignette */}
            <div className="absolute inset-0 bg-gradient-to-r from-dark-950/40 via-transparent to-dark-950/40" />
            <div className="absolute inset-0 bg-gradient-to-b from-dark-950/20 via-transparent to-dark-950/60" />
          </div>
        </div>

        {/* 4 Feature Icons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-10">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="text-center p-4 md:p-6 bg-dark-900/60 rounded-xl border border-brand-700/20 hover:border-brand-500/40 transition-all duration-300 animate-fade-in"
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
