'use client'

import { Swords, Dumbbell, Baby, UserCheck, Euro, Clock, Gift, MapPin, Info } from 'lucide-react'

export function KurseInfos() {
  const kurse = [
    {
      icon: Dumbbell,
      label: 'Erwachsenenkurse',
      detail: 'MO, MI & FR · 18–19 Uhr',
    },
    {
      icon: Baby,
      label: 'Kinderkurse (3–14 Jahre)',
      detail: 'DI & DO · 17–18 Uhr',
    },
    {
      icon: Swords,
      label: 'Boxtraining',
      detail: 'Technik, Sparring & Fitness',
    },
    {
      icon: UserCheck,
      label: 'Personal Training',
      detail: 'Flexible Termine nach Absprache',
    },
  ]

  const infos = [
    { icon: Euro, label: 'Ab 50€/mtl.', detail: 'Faire Preise, keine versteckten Kosten' },
    { icon: Gift, label: 'Probetraining kostenlos', detail: 'Unverbindlich reinschnuppern (max. 2 Kurse)' },
    { icon: MapPin, label: 'Reutlingen', detail: 'Netzgenauerstr. 8, 72764 Reutlingen' },
    { icon: Clock, label: 'Jetzt starten', detail: 'Einfach vorbeikommen oder anrufen' },
  ]

  return (
    <section id="angebote" className="py-16 px-4">
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
                  <div className="w-10 h-10 bg-brand-500/15 rounded-lg flex items-center justify-center text-brand-500 group-hover:bg-brand-500/25 transition-colors shrink-0">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-lg font-semibold text-dark-200 block">
                      {item.label}
                    </span>
                    <span className="text-sm text-dark-400">
                      {item.detail}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* 15 Min Hinweis */}
            <div className="mt-4 flex items-start gap-2 text-dark-500 text-xs px-1">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>Bitte 15 Minuten vor Kursbeginn da sein, damit wir pünktlich starten können.</span>
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
                  <div className="w-10 h-10 bg-brand-500/15 rounded-lg flex items-center justify-center text-brand-500 group-hover:bg-brand-500/25 transition-colors shrink-0">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-lg font-semibold text-dark-200 block">
                      {item.label}
                    </span>
                    <span className="text-sm text-dark-400">
                      {item.detail}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
