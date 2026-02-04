import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Kombiniert clsx und tailwind-merge für saubere Klassennamen
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formatiert Datum auf Deutsch
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

// Formatiert Preis
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(price)
}
