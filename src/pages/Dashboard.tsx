import { useState, useEffect } from 'react'
import { ArrowDownCircle, ArrowUpCircle, PiggyBank } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { PageHeader } from '../components/layout/PageHeader'
import { SummaryCards } from '../components/dashboard/SummaryCards'
import { KpiCards } from '../components/dashboard/KpiCards'
import { UpcomingBills } from '../components/dashboard/UpcomingBills'
import { TransactionModal } from '../components/transactions/TransactionModal'
import { TransactionItem } from '../components/transactions/TransactionItem'
import { useDashboardExtras } from '../hooks/useDashboardExtras'
import { formatCurrency } from '../lib/utils'
import type { Transaction, TransactionType } from '../types'

// Always today's month/year — never follows navigation
const TODAY = new Date()
const THIS_MONTH = TODAY.getMonth() + 1
const THIS_YEAR  = TODAY.getFullYear()

const MONTH_NAMES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

export function Dashboard() {
  useApp()
  const { user } = useAuth()
  const { prevIncome, prevExpense, upcoming, loadingExtras } = useDashboardExtras(THIS_MONTH, THIS_YEAR)

  const [txs, setTxs]             = useState<Transaction[]>([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<TransactionType>('expense')
  const [modalIsSavings, setModalIsSavings] = useState(false)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    supabase
      .from('transactions')
      .select('*, category:categories(*)')
      .eq('user_id', user.id)
      .eq('month', THIS_MONTH)
      .eq('year', THIS_YEAR)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setTxs(data || [])
        setLoading(false)
      })
  }, [user])

  const income  = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const savings = txs.filter(t => t.category?.type === 'savings').reduce((s, t) => s + t.amount, 0)
  const expense = txs.filter(t => t.type === 'expense' && t.category?.type !== 'savings').reduce((s, t) => s + t.amount, 0)
  const balance = income - expense - savings

  const recent = txs.slice(0, 6)

  const openModal = (type: TransactionType, isSavings = false) => {
    setModalType(type)
    setModalIsSavings(isSavings)
    setShowModal(true)
  }
  const isLoading = loading || loadingExtras

  return (
    <div className="pb-2">
      {/* Fixed month label — no navigation */}
      <PageHeader title={`${MONTH_NAMES[THIS_MONTH - 1]} ${THIS_YEAR}`} showSettings />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ── MOBILE layout ── */}
          <div className="lg:hidden space-y-4 pb-24">
            <SummaryCards balance={balance} income={income} expense={expense} savings={savings} />
            <QuickActions
              onExpense={() => openModal('expense')}
              onIncome={() => openModal('income')}
              onSavings={() => openModal('expense', true)}
            />

            {/* Próximas contas */}
            {upcoming.length > 0 && (
              <div className="px-5">
                <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-3">Próximas contas</p>
                <div className="space-y-2">
                  {upcoming.slice(0, 3).map(b => (
                    <div key={b.id} className="flex items-center justify-between px-4 py-3 rounded-2xl bg-[#161616] border border-[#1f1f1f]">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{b.description}</p>
                        <p className="text-[11px] text-zinc-600 mt-0.5">{b.due_date}</p>
                      </div>
                      <span className="text-sm font-semibold text-amber-400 shrink-0 ml-3">{formatCurrency(b.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Últimos lançamentos */}
            {recent.length > 0 ? (
              <div className="px-5">
                <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-3">Últimos lançamentos</p>
                <div className="space-y-2">
                  {recent.map(t => <TransactionItem key={t.id} transaction={t} />)}
                </div>
              </div>
            ) : (
              <EmptyHint />
            )}
          </div>

          {/* ── DESKTOP layout ── */}
          <div className="hidden lg:block px-6 pb-8 space-y-6">
            <KpiCards
              income={income} expense={expense} balance={balance}
              savings={savings}
              prevIncome={prevIncome} prevExpense={prevExpense}
            />
            <div className="grid grid-cols-12 gap-5">
              <div className="col-span-7 space-y-5">
                {recent.length > 0 ? (
                  <div>
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Últimos lançamentos</p>
                    <div className="space-y-2">
                      {recent.map(t => <TransactionItem key={t.id} transaction={t} />)}
                    </div>
                  </div>
                ) : (
                  <EmptyHint />
                )}
              </div>
              <div className="col-span-5 space-y-5">
                <div className="grid grid-cols-2 gap-2.5">
                  <button onClick={() => openModal('expense')} className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-[#252525] bg-[#161616] text-sm font-medium text-zinc-300 hover:border-zinc-500 active:scale-95 transition-all">
                    <div className="w-6 h-6 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <ArrowDownCircle size={13} className="text-red-400" />
                    </div>
                    Novo gasto
                  </button>
                  <button onClick={() => openModal('income')} className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-[#252525] bg-[#161616] text-sm font-medium text-zinc-300 hover:border-zinc-500 active:scale-95 transition-all">
                    <div className="w-6 h-6 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <ArrowUpCircle size={13} className="text-green-400" />
                    </div>
                    Nova receita
                  </button>
                </div>
                <UpcomingBills bills={upcoming} />
              </div>
            </div>
          </div>
        </>
      )}

      {showModal && <TransactionModal defaultType={modalType} defaultIsSavings={modalIsSavings} onClose={() => {
        setShowModal(false)
        // reload after adding
        if (!user) return
        supabase
          .from('transactions')
          .select('*, category:categories(*)')
          .eq('user_id', user.id)
          .eq('month', THIS_MONTH)
          .eq('year', THIS_YEAR)
          .order('created_at', { ascending: false })
          .then(({ data }) => setTxs(data || []))
      }} />}
    </div>
  )
}

function QuickActions({ onExpense, onIncome, onSavings }: {
  onExpense: () => void
  onIncome: () => void
  onSavings: () => void
}) {
  return (
    <div className="px-5 flex gap-2 flex-wrap">
      <button onClick={onExpense} className="flex-1 min-w-0 flex items-center justify-center gap-1.5 py-3 rounded-2xl border border-[#252525] bg-[#161616] text-xs font-medium text-zinc-300 hover:border-zinc-500 active:scale-95 transition-all">
        <div className="w-5 h-5 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
          <ArrowDownCircle size={12} className="text-red-400" />
        </div>
        Novo gasto
      </button>
      <button onClick={onSavings} className="flex-1 min-w-0 flex items-center justify-center gap-1.5 py-3 rounded-2xl border border-[#252525] bg-[#161616] text-xs font-medium text-zinc-300 hover:border-blue-500/40 active:scale-95 transition-all">
        <div className="w-5 h-5 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
          <PiggyBank size={12} className="text-blue-400" />
        </div>
        Poupança
      </button>
      <button onClick={onIncome} className="flex-1 min-w-0 flex items-center justify-center gap-1.5 py-3 rounded-2xl border border-[#252525] bg-[#161616] text-xs font-medium text-zinc-300 hover:border-zinc-500 active:scale-95 transition-all">
        <div className="w-5 h-5 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
          <ArrowUpCircle size={12} className="text-green-400" />
        </div>
        Nova receita
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
