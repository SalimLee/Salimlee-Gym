// Diese Datei wird automatisch generiert durch:
// npm run db:generate
// 
// Oder manuell über Supabase CLI:
// supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      bookings: {
        Row: {
          id: string
          created_at: string
          name: string
          email: string
          phone: string | null
          service: string
          people: number
          preferred_date: string | null
          message: string | null
          status: 'pending' | 'confirmed' | 'cancelled'
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          email: string
          phone?: string | null
          service: string
          people?: number
          preferred_date?: string | null
          message?: string | null
          status?: 'pending' | 'confirmed' | 'cancelled'
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          email?: string
          phone?: string | null
          service?: string
          people?: number
          preferred_date?: string | null
          message?: string | null
          status?: 'pending' | 'confirmed' | 'cancelled'
        }
      }
      services: {
        Row: {
          id: string
          title: string
          subtitle: string
          price: string
          features: string[]
          icon: string
          order: number
          active: boolean
        }
        Insert: {
          id?: string
          title: string
          subtitle: string
          price: string
          features: string[]
          icon: string
          order?: number
          active?: boolean
        }
        Update: {
          id?: string
          title?: string
          subtitle?: string
          price?: string
          features?: string[]
          icon?: string
          order?: number
          active?: boolean
        }
      }
      prices: {
        Row: {
          id: string
          name: string
          price: string
          discount: string | null
          category: string
          order: number
          active: boolean
        }
        Insert: {
          id?: string
          name: string
          price: string
          discount?: string | null
          category: string
          order?: number
          active?: boolean
        }
        Update: {
          id?: string
          name?: string
          price?: string
          discount?: string | null
          category?: string
          order?: number
          active?: boolean
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      booking_status: 'pending' | 'confirmed' | 'cancelled'
    }
  }
}
