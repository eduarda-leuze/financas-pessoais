import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { PageHeader } from '../components/layout/PageHeader'
import { TransactionItem } from '../components/transactions/TransactionItem'
import { TransactionModal } from '../components/transactions/TransactionModal'
import { formatCurrency } from '../lib/utils'
import type { TransactionStatus, TransactionType } from '../types'

function fmtDayLabel(dateStr: string | undefined | null): string {
  if (!dateStr) return 'Sem data'
  const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'))
  const today = new Date(); today.setHours(0,0,0,0)
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
  if (d >= today) return 'Hoje'
  if (d >= yesterday) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined })
}

function sortKey(t: { created_at?: string; due_date?: string }) {
  return t.created_at || t.due_date || '0'
}

export function Transactions() {
  const { transactions, loading } = useApp()
  const [showModal, setShowModal] = useState(false)
  const [filterStatus, setFilterStatus] = useState<TransactionStatus | 'all'>('all')
  const [filterType, setFilterType] = useState<TransactionType | 'all' | 'savings'>('all')

  const filtered = transactions
    .filter(t => {
      if (filterStatus !== 'all' && t.status !== filterStatus) return false
      if (filterType === 'savings') return t.category?.type === 'savings'
      if (filterType === 'expense') return t.type === 'expense' && t.category?.type !== 'savings'
      if (filterType === 'income') return t.type === 'income'
      return true
    })
    .sort((a, b) => sortKey(b).localeCompare(sortKey(a)))

  // group by calendar day, most recent first
  const grouped = filtered.reduce<{ label: string; dateKey: string; items: typeof filtered }[]>((acc, t) => {
    const raw = t.created_at || t.due_date || ''
    const dateKey = raw.slice(0, 10) // YYYY-MM-DD
    const existing = acc.find(g => g.dateKey === dateKey)
    if (existing) {
      existing.items.push(t)
    } else {
      acc.push({ label: fmtDayLabel(raw), dateKey, items: [t] })
    }
    return acc
  }, [])

  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const totalIncome  = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)

  const statusFilters = [
    { v: 'all' as const,     label: 'Todos'     },
    { v: 'pending' as const, label: 'Pendentes' },
    { v: 'paid' as const,    label: 'Pagos'     },
    { v: 'overdue' as const, label: 'Vencidos'  },
  ]

  const typeFilters = [
    { v: 'all' as const,      label: 'Todos'    },
    { v: 'expense' as const,  label: 'Gastos'   },
    { v: 'savings' as const,  label: 'Poupança' },
    { v: 'income' as const,   label: 'Receitas' },
  ]

  return (
    <div>
      <PageHeader showMonthNav />

      <div className="px-5 pb-4 space-y-3">
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
        <div className="px-5 space-y-5 pb-24">
          {grouped.map(group => (
            <div key={group.dateKey}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">{group.label}</span>
                <div className="flex-1 h-px bg-[#1f1f1f]" />
                <span className="text-[10px] text-zinc-700">
                  {formatCurrency(
                    group.items.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0)
                  )}
                </span>
              </div>
              <div className="space-y-2">
                {group.items.map(t => <TransactionItem key={t.id} transaction={t} />)}
              </div>
            </div>
          ))}
        </div>
      )}

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
