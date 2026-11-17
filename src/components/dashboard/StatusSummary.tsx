import { CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { formatCurrency } from '../../lib/utils'
import type { Transaction } from '../../types'

interface StatusSummaryProps {
  transactions: Transaction[]
}

export function StatusSummary({ transactions }: StatusSummaryProps) {
  const expenses = transactions.filter(t => t.type === 'expense')
  const paid = expenses.filter(t => t.status === 'paid')
  const pending = expenses.filter(t => t.status === 'pending')
  const overdue = expenses.filter(t => t.status === 'overdue')

  const sum = (arr: Transaction[]) => arr.reduce((s, t) => s + t.amount, 0)

  const items = [
    {
      label: 'Pagas',
      count: paid.length,
      amount: sum(paid),
      icon: CheckCircle,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
    },
    {
      label: 'Pendentes',
      count: pending.length,
      amount: sum(pending),
      icon: Clock,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
    },
    {
      label: 'Vencidas',
      count: overdue.length,
      amount: sum(overdue),
      icon: AlertCircle,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
    },
  ]

  return (
    <div className="mx-4 grid grid-cols-3 gap-2">
      {items.map(({ label, count, amount, icon: Icon, color, bg }) => (
        <div key={label} className={`${bg} rounded-xl p-3 border border-white/5`}>
          <Icon size={16} className={`${color} mb-1.5`} />
          <p className={`text-lg font-bold ${color}`}>{count}</p>
          <p className="text-[10px] text-zinc-500">{label}</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">{formatCurrency(amount)}</p>
        </div>
      ))}
    </div>
  )
}
