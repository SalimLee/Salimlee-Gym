'use client'

import Image from 'next/image'
import logoImage from '@/assets/logo.png'

interface HeroProps {
  onBookingClick?: () => void
}

// Bold, filled SVG icons - kräftig und erwachsen
function BoxingGloveIcon() {
  return (
    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.8 8.3c0-1.5-.5-2.9-1.5-4C17.2 3.1 15.7 2.5 14 2.5c-1 0-2 .3-2.8.8-.8-.5-1.8-.8-2.8-.8C6.7 2.5 5.2 3.1 4.1 4.3 3.1 5.4 2.5 6.8 2.5 8.3c0 1 .2 1.9.6 2.7L5 14.5v4c0 1.7 1.3 3 3 3h8.5c1.7 0 3-1.3 3-3v-4l1.7-3.5c.4-.8.6-1.7.6-2.7zM16.5 18.5c0 .3-.2.5-.5.5H8c-.3 0-.5-.2-.5-.5V15h9v3.5z"/>
    </svg>
  )
}

function DumbbellIcon() {
  return (
    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z"/>
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
    </svg>
  )
}

function PeopleIcon() {
  return (
    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
    </svg>
  )
}

export function Hero({ onBookingClick }: HeroProps) {
  const features = [
    { icon: <BoxingGloveIcon />, title: 'Boxen & Fitness' },
    { icon: <DumbbellIcon />, title: 'Kraft & Ausdauer' },
    { icon: <ShieldIcon />, title: 'Selbstvertrauen & Disziplin' },
    { icon: <PeopleIcon />, title: 'Alle Level willkommen' },
  ]

  return (
    <section className="relative pt-0 pb-8 px-4 overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-900/30 via-transparent to-dark-950" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand-500/8 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Main Hero Content */}
        <div className="text-center mb-0 animate-fade-in flex flex-col items-center justify-center">
          <Image 
            src={logoImage} 
            alt="Salim Lee Boxing & Fitness Logo" 
            className="w-full max-w-[280px] sm:max-w-[320px] md:max-w-[500px] lg:max-w-[600px] h-auto drop-shadow-[0_0_20px_rgba(176,0,0,0.3)]" 
            priority
          />
        </div>

        {/* Boxing Gym Image */}
        <div className="relative mb-12 animate-fade-in-delay">
          <div
            className="max-w-3xl mx-auto rounded-2xl overflow-hidden relative"
            style={{
              boxShadow: '0 0 30px rgba(176, 0, 0, 0.15), 0 0 80px rgba(176, 0, 0, 0.05), 0 25px 50px rgba(0,0,0,0.5)',
              border: '1px solid rgba(176, 0, 0, 0.25)',
            }}
          >
            <Image
              src="/Boxring.jpeg"
              alt="Boxring im Salim Lee Boxing & Fitness Gym"
              width={1200}
              height={900}
              className="w-full h-auto object-cover"
              priority
            />
            {/* Vignette overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-dark-950/20 via-transparent to-dark-950/40" />
          </div>
        </div>

        {/* 4 Feature Icons - bold filled style */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-10">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="text-center p-4 md:p-6 bg-dark-900/60 rounded-xl border border-brand-700/20 hover:border-brand-500/30 transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div
                className="w-14 h-14 md:w-16 md:h-16 mx-auto bg-brand-500/10 rounded-xl flex items-center justify-center text-brand-500 mb-3"
                style={{ boxShadow: '0 0 15px rgba(176,0,0,0.08)' }}
              >
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
            className="px-12 py-4 bg-gradient-to-r from-brand-500 to-brand-600 text-white font-black text-xl rounded-lg transition-all duration-300 transform hover:scale-105 tracking-wider"
            style={{ boxShadow: '0 0 20px rgba(176, 0, 0, 0.4), 0 0 60px rgba(176, 0, 0, 0.15)' }}
          >
            JETZT BUCHEN
          </button>
        </div>
      </div>
    </section>
  )
}
