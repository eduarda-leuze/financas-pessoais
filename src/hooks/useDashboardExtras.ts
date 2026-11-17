import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { isOverdue } from '../lib/utils'
import type { Transaction } from '../types'

export interface DashboardExtras {
  prevIncome: number
  prevExpense: number
  upcoming: Transaction[]        // bills due in next 60 days (all months)
  loadingExtras: boolean
}

export function useDashboardExtras(currentMonth: number, currentYear: number): DashboardExtras {
  const { user } = useAuth()
  const [prevIncome,  setPrevIncome]  = useState(0)
  const [prevExpense, setPrevExpense] = useState(0)
  const [upcoming,    setUpcoming]    = useState<Transaction[]>([])
  const [loadingExtras, setLoading]   = useState(true)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    const load = async () => {
      setLoading(true)

      // Previous month
      const prevM = currentMonth === 1 ? 12 : currentMonth - 1
      const prevY = currentMonth === 1 ? currentYear - 1 : currentYear
      const { data: prevData } = await supabase
        .from('transactions')
        .select('amount, type')
        .eq('user_id', user.id)
        .eq('month', prevM)
        .eq('year', prevY)

      if (!cancelled && prevData) {
        setPrevIncome (prevData.filter(t => t.type === 'income' ).reduce((s, t) => s + t.amount, 0))
        setPrevExpense(prevData.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0))
      }

      // Upcoming bills: next 60 days
      const today = new Date(); today.setHours(0,0,0,0)
      const future = new Date(today); future.setDate(today.getDate() + 60)
      const todayStr  = today.toISOString().split('T')[0]
      const futureStr = future.toISOString().split('T')[0]

      const { data: upData } = await supabase
        .from('transactions')
        .select('*, category:categories(*)')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .neq('status', 'paid')
        .gte('due_date', todayStr)
        .lte('due_date', futureStr)
        .order('due_date', { ascending: true })
        .limit(10)

      if (!cancelled && upData) {
        setUpcoming(upData.map(t => ({
          ...t,
          status: t.status !== 'paid' && t.due_date && isOverdue(t.due_date, t.status)
            ? 'overdue' as const : t.status,
        })))
      }

      if (!cancelled) setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [user, currentMonth, currentYear])

  return { prevIncome, prevExpense, upcoming, loadingExtras }
}
