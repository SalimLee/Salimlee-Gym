'use client'

import { Swords, Dumbbell, Baby, UserCheck, Euro, Clock, Gift, MapPin } from 'lucide-react'

export function KurseInfos() {
  const kurse = [
    { icon: Swords, label: 'Boxtraining' },
    { icon: Dumbbell, label: 'Fitness & Kraft' },
    { icon: Baby, label: 'Kinderkurse (3-14 Jahre)' },
    { icon: UserCheck, label: 'Personal Training' },
  ]

  const infos = [
    { icon: Euro, label: 'Ab 50€/Monat' },
    { icon: Clock, label: 'DI & DO 17-18 Uhr' },
    { icon: Gift, label: 'Probetraining Kostenlos' },
    { icon: MapPin, label: 'Reutlingen' },
  ]

  return (
    <section className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          {/* Kurse */}
          <div className="animate-fade-in">
            <h2 className="text-3xl md:text-4xl font-black mb-8 tracking-tight">
              KURSE
            </h2>
            <div className="space-y-4">
              {kurse.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-4 p-4 bg-dark-900/40 rounded-xl border border-dark-800 hover:border-brand-500/30 transition-all duration-300 group"
                >
                  <div className="w-10 h-10 bg-brand-500/15 rounded-lg flex items-center justify-center text-brand-500 group-hover:bg-brand-500/25 transition-colors">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="text-lg font-semibold text-dark-200">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Infos */}
          <div className="animate-fade-in-delay">
            <h2 className="text-3xl md:text-4xl font-black mb-8 tracking-tight">
              INFOS
            </h2>
            <div className="space-y-4">
              {infos.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-4 p-4 bg-dark-900/40 rounded-xl border border-dark-800 hover:border-brand-500/30 transition-all duration-300 group"
                >
                  <div className="w-10 h-10 bg-brand-500/15 rounded-lg flex items-center justify-center text-brand-500 group-hover:bg-brand-500/25 transition-colors">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="text-lg font-semibold text-dark-200">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
