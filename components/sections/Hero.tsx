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
              boxShadow: '0 0 30px rgba(255, 45, 45, 0.15), 0 0 80px rgba(255, 45, 45, 0.05), 0 25px 50px rgba(0,0,0,0.5)',
              border: '1px solid rgba(255, 45, 45, 0.2)',
            }}
          >
            {/* Dark gym background */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0d0404] via-[#120606] to-[#0a0202]" />

            {/* Dramatic overhead spotlight */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[40%] h-[80%]"
              style={{ background: 'radial-gradient(ellipse at top, rgba(255,45,45,0.12) 0%, rgba(255,45,45,0.04) 40%, transparent 70%)' }}
            />

            {/* Secondary ambient light */}
            <div className="absolute top-[10%] left-[20%] w-[25%] h-[40%]"
              style={{ background: 'radial-gradient(circle, rgba(255,82,82,0.06) 0%, transparent 70%)' }}
            />

            {/* Boxing ring - floor canvas */}
            <div className="absolute bottom-0 left-[5%] right-[5%] h-[30%] bg-gradient-to-t from-[#1a0808]/80 via-[#140505]/40 to-transparent" />

            {/* Ring ropes with glow */}
            {[22, 38, 54].map((top, i) => (
              <div key={top} className="absolute left-[6%] right-[6%]" style={{ top: `${top}%` }}>
                <div
                  className="h-[2px] w-full"
                  style={{
                    background: `linear-gradient(to right, transparent, rgba(255,45,45,${0.35 - i * 0.1}) 20%, rgba(255,45,45,${0.5 - i * 0.12}) 50%, rgba(255,45,45,${0.35 - i * 0.1}) 80%, transparent)`,
                    boxShadow: `0 0 ${8 - i * 2}px rgba(255,45,45,${0.3 - i * 0.08})`,
                  }}
                />
              </div>
            ))}

            {/* Ring posts with glow */}
            <div className="absolute top-[18%] left-[6%] w-[4px] h-[40%] rounded-full"
              style={{
                background: 'linear-gradient(to bottom, rgba(255,45,45,0.6), rgba(255,45,45,0.2), transparent)',
                boxShadow: '0 0 8px rgba(255,45,45,0.3)',
              }}
            />
            <div className="absolute top-[18%] right-[6%] w-[4px] h-[40%] rounded-full"
              style={{
                background: 'linear-gradient(to bottom, rgba(255,45,45,0.6), rgba(255,45,45,0.2), transparent)',
                boxShadow: '0 0 8px rgba(255,45,45,0.3)',
              }}
            />

            {/* Hanging hook/bar at top */}
            <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-12 h-[3px] rounded-full"
              style={{
                background: 'linear-gradient(to right, transparent, rgba(180,180,180,0.4), transparent)',
              }}
            />
            {/* Laces hanging down */}
            <div className="absolute top-[11%] left-[calc(50%-8px)] w-[1px] h-[14%]"
              style={{ background: 'linear-gradient(to bottom, rgba(180,180,180,0.3), rgba(120,120,120,0.15), transparent)' }}
            />
            <div className="absolute top-[11%] left-[calc(50%+8px)] w-[1px] h-[14%]"
              style={{ background: 'linear-gradient(to bottom, rgba(180,180,180,0.3), rgba(120,120,120,0.15), transparent)' }}
            />

            {/* LEFT BOXING GLOVE */}
            <div className="absolute top-[24%] left-[26%] md:left-[30%] transform -rotate-[15deg]">
              <div className="relative w-[60px] h-[75px] md:w-[80px] md:h-[100px]">
                {/* Glove body */}
                <div className="absolute inset-0 rounded-[45%_45%_50%_50%]"
                  style={{
                    background: 'linear-gradient(135deg, #ff4040 0%, #d42020 30%, #a01515 60%, #801010 100%)',
                    boxShadow: '0 0 20px rgba(255,45,45,0.3), inset 0 -5px 15px rgba(0,0,0,0.4), inset 5px 5px 10px rgba(255,100,100,0.15)',
                  }}
                />
                {/* Glove highlight/shine */}
                <div className="absolute top-[12%] left-[12%] w-[40%] h-[35%] rounded-full opacity-40"
                  style={{ background: 'radial-gradient(circle at 30% 30%, rgba(255,150,150,0.6), transparent)' }}
                />
                {/* Thumb */}
                <div className="absolute top-[20%] left-[-10%] w-[30%] h-[35%] rounded-[50%]"
                  style={{
                    background: 'linear-gradient(135deg, #e03535, #a01515)',
                    boxShadow: 'inset 2px 2px 4px rgba(255,100,100,0.15)',
                  }}
                />
                {/* Wrist/cuff */}
                <div className="absolute bottom-[-8%] left-[15%] w-[70%] h-[20%] rounded-b-lg"
                  style={{ background: 'linear-gradient(to bottom, #801010, #500a0a)' }}
                />
                {/* Stitching line */}
                <div className="absolute top-[55%] left-[20%] w-[60%] h-[1px] opacity-20 bg-white" />
              </div>
            </div>

            {/* RIGHT BOXING GLOVE */}
            <div className="absolute top-[24%] right-[26%] md:right-[30%] transform rotate-[15deg]">
              <div className="relative w-[60px] h-[75px] md:w-[80px] md:h-[100px]">
                {/* Glove body */}
                <div className="absolute inset-0 rounded-[45%_45%_50%_50%]"
                  style={{
                    background: 'linear-gradient(225deg, #ff4040 0%, #d42020 30%, #a01515 60%, #801010 100%)',
                    boxShadow: '0 0 20px rgba(255,45,45,0.3), inset 0 -5px 15px rgba(0,0,0,0.4), inset -5px 5px 10px rgba(255,100,100,0.15)',
                  }}
                />
                {/* Glove highlight/shine */}
                <div className="absolute top-[12%] right-[12%] w-[40%] h-[35%] rounded-full opacity-40"
                  style={{ background: 'radial-gradient(circle at 70% 30%, rgba(255,150,150,0.6), transparent)' }}
                />
                {/* Thumb */}
                <div className="absolute top-[20%] right-[-10%] w-[30%] h-[35%] rounded-[50%]"
                  style={{
                    background: 'linear-gradient(225deg, #e03535, #a01515)',
                    boxShadow: 'inset -2px 2px 4px rgba(255,100,100,0.15)',
                  }}
                />
                {/* Wrist/cuff */}
                <div className="absolute bottom-[-8%] left-[15%] w-[70%] h-[20%] rounded-b-lg"
                  style={{ background: 'linear-gradient(to bottom, #801010, #500a0a)' }}
                />
                {/* Stitching line */}
                <div className="absolute top-[55%] left-[20%] w-[60%] h-[1px] opacity-20 bg-white" />
              </div>
            </div>

            {/* Glow behind gloves */}
            <div className="absolute top-[25%] left-1/2 -translate-x-1/2 w-[50%] h-[35%]"
              style={{ background: 'radial-gradient(ellipse, rgba(255,45,45,0.08) 0%, transparent 60%)' }}
            />

            {/* Central text */}
            <div className="absolute bottom-[15%] left-0 right-0 text-center">
              <div
                className="text-xl md:text-3xl font-black tracking-[0.25em] text-dark-400/70"
                style={{ textShadow: '0 0 20px rgba(255,45,45,0.15)' }}
              >
                TRAIN HARD
              </div>
            </div>

            {/* Vignette */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#080202]/60 via-transparent to-[#080202]/60" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#080202]/30 via-transparent to-[#080202]/70" />
          </div>
        </div>

        {/* 4 Feature Icons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-10">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="text-center p-4 md:p-6 bg-dark-900/60 rounded-xl border border-brand-700/20 hover:border-brand-500/30 transition-all duration-300 animate-fade-in"
              style={{
                animationDelay: `${index * 0.1}s`,
              }}
            >
              <div
                className="w-14 h-14 md:w-16 md:h-16 mx-auto bg-brand-500/10 rounded-xl flex items-center justify-center text-brand-500 mb-3"
                style={{ boxShadow: '0 0 15px rgba(255,45,45,0.08)' }}
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
            style={{
              boxShadow: '0 0 20px rgba(255, 45, 45, 0.4), 0 0 60px rgba(255, 45, 45, 0.15)',
            }}
          >
            JETZT BUCHEN
          </button>
        </div>
      </div>
    </section>
  )
}
