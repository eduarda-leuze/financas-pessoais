import { AlertTriangle, CheckCircle2, Info, TrendingDown } from 'lucide-react'
import { formatCurrency } from '../../lib/utils'
import type { Transaction, Category } from '../../types'

interface Props {
  transactions: Transaction[]
  categories: Category[]
}

interface Insight {
  type: 'success' | 'warning' | 'danger' | 'info'
  title: string
  body: string
}

function generateInsights(transactions: Transaction[], categories: Category[]): Insight[] {
  const insights: Insight[] = []
  const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const balance = income - expense

  if (income === 0 && expense === 0) return []

  if (balance < 0) {
    insights.push({ type: 'danger', title: 'Saldo negativo', body: `Você gastou ${formatCurrency(Math.abs(balance))} a mais do que recebeu.` })
  }

  if (income > 0) {
    const rate = ((balance / income) * 100)
    if (rate >= 20) insights.push({ type: 'success', title: `Taxa de poupança: ${rate.toFixed(0)}%`, body: 'Parabéns! Você está poupando bem este mês.' })
    else if (rate >= 0) insights.push({ type: 'warning', title: `Taxa de poupança: ${rate.toFixed(0)}%`, body: 'Tente poupar ao menos 20% da sua renda.' })

    for (const cat of categories.filter(c => c.type === 'expense')) {
      const catExp = transactions.filter(t => t.category_id === cat.id && t.type === 'expense').reduce((s, t) => s + t.amount, 0)
      const pct = (catExp / income) * 100
      if (pct >= 30) {
        insights.push({ type: 'warning', title: `${cat.name}: ${pct.toFixed(0)}% da renda`, body: `Você está gastando ${formatCurrency(catExp)} em ${cat.name}.` })
      }
    }
  }

  const biggest = transactions.filter(t => t.type === 'expense').sort((a, b) => b.amount - a.amount)[0]
  if (biggest) {
    insights.push({ type: 'info', title: 'Maior gasto', body: `${biggest.description}: ${formatCurrency(biggest.amount)}` })
  }

  return insights.slice(0, 4)
}

const icons = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: TrendingDown,
  info: Info,
}

const colors = {
  success: { text: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.15)' },
  warning: { text: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.15)' },
  danger:  { text: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.15)' },
  info:    { text: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.15)' },
}

export function InsightsPanel({ transactions, categories }: Props) {
  const insights = generateInsights(transactions, categories)
  if (!insights.length) return null

  return (
    <div className="px-5">
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">Análise do mês</p>
      <div className="space-y-2.5">
        {insights.map((ins, i) => {
          const Icon = icons[ins.type]
          const c = colors[ins.type]
          return (
            <div key={i} className="flex gap-3 p-3.5 rounded-2xl border" style={{ background: c.bg, borderColor: c.border }}>
              <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0" style={{ background: c.border }}>
                <Icon size={14} style={{ color: c.text }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: c.text }}>{ins.title}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{ins.body}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
