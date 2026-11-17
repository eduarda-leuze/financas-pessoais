import { TrendingDown, AlertTriangle, CheckCircle, Info } from 'lucide-react'
import { formatCurrency } from '../../lib/utils'
import type { Category, Transaction, FinancialInsight } from '../../types'

interface InsightsPanelProps {
  transactions: Transaction[]
  categories: Category[]
  totalIncome: number
  totalExpense: number
}

function generateInsights(
  transactions: Transaction[],
  categories: Category[],
  totalIncome: number,
  totalExpense: number,
): FinancialInsight[] {
  const insights: FinancialInsight[] = []
  if (totalIncome === 0 && totalExpense === 0) return insights

  const balance = totalIncome - totalExpense

  // Saldo negativo
  if (balance < 0) {
    insights.push({
      type: 'danger',
      message: `Suas despesas superaram sua receita em ${formatCurrency(Math.abs(balance))}`,
      value: balance,
    })
  }

  // Taxa de poupança
  if (totalIncome > 0) {
    const savingsRate = ((totalIncome - totalExpense) / totalIncome) * 100
    if (savingsRate >= 20) {
      insights.push({
        type: 'success',
        message: `Você poupou ${savingsRate.toFixed(0)}% da sua renda este mês`,
        value: savingsRate,
      })
    } else if (savingsRate > 0) {
      insights.push({
        type: 'warning',
        message: `Você poupou apenas ${savingsRate.toFixed(0)}% da sua renda (meta: 20%)`,
        value: savingsRate,
      })
    }
  }

  // % por categoria
  const expenseTransactions = transactions.filter(t => t.type === 'expense')
  const expenseCategories = categories.filter(c => c.type === 'expense' && c.name !== 'Sem categoria')

  for (const cat of expenseCategories) {
    const catTotal = expenseTransactions
      .filter(t => t.category_id === cat.id)
      .reduce((s, t) => s + t.amount, 0)

    if (catTotal === 0 || totalIncome === 0) continue

    const pct = (catTotal / totalIncome) * 100
    if (pct >= 30) {
      insights.push({
        type: 'warning',
        message: `Você gastou ${pct.toFixed(0)}% da sua receita em ${cat.name} (${formatCurrency(catTotal)})`,
        value: pct,
      })
    } else if (pct >= 5) {
      insights.push({
        type: 'info',
        message: `${pct.toFixed(0)}% da receita em ${cat.name} — ${formatCurrency(catTotal)}`,
        value: pct,
      })
    }
  }

  // Maior despesa
  if (expenseTransactions.length > 0) {
    const biggest = expenseTransactions.reduce((a, b) => a.amount > b.amount ? a : b)
    insights.push({
      type: 'info',
      message: `Maior despesa: ${biggest.description} — ${formatCurrency(biggest.amount)}`,
    })
  }

  return insights.slice(0, 5)
}

const iconMap = {
  success: CheckCircle,
  warning: AlertTriangle,
  danger: TrendingDown,
  info: Info,
}

const colorMap = {
  success: 'text-green-400 bg-green-500/10 border-green-500/20',
  warning: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  danger: 'text-red-400 bg-red-500/10 border-red-500/20',
  info: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
}

export function InsightsPanel({ transactions, categories, totalIncome, totalExpense }: InsightsPanelProps) {
  const insights = generateInsights(transactions, categories, totalIncome, totalExpense)

  if (insights.length === 0) {
    return (
      <div className="mx-4 bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]">
        <h3 className="text-sm font-medium text-zinc-400 mb-2 uppercase tracking-wide">Análise do mês</h3>
        <p className="text-zinc-500 text-sm">Lance suas transações para ver insights.</p>
      </div>
    )
  }

  return (
    <div className="mx-4 bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] space-y-2">
      <h3 className="text-sm font-medium text-zinc-400 mb-3 uppercase tracking-wide">Análise do mês</h3>
      {insights.map((insight, i) => {
        const Icon = iconMap[insight.type]
        const colors = colorMap[insight.type]
        return (
          <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${colors}`}>
            <Icon size={15} className="mt-0.5 shrink-0" />
            <p className="text-sm leading-snug">{insight.message}</p>
          </div>
        )
      })}
    </div>
  )
}
