import { TrendingUp, TrendingDown } from 'lucide-react'
import { formatCurrency } from '../../lib/utils'

interface Props {
  balance: number
  income: number
  expense: number
}

export function SummaryCards({ balance, income, expense }: Props) {
  const isPositive = balance >= 0

  return (
    <div className="px-5 space-y-3">
      {/* Balance hero */}
      <div
        className="rounded-2xl p-5 border"
        style={{
          background: '#161616',
          borderColor: isPositive ? 'rgba(34,197,94,0.15)' : 'rgba(248,113,113,0.15)',
          boxShadow: isPositive
            ? '0 0 40px rgba(34,197,94,0.05)'
            : '0 0 40px rgba(248,113,113,0.05)',
        }}
      >
        <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest mb-2">Saldo do mês</p>
        <p className={`text-4xl font-bold tracking-tight ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {formatCurrency(balance)}
        </p>
        <div className="mt-4 pt-4 border-t border-[#252525] flex gap-4">
          <div className="flex-1 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
              <TrendingUp size={14} className="text-green-400" />
            </div>
            <div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-wide font-medium">Receitas</p>
              <p className="text-sm font-semibold text-green-400">{formatCurrency(income)}</p>
            </div>
          </div>
          <div className="w-px bg-[#252525]" />
          <div className="flex-1 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
              <TrendingDown size={14} className="text-red-400" />
            </div>
            <div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-wide font-medium">Gastos</p>
              <p className="text-sm font-semibold text-red-400">{formatCurrency(expense)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
