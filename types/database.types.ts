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
      members: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          name: string
          email: string
          phone: string | null
          notes: string | null
          active: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          name: string
          email: string
          phone?: string | null
          notes?: string | null
          active?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          name?: string
          email?: string
          phone?: string | null
          notes?: string | null
          active?: boolean
        }
      }
      subscriptions: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          member_id: string
          name: string
          type: string
          start_date: string
          end_date: string | null
          total_units: number | null
          remaining_units: number | null
          price: number
          status: 'active' | 'expired' | 'cancelled' | 'paused'
          notes: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          member_id: string
          name: string
          type?: string
          start_date: string
          end_date?: string | null
          total_units?: number | null
          remaining_units?: number | null
          price?: number
          status?: 'active' | 'expired' | 'cancelled' | 'paused'
          notes?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          member_id?: string
          name?: string
          type?: string
          start_date?: string
          end_date?: string | null
          total_units?: number | null
          remaining_units?: number | null
          price?: number
          status?: 'active' | 'expired' | 'cancelled' | 'paused'
          notes?: string | null
        }
      }
      invoices: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          member_id: string
          invoice_number: string
          description: string
          amount: number
          status: 'open' | 'paid' | 'overdue' | 'cancelled'
          due_date: string
          paid_date: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          member_id: string
          invoice_number: string
          description: string
          amount: number
          status?: 'open' | 'paid' | 'overdue' | 'cancelled'
          due_date: string
          paid_date?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          member_id?: string
          invoice_number?: string
          description?: string
          amount?: number
          status?: 'open' | 'paid' | 'overdue' | 'cancelled'
          due_date?: string
          paid_date?: string | null
          notes?: string | null
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
      subscription_status: 'active' | 'expired' | 'cancelled' | 'paused'
      invoice_status: 'open' | 'paid' | 'overdue' | 'cancelled'
    }
  }
}
