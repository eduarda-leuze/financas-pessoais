import { useState } from 'react'
import { Plus, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { PageHeader } from '../components/layout/PageHeader'
import { SummaryCards } from '../components/dashboard/SummaryCards'
import { StatusSummary } from '../components/dashboard/StatusSummary'
import { CategoryChart } from '../components/dashboard/CategoryChart'
import { InsightsPanel } from '../components/dashboard/InsightsPanel'
import { KpiCards } from '../components/dashboard/KpiCards'
import { UpcomingBills } from '../components/dashboard/UpcomingBills'
import { ForecastCard } from '../components/dashboard/ForecastCard'
import { TransactionModal } from '../components/transactions/TransactionModal'
import { TransactionItem } from '../components/transactions/TransactionItem'
import { useDashboardExtras } from '../hooks/useDashboardExtras'
import type { TransactionType } from '../types'

export function Dashboard() {
  const { transactions, categories, loading, currentMonth, currentYear } = useApp()
  const { prevIncome, prevExpense, upcoming, loadingExtras } = useDashboardExtras(currentMonth, currentYear)

  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<TransactionType>('expense')

  const income   = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const savings  = transactions.filter(t => t.category?.type === 'savings').reduce((s, t) => s + t.amount, 0)
  const expense  = transactions.filter(t => t.type === 'expense' && t.category?.type !== 'savings').reduce((s, t) => s + t.amount, 0)
  const balance  = income - expense - savings

  const recent = [...transactions]
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    .slice(0, 6)

  const openModal = (type: TransactionType) => { setModalType(type); setShowModal(true) }

  const isLoading = loading || loadingExtras

  return (
    <div className="pb-2">
      <PageHeader showMonthNav />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ── MOBILE layout ── */}
          <div className="lg:hidden space-y-4 pb-4">
            <SummaryCards balance={balance} income={income} expense={expense} />
            <StatusSummary transactions={transactions} />
            <QuickActions onExpense={() => openModal('expense')} onIncome={() => openModal('income')} />
            {transactions.length > 0 && (
              <>
                <CategoryChart transactions={transactions} categories={categories} />
                <InsightsPanel transactions={transactions} categories={categories} />
              </>
            )}
            {transactions.length === 0 && <EmptyHint />}
          </div>

          {/* ── DESKTOP layout ── */}
          <div className="hidden lg:block px-6 pb-8 space-y-6">
            {/* Row 1: KPI cards */}
            <KpiCards
              income={income} expense={expense} balance={balance}
              savings={savings}
              prevIncome={prevIncome} prevExpense={prevExpense}
            />

            {/* Row 2: 3-column grid */}
            <div className="grid grid-cols-12 gap-5">
              {/* Left: chart + recent */}
              <div className="col-span-7 space-y-5">
                {transactions.length > 0 ? (
                  <>
                    <DesktopCategoryChart transactions={transactions} categories={categories} />
                    <div>
                      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Últimos lançamentos</p>
                      <div className="space-y-2">
                        {recent.length > 0
                          ? recent.map(t => <TransactionItem key={t.id} transaction={t} />)
                          : <p className="text-sm text-zinc-600 py-4 text-center">Nenhum lançamento ainda</p>
                        }
                      </div>
                    </div>
                  </>
                ) : (
                  <EmptyHint />
                )}
              </div>

              {/* Right: actions + upcoming + forecast + insights */}
              <div className="col-span-5 space-y-5">
                {/* Quick actions */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => openModal('expense')}
                    className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-[#252525] bg-[#161616] text-sm font-medium text-zinc-300 hover:border-zinc-500 active:scale-95 transition-all"
                  >
                    <div className="w-6 h-6 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <ArrowDownCircle size={13} className="text-red-400" />
                    </div>
                    Novo gasto
                  </button>
                  <button
                    onClick={() => openModal('income')}
                    className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-[#252525] bg-[#161616] text-sm font-medium text-zinc-300 hover:border-zinc-500 active:scale-95 transition-all"
                  >
                    <div className="w-6 h-6 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <ArrowUpCircle size={13} className="text-green-400" />
                    </div>
                    Nova receita
                  </button>
                </div>

                <StatusSummary transactions={transactions} />
                <UpcomingBills bills={upcoming} />
                <ForecastCard
                  income={income} expense={expense}
                  prevIncome={prevIncome} prevExpense={prevExpense}
                  currentMonth={currentMonth} currentYear={currentYear}
                />
                {transactions.length > 0 && (
                  <InsightsPanel transactions={transactions} categories={categories} />
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {showModal && <TransactionModal defaultType={modalType} onClose={() => setShowModal(false)} />}
    </div>
  )
}

// Desktop-only category chart with bigger layout
function DesktopCategoryChart({ transactions, categories }: Parameters<typeof CategoryChart>[0]) {
  return (
    <div>
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Gastos por categoria</p>
      <CategoryChart transactions={transactions} categories={categories} />
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

function EmptyHint() {
  return (
    <div className="text-center py-14 px-6">
      <div className="w-16 h-16 rounded-2xl bg-[#161616] border border-[#252525] flex items-center justify-center mx-auto mb-4">
        <span className="text-2xl">💰</span>
      </div>
      <p className="text-sm font-medium text-zinc-400">Nenhum lançamento ainda</p>
      <p className="text-xs text-zinc-600 mt-1">Adicione um gasto ou receita para começar</p>
    </div>
  )
}
