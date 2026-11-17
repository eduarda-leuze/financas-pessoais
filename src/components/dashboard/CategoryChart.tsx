import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '../../lib/utils'
import type { Category, Transaction } from '../../types'

interface CategoryChartProps {
  transactions: Transaction[]
  categories: Category[]
}

export function CategoryChart({ transactions, categories }: CategoryChartProps) {
  const expenseTransactions = transactions.filter(t => t.type === 'expense')

  const data = categories
    .filter(c => c.type === 'expense' && c.name !== 'Sem categoria')
    .map(cat => {
      const total = expenseTransactions
        .filter(t => t.category_id === cat.id)
        .reduce((sum, t) => sum + t.amount, 0)
      return { name: cat.name, value: total, color: cat.color }
    })
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value)

  if (data.length === 0) {
    return (
      <div className="mx-4 bg-[#1a1a1a] rounded-xl p-6 border border-[#2a2a2a] text-center">
        <p className="text-zinc-500 text-sm">Nenhum gasto registrado ainda</p>
      </div>
    )
  }

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: { color: string } }[] }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1f1f1f] border border-[#333] rounded-lg px-3 py-2 text-sm">
          <p className="text-white font-medium">{payload[0].name}</p>
          <p className="text-zinc-300">{formatCurrency(payload[0].value)}</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="mx-4 bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]">
      <h3 className="text-sm font-medium text-zinc-400 mb-3 uppercase tracking-wide">Gastos por categoria</h3>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      {/* Legend */}
      <div className="mt-2 space-y-1.5">
        {data.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-sm text-zinc-300">{entry.name}</span>
            </div>
            <span className="text-sm font-medium text-white">{formatCurrency(entry.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
