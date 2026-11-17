import { useState } from 'react'
import { CheckCircle, Clock, AlertCircle, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { formatCurrency, formatDate, getDaysUntilDue } from '../../lib/utils'
import type { Transaction } from '../../types'

interface TransactionItemProps {
  transaction: Transaction
}

const statusConfig = {
  paid: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', label: 'Pago' },
  pending: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10', label: 'Pendente' },
  overdue: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Vencido' },
}

export function TransactionItem({ transaction: t }: TransactionItemProps) {
  const { markAsPaid, deleteTransaction } = useApp()
  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const cfg = statusConfig[t.status]
  const StatusIcon = cfg.icon
  const daysUntil = t.due_date && t.status !== 'paid' ? getDaysUntilDue(t.due_date) : null

  const handleMarkPaid = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await markAsPaid(t.id)
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Excluir esta transação?')) return
    setDeleting(true)
    await deleteTransaction(t.id)
  }

  return (
    <div className={`bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden transition-opacity ${deleting ? 'opacity-50' : ''}`}>
      <button
        className="w-full flex items-center gap-3 p-4 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Category color dot */}
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: t.category?.color || '#666' }}
        />

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{t.description}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {t.due_date && (
              <span className="text-[11px] text-zinc-500">{formatDate(t.due_date)}</span>
            )}
            {daysUntil !== null && daysUntil <= 3 && daysUntil > 0 && (
              <span className="text-[10px] text-yellow-400 bg-yellow-500/10 px-1.5 py-0.5 rounded-full">
                {daysUntil}d
              </span>
            )}
          </div>
        </div>

        {/* Amount + status */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-sm font-semibold ${t.type === 'income' ? 'text-green-400' : 'text-white'}`}>
            {t.type === 'income' ? '+' : ''}{formatCurrency(t.amount)}
          </span>
          <span className={`text-[10px] ${cfg.color} flex items-center gap-0.5`}>
            <StatusIcon size={10} />
            {cfg.label}
          </span>
        </div>

        {expanded ? <ChevronUp size={14} className="text-zinc-600 ml-1 shrink-0" /> : <ChevronDown size={14} className="text-zinc-600 ml-1 shrink-0" />}
      </button>

      {/* Expanded actions */}
      {expanded && (
        <div className="border-t border-[#2a2a2a] px-4 py-3 flex gap-2 bg-[#161616]">
          {t.status !== 'paid' && t.type === 'expense' && (
            <button
              onClick={handleMarkPaid}
              className="flex-1 py-2 rounded-lg bg-green-500/15 text-green-400 text-sm font-medium hover:bg-green-500/25 transition-colors"
            >
              ✅ Marcar como pago
            </button>
          )}
          <button
            onClick={handleDelete}
            className="py-2 px-3 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
