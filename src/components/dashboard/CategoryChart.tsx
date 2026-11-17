import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '../../lib/utils'
import type { Transaction, Category } from '../../types'

interface Props {
  transactions: Transaction[]
  categories: Category[]
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: { color: string } }[] }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1e1e1e] border border-[#333] rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-white font-semibold">{payload[0].name}</p>
      <p className="text-zinc-400 mt-0.5">{formatCurrency(payload[0].value)}</p>
    </div>
  )
}

export function CategoryChart({ transactions, categories }: Props) {
  const expenseTxs = transactions.filter(t => t.type === 'expense')
  const total = expenseTxs.reduce((s, t) => s + t.amount, 0)
  if (total === 0) return null

  const data = categories
    .filter(c => c.type === 'expense')
    .map(cat => ({
      name: cat.name,
      value: expenseTxs.filter(t => t.category_id === cat.id).reduce((s, t) => s + t.amount, 0),
      color: cat.color,
    }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value)

  if (!data.length) return null

  return (
    <div className="px-5 lg:px-0">
      <div className="bg-[#161616] rounded-2xl border border-[#252525] p-4 lg:p-5">
        {/* Mobile: compact horizontal layout */}
        <div className="flex items-center gap-4 lg:hidden">
          <div className="shrink-0">
            <ResponsiveContainer width={110} height={110}>
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={32} outerRadius={50} paddingAngle={3} dataKey="value" stroke="none">
                  {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2 min-w-0">
            {data.slice(0, 5).map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                <span className="text-xs text-zinc-400 truncate flex-1">{d.name}</span>
                <span className="text-xs font-semibold text-white shrink-0">{((d.value / total) * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop: bigger donut + full legend */}
        <div className="hidden lg:flex gap-6">
          <div className="shrink-0">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={52} outerRadius={80} paddingAngle={3} dataKey="value" stroke="none">
                  {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-3 content-center">
            {data.map((d, i) => (
              <div key={i} className="flex items-center gap-2 min-w-0">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-400 truncate">{d.name}</p>
                  <p className="text-xs font-semibold text-white">{formatCurrency(d.value)}</p>
                </div>
                <span className="text-[11px] text-zinc-500 shrink-0">{((d.value / total) * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
