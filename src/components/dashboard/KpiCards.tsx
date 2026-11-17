import { TrendingUp, TrendingDown, Minus, DollarSign, ArrowUpCircle, ArrowDownCircle, PiggyBank } from 'lucide-react'
import { formatCurrency } from '../../lib/utils'

interface KpiCardsProps {
  income:      number
  expense:     number
  balance:     number
  prevIncome:  number
  prevExpense: number
}

function pct(curr: number, prev: number): number | null {
  if (prev === 0) return null
  return ((curr - prev) / prev) * 100
}

function Delta({ curr, prev, inverse = false }: { curr: number; prev: number; inverse?: boolean }) {
  const p = pct(curr, prev)
  if (p === null) return <span className="text-[11px] text-zinc-600">sem histórico</span>
  const up = p >= 0
  const good = inverse ? !up : up
  const color = good ? 'text-green-400' : 'text-red-400'
  const Icon = p === 0 ? Minus : up ? TrendingUp : TrendingDown
  return (
    <span className={`flex items-center gap-1 text-[11px] font-medium ${color}`}>
      <Icon size={11} />
      {p === 0 ? 'igual' : `${Math.abs(p).toFixed(1)}% vs mês ant.`}
    </span>
  )
}

interface CardProps {
  label: string
  value: number
  icon: React.ReactNode
  iconBg: string
  valueColor?: string
  delta?: React.ReactNode
  sub?: string
}

function Card({ label, value, icon, iconBg, valueColor = 'text-white', delta, sub }: CardProps) {
  return (
    <div className="bg-[#161616] border border-[#252525] rounded-2xl p-5 flex flex-col gap-3 hover:border-[#303030] transition-colors">
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{label}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
      </div>
      <div>
        <p className={`text-2xl font-bold leading-tight ${valueColor}`}>{formatCurrency(value)}</p>
        {sub && <p className="text-xs text-zinc-600 mt-0.5">{sub}</p>}
      </div>
      {delta && <div>{delta}</div>}
    </div>
  )
}

export function KpiCards({ income, expense, balance, prevIncome, prevExpense }: KpiCardsProps) {
  const saved    = Math.max(0, income - expense)
  const savePct  = income > 0 ? (saved / income) * 100 : 0
  const prevBal  = prevIncome - prevExpense

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      <Card
        label="Saldo do mês"
        value={balance}
        icon={<DollarSign size={17} className="text-green-400" />}
        iconBg="bg-green-500/10"
        valueColor={balance >= 0 ? 'text-green-400' : 'text-red-400'}
        delta={<Delta curr={balance} prev={prevBal} />}
      />
      <Card
        label="Receitas"
        value={income}
        icon={<ArrowUpCircle size={17} className="text-green-400" />}
        iconBg="bg-green-500/10"
        valueColor="text-green-400"
        delta={<Delta curr={income} prev={prevIncome} />}
      />
      <Card
        label="Gastos"
        value={expense}
        icon={<ArrowDownCircle size={17} className="text-red-400" />}
        iconBg="bg-red-500/10"
        valueColor="text-red-400"
        delta={<Delta curr={expense} prev={prevExpense} inverse />}
      />
      <Card
        label="Poupado"
        value={saved}
        icon={<PiggyBank size={17} className="text-amber-400" />}
        iconBg="bg-amber-500/10"
        valueColor={saved > 0 ? 'text-amber-400' : 'text-zinc-500'}
        sub={income > 0 ? `${savePct.toFixed(0)}% da receita` : undefined}
        delta={
          prevIncome > 0 ? (
            <Delta curr={saved} prev={Math.max(0, prevIncome - prevExpense)} />
          ) : undefined
        }
      />
    </div>
  )
}
