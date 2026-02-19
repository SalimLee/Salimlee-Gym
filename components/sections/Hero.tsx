'use client'

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
    <section className="relative pt-24 pb-8 px-4 overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-900/30 via-transparent to-dark-950" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand-500/8 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Main Hero Content */}
        <div className="text-center mb-10 animate-fade-in">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter mb-6 leading-none">
            SALIM LEE<br />
            <span className="text-brand-500 neon-text">BOXING & FITNESS</span>
          </h1>
        </div>

        {/* Boxing Gym Image Area */}
        <div className="relative mb-12 animate-fade-in-delay">
          <div
            className="max-w-3xl mx-auto aspect-[16/9] rounded-2xl overflow-hidden relative"
            style={{
              boxShadow: '0 0 30px rgba(176, 0, 0, 0.15), 0 0 80px rgba(176, 0, 0, 0.05), 0 25px 50px rgba(0,0,0,0.5)',
              border: '1px solid rgba(176, 0, 0, 0.25)',
            }}
          >
            {/* Dark gym background */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0d0404] via-[#120606] to-[#0a0202]" />

            {/* Dramatic overhead spotlight */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[40%] h-[80%]"
              style={{ background: 'radial-gradient(ellipse at top, rgba(176,0,0,0.12) 0%, rgba(176,0,0,0.04) 40%, transparent 70%)' }}
            />

            {/* Secondary ambient light */}
            <div className="absolute top-[10%] left-[20%] w-[25%] h-[40%]"
              style={{ background: 'radial-gradient(circle, rgba(176,0,0,0.06) 0%, transparent 70%)' }}
            />

            {/* Boxing ring - floor canvas */}
            <div className="absolute bottom-0 left-[5%] right-[5%] h-[30%] bg-gradient-to-t from-[#1a0808]/80 via-[#140505]/40 to-transparent" />

            {/* Ring ropes with glow */}
            {[22, 38, 54].map((top, i) => (
              <div key={top} className="absolute left-[6%] right-[6%]" style={{ top: `${top}%` }}>
                <div
                  className="h-[2px] w-full"
                  style={{
                    background: `linear-gradient(to right, transparent, rgba(176,0,0,${0.35 - i * 0.1}) 20%, rgba(176,0,0,${0.5 - i * 0.12}) 50%, rgba(176,0,0,${0.35 - i * 0.1}) 80%, transparent)`,
                    boxShadow: `0 0 ${8 - i * 2}px rgba(176,0,0,${0.3 - i * 0.08})`,
                  }}
                />
              </div>
            ))}

            {/* Ring posts with glow */}
            <div className="absolute top-[18%] left-[6%] w-[4px] h-[40%] rounded-full"
              style={{ background: 'linear-gradient(to bottom, rgba(176,0,0,0.6), rgba(176,0,0,0.2), transparent)', boxShadow: '0 0 8px rgba(176,0,0,0.3)' }}
            />
            <div className="absolute top-[18%] right-[6%] w-[4px] h-[40%] rounded-full"
              style={{ background: 'linear-gradient(to bottom, rgba(176,0,0,0.6), rgba(176,0,0,0.2), transparent)', boxShadow: '0 0 8px rgba(176,0,0,0.3)' }}
            />

            {/* Hanging hook/bar at top */}
            <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-12 h-[3px] rounded-full"
              style={{ background: 'linear-gradient(to right, transparent, rgba(180,180,180,0.4), transparent)' }}
            />
            {/* Laces */}
            <div className="absolute top-[11%] left-[calc(50%-8px)] w-[1px] h-[14%]"
              style={{ background: 'linear-gradient(to bottom, rgba(180,180,180,0.3), rgba(120,120,120,0.15), transparent)' }}
            />
            <div className="absolute top-[11%] left-[calc(50%+8px)] w-[1px] h-[14%]"
              style={{ background: 'linear-gradient(to bottom, rgba(180,180,180,0.3), rgba(120,120,120,0.15), transparent)' }}
            />

            {/* LEFT BOXING GLOVE */}
            <div className="absolute top-[24%] left-[26%] md:left-[30%] transform -rotate-[15deg]">
              <div className="relative w-[60px] h-[75px] md:w-[80px] md:h-[100px]">
                <div className="absolute inset-0 rounded-[45%_45%_50%_50%]"
                  style={{
                    background: 'linear-gradient(135deg, #c00000 0%, #b00000 25%, #6a0000 60%, #550000 100%)',
                    boxShadow: '0 0 25px rgba(176,0,0,0.35), inset 0 -5px 15px rgba(0,0,0,0.5), inset 5px 5px 10px rgba(255,80,80,0.1)',
                  }}
                />
                <div className="absolute top-[12%] left-[12%] w-[40%] h-[35%] rounded-full opacity-30"
                  style={{ background: 'radial-gradient(circle at 30% 30%, rgba(255,120,120,0.6), transparent)' }}
                />
                <div className="absolute top-[20%] left-[-10%] w-[30%] h-[35%] rounded-[50%]"
                  style={{ background: 'linear-gradient(135deg, #b00000, #6a0000)', boxShadow: 'inset 2px 2px 4px rgba(255,80,80,0.1)' }}
                />
                <div className="absolute bottom-[-8%] left-[15%] w-[70%] h-[20%] rounded-b-lg"
                  style={{ background: 'linear-gradient(to bottom, #550000, #350000)' }}
                />
                <div className="absolute top-[55%] left-[20%] w-[60%] h-[1px] opacity-15 bg-white" />
              </div>
            </div>

            {/* RIGHT BOXING GLOVE */}
            <div className="absolute top-[24%] right-[26%] md:right-[30%] transform rotate-[15deg]">
              <div className="relative w-[60px] h-[75px] md:w-[80px] md:h-[100px]">
                <div className="absolute inset-0 rounded-[45%_45%_50%_50%]"
                  style={{
                    background: 'linear-gradient(225deg, #c00000 0%, #b00000 25%, #6a0000 60%, #550000 100%)',
                    boxShadow: '0 0 25px rgba(176,0,0,0.35), inset 0 -5px 15px rgba(0,0,0,0.5), inset -5px 5px 10px rgba(255,80,80,0.1)',
                  }}
                />
                <div className="absolute top-[12%] right-[12%] w-[40%] h-[35%] rounded-full opacity-30"
                  style={{ background: 'radial-gradient(circle at 70% 30%, rgba(255,120,120,0.6), transparent)' }}
                />
                <div className="absolute top-[20%] right-[-10%] w-[30%] h-[35%] rounded-[50%]"
                  style={{ background: 'linear-gradient(225deg, #b00000, #6a0000)', boxShadow: 'inset -2px 2px 4px rgba(255,80,80,0.1)' }}
                />
                <div className="absolute bottom-[-8%] left-[15%] w-[70%] h-[20%] rounded-b-lg"
                  style={{ background: 'linear-gradient(to bottom, #550000, #350000)' }}
                />
                <div className="absolute top-[55%] left-[20%] w-[60%] h-[1px] opacity-15 bg-white" />
              </div>
            </div>

            {/* Glow behind gloves */}
            <div className="absolute top-[25%] left-1/2 -translate-x-1/2 w-[50%] h-[35%]"
              style={{ background: 'radial-gradient(ellipse, rgba(176,0,0,0.1) 0%, transparent 60%)' }}
            />

            {/* Central text */}
            <div className="absolute bottom-[15%] left-0 right-0 text-center">
              <div className="text-xl md:text-3xl font-black tracking-[0.25em] text-dark-400/70"
                style={{ textShadow: '0 0 20px rgba(176,0,0,0.15)' }}
              >
                TRAIN HARD
              </div>
            </div>

            {/* Vignette */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#080202]/60 via-transparent to-[#080202]/60" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#080202]/30 via-transparent to-[#080202]/70" />
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
