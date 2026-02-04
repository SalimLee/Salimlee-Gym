'use client'

import { PRICES } from '@/lib/constants'

export function Pricing() {
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

        {/* Price List */}
        <div className="bg-dark-900/50 rounded-2xl border border-brand-600/20 overflow-hidden">
          {PRICES.map((item, index) => (
            <div
              key={item.id}
              className={`flex items-center justify-between p-6 hover:bg-dark-800/50 transition-colors ${
                index !== PRICES.length - 1 ? 'border-b border-brand-600/10' : ''
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

        {/* Info Text */}
        <p className="text-center text-dark-400 mt-8 text-sm">
          * Alle Preise inkl. MwSt. Probetraining nach Absprache möglich.
        </p>
      </div>
    </section>
  )
}
