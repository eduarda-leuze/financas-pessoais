import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { useApp } from '../context/AppContext'
import { PageHeader } from '../components/layout/PageHeader'
import { formatCurrency, formatMonthShort } from '../lib/utils'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
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
  const { transactions, categories, currentMonth, currentYear } = useApp()
  const { user } = useAuth()
  const [yearData, setYearData] = useState<MonthData[]>([])
  const [loadingYear, setLoadingYear] = useState(true)
  const [expandedCat, setExpandedCat] = useState<string | null>(null)

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
            income:  monthTxs.filter((t: Transaction) => t.type === 'income').reduce((s: number, t: Transaction) => s + t.amount, 0),
            expense: monthTxs.filter((t: Transaction) => t.type === 'expense').reduce((s: number, t: Transaction) => s + t.amount, 0),
            balance: 0,
          }
        }).map(m => ({ ...m, balance: m.income - m.expense }))
        setYearData(months)
        setLoadingYear(false)
      })
  }, [user, currentYear])

  const expenseTxs   = transactions.filter(t => t.type === 'expense')
  const totalExpense = expenseTxs.reduce((s, t) => s + t.amount, 0)
  const totalIncome  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)

  const categoryData = categories
    .map(cat => {
      const catTxs = expenseTxs.filter(t => t.category_id === cat.id)
      return {
        id:     cat.id,
        name:   cat.name,
        icon:   cat.icon,
        color:  cat.color,
        amount: catTxs.reduce((s, t) => s + t.amount, 0),
        txs:    catTxs,
        pct:    totalExpense > 0 ? (catTxs.reduce((s, t) => s + t.amount, 0) / totalExpense * 100) : 0,
      }
    })
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

  // month label for section header
  const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                      'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  const monthLabel = `${monthNames[currentMonth - 1]} ${currentYear}`

  return (
    <div className="pb-4">
      <PageHeader title="Análise" showMonthNav />

      {/* ── CATEGORY DONUT CHART ─────────────────────────────────────────── */}
      {categoryData.length > 0 && (
        <div className="mx-4 mb-4 bg-[#1a1a1a] rounded-2xl p-4 border border-[#2a2a2a]">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-4">
            Gastos por categoria — {monthLabel}
          </h3>

          {/* Donut */}
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <PieChart width={130} height={130}>
                <Pie
                  data={categoryData}
                  cx={60}
                  cy={60}
                  innerRadius={40}
                  outerRadius={60}
                  paddingAngle={2}
                  dataKey="amount"
                  strokeWidth={0}
                >
                  {categoryData.map(c => (
                    <Cell key={c.id} fill={c.color} opacity={expandedCat && expandedCat !== c.id ? 0.3 : 1} />
                  ))}
                </Pie>
              </PieChart>
              {/* Center total */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-[9px] text-zinc-500 leading-none">total</p>
                <p className="text-[11px] font-bold text-white mt-0.5">{formatCurrency(totalExpense)}</p>
              </div>
            </div>

            {/* Legend */}
            <div className="flex-1 space-y-1.5 min-w-0">
              {categoryData.slice(0, 5).map(c => (
                <div key={c.id} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                  <span className="text-xs text-zinc-400 truncate flex-1">{c.icon} {c.name}</span>
                  <span className="text-xs font-semibold text-white shrink-0">{c.pct.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Category bars + expandable transactions */}
          <div className="mt-4 space-y-1">
            {categoryData.map(cat => (
              <div key={cat.id}>
                <button
                  className="w-full"
                  onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}
                >
                  <div className="flex items-center gap-2 py-1.5">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="text-xs text-zinc-300 flex-1 text-left truncate">{cat.icon} {cat.name}</span>
                    <span className="text-xs font-bold text-white shrink-0">{formatCurrency(cat.amount)}</span>
                    {totalIncome > 0 && (
                      <span className={`text-[10px] shrink-0 w-9 text-right ${cat.amount / totalIncome >= 0.3 ? 'text-red-400' : 'text-zinc-600'}`}>
                        {(cat.amount / totalIncome * 100).toFixed(0)}%
                      </span>
                    )}
                    {expandedCat === cat.id
                      ? <ChevronUp size={12} className="text-zinc-600 shrink-0" />
                      : <ChevronDown size={12} className="text-zinc-600 shrink-0" />}
                  </div>
                  {/* Bar */}
                  <div className="h-1 bg-[#222] rounded-full overflow-hidden mb-0.5">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${totalExpense > 0 ? Math.min((cat.amount / totalExpense) * 100, 100) : 0}%`,
                        backgroundColor: cat.color,
                        opacity: expandedCat && expandedCat !== cat.id ? 0.3 : 1,
                      }}
                    />
                  </div>
                </button>

                {/* Expandable: individual transactions */}
                {expandedCat === cat.id && (
                  <div className="mt-1 mb-2 ml-4 border-l-2 pl-3 space-y-1" style={{ borderColor: cat.color + '40' }}>
                    {cat.txs.sort((a, b) => b.amount - a.amount).map(tx => (
                      <div key={tx.id} className="flex items-center gap-2 py-0.5">
                        <span className="text-xs text-zinc-500 flex-1 truncate">{tx.description}</span>
                        <span className="text-xs font-medium text-zinc-300 shrink-0">{formatCurrency(tx.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {categoryData.length === 0 && (
        <div className="mx-4 mb-4 bg-[#1a1a1a] rounded-2xl p-8 border border-[#2a2a2a] text-center">
          <p className="text-2xl mb-2">📊</p>
          <p className="text-sm text-zinc-500">Nenhum gasto registrado em {monthLabel}</p>
        </div>
      )}

      {/* ── ANNUAL BAR CHART ─────────────────────────────────────────────── */}
      <div className="mx-4 mb-4 bg-[#1a1a1a] rounded-2xl p-4 border border-[#2a2a2a]">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Visão anual {currentYear}</h3>
        {loadingYear ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={yearData} barSize={8} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<CustomTooltipYear />} cursor={{ fill: '#1f1f1f' }} />
                <Bar dataKey="income"  fill="#22c55e" radius={[3, 3, 0, 0]} />
                <Bar dataKey="expense" fill="#ef4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

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
          </>
        )}
      </div>
    </div>
  )
}
