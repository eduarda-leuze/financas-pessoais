import { useState } from 'react'
import { Check } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { formatCurrency, formatDate, getDaysUntilDue } from '../../lib/utils'
import { TransactionModal } from './TransactionModal'
import type { Transaction } from '../../types'

interface Props { transaction: Transaction }

export function TransactionItem({ transaction: t }: Props) {
  const { markAsPaid } = useApp()
  const [editing, setEditing] = useState(false)

  const days = t.due_date ? getDaysUntilDue(t.due_date) : null
  const isExpense = t.type === 'expense'
  const isPaid = t.status === 'paid'
  const isOverdue = t.status === 'overdue'

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isPaid) markAsPaid(t.id)
  }

  return (
    <>
      <button
        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-[#1f1f1f] bg-[#161616] text-left active:scale-[0.99] transition-all hover:border-[#2a2a2a]"
        onClick={() => setEditing(true)}
      >
        {/* Category color bar */}
        <div
          className="w-1 h-8 rounded-full shrink-0"
          style={{ background: t.category?.color || '#333' }}
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{t.description}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-zinc-600">
              {t.category?.name || 'Sem categoria'}
            </span>
            {t.due_date && (
              <>
                <span className="text-zinc-800">·</span>
                <span className="text-[11px] text-zinc-600">{formatDate(t.due_date)}</span>
              </>
            )}
            {days !== null && !isPaid && days <= 3 && days >= 0 && (
              <span className="text-[10px] font-semibold text-amber-400">
                {days === 0 ? 'hoje' : `${days}d`}
              </span>
            )}
            {isOverdue && (
              <span className="text-[10px] font-semibold text-red-400">vencida</span>
            )}
          </div>
        </div>

        {/* Amount */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className={`text-sm font-semibold ${isExpense ? 'text-white' : 'text-green-400'}`}>
            {isExpense ? '-' : '+'}{formatCurrency(t.amount)}
          </span>

          {/* Status pill — tappable */}
          <button
            onClick={handleStatusClick}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all ${
              isPaid
                ? 'bg-green-500/10 text-green-500 cursor-default'
                : isOverdue
                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                : 'bg-amber-500/10 text-amber-400 hover:bg-green-500/15 hover:text-green-400'
            }`}
          >
            {isPaid && <Check size={9} strokeWidth={3} />}
            {isPaid ? 'Pago' : isOverdue ? 'Vencido' : 'Pendente'}
          </button>
        </div>
      </button>

      {editing && (
        <TransactionModal transaction={t} onClose={() => setEditing(false)} />
      )}
    </>
  )
}
