import { useState, useEffect } from 'react'
import { X, ArrowDownCircle, ArrowUpCircle, Trash2, Receipt, ShoppingBag, PiggyBank } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { supabase } from '../../lib/supabase'
import { getCurrentMonthYear } from '../../lib/utils'
import type { Transaction, TransactionType } from '../../types'

type Mode = 'expense' | 'savings' | 'income'

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
  const { categories, addTransaction, updateTransaction, deleteTransaction, currentMonth, currentYear } = useApp()
  const isEdit = !!transaction

  // Derive initial mode from transaction or defaults
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

  const [mode, setMode]           = useState<Mode>(initMode)
  const [isBill, setIsBill]       = useState<boolean>(transaction?.is_bill ?? defaultIsBill)
  const [description, setDescription] = useState(transaction?.description ?? '')
  const [amount, setAmount]       = useState(transaction ? String(transaction.amount) : '')
  const [categoryId, setCategoryId] = useState(transaction?.category_id ?? '')
  const [dueDate, setDueDate]     = useState(transaction?.due_date ?? '')
  const [status, setStatus]       = useState<'pending' | 'paid'>(
    transaction?.status === 'paid' ? 'paid' : 'pending'
  )
  const [saving, setSaving]       = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { month, year } = getCurrentMonthYear()

  // Derived values from mode
  const type: TransactionType = mode === 'income' ? 'income' : 'expense'
  const isSavingsMode = mode === 'savings'

  const filteredCats = isSavingsMode
    ? categories.filter(c => c.type === 'savings')
    : categories.filter(c => c.type === type)

  // Reset category when mode changes
  useEffect(() => {
    if (!isEdit) setCategoryId('')
    if (mode !== 'expense') setIsBill(false)
  }, [mode, isEdit])

  // Auto-select first savings category when switching to savings mode
  useEffect(() => {
    if (isSavingsMode && !isEdit && filteredCats.length > 0 && !categoryId) {
      setCategoryId(filteredCats[0].id)
    }
  }, [isSavingsMode, filteredCats, isEdit, categoryId])

  const saveKeywordRule = async (desc: string, catId: string) => {
    if (!catId) return
    const cat = categories.find(c => c.id === catId)
    if (!cat) return
    const normalized = desc.trim().toLowerCase()
    if (!normalized || cat.keywords.map(k => k.toLowerCase()).includes(normalized)) return
    await supabase.from('categories').update({ keywords: [...cat.keywords, desc.trim()] }).eq('id', catId)
  }

  const handleSave = async () => {
    if (!description.trim() || !amount) return
    setSaving(true)
    const effectiveStatus = (type === 'expense' && !isBill) ? 'paid' : status
    const descTrimmed = description.trim()
    if (categoryId) await saveKeywordRule(descTrimmed, categoryId)
    const payload = {
      description: descTrimmed,
      amount: parseFloat(amount.replace(',', '.')),
      type,
      status: effectiveStatus,
      is_bill: isBill,
      category_id: categoryId,
      due_date: dueDate || undefined,
    }
    if (isEdit) {
      await updateTransaction(transaction.id, payload)
    } else {
      await addTransaction({
        ...payload,
        month: forceMonth ?? currentMonth ?? month,
        year: forceYear ?? currentYear ?? year,
        source: 'manual',
      })
    }
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center px-0 lg:px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-md rounded-t-3xl lg:rounded-3xl border border-[#252525] overflow-hidden"
        style={{ background: '#141414' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
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

        {/* Mode toggle: Gasto | Poupança | Receita */}
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

        {/* Bill toggle — only for expenses (not savings) */}
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
                {mode === 'income' ? 'Data de recebimento' : isBill ? 'Vencimento' : 'Data'}
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

          <button
            onClick={handleSave}
            disabled={saving || !description.trim() || !amount}
            className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-1 ${
              mode === 'savings'
                ? 'bg-blue-500 hover:bg-blue-400 text-white'
                : 'bg-green-500 hover:bg-green-400 text-black'
            }`}
          >
            {saving ? 'Salvando...' : isEdit ? 'Salvar alterações' : mode === 'savings' ? 'Guardar poupança' : 'Salvar'}
          </button>

          {isEdit && (
            confirmDelete ? (
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#1a1a1a] border border-[#252525] text-zinc-500 text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => { await deleteTransaction(transaction!.id); onClose() }}
                  className="flex-1 py-2.5 rounded-xl bg-red-500/15 border border-red-500/25 text-red-400 text-xs font-semibold"
                >
                  Confirmar exclusão
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-zinc-600 hover:text-red-400 transition-colors"
              >
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
