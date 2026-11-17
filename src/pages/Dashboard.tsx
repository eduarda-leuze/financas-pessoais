import { useState } from 'react'
import { Plus, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { PageHeader } from '../components/layout/PageHeader'
import { SummaryCards } from '../components/dashboard/SummaryCards'
import { StatusSummary } from '../components/dashboard/StatusSummary'
import { CategoryChart } from '../components/dashboard/CategoryChart'
import { InsightsPanel } from '../components/dashboard/InsightsPanel'
import { TransactionModal } from '../components/transactions/TransactionModal'
import { TransactionItem } from '../components/transactions/TransactionItem'
import type { TransactionType } from '../types'

export function Dashboard() {
  const { transactions, categories, loading } = useApp()
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<TransactionType>('expense')

  const income  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const balance = income - expense

  const recent = [...transactions].sort((a, b) =>
    (b.created_at || '').localeCompare(a.created_at || '')
  ).slice(0, 5)

  const openModal = (type: TransactionType) => { setModalType(type); setShowModal(true) }

  return (
    <div className="pb-2">
      <PageHeader showMonthNav />

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Mobile: single column */}
          <div className="lg:hidden space-y-4">
            <SummaryCards balance={balance} income={income} expense={expense} />
            <StatusSummary transactions={transactions} />
            <QuickActions onExpense={() => openModal('expense')} onIncome={() => openModal('income')} />
            {transactions.length > 0 && (
              <>
                <CategoryChart transactions={transactions} categories={categories} />
                <InsightsPanel transactions={transactions} categories={categories} />
              </>
            )}
            <EmptyState show={transactions.length === 0} />
          </div>

          {/* Desktop: 2-column grid */}
          <div className="hidden lg:grid lg:grid-cols-5 lg:gap-6 px-6 pb-6">
            {/* Left column (wider) */}
            <div className="col-span-3 space-y-5">
              <SummaryCards balance={balance} income={income} expense={expense} />
              <StatusSummary transactions={transactions} />

              {/* Recent transactions */}
              {recent.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">Últimos lançamentos</p>
                  <div className="space-y-2">
                    {recent.map(t => <TransactionItem key={t.id} transaction={t} />)}
                  </div>
                </div>
              )}

              <EmptyState show={transactions.length === 0} />
            </div>

            {/* Right column */}
            <div className="col-span-2 space-y-5">
              <QuickActions onExpense={() => openModal('expense')} onIncome={() => openModal('income')} />
              {transactions.length > 0 && (
                <>
                  <CategoryChart transactions={transactions} categories={categories} />
                  <InsightsPanel transactions={transactions} categories={categories} />
                </>
              )}
            </div>
          </div>
        </>
      )}

      {showModal && <TransactionModal defaultType={modalType} onClose={() => setShowModal(false)} />}
    </div>
  )
}

function QuickActions({ onExpense, onIncome }: { onExpense: () => void; onIncome: () => void }) {
  return (
    <div className="px-5 flex gap-2.5">
      <button
        onClick={onExpense}
        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border border-[#252525] bg-[#161616] text-sm font-medium text-zinc-300 hover:border-zinc-500 active:scale-95 transition-all"
      >
        <div className="w-6 h-6 rounded-lg bg-red-500/10 flex items-center justify-center">
          <ArrowDownCircle size={13} className="text-red-400" />
        </div>
        Novo gasto
      </button>
      <button
        onClick={onIncome}
        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border border-[#252525] bg-[#161616] text-sm font-medium text-zinc-300 hover:border-zinc-500 active:scale-95 transition-all"
      >
        <div className="w-6 h-6 rounded-lg bg-green-500/10 flex items-center justify-center">
          <ArrowUpCircle size={13} className="text-green-400" />
        </div>
        Nova receita
      </button>
      <button
        onClick={onExpense}
        className="w-12 flex items-center justify-center rounded-2xl border border-[#252525] bg-[#161616] text-zinc-400 hover:border-zinc-500 active:scale-95 transition-all"
      >
        <Plus size={18} />
      </button>
    </div>
  )
}

function EmptyState({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <div className="text-center py-14 px-6">
      <div className="w-16 h-16 rounded-2xl bg-[#161616] border border-[#252525] flex items-center justify-center mx-auto mb-4">
        <span className="text-2xl">💰</span>
      </div>
      <p className="text-sm font-medium text-zinc-400">Nenhum lançamento ainda</p>
      <p className="text-xs text-zinc-600 mt-1">Use os botões acima para começar</p>
    </div>
  )
}
