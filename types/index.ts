// Service Types
export interface Service {
  id: string
  title: string
  subtitle: string
  price: string
  features: string[]
  icon: string // Lucide icon name
}

// Pricing Types
export interface PriceItem {
  id: string
  name: string
  price: string
  discount: string | null
  category: 'membership' | 'personal' | 'trial'
}

// Booking Types
export interface BookingFormData {
  name: string
  email: string
  phone: string
  service: string
  people: string
  date: string
  message: string
}

export interface Booking extends BookingFormData {
  id: string
  created_at: string
  status: 'pending' | 'confirmed' | 'cancelled'
}

// Contact Types
export interface ContactInfo {
  address: {
    street: string
    zip: string
    city: string
    country: string
  }
  phone: string
  email: string
  hours: {
    weekdays: string
    weekend: string
  }
}

// Stats Types
export interface Stat {
  number: string
  label: string
}
