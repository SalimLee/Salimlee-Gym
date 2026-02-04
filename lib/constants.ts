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
    street: 'Metzgerstrasse 5',
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
    price: 'ab 45€',
    features: [
      'Individuelle Betreuung',
      'Flexible Zeiten',
      'Maßgeschneidertes Training',
      'Ernährungsberatung',
    ],
    icon: 'Users',
  },
  {
    id: 'group',
    title: 'Gruppenkurse',
    subtitle: 'Boxen & Fitness',
    price: 'ab 15€',
    features: [
      'Motivierende Atmosphäre',
      'Feste Kurszeiten',
      'Alle Fitnesslevel',
      'Community-Gefühl',
    ],
    icon: 'Award',
  },
  {
    id: 'kids',
    title: 'Kinderkurse',
    subtitle: 'Ab 6 Jahren',
    price: 'ab 12€',
    features: [
      'Spielerisches Training',
      'Selbstvertrauen aufbauen',
      'Koordination & Kraft',
      'Erfahrene Trainer',
    ],
    icon: 'Calendar',
  },
]

export const PRICES: PriceItem[] = [
  { id: '1', name: 'Einzelstunde Personaltraining', price: '45€', discount: null, category: 'personal' },
  { id: '2', name: '10er Karte Personaltraining', price: '400€', discount: '50€ Ersparnis', category: 'personal' },
  { id: '3', name: 'Einzelne Gruppenstunde', price: '15€', discount: null, category: 'group' },
  { id: '4', name: '10er Karte Gruppenkurse', price: '120€', discount: '30€ Ersparnis', category: 'group' },
  { id: '5', name: 'Monatskarte Gruppenkurse', price: '89€', discount: 'Unbegrenzt trainieren', category: 'group' },
  { id: '6', name: 'Kinderkurs Einzelstunde', price: '12€', discount: null, category: 'kids' },
  { id: '7', name: '10er Karte Kinderkurse', price: '100€', discount: '20€ Ersparnis', category: 'kids' },
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
