import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { PageHeader } from '../components/layout/PageHeader'
import { TransactionItem } from '../components/transactions/TransactionItem'
import { TransactionModal } from '../components/transactions/TransactionModal'
import { formatCurrency } from '../lib/utils'
import type { TransactionStatus, TransactionType } from '../types'

export function Transactions() {
  const { transactions, loading } = useApp()
  const [showModal, setShowModal] = useState(false)
  const [filterStatus, setFilterStatus] = useState<TransactionStatus | 'all'>('all')
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all')

  const filtered = transactions.filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
    if (filterType !== 'all' && t.type !== filterType) return false
    return true
  })

  // Group by category
  const grouped = filtered.reduce<Record<string, typeof filtered>>((acc, t) => {
    const key = t.category?.name || 'Sem categoria'
    if (!acc[key]) acc[key] = []
    acc[key].push(t)
    return acc
  }, {})

  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)

  return (
    <div>
      <PageHeader showMonthNav />

      {/* Filters */}
      <div className="px-4 pb-3 space-y-2">
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {(['all', 'pending', 'paid', 'overdue'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                filterStatus === s
                  ? 'bg-green-500/20 border-green-500/30 text-green-400'
                  : 'bg-[#1a1a1a] border-[#2a2a2a] text-zinc-500 hover:text-white'
              }`}
            >
              {s === 'all' ? 'Todos' : s === 'pending' ? 'Pendentes' : s === 'paid' ? 'Pagos' : 'Vencidos'}
            </button>
          ))}
          <div className="w-px bg-[#2a2a2a] shrink-0 mx-1" />
          {(['all', 'expense', 'income'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                filterType === t
                  ? 'bg-green-500/20 border-green-500/30 text-green-400'
                  : 'bg-[#1a1a1a] border-[#2a2a2a] text-zinc-500 hover:text-white'
              }`}
            >
              {t === 'all' ? 'Todos' : t === 'expense' ? 'Gastos' : 'Receitas'}
            </button>
          ))}
        </div>

        {/* Summary row */}
        <div className="flex gap-3 text-xs text-zinc-500">
          <span>{filtered.length} transações</span>
          {totalExpense > 0 && <span className="text-red-400">- {formatCurrency(totalExpense)}</span>}
          {totalIncome > 0 && <span className="text-green-400">+ {formatCurrency(totalIncome)}</span>}
        </div>
      </div>

      {/* Add button */}
      <div className="px-4 mb-3">
        <button
          onClick={() => setShowModal(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-sm font-medium text-zinc-300 hover:border-zinc-500"
        >
          <Plus size={16} className="text-green-400" />
          Novo lançamento
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-zinc-600">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-sm">Nenhuma transação encontrada</p>
        </div>
      ) : (
        <div className="px-4 space-y-5">
          {Object.entries(grouped).map(([catName, items]) => {
            const catTotal = items.reduce((s, t) => s + (t.type === 'expense' ? -t.amount : t.amount), 0)
            const catColor = items[0]?.category?.color || '#666'
            return (
              <div key={catName}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: catColor }} />
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">{catName}</span>
                  </div>
                  <span className={`text-xs font-semibold ${catTotal >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {catTotal >= 0 ? '+' : ''}{formatCurrency(catTotal)}
                  </span>
                </div>
                <div className="space-y-2">
                  {items.map(t => <TransactionItem key={t.id} transaction={t} />)}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && <TransactionModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
