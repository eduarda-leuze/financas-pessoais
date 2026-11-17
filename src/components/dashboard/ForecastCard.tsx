import { TrendingUp, TrendingDown, Zap } from 'lucide-react'
import { formatCurrency } from '../../lib/utils'

interface Props {
  income:      number
  expense:     number
  prevIncome:  number
  prevExpense: number
  currentMonth: number
  currentYear:  number
}

export function ForecastCard({ income, expense, prevIncome, prevExpense, currentMonth, currentYear }: Props) {
  const today    = new Date()
  const isCurrentMonth = today.getMonth() + 1 === currentMonth && today.getFullYear() === currentYear
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate()
  const daysPassed  = isCurrentMonth ? today.getDate() : daysInMonth
  const daysLeft    = isCurrentMonth ? daysInMonth - daysPassed : 0

  const dailyRate      = daysPassed > 0 ? expense / daysPassed : 0
  const projected      = isCurrentMonth ? expense + dailyRate * daysLeft : expense
  const projectedSave  = income > 0 ? income - projected : null
  const prevBalance    = prevIncome - prevExpense
  const currBalance    = income - expense
  const balanceDelta   = prevBalance !== 0 ? ((currBalance - prevBalance) / Math.abs(prevBalance)) * 100 : null
  const monthPct       = (daysPassed / daysInMonth) * 100

  const spendRatio = income > 0 ? (expense / income) * 100 : null

  return (
    <div className="bg-[#161616] border border-[#252525] rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
          <Zap size={14} className="text-amber-400" />
        </div>
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Visão do mês</p>
      </div>

      <div className="space-y-4">
        {/* Month progress */}
        {isCurrentMonth && (
          <div>
            <div className="flex justify-between text-[11px] text-zinc-600 mb-1.5">
              <span>Progresso do mês</span>
              <span>{daysPassed}/{daysInMonth} dias ({monthPct.toFixed(0)}%)</span>
            </div>
            <div className="h-1.5 bg-[#252525] rounded-full overflow-hidden">
              <div className="h-full bg-zinc-500 rounded-full transition-all" style={{ width: `${monthPct}%` }} />
            </div>
          </div>
        )}

        {/* Daily rate */}
        {isCurrentMonth && daysPassed > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-zinc-500">Ritmo de gastos</span>
            <span className="text-sm font-semibold text-white">{formatCurrency(dailyRate)}<span className="text-xs text-zinc-600 font-normal">/dia</span></span>
          </div>
        )}

        {/* Projected end of month */}
        {isCurrentMonth && daysLeft > 0 && (
          <div className="flex justify-between items-center border-t border-[#1f1f1f] pt-3">
            <span className="text-xs text-zinc-500">Projeção ao fim do mês</span>
            <div className="text-right">
              <p className="text-sm font-semibold text-white">{formatCurrency(projected)}</p>
              {projectedSave !== null && (
                <p className={`text-[11px] ${projectedSave >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {projectedSave >= 0 ? 'sobra ' : 'falta '}{formatCurrency(Math.abs(projectedSave))}
                </p>
              )}
            </div>
          </div>
        )}

        {/* % of income spent */}
        {spendRatio !== null && (
          <div>
            <div className="flex justify-between text-[11px] mb-1.5">
              <span className="text-zinc-500">Gastos vs receita</span>
              <span className={spendRatio > 90 ? 'text-red-400' : spendRatio > 70 ? 'text-amber-400' : 'text-green-400'}>
                {spendRatio.toFixed(0)}%
              </span>
            </div>
            <div className="h-1.5 bg-[#252525] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  spendRatio > 90 ? 'bg-red-400' : spendRatio > 70 ? 'bg-amber-400' : 'bg-green-400'
                }`}
                style={{ width: `${Math.min(100, spendRatio)}%` }}
              />
            </div>
          </div>
        )}

        {/* vs last month */}
        {balanceDelta !== null && (
          <div className="flex justify-between items-center border-t border-[#1f1f1f] pt-3">
            <span className="text-xs text-zinc-500">Saldo vs mês anterior</span>
            <span className={`flex items-center gap-1 text-sm font-semibold ${balanceDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {balanceDelta >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              {balanceDelta > 0 ? '+' : ''}{balanceDelta.toFixed(1)}%
            </span>
          </div>
        )}

        {prevIncome > 0 && (
          <div className="bg-[#1a1a1a] rounded-xl px-3 py-2.5 border border-[#252525] grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
            <span className="text-zinc-600">Mês anterior</span>
            <span className="text-zinc-600 text-right">Este mês</span>
            <span className="text-zinc-400">{formatCurrency(prevExpense)}</span>
            <span className="text-white font-medium text-right">{formatCurrency(expense)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
