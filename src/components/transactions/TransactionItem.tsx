import { useState } from 'react'
import { ChevronRight, Trash2, Check, Pencil } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { formatCurrency, formatDate, getDaysUntilDue } from '../../lib/utils'
import { TransactionModal } from './TransactionModal'
import type { Transaction } from '../../types'

interface Props { transaction: Transaction }

export function TransactionItem({ transaction: t }: Props) {
  const { deleteTransaction, markAsPaid } = useApp()
  const [expanded, setExpanded] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [editing, setEditing] = useState(false)

  const days = t.due_date ? getDaysUntilDue(t.due_date) : null
  const isExpense = t.type === 'expense'

  const statusColor = t.status === 'paid' ? '#22c55e' : t.status === 'overdue' ? '#f87171' : '#fbbf24'
  const statusLabel = t.status === 'paid' ? 'Pago' : t.status === 'overdue' ? 'Vencido' : 'Pendente'

  return (
    <div
      className="rounded-2xl border border-[#252525] overflow-hidden transition-all"
      style={{ background: '#161616' }}
    >
      <button
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Category dot */}
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: t.category?.color || '#555' }}
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{t.description}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {t.due_date && (
              <span className="text-[11px] text-zinc-600">{formatDate(t.due_date)}</span>
            )}
            {days !== null && t.status === 'pending' && days <= 3 && days >= 0 && (
              <span className="text-[10px] font-semibold text-amber-400">
                {days === 0 ? 'Vence hoje' : `${days}d`}
              </span>
            )}
          </div>
        </div>

        {/* Amount + status */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-sm font-semibold ${isExpense ? 'text-white' : 'text-green-400'}`}>
            {isExpense ? '-' : '+'}{formatCurrency(t.amount)}
          </span>
          <div className="flex items-center gap-1">
            <div className="w-1 h-1 rounded-full" style={{ background: statusColor }} />
            <span className="text-[10px] font-medium" style={{ color: statusColor }}>{statusLabel}</span>
          </div>
        </div>

        <ChevronRight
          size={14}
          className="text-zinc-700 shrink-0 transition-transform"
          style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
        />
      </button>

      {expanded && (
        <div className="border-t border-[#252525] px-4 py-3 flex gap-2">
          {t.status !== 'paid' && (
            <button
              onClick={() => markAsPaid(t.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold transition-colors hover:bg-green-500/20"
            >
              <Check size={13} />
              Marcar como pago
            </button>
          )}
          <button
            onClick={() => setEditing(true)}
            className="w-10 flex items-center justify-center rounded-xl bg-[#1e1e1e] border border-[#2a2a2a] text-zinc-500 hover:text-white transition-colors"
          >
            <Pencil size={14} />
          </button>
          {confirming ? (
            <button
              onClick={() => deleteTransaction(t.id)}
              className="flex-1 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold"
            >
              Confirmar exclusão
            </button>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="w-10 flex items-center justify-center rounded-xl bg-[#1e1e1e] border border-[#2a2a2a] text-zinc-600 hover:text-red-400 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )}

      {editing && (
        <TransactionModal transaction={t} onClose={() => setEditing(false)} />
      )}
    </div>
  )
}
