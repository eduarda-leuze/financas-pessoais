import { useState } from 'react'
import { Check, Plus, ChevronDown, ChevronUp, Calendar } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { PageHeader } from '../components/layout/PageHeader'
import { TransactionModal } from '../components/transactions/TransactionModal'
import { formatCurrency } from '../lib/utils'
import type { TransactionStatus } from '../types'

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function daysLabel(d: string | null | undefined, status: string) {
  if (!d || status === 'paid') return null
  const today = new Date(); today.setHours(0,0,0,0)
  const due   = new Date(d + 'T00:00:00')
  const diff  = Math.round((due.getTime() - today.getTime()) / 86400000)
  if (diff === 0)  return { text: 'Vence hoje', color: 'text-amber-400' }
  if (diff === 1)  return { text: 'Amanhã',     color: 'text-amber-400' }
  if (diff > 0)    return { text: `${diff}d`,   color: 'text-zinc-500'  }
  return { text: `${Math.abs(diff)}d atrás`, color: 'text-red-400' }
}

const STATUS_COLOR: Record<string, string> = {
  paid:    '#22c55e',
  pending: '#fbbf24',
  overdue: '#f87171',
}
const STATUS_LABEL: Record<string, string> = {
  paid:    'Pago',
  pending: 'Pendente',
  overdue: 'Vencido',
}

export function Contas() {
  const { transactions, markAsPaid, loading } = useApp()
  const [filter, setFilter] = useState<TransactionStatus | 'all'>('all')
  const [showModal, setShowModal] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [marking, setMarking] = useState<string | null>(null)

  // only expense transactions (bills)
  const bills = transactions.filter(t => t.type === 'expense')
  const filtered = filter === 'all' ? bills : bills.filter(t => t.status === filter)

  // sort: overdue first, then pending by due_date, then paid
  const sorted = [...filtered].sort((a, b) => {
    const order = { overdue: 0, pending: 1, paid: 2 }
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status]
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
    return 0
  })

  const totalPending = bills.filter(t => t.status === 'pending').reduce((s, t) => s + t.amount, 0)
  const totalOverdue = bills.filter(t => t.status === 'overdue').reduce((s, t) => s + t.amount, 0)
  const totalPaid    = bills.filter(t => t.status === 'paid').reduce((s, t) => s + t.amount, 0)
  const countPending = bills.filter(t => t.status === 'pending').length
  const countOverdue = bills.filter(t => t.status === 'overdue').length

  const handleMarkPaid = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setMarking(id)
    await markAsPaid(id)
    setMarking(null)
  }

  const filters: { v: TransactionStatus | 'all'; label: string }[] = [
    { v: 'all',     label: 'Todas'     },
    { v: 'overdue', label: 'Vencidas'  },
    { v: 'pending', label: 'Pendentes' },
    { v: 'paid',    label: 'Pagas'     },
  ]

  return (
    <div className="pb-4">
      <PageHeader showMonthNav />

      {/* Summary bar */}
      <div className="px-5 mb-4">
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setFilter(filter === 'overdue' ? 'all' : 'overdue')}
            className={`rounded-2xl p-3 border transition-all text-left ${
              filter === 'overdue'
                ? 'bg-red-500/15 border-red-500/30'
                : 'bg-[#161616] border-[#252525]'
            }`}
          >
            <p className="text-[10px] text-zinc-500 font-medium mb-1">Vencidas</p>
            <p className="text-sm font-bold text-red-400">{formatCurrency(totalOverdue)}</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">{countOverdue} conta{countOverdue !== 1 ? 's' : ''}</p>
          </button>
          <button
            onClick={() => setFilter(filter === 'pending' ? 'all' : 'pending')}
            className={`rounded-2xl p-3 border transition-all text-left ${
              filter === 'pending'
                ? 'bg-amber-500/15 border-amber-500/30'
                : 'bg-[#161616] border-[#252525]'
            }`}
          >
            <p className="text-[10px] text-zinc-500 font-medium mb-1">Pendentes</p>
            <p className="text-sm font-bold text-amber-400">{formatCurrency(totalPending)}</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">{countPending} conta{countPending !== 1 ? 's' : ''}</p>
          </button>
          <button
            onClick={() => setFilter(filter === 'paid' ? 'all' : 'paid')}
            className={`rounded-2xl p-3 border transition-all text-left ${
              filter === 'paid'
                ? 'bg-green-500/15 border-green-500/30'
                : 'bg-[#161616] border-[#252525]'
            }`}
          >
            <p className="text-[10px] text-zinc-500 font-medium mb-1">Pagas</p>
            <p className="text-sm font-bold text-green-400">{formatCurrency(totalPaid)}</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">{bills.filter(t=>t.status==='paid').length} conta{bills.filter(t=>t.status==='paid').length !== 1 ? 's' : ''}</p>
          </button>
        </div>
      </div>

      {/* Add button */}
      <div className="px-5 mb-4">
        <button
          onClick={() => setShowModal(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-[#161616] border border-[#252525] text-sm font-medium text-zinc-400 hover:border-zinc-500 active:scale-[0.98] transition-all"
        >
          <Plus size={14} className="text-green-400" />
          Nova conta
        </button>
      </div>

      {/* Filter chips */}
      <div className="px-5 mb-3 flex gap-1.5">
        {filters.map(f => (
          <button
            key={f.v}
            onClick={() => setFilter(f.v)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              filter === f.v
                ? 'bg-green-500/15 border-green-500/25 text-green-400'
                : 'bg-[#161616] border-[#252525] text-zinc-500'
            }`}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-zinc-600 self-center">{sorted.length} conta{sorted.length !== 1 ? 's' : ''}</span>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-5 h-5 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-14 px-5">
          <p className="text-3xl mb-3">📋</p>
          <p className="text-sm text-zinc-500 font-medium">Nenhuma conta encontrada</p>
          <p className="text-xs text-zinc-600 mt-1">Adicione uma nova conta acima</p>
        </div>
      ) : (
        <div className="px-5 space-y-2">
          {sorted.map(t => {
            const label = daysLabel(t.due_date, t.status)
            const isExp = expanded === t.id
            return (
              <div
                key={t.id}
                className="rounded-2xl border border-[#252525] overflow-hidden transition-all"
                style={{ background: '#161616' }}
              >
                {/* Main row */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer active:bg-[#1e1e1e] transition-colors"
                  onClick={() => setExpanded(isExp ? null : t.id)}
                >
                  {/* Status dot */}
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: STATUS_COLOR[t.status] }}
                  />

                  {/* Description + category */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${t.status === 'paid' ? 'text-zinc-500 line-through' : 'text-white'}`}>
                      {t.description}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {t.category && (
                        <span
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                          style={{ background: t.category.color + '22', color: t.category.color }}
                        >
                          {t.category.icon} {t.category.name}
                        </span>
                      )}
                      {label && (
                        <span className={`text-[10px] font-medium ${label.color}`}>
                          {label.text}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold ${t.status === 'paid' ? 'text-zinc-500' : 'text-white'}`}>
                      {formatCurrency(t.amount)}
                    </p>
                    <p className="text-[10px] text-zinc-600 mt-0.5">{fmtDate(t.due_date)}</p>
                  </div>

                  {/* Mark paid button */}
                  {t.status !== 'paid' && (
                    <button
                      onClick={e => handleMarkPaid(t.id, e)}
                      disabled={marking === t.id}
                      className="ml-1 w-8 h-8 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 hover:bg-green-500/20 active:scale-90 transition-all shrink-0 disabled:opacity-50"
                      title="Marcar como pago"
                    >
                      {marking === t.id
                        ? <div className="w-3.5 h-3.5 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                        : <Check size={14} strokeWidth={2.5} />
                      }
                    </button>
                  )}
                  {t.status === 'paid' && (
                    <div className="ml-1 w-8 h-8 rounded-xl bg-green-500/10 border border-green-500/15 flex items-center justify-center text-green-500/50 shrink-0">
                      <Check size={14} strokeWidth={2.5} />
                    </div>
                  )}

                  {/* Expand chevron */}
                  <div className="text-zinc-600 shrink-0">
                    {isExp ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </div>

                {/* Expanded detail */}
                {isExp && (
                  <div className="px-4 pb-3 border-t border-[#252525] pt-3 grid grid-cols-2 gap-x-4 gap-y-2">
                    <div>
                      <p className="text-[10px] text-zinc-600 font-medium mb-0.5">Status</p>
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: STATUS_COLOR[t.status] + '22', color: STATUS_COLOR[t.status] }}
                      >
                        {STATUS_LABEL[t.status]}
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-600 font-medium mb-0.5">Valor</p>
                      <p className="text-xs font-semibold text-white">{formatCurrency(t.amount)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-600 font-medium mb-0.5 flex items-center gap-1"><Calendar size={9} /> Vencimento</p>
                      <p className="text-xs text-zinc-400">{fmtDate(t.due_date)}</p>
                    </div>
                    {t.paid_date && (
                      <div>
                        <p className="text-[10px] text-zinc-600 font-medium mb-0.5 flex items-center gap-1"><Calendar size={9} /> Pagamento</p>
                        <p className="text-xs text-zinc-400">{fmtDate(t.paid_date)}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showModal && <TransactionModal onClose={() => setShowModal(false)} defaultType="expense" />}
    </div>
  )
}
