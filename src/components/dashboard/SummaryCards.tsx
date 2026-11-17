import { TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { formatCurrency } from '../../lib/utils'

interface SummaryCardsProps {
  totalIncome: number
  totalExpense: number
  balance: number
}

export function SummaryCards({ totalIncome, totalExpense, balance }: SummaryCardsProps) {
  const isPositive = balance >= 0

  return (
    <div className="px-4 space-y-3">
      {/* Balance - main card */}
      <div className={`rounded-2xl p-5 ${isPositive ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
        <div className="flex items-center gap-2 mb-1">
          <Wallet size={16} className={isPositive ? 'text-green-400' : 'text-red-400'} />
          <span className="text-xs text-zinc-400 uppercase tracking-wide font-medium">Saldo do mês</span>
        </div>
        <p className={`text-3xl font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {formatCurrency(balance)}
        </p>
      </div>

      {/* Income + Expense */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp size={14} className="text-green-400" />
            <span className="text-[11px] text-zinc-500 uppercase tracking-wide font-medium">Receitas</span>
          </div>
          <p className="text-xl font-bold text-green-400">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingDown size={14} className="text-red-400" />
            <span className="text-[11px] text-zinc-500 uppercase tracking-wide font-medium">Gastos</span>
          </div>
          <p className="text-xl font-bold text-red-400">{formatCurrency(totalExpense)}</p>
        </div>
      </div>
    </div>
  )
}
