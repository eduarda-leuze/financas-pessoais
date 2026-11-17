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

  const grouped = filtered.reduce<Record<string, typeof filtered>>((acc, t) => {
    const key = t.category?.name || 'Sem categoria'
    if (!acc[key]) acc[key] = []
    acc[key].push(t)
    return acc
  }, {})

  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const totalIncome  = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)

  const statusFilters = [
    { v: 'all' as const,     label: 'Todos'     },
    { v: 'pending' as const, label: 'Pendentes' },
    { v: 'paid' as const,    label: 'Pagos'     },
    { v: 'overdue' as const, label: 'Vencidos'  },
  ]

  const typeFilters = [
    { v: 'all' as const,     label: 'Todos'    },
    { v: 'expense' as const, label: 'Gastos'   },
    { v: 'income' as const,  label: 'Receitas' },
  ]

  return (
    <div>
      <PageHeader showMonthNav />

      <div className="px-5 pb-4 space-y-3">
        {/* Filters */}
        <div className="space-y-2">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {statusFilters.map(f => (
              <button
                key={f.v}
                onClick={() => setFilterStatus(f.v)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all border ${
                  filterStatus === f.v
                    ? 'bg-green-500/15 border-green-500/25 text-green-400'
                    : 'bg-[#161616] border-[#252525] text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {f.label}
              </button>
            ))}
            <div className="w-px bg-[#252525] shrink-0 mx-0.5" />
            {typeFilters.map(f => (
              <button
                key={f.v}
                onClick={() => setFilterType(f.v)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all border ${
                  filterType === f.v
                    ? 'bg-green-500/15 border-green-500/25 text-green-400'
                    : 'bg-[#161616] border-[#252525] text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-600">{filtered.length} lançamentos</span>
            <div className="flex gap-3 text-xs">
              {totalExpense > 0 && <span className="text-red-400">- {formatCurrency(totalExpense)}</span>}
              {totalIncome  > 0 && <span className="text-green-400">+ {formatCurrency(totalIncome)}</span>}
            </div>
          </div>
        </div>

      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-5 h-5 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-14">
          <p className="text-3xl mb-3">📭</p>
          <p className="text-sm text-zinc-600">Nenhum lançamento encontrado</p>
        </div>
      ) : (
        <div className="px-5 space-y-5">
          {Object.entries(grouped).map(([catName, items]) => {
            const catTotal = items.reduce((s, t) => s + (t.type === 'expense' ? -t.amount : t.amount), 0)
            const catColor = items[0]?.category?.color || '#555'
            return (
              <div key={catName}>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: catColor }} />
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">{catName}</span>
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

      {/* FAB */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-24 right-5 z-30 w-14 h-14 rounded-2xl bg-green-500 shadow-lg shadow-green-500/20 flex items-center justify-center active:scale-95 transition-transform lg:bottom-6"
      >
        <Plus size={22} className="text-black" strokeWidth={2.5} />
      </button>

      {showModal && <TransactionModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
