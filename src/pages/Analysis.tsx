import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useApp } from '../context/AppContext'
import { PageHeader } from '../components/layout/PageHeader'
import { formatCurrency, formatMonthShort } from '../lib/utils'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useEffect, useState } from 'react'
import type { Transaction } from '../types'

interface MonthData {
  month: number
  year: number
  label: string
  income: number
  expense: number
  balance: number
}

export function Analysis() {
  const { transactions, categories, currentYear } = useApp()
  const { user } = useAuth()
  const [yearData, setYearData] = useState<MonthData[]>([])
  const [loadingYear, setLoadingYear] = useState(true)

  useEffect(() => {
    if (!user) return
    setLoadingYear(true)

    supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .eq('year', currentYear)
      .then(({ data }) => {
        const months = Array.from({ length: 12 }, (_, i) => {
          const m = i + 1
          const monthTxs = (data || []).filter((t: Transaction) => t.month === m)
          return {
            month: m,
            year: currentYear,
            label: formatMonthShort(m),
            income: monthTxs.filter((t: Transaction) => t.type === 'income').reduce((s: number, t: Transaction) => s + t.amount, 0),
            expense: monthTxs.filter((t: Transaction) => t.type === 'expense').reduce((s: number, t: Transaction) => s + t.amount, 0),
            balance: 0,
          }
        }).map(m => ({ ...m, balance: m.income - m.expense }))
        setYearData(months)
        setLoadingYear(false)
      })
  }, [user, currentYear])

  // Category breakdown current month
  const expenseTxs = transactions.filter(t => t.type === 'expense')
  const totalExpense = expenseTxs.reduce((s, t) => s + t.amount, 0)
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)

  const categoryData = categories
    .filter(c => c.type === 'expense' && c.name !== 'Sem categoria')
    .map(cat => ({
      name: cat.name,
      amount: expenseTxs.filter(t => t.category_id === cat.id).reduce((s, t) => s + t.amount, 0),
      color: cat.color,
      pct: totalIncome > 0
        ? ((expenseTxs.filter(t => t.category_id === cat.id).reduce((s, t) => s + t.amount, 0)) / totalIncome * 100)
        : 0,
    }))
    .filter(d => d.amount > 0)
    .sort((a, b) => b.amount - a.amount)

  const CustomTooltipYear = ({ active, payload, label }: { active?: boolean; payload?: { value: number; dataKey: string }[]; label?: string }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-[#1f1f1f] border border-[#333] rounded-lg px-3 py-2 text-xs space-y-1">
        <p className="text-white font-medium">{label}</p>
        {payload.map(p => (
          <p key={p.dataKey} className={p.dataKey === 'income' ? 'text-green-400' : 'text-red-400'}>
            {p.dataKey === 'income' ? 'Receita' : 'Gasto'}: {formatCurrency(p.value)}
          </p>
        ))}
      </div>
    )
  }

  return (
    <div className="pb-4">
      <PageHeader title="Análise Financeira" />

      {/* Annual overview */}
      <div className="mx-4 mb-4 bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]">
        <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-3">Visão anual {currentYear}</h3>
        {loadingYear ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={yearData} barSize={8} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<CustomTooltipYear />} cursor={{ fill: '#1f1f1f' }} />
              <Bar dataKey="income" fill="#22c55e" radius={[3, 3, 0, 0]} />
              <Bar dataKey="expense" fill="#ef4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* Annual table */}
        {!loadingYear && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-zinc-600">
                  <th className="text-left pb-1.5">Mês</th>
                  <th className="text-right pb-1.5">Receita</th>
                  <th className="text-right pb-1.5">Gasto</th>
                  <th className="text-right pb-1.5">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {yearData.filter(m => m.income > 0 || m.expense > 0).map(m => (
                  <tr key={m.month} className="border-t border-[#222]">
                    <td className="py-1.5 text-zinc-400">{m.label}</td>
                    <td className="py-1.5 text-right text-green-400">{formatCurrency(m.income)}</td>
                    <td className="py-1.5 text-right text-red-400">{formatCurrency(m.expense)}</td>
                    <td className={`py-1.5 text-right font-medium ${m.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(m.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Category breakdown */}
      {categoryData.length > 0 && (
        <div className="mx-4 bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]">
          <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-3">Composição dos gastos</h3>
          <div className="space-y-3">
            {categoryData.map(cat => (
              <div key={cat.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-zinc-300 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                    {cat.name}
                  </span>
                  <div className="text-right">
                    <span className="text-white font-medium">{formatCurrency(cat.amount)}</span>
                    {totalIncome > 0 && (
                      <span className={`ml-2 text-xs ${cat.pct >= 30 ? 'text-red-400' : 'text-zinc-500'}`}>
                        {cat.pct.toFixed(0)}% da receita
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-1.5 bg-[#222] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${totalExpense > 0 ? Math.min((cat.amount / totalExpense) * 100, 100) : 0}%`,
                      backgroundColor: cat.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
