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
          updated_at: string
          name: string
          email: string
          phone: string | null
          service: string
          people: number
          preferred_date: string | null
          message: string | null
          status: 'pending' | 'confirmed' | 'cancelled'
          admin_notes: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          name: string
          email: string
          phone?: string | null
          service: string
          people?: number
          preferred_date?: string | null
          message?: string | null
          status?: 'pending' | 'confirmed' | 'cancelled'
          admin_notes?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          name?: string
          email?: string
          phone?: string | null
          service?: string
          people?: number
          preferred_date?: string | null
          message?: string | null
          status?: 'pending' | 'confirmed' | 'cancelled'
          admin_notes?: string | null
        }
      }
      services: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          title: string
          subtitle: string | null
          price: string
          features: string[]
          icon: string
          display_order: number
          active: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          title: string
          subtitle?: string | null
          price: string
          features?: string[]
          icon?: string
          display_order?: number
          active?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          title?: string
          subtitle?: string | null
          price?: string
          features?: string[]
          icon?: string
          display_order?: number
          active?: boolean
        }
      }
      prices: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          name: string
          price: string
          discount: string | null
          category: string
          display_order: number
          active: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          name: string
          price: string
          discount?: string | null
          category: string
          display_order?: number
          active?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          name?: string
          price?: string
          discount?: string | null
          category?: string
          display_order?: number
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
