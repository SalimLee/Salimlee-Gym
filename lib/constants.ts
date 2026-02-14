import { Service, PriceItem, Stat, ContactInfo } from '@/types'

export const SITE_CONFIG = {
  name: 'Salim Lee Boxing & Fitness Gym',
  shortName: 'Salim Lee',
  tagline: 'BOXING & FITNESS',
  description: 'Professionelles Boxen und Fitness Training in Reutlingen. Personaltraining, Gruppenkurse und spezielle Kinderkurse – für alle Levels.',
  url: 'https://salim-lee-gym.de',
} as const

export const CONTACT_INFO: ContactInfo = {
  address: {
    street: 'Wörthstrasse 17',
    zip: '72764',
    city: 'Reutlingen',
    country: 'Deutschland',
  },
  phone: '+49 (0) 123 456 789',
  email: 'info@salim-lee-gym.de',
  hours: {
    weekdays: 'Mo - Fr: 06:00 - 22:00',
    weekend: 'Sa - So: 08:00 - 20:00',
  },
}

export const SERVICES: Service[] = [
  {
    id: 'personal',
    title: 'Personaltraining',
    subtitle: '1-4 Personen',
    price: '60€/Std',
    features: [
      'Individuelle Betreuung',
      'Flexible Zeiten',
      '10er Karte verfügbar (Vorauszahlung)',
      'Probetraining einmalig für 40€',
    ],
    icon: 'Users',
  },
  {
    id: 'group',
    title: 'Erwachsenenkurse',
    subtitle: 'MO, MI & FR · 19-20 Uhr',
    price: 'ab 80€/Mo',
    features: [
      'Boxen & Fitness',
      'Motivierende Atmosphäre',
      'Alle Fitnesslevel',
      'Probetraining kostenlos (max. 2 Kurse)',
    ],
    icon: 'Award',
  },
  {
    id: 'kids',
    title: 'Kinderkurse',
    subtitle: 'DI & DO · 17-18 Uhr',
    price: 'ab 50€/Mo',
    features: [
      'Für Kinder von 3-14 Jahren',
      'Spielerisches Training',
      'Selbstvertrauen aufbauen',
      'Probetraining kostenlos (max. 2 Kurse)',
    ],
    icon: 'Calendar',
  },
  {
    id: 'trial',
    title: 'Probetraining',
    subtitle: 'Reinschnuppern',
    price: 'ab 0€',
    features: [
      'Personaltraining: einmalig 40€',
      'Kurse: kostenlos (max. 2 Kurse)',
      'Unverbindlich testen',
      'Alle Angebote kennenlernen',
    ],
    icon: 'Star',
  },
]

export const PRICES: PriceItem[] = [
  { id: '1', name: 'Erwachsene & Jugendliche – 6 Monate', price: '90€/Mo', discount: null, category: 'membership' },
  { id: '2', name: 'Erwachsene & Jugendliche – 12 Monate', price: '80€/Mo', discount: 'Beste Ersparnis', category: 'membership' },
  { id: '3', name: 'Kinder (3-14 Jahre) – 12 Monate', price: '50€/Mo', discount: null, category: 'membership' },
  { id: '4', name: 'Monatlich kündbar', price: '120€/Mo', discount: 'Flexibel', category: 'membership' },
  { id: '5', name: '10er Karte – 6 Monate gültig', price: '160€', discount: 'Einmalzahlung', category: 'membership' },
  { id: '6', name: 'Einzelstunde Personaltraining', price: '60€', discount: null, category: 'personal' },
  { id: '7', name: '10er Karte Personaltraining', price: '600€', discount: 'Vorauszahlung', category: 'personal' },
  { id: '8', name: 'Probetraining Personaltraining (einmalig)', price: '40€', discount: null, category: 'trial' },
  { id: '9', name: 'Probetraining Kurse (max. 2 Kurse)', price: 'Kostenlos', discount: 'Unverbindlich', category: 'trial' },
]

export const STATS: Stat[] = [
  { number: '5+', label: 'Jahre Erfahrung' },
  { number: '200+', label: 'Zufriedene Mitglieder' },
  { number: '15+', label: 'Wöchentliche Kurse' },
  { number: '100%', label: 'Engagement' },
]

export const NAV_LINKS = [
  { href: '#angebote', label: 'ANGEBOTE' },
  { href: '#preise', label: 'PREISE' },
  { href: '#kontakt', label: 'KONTAKT' },
] as const
