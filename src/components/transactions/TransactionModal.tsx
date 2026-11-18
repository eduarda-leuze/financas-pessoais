import { useState, useEffect } from 'react'
import { X, ArrowDownCircle, ArrowUpCircle, Trash2, Receipt, ShoppingBag, PiggyBank, RefreshCw } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { supabase } from '../../lib/supabase'
import { v4 as uuidv4 } from '../../lib/uuid'

import { getCurrentMonthYear } from '../../lib/utils'
import type { Transaction, TransactionType } from '../../types'

type Mode = 'expense' | 'savings' | 'income'
type Recurrence = 'once' | 'monthly' | 'installment'

interface Props {
  onClose: () => void
  defaultType?: TransactionType
  defaultIsBill?: boolean
  defaultIsSavings?: boolean
  forceMonth?: number
  forceYear?: number
  transaction?: Transaction
}

export function TransactionModal({ onClose, defaultType = 'expense', defaultIsBill = false, defaultIsSavings = false, forceMonth, forceYear, transaction }: Props) {
  const { categories, addTransaction, bulkImport, updateTransaction, deleteTransaction, currentMonth, currentYear } = useApp()
  const isEdit = !!transaction

  const initMode = (): Mode => {
    if (transaction) {
      if (transaction.type === 'income') return 'income'
      const cat = categories.find(c => c.id === transaction.category_id)
      if (cat?.type === 'savings') return 'savings'
      return 'expense'
    }
    if (defaultIsSavings) return 'savings'
    if (defaultType === 'income') return 'income'
    return 'expense'
  }

  const [mode, setMode]               = useState<Mode>(initMode)
  const [isBill, setIsBill]           = useState<boolean>(transaction?.is_bill ?? defaultIsBill)
  const [recurrence, setRecurrence]   = useState<Recurrence>('once')
  const [installments, setInstallments] = useState('12')
  const [description, setDescription] = useState(transaction?.description ?? '')
  const [amount, setAmount]           = useState(transaction ? String(transaction.amount) : '')
  const [categoryId, setCategoryId]   = useState(transaction?.category_id ?? '')
  const [dueDate, setDueDate]         = useState(transaction?.due_date ?? '')
  const [status, setStatus]           = useState<'pending' | 'paid'>(
    transaction?.status === 'paid' ? 'paid' : 'pending'
  )
  const [saving, setSaving]           = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  // convert existing bill to recurring
  const [makeRecurring, setMakeRecurring] = useState<Recurrence>('once')
  const [makeInstallments, setMakeInstallments] = useState('12')
  const canConvertToRecurring = isEdit && isBill && !transaction?.recurring_group_id

  const { month, year } = getCurrentMonthYear()

  const type: TransactionType = mode === 'income' ? 'income' : 'expense'
  const isSavingsMode = mode === 'savings'

  const filteredCats = isSavingsMode
    ? categories.filter(c => c.type === 'savings')
    : categories.filter(c => c.type === type)

  useEffect(() => {
    if (!isEdit) setCategoryId('')
    if (mode !== 'expense') setIsBill(false)
  }, [mode, isEdit])

  useEffect(() => {
    if (isSavingsMode && !isEdit && filteredCats.length > 0 && !categoryId) {
      setCategoryId(filteredCats[0].id)
    }
  }, [isSavingsMode, filteredCats, isEdit, categoryId])

  // Reset recurrence when switching away from bill mode
  useEffect(() => {
    if (!isBill) setRecurrence('once')
  }, [isBill])

  const saveKeywordRule = async (desc: string, catId: string) => {
    if (!catId) return
    const cat = categories.find(c => c.id === catId)
    if (!cat) return
    const normalized = desc.trim().toLowerCase()
    if (!normalized || cat.keywords.map(k => k.toLowerCase()).includes(normalized)) return
    await supabase.from('categories').update({ keywords: [...cat.keywords, desc.trim()] }).eq('id', catId)
  }

  // Add N months to a YYYY-MM-DD date, returning YYYY-MM-DD
  const addMonths = (dateStr: string, n: number): { date: string; month: number; year: number } => {
    if (!dateStr) {
      const today = new Date()
      today.setMonth(today.getMonth() + n)
      return {
        date: today.toISOString().slice(0, 10),
        month: today.getMonth() + 1,
        year: today.getFullYear(),
      }
    }
    const d = new Date(dateStr + 'T00:00:00')
    d.setMonth(d.getMonth() + n)
    return {
      date: d.toISOString().slice(0, 10),
      month: d.getMonth() + 1,
      year: d.getFullYear(),
    }
  }

  const handleSave = async () => {
    if (!description.trim() || !amount) return
    setSaving(true)
    const effectiveStatus = (type === 'expense' && !isBill) ? 'paid' : status
    const descTrimmed = description.trim()
    const amountNum = parseFloat(amount.replace(',', '.'))
    if (categoryId) await saveKeywordRule(descTrimmed, categoryId)

    const baseMonth = forceMonth ?? currentMonth ?? month
    const baseYear  = forceYear  ?? currentYear  ?? year

    if (isEdit) {
      if (canConvertToRecurring && makeRecurring !== 'once') {
        // Convert existing bill to recurring/installment
        const groupId = uuidv4()
        const count = makeRecurring === 'monthly' ? 12 : Math.max(1, parseInt(makeInstallments) || 12)
        const isInstallment = makeRecurring === 'installment'
        const baseDateStr = dueDate || transaction!.due_date || ''
        // Update the existing transaction (becomes item #1)
        await updateTransaction(transaction!.id, {
          description: isInstallment ? `${descTrimmed} (1/${count})` : descTrimmed,
          amount: amountNum,
          type,
          status: effectiveStatus,
          is_bill: true,
          category_id: categoryId,
          due_date: dueDate || undefined,
          recurring_group_id: groupId,
          installment_number: isInstallment ? 1 : null,
          total_installments: isInstallment ? count : null,
        })
        // Bulk-create future copies (months 2…N)
        const futureRows = Array.from({ length: count - 1 }, (_, i) => {
          const { date: dd, month: m, year: y } = addMonths(baseDateStr, i + 1)
          return {
            description: isInstallment ? `${descTrimmed} (${i + 2}/${count})` : descTrimmed,
            amount: amountNum,
            type,
            status: 'pending' as const,
            is_bill: true,
            category_id: categoryId,
            due_date: dd,
            month: m,
            year: y,
            source: 'manual' as const,
            recurring_group_id: groupId,
            installment_number: isInstallment ? i + 2 : null,
            total_installments: isInstallment ? count : null,
          }
        })
        if (futureRows.length > 0) await bulkImport(futureRows)
      } else {
        await updateTransaction(transaction!.id, {
          description: descTrimmed,
          amount: amountNum,
          type,
          status: effectiveStatus,
          is_bill: isBill,
          category_id: categoryId,
          due_date: dueDate || undefined,
        })
      }
      setSaving(false)
      onClose()
      return
    }

    // ── Recurring / installment logic ─────────────────────────────────────
    if (isBill && recurrence !== 'once') {
      const groupId = uuidv4()
      const count = recurrence === 'monthly' ? 12 : Math.max(1, parseInt(installments) || 12)
      const isInstallment = recurrence === 'installment'

      const rows = Array.from({ length: count }, (_, i) => {
        const { date: dd, month: m, year: y } = addMonths(dueDate, i)
        return {
          description: isInstallment ? `${descTrimmed} (${i + 1}/${count})` : descTrimmed,
          amount: amountNum,
          type,
          status: i === 0 ? effectiveStatus : 'pending' as const,
          is_bill: true,
          category_id: categoryId,
          due_date: dd,
          month: m,
          year: y,
          source: 'manual' as const,
          recurring_group_id: groupId,
          installment_number: isInstallment ? i + 1 : null,
          total_installments: isInstallment ? count : null,
        }
      })

      await bulkImport(rows)
      setSaving(false)
      onClose()
      return
    }

    await addTransaction({
      description: descTrimmed,
      amount: amountNum,
      type,
      status: effectiveStatus,
      is_bill: isBill,
      category_id: categoryId,
      due_date: dueDate || undefined,
      month: baseMonth,
      year: baseYear,
      source: 'manual',
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center px-0 lg:px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-md rounded-t-3xl lg:rounded-3xl border border-[#252525] overflow-hidden max-h-[92dvh] overflow-y-auto"
        style={{ background: '#141414' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 sticky top-0 bg-[#141414] z-10">
          <div className="w-10 h-1 rounded-full bg-[#333]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3">
          <h2 className="text-base font-semibold text-white">
            {isEdit ? 'Editar lançamento' : mode === 'savings' ? 'Nova poupança' : 'Novo lançamento'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-[#1e1e1e] text-zinc-500 hover:text-white transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Mode toggle */}
        <div className="px-5 mb-4">
          <div className="flex bg-[#1a1a1a] rounded-2xl p-1 border border-[#252525]">
            <button
              onClick={() => setMode('expense')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                mode === 'expense' ? 'bg-[#252525] text-white' : 'text-zinc-600'
              }`}
            >
              <ArrowDownCircle size={14} className={mode === 'expense' ? 'text-red-400' : ''} />
              Gasto
            </button>
            <button
              onClick={() => setMode('savings')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                mode === 'savings' ? 'bg-[#252525] text-white' : 'text-zinc-600'
              }`}
            >
              <PiggyBank size={14} className={mode === 'savings' ? 'text-blue-400' : ''} />
              Poupança
            </button>
            <button
              onClick={() => setMode('income')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                mode === 'income' ? 'bg-[#252525] text-white' : 'text-zinc-600'
              }`}
            >
              <ArrowUpCircle size={14} className={mode === 'income' ? 'text-green-400' : ''} />
              Receita
            </button>
          </div>
        </div>

        {/* Bill toggle */}
        {mode === 'expense' && (
          <div className="px-5 mb-4">
            <div className="flex bg-[#1a1a1a] rounded-2xl p-1 border border-[#252525]">
              <button
                onClick={() => setIsBill(false)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium transition-all ${
                  !isBill ? 'bg-[#252525] text-white' : 'text-zinc-600'
                }`}
              >
                <ShoppingBag size={13} className={!isBill ? 'text-orange-400' : ''} />
                Gasto
              </button>
              <button
                onClick={() => setIsBill(true)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium transition-all ${
                  isBill ? 'bg-[#252525] text-white' : 'text-zinc-600'
                }`}
              >
                <Receipt size={13} className={isBill ? 'text-blue-400' : ''} />
                Conta a pagar
              </button>
            </div>
          </div>
        )}

        {/* Recurrence — only for bills, only on creation */}
        {mode === 'expense' && isBill && !isEdit && (
          <div className="px-5 mb-4">
            <label className="text-xs text-zinc-500 font-medium mb-2 block flex items-center gap-1.5">
              <RefreshCw size={11} />
              Repetição
            </label>
            <div className="flex bg-[#1a1a1a] rounded-2xl p-1 border border-[#252525]">
              {(['once', 'monthly', 'installment'] as Recurrence[]).map(r => (
                <button
                  key={r}
                  onClick={() => setRecurrence(r)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                    recurrence === r ? 'bg-[#252525] text-white' : 'text-zinc-600'
                  }`}
                >
                  {r === 'once' ? 'Única' : r === 'monthly' ? 'Mensal' : 'Parcelada'}
                </button>
              ))}
            </div>
            {recurrence === 'installment' && (
              <div className="mt-2 flex items-center gap-2">
                <label className="text-xs text-zinc-500 shrink-0">Total de parcelas:</label>
                <input
                  type="number"
                  min="2"
                  max="120"
                  value={installments}
                  onChange={e => setInstallments(e.target.value)}
                  className="w-20 bg-[#1a1a1a] border border-[#252525] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500 text-center"
                />
                <span className="text-xs text-zinc-600">meses</span>
              </div>
            )}
            {recurrence === 'monthly' && (
              <p className="text-[11px] text-zinc-600 mt-1.5 flex items-center gap-1">
                <RefreshCw size={10} className="text-green-500" />
                Será criada automaticamente por 12 meses
              </p>
            )}
          </div>
        )}

        {/* Savings hint */}
        {mode === 'savings' && (
          <div className="px-5 mb-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/8 border border-blue-500/15">
              <PiggyBank size={13} className="text-blue-400 shrink-0" />
              <p className="text-xs text-blue-300/80">Valor reservado para poupança ou investimento</p>
            </div>
          </div>
        )}

        {/* Fields */}
        <div className="px-5 space-y-3" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
          <div>
            <label className="text-xs text-zinc-500 font-medium mb-1.5 block">Descrição</label>
            <input
              autoFocus
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={mode === 'savings' ? 'Ex: Reserva de emergência' : mode === 'income' ? 'Ex: Salário' : 'Ex: Conta de luz'}
              className="w-full bg-[#1a1a1a] border border-[#252525] rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-700 focus:outline-none focus:border-zinc-500 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-500 font-medium mb-1.5 block">Valor (R$)</label>
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0,00"
              className="w-full bg-[#1a1a1a] border border-[#252525] rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-700 focus:outline-none focus:border-zinc-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-500 font-medium mb-1.5 block">Categoria</label>
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#252525] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-500 transition-colors appearance-none"
              >
                {!isSavingsMode && <option value="">Nenhuma</option>}
                {filteredCats.map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-zinc-500 font-medium mb-1.5 block">
                {mode === 'income' ? 'Data de recebimento' : isBill ? 'Vencimento (1ª)' : 'Data'}
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#252525] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-500 transition-colors"
              />
            </div>
          </div>

          {mode === 'expense' && isBill && (
            <div className="flex gap-2">
              {(['pending', 'paid'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                    status === s
                      ? s === 'paid'
                        ? 'bg-green-500/15 border-green-500/25 text-green-400'
                        : 'bg-amber-500/15 border-amber-500/25 text-amber-400'
                      : 'bg-[#1a1a1a] border-[#252525] text-zinc-600'
                  }`}
                >
                  {s === 'paid' ? 'Pago' : 'Pendente'}
                </button>
              ))}
            </div>
          )}

          {/* Convert to recurring — only when editing a non-recurring bill */}
          {canConvertToRecurring && (
            <div className="rounded-2xl border border-[#252525] p-3 bg-[#1a1a1a] space-y-2">
              <label className="text-xs text-zinc-500 font-medium flex items-center gap-1.5">
                <RefreshCw size={11} className="text-green-400" />
                Tornar recorrente
              </label>
              <div className="flex bg-[#141414] rounded-xl p-1 border border-[#252525]">
                {(['once', 'monthly', 'installment'] as Recurrence[]).map(r => (
                  <button
                    key={r}
                    onClick={() => setMakeRecurring(r)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                      makeRecurring === r ? 'bg-[#252525] text-white' : 'text-zinc-600'
                    }`}
                  >
                    {r === 'once' ? 'Não' : r === 'monthly' ? 'Mensal' : 'Parcelada'}
                  </button>
                ))}
              </div>
              {makeRecurring === 'installment' && (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-zinc-500 shrink-0">Total de parcelas:</label>
                  <input
                    type="number"
                    min="2"
                    max="120"
                    value={makeInstallments}
                    onChange={e => setMakeInstallments(e.target.value)}
                    className="w-20 bg-[#141414] border border-[#252525] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500 text-center"
                  />
                  <span className="text-xs text-zinc-600">meses</span>
                </div>
              )}
              {makeRecurring === 'monthly' && (
                <p className="text-[11px] text-zinc-600 flex items-center gap-1">
                  <RefreshCw size={9} className="text-green-500" />
                  Esta conta vai repetir por mais 11 meses
                </p>
              )}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving || !description.trim() || !amount}
            className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-1 ${
              mode === 'savings'
                ? 'bg-blue-500 hover:bg-blue-400 text-white'
                : 'bg-green-500 hover:bg-green-400 text-black'
            }`}
          >
            {saving
              ? 'Salvando...'
              : isEdit
                ? canConvertToRecurring && makeRecurring !== 'once'
                  ? makeRecurring === 'monthly'
                    ? 'Salvar e tornar mensal'
                    : `Salvar e criar ${makeInstallments || '?'} parcelas`
                  : 'Salvar alterações'
                : mode === 'savings'
                  ? 'Guardar poupança'
                  : recurrence === 'monthly'
                    ? 'Criar mensal (12 meses)'
                    : recurrence === 'installment'
                      ? `Criar ${installments || '?'} parcelas`
                      : 'Salvar'}
          </button>

          {isEdit && (
            confirmDelete ? (
              <div className="flex gap-2">
                <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2.5 rounded-xl bg-[#1a1a1a] border border-[#252525] text-zinc-500 text-xs font-medium">
                  Cancelar
                </button>
                <button onClick={async () => { await deleteTransaction(transaction!.id); onClose() }} className="flex-1 py-2.5 rounded-xl bg-red-500/15 border border-red-500/25 text-red-400 text-xs font-semibold">
                  Confirmar exclusão
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-zinc-600 hover:text-red-400 transition-colors">
                <Trash2 size={12} />
                Excluir lançamento
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}

