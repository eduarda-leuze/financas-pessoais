import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { PageHeader } from '../components/layout/PageHeader'
import { SummaryCards } from '../components/dashboard/SummaryCards'
import { CategoryChart } from '../components/dashboard/CategoryChart'
import { StatusSummary } from '../components/dashboard/StatusSummary'
import { InsightsPanel } from '../components/dashboard/InsightsPanel'
import { TransactionModal } from '../components/transactions/TransactionModal'

export function Dashboard() {
  const { transactions, categories, loading } = useApp()
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'expense' | 'income'>('expense')

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0)

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0)

  const balance = totalIncome - totalExpense

  const openModal = (type: 'expense' | 'income') => {
    setModalType(type)
    setShowModal(true)
  }

  return (
    <div className="pb-4">
      <PageHeader showMonthNav />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          <SummaryCards
            totalIncome={totalIncome}
            totalExpense={totalExpense}
            balance={balance}
          />

          <StatusSummary transactions={transactions} />

          {/* Quick actions */}
          <div className="px-4 grid grid-cols-2 gap-3">
            <button
              onClick={() => openModal('expense')}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-sm font-medium text-zinc-300 hover:border-zinc-500 transition-colors"
            >
              <Plus size={16} className="text-red-400" />
              Lançar gasto
            </button>
            <button
              onClick={() => openModal('income')}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-sm font-medium text-zinc-300 hover:border-zinc-500 transition-colors"
            >
              <Plus size={16} className="text-green-400" />
              Lançar receita
            </button>
          </div>

          <CategoryChart transactions={transactions} categories={categories} />

          <InsightsPanel
            transactions={transactions}
            categories={categories}
            totalIncome={totalIncome}
            totalExpense={totalExpense}
          />
        </div>
      )}

      {showModal && (
        <TransactionModal
          onClose={() => setShowModal(false)}
          defaultType={modalType}
        />
      )}
    </div>
  )
}
