import { formatCurrency } from '../../lib/utils'
import type { Transaction } from '../../types'

interface Props { transactions: Transaction[] }

export function StatusSummary({ transactions }: Props) {
  const paid    = transactions.filter(t => t.status === 'paid')
  const pending = transactions.filter(t => t.status === 'pending')
  const overdue = transactions.filter(t => t.status === 'overdue')

  const sum = (arr: Transaction[]) => arr.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  const items = [
    { label: 'Pagas',    count: paid.length,    amount: sum(paid),    color: '#22c55e', bg: 'rgba(34,197,94,0.08)',   dot: '#22c55e' },
    { label: 'Pendentes',count: pending.length,  amount: sum(pending), color: '#fbbf24', bg: 'rgba(251,191,36,0.08)',  dot: '#fbbf24' },
    { label: 'Vencidas', count: overdue.length,  amount: sum(overdue), color: '#f87171', bg: 'rgba(248,113,113,0.08)', dot: '#f87171' },
  ]

  return (
    <div className="px-5">
      <div className="grid grid-cols-3 gap-2.5">
        {items.map(item => (
          <div
            key={item.label}
            className="rounded-2xl p-3.5 border border-[#252525]"
            style={{ background: item.bg }}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: item.color }} />
              <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: item.color }}>
                {item.label}
              </span>
            </div>
            <p className="text-xl font-bold text-white">{item.count}</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">{formatCurrency(item.amount)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
