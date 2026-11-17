import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          user_id: string
          name: string
          type: 'expense' | 'income'
          color: string
          icon: string
          keywords: string[]
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['categories']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['categories']['Row']>
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          category_id: string
          account_id: string | null
          description: string
          amount: number
          due_date: string | null
          paid_date: string | null
          status: 'paid' | 'pending' | 'overdue'
          type: 'expense' | 'income'
          source: 'manual' | 'import'
          month: number
          year: number
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['transactions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['transactions']['Row']>
      }
    }
  }
}
