import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Create a null client if environment variables are not available
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// Helper function to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return supabase !== null
}

export type Database = {
  public: {
    Tables: {
      aircraft_data: {
        Row: {
          id: string
          week_number: number
          month_number: number
          registration: string
          flight_no: string
          day: string
          date: string
          std: string
          adep: string
          sta: string
          operator: string
          flight_type: 'charter' | 'schedule' | 'acmi'
          total_capacity: number
          capacity_used: number
          capacity_available: number
          status: 'operational' | 'aog' | 'maintenance' | 'cancelled'
          client_name: string
          contract_id: string
          revenue: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          week_number: number
          month_number: number
          registration: string
          flight_no: string
          day: string
          date: string
          std: string
          adep: string
          sta: string
          operator: string
          flight_type: 'charter' | 'schedule' | 'acmi'
          total_capacity: number
          capacity_used: number
          capacity_available: number
          status: 'operational' | 'aog' | 'maintenance' | 'cancelled'
          client_name: string
          contract_id: string
          revenue: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          week_number?: number
          month_number?: number
          registration?: string
          flight_no?: string
          day?: string
          date?: string
          std?: string
          adep?: string
          sta?: string
          operator?: string
          flight_type?: 'charter' | 'schedule' | 'acmi'
          total_capacity?: number
          capacity_used?: number
          capacity_available?: number
          status?: 'operational' | 'aog' | 'maintenance' | 'cancelled'
          client_name?: string
          contract_id?: string
          revenue?: number
          created_at?: string
          updated_at?: string
        }
      }
      activity_log: {
        Row: {
          id: string
          aircraft_id: string
          field_name: string
          old_value: string
          new_value: string
          changed_by: string
          changed_at: string
        }
        Insert: {
          id?: string
          aircraft_id: string
          field_name: string
          old_value: string
          new_value: string
          changed_by: string
          changed_at?: string
        }
        Update: {
          id?: string
          aircraft_id?: string
          field_name?: string
          old_value?: string
          new_value?: string
          changed_by?: string
          changed_at?: string
        }
      }
    }
  }
}