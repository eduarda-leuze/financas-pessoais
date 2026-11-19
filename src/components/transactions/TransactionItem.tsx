import { useState, useRef } from 'react'
import { Check, MoreHorizontal, Receipt, Pencil, Trash2, X } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { formatCurrency, formatDate, getDaysUntilDue } from '../../lib/utils'
import { TransactionModal } from './TransactionModal'
import type { Transaction } from '../../types'

interface Props { transaction: Transaction }

export function TransactionItem({ transaction: t }: Props) {
  const { markAsPaid, updateTransaction, deleteTransaction } = useApp()
  const [editing, setEditing]           = useState(false)
  const [showActions, setShowActions]   = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [renaming, setRenaming]         = useState(false)
  const [newTitle, setNewTitle]         = useState(t.description)
  const inputRef = useRef<HTMLInputElement>(null)

  const isExpense = t.type === 'expense'
  const isPaid    = t.status === 'paid'
  const isOverdue = t.status === 'overdue'
  const isBill    = t.is_bill === true
  const days      = isBill && t.due_date ? getDaysUntilDue(t.due_date) : null

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isPaid) markAsPaid(t.id)
  }

  const handleMoreClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowActions(v => !v)
    setConfirmDelete(false)
    setRenaming(false)
  }

  const handleConvertToBill = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await updateTransaction(t.id, { is_bill: true, status: 'pending' })
    setShowActions(false)
  }

  const handleStartRename = (e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirmDelete(false)
    setNewTitle(t.description)
    setRenaming(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newTitle.trim()
    if (trimmed && trimmed !== t.description) {
      await updateTransaction(t.id, { description: trimmed })
    }
    setRenaming(false)
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await deleteTransaction(t.id)
  }

  return (
    <>
      <div className="rounded-2xl border border-[#1f1f1f] bg-[#161616] overflow-hidden">
        <button
          className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-[#1c1c1c] transition-colors"
          onClick={() => setEditing(true)}
        >
          {/* Category color bar */}
          <div
            className="w-1 h-9 rounded-full shrink-0"
            style={{ background: t.category?.color || '#333' }}
          />

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate leading-snug">{t.description}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-[11px] text-zinc-600 leading-none">
                {t.category?.name || 'Sem categoria'}
              </span>
              {t.due_date && (
                <>
                  <span className="text-zinc-800 leading-none">·</span>
                  <span className="text-[11px] text-zinc-600 leading-none">{formatDate(t.due_date)}</span>
                </>
              )}
              {isBill && days !== null && !isPaid && days <= 3 && days >= 0 && (
                <span className="text-[10px] font-semibold text-amber-400 leading-none">
                  {days === 0 ? 'hoje' : `${days}d`}
                </span>
              )}
              {isBill && isOverdue && (
                <span className="text-[10px] font-semibold text-red-400 leading-none">vencida</span>
              )}
            </div>
          </div>

          {/* Amount + status */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className={`text-sm font-semibold tabular-nums ${isExpense ? 'text-white' : 'text-green-400'}`}>
              {isExpense ? '-' : '+'}{formatCurrency(t.amount)}
            </span>
            {isBill && (
              <button
                onClick={handleStatusClick}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all min-h-[20px] ${
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
            )}
          </div>

          {/* More button */}
          <button
            onClick={handleMoreClick}
            className={`ml-0.5 w-8 h-8 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
              showActions ? 'bg-[#2a2a2a] text-zinc-300' : 'text-zinc-700 active:text-zinc-400'
            }`}
          >
            <MoreHorizontal size={15} />
          </button>
        </button>

        {/* Quick actions row */}
        {showActions && (
          <div className="border-t border-[#1f1f1f] px-3 py-2.5 flex gap-2 items-center" onClick={e => e.stopPropagation()}>
            {confirmDelete ? (
              <>
                <span className="text-xs text-zinc-500 mr-1">Excluir?</span>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl bg-[#1a1a1a] border border-[#252525] text-xs text-zinc-500 active:scale-95 transition-all"
                >
                  <X size={11} />
                  Não
                </button>
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl bg-red-500/15 border border-red-500/25 text-xs text-red-400 font-semibold active:scale-95 transition-all"
                >
                  <Trash2 size={11} />
                  Excluir
                </button>
              </>
            ) : renaming ? (
              <form onSubmit={handleRenameSubmit} className="flex-1 flex gap-2">
                <input
                  ref={inputRef}
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
                  onBlur={() => setRenaming(false)}
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-green-500/15 text-green-400 text-xs font-semibold border border-green-500/20"
                >
                  OK
                </button>
              </form>
            ) : (
              <>
                <button
                  onClick={handleStartRename}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1a1a1a] border border-[#252525] text-xs text-zinc-400 active:scale-95 transition-all"
                >
                  <Pencil size={11} />
                  Renomear
                </button>
                {isExpense && !isBill && (
                  <button
                    onClick={handleConvertToBill}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400 active:scale-95 transition-all"
                  >
                    <Receipt size={11} />
                    Virar conta
                  </button>
                )}
                <button
                  onClick={e => { e.stopPropagation(); setRenaming(false); setConfirmDelete(true) }}
                  className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1a1a1a] border border-[#252525] text-xs text-zinc-600 active:text-red-400 active:border-red-500/30 active:scale-95 transition-all"
                >
                  <Trash2 size={11} />
                  Excluir
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {editing && (
        <TransactionModal transaction={t} onClose={() => setEditing(false)} />
      )}
    </>
  )
}
