'use client'

import { PRICES } from '@/lib/constants'

const CATEGORY_LABELS: Record<string, string> = {
  membership: 'Mitgliedschaft (Kurse)',
  student: 'Schüler / Azubi / Student (ab 14 Jahren)',
  personal: 'Personaltraining',
  trial: 'Probetraining',
  service: 'Service Pauschale',
}

const CATEGORY_ORDER = ['membership', 'student', 'personal', 'trial', 'service'] as const

export function Pricing() {
  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    items: PRICES.filter((p) => p.category === cat),
  }))

  return (
    <section id="preise" className="py-20 px-4 scroll-mt-24 bg-gradient-to-b from-transparent via-dark-900/30 to-transparent">
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
              {group.category === 'student' && (
                <div className="mb-3 p-4 rounded-xl bg-brand-500/5 border border-brand-500/20 text-sm text-dark-300">
                  <p className="font-semibold text-brand-400 mb-1">Voraussetzungen für den Schüler-, Azubi- &amp; Studenten-Tarif</p>
                  <ul className="list-disc list-inside space-y-1 text-dark-400">
                    <li>Gültig ab <strong className="text-dark-200">14 Jahren</strong> (darunter gelten die Kinderkurs-Preise)</li>
                    <li>Nur als <strong className="text-dark-200">6-Monats-Vertrag</strong> oder <strong className="text-dark-200">monatlich kündbar</strong> – keine 12-Monats-Verträge</li>
                    <li>
                      Der Vertrag kommt nur mit gültigem <strong className="text-dark-200">Nachweis</strong> zustande (Schülerausweis,
                      Immatrikulationsbescheinigung oder Arbeitsvertrag / Ausbildungsvertrag)
                    </li>
                  </ul>
                </div>
              )}
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
                      {item.hasServiceFee && (
                        <div className="text-xs text-dark-500 mt-1">zzgl. 40€ halbjährliche Service Pauschale</div>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-2xl font-black text-brand-500">
                        {item.price}
                      </div>
                      {item.perUnit && (
                        <div className="text-xs font-semibold text-brand-300 bg-brand-500/10 rounded-full px-3 py-0.5 mt-1 whitespace-nowrap">
                          {item.perUnit}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Info Text */}
        <p className="text-center text-dark-400 mt-8 text-sm">
          * Alle Preise inkl. MwSt. Kurszeiten: Erwachsene MO, MI &amp; FR – Kurs 19:00–20:00, freies Training 17:00–19:00 · Kinder DI &amp; DO – 17:00–18:00.
        </p>
      </div>
    </section>
  )
}
