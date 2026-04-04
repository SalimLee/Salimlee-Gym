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

// Exercise Types
export interface Exercise {
  id: string
  created_at: string
  updated_at: string
  created_by: string
  name: string
  description: string | null
  target_muscle: string | null
  exercise_type: string
  difficulty_level: string
  default_sets: number | null
  default_reps: number | null
  default_duration_seconds: number | null
  instructions: string | null
  video_url: string | null
  image_url: string | null
}

// Workout Types
export interface Workout {
  id: string
  created_at: string
  updated_at: string
  created_by: string
  name: string
  description: string | null
  target_muscle_group: string | null
  difficulty_level: string
  estimated_duration_minutes: number | null
  is_published: boolean
  image_url: string | null
  tags: string[] | null
  estimated_calories: number | null
}

// WorkoutExercise (Junction)
export interface WorkoutExercise {
  id: string
  created_at: string
  workout_id: string
  exercise_id: string
  exercise_order: number
  sets: number | null
  reps: number | null
  duration_seconds: number | null
  rest_seconds: number | null
  notes: string | null
  exercise?: Exercise
}

// Workout with nested exercises
export interface WorkoutWithExercises extends Workout {
  workout_exercises: WorkoutExercise[]
}
