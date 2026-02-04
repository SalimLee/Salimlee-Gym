'use client'

import { STATS } from '@/lib/constants'

export function Stats() {
  return (
    <section className="py-16 px-4 bg-gradient-to-b from-transparent to-dark-900/50">
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
        {STATS.map((stat, index) => (
          <div
            key={stat.label}
            className="text-center p-6 bg-dark-900/50 rounded-xl border border-brand-600/20 hover:border-brand-500/50 transition-all duration-300 animate-fade-in"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="text-4xl md:text-5xl font-black text-brand-500 mb-2">
              {stat.number}
            </div>
            <div className="text-sm text-dark-400 font-semibold tracking-wide">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
