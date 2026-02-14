'use client'

import { PRICES } from '@/lib/constants'

const CATEGORY_LABELS: Record<string, string> = {
  membership: 'Mitgliedschaft (Kurse)',
  personal: 'Personaltraining',
  trial: 'Probetraining',
}

const CATEGORY_ORDER = ['membership', 'personal', 'trial'] as const

export function Pricing() {
  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    items: PRICES.filter((p) => p.category === cat),
  }))

  return (
    <section id="preise" className="py-20 px-4 bg-gradient-to-b from-transparent via-dark-900/30 to-transparent">
      <div className="max-w-4xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="section-title mb-4">
            UNSERE <span className="text-brand-500">PREISE</span>
          </h2>
          <p className="text-xl text-dark-400 max-w-2xl mx-auto">
            Transparente Preise ohne versteckte Kosten
          </p>
        </div>

        {/* Price Groups */}
        <div className="space-y-8">
          {grouped.map((group) => (
            <div key={group.category}>
              <h3 className="text-lg font-black text-brand-400 mb-3 uppercase tracking-wider">
                {group.label}
              </h3>
              <div className="bg-dark-900/50 rounded-2xl border border-brand-600/20 overflow-hidden">
                {group.items.map((item, index) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-6 hover:bg-dark-800/50 transition-colors ${
                      index !== group.items.length - 1 ? 'border-b border-brand-600/10' : ''
                    }`}
                  >
                    <div className="flex-1">
                      <div className="font-bold text-lg">{item.name}</div>
                      {item.discount && (
                        <div className="text-sm text-brand-400 mt-1">{item.discount}</div>
                      )}
                    </div>
                    <div className="text-2xl font-black text-brand-500 ml-4">
                      {item.price}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Info Text */}
        <p className="text-center text-dark-400 mt-8 text-sm">
          * Alle Preise inkl. MwSt. Kurszeiten: Erwachsene MO, MI & FR 19-20 Uhr · Kinder DI & DO 17-18 Uhr.
        </p>
      </div>
    </section>
  )
}
