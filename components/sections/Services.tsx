'use client'

import { Users, Award, Calendar, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SERVICES } from '@/lib/constants'
import { Service } from '@/types'

// Icon Mapping
const IconMap = {
  Users,
  Award,
  Calendar,
}

interface ServicesProps {
  onServiceSelect?: (service: Service) => void
}

export function Services({ onServiceSelect }: ServicesProps) {
  return (
    <section id="angebote" className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="section-title mb-4">
            UNSERE <span className="text-brand-500">ANGEBOTE</span>
          </h2>
          <p className="text-xl text-dark-400 max-w-2xl mx-auto">
            Wähle das perfekte Training für deine Ziele
          </p>
        </div>

        {/* Service Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {SERVICES.map((service, index) => {
            const IconComponent = IconMap[service.icon as keyof typeof IconMap]
            
            return (
              <div
                key={service.id}
                className="group relative bg-dark-900/50 rounded-2xl border border-brand-600/20 hover:border-brand-500/50 transition-all duration-300 overflow-hidden animate-fade-in"
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="relative p-8 space-y-6">
                  {/* Icon & Price */}
                  <div className="flex items-start justify-between">
                    <div className="w-16 h-16 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl flex items-center justify-center text-dark-950">
                      {IconComponent && <IconComponent className="w-8 h-8" />}
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-brand-500">{service.price}</div>
                      <div className="text-sm text-dark-400">{service.subtitle}</div>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl font-black">{service.title}</h3>

                  {/* Features */}
                  <ul className="space-y-3">
                    {service.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3 text-dark-300">
                        <CheckCircle className="w-5 h-5 text-brand-500 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <Button
                    onClick={() => onServiceSelect?.(service)}
                    className="w-full"
                    size="lg"
                  >
                    JETZT BUCHEN
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
