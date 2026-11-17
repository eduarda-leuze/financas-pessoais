import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { getDefaultCategories } from '../lib/categorizer'
import { getCurrentMonthYear, isOverdue } from '../lib/utils'
import type { Category, Transaction } from '../types'

interface AppContextType {
  categories: Category[]
  transactions: Transaction[]
  currentMonth: number
  currentYear: number
  setCurrentMonth: (m: number) => void
  setCurrentYear: (y: number) => void
  loadTransactions: () => Promise<void>
  loadCategories: () => Promise<void>
  addTransaction: (t: Omit<Transaction, 'id' | 'user_id' | 'created_at'>) => Promise<void>
  updateTransaction: (id: string, t: Partial<Transaction>) => Promise<void>
  deleteTransaction: (id: string) => Promise<void>
  markAsPaid: (id: string) => Promise<void>
  loading: boolean
}

const AppContext = createContext<AppContextType>({} as AppContextType)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const { month, year } = getCurrentMonthYear()
  const [categories, setCategories] = useState<Category[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [currentMonth, setCurrentMonth] = useState(month)
  const [currentYear, setCurrentYear] = useState(year)
  const [loading, setLoading] = useState(false)

  const loadCategories = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('name')

    if (data && data.length > 0) {
      setCategories(data)
    } else {
      // Seed default categories for new user
      const defaults = getDefaultCategories(user.id)
      const { data: inserted } = await supabase
        .from('categories')
        .insert(defaults)
        .select()
      if (inserted) setCategories(inserted)
    }
  }, [user])

  const loadTransactions = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('transactions')
      .select('*, category:categories(*)')
      .eq('user_id', user.id)
      .eq('month', currentMonth)
      .eq('year', currentYear)
      .order('due_date', { ascending: true })

    if (data) {
      // Auto-update overdue status
      const updated = data.map((t: Transaction) => ({
        ...t,
        status: t.status !== 'paid' && t.due_date && isOverdue(t.due_date, t.status)
          ? 'overdue' as const
          : t.status,
      }))
      setTransactions(updated)
    }
    setLoading(false)
  }, [user, currentMonth, currentYear])

  useEffect(() => {
    if (user) {
      loadCategories()
    }
  }, [user, loadCategories])

  useEffect(() => {
    if (user) {
      loadTransactions()
    }
  }, [user, currentMonth, currentYear, loadTransactions])

  const addTransaction = async (t: Omit<Transaction, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return
    await supabase.from('transactions').insert({ ...t, user_id: user.id })
    await loadTransactions()
  }

  const updateTransaction = async (id: string, t: Partial<Transaction>) => {
    await supabase.from('transactions').update(t).eq('id', id)
    await loadTransactions()
  }

  const deleteTransaction = async (id: string) => {
    await supabase.from('transactions').delete().eq('id', id)
    await loadTransactions()
  }

  const markAsPaid = async (id: string) => {
    const today = new Date().toISOString().split('T')[0]
    await supabase.from('transactions').update({
      status: 'paid',
      paid_date: today,
    }).eq('id', id)
    await loadTransactions()
  }

  return (
    <AppContext.Provider value={{
      categories, transactions, currentMonth, currentYear,
      setCurrentMonth, setCurrentYear,
      loadTransactions, loadCategories,
      addTransaction, updateTransaction, deleteTransaction, markAsPaid,
      loading,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
