import { useState, useEffect } from 'react'
import { X, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { getCurrentMonthYear } from '../../lib/utils'
import type { TransactionType } from '../../types'

interface Props {
  onClose: () => void
  defaultType?: TransactionType
}

export function TransactionModal({ onClose, defaultType = 'expense' }: Props) {
  const { categories, addTransaction, currentMonth, currentYear } = useApp()
  const [type, setType] = useState<TransactionType>(defaultType)
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [status, setStatus] = useState<'pending' | 'paid'>('pending')
  const [saving, setSaving] = useState(false)

  const { month, year } = getCurrentMonthYear()
  const filteredCats = categories.filter(c => c.type === type)

  useEffect(() => {
    setCategoryId('')
  }, [type])

  const handleSave = async () => {
    if (!description.trim() || !amount) return
    setSaving(true)
    await addTransaction({
      description: description.trim(),
      amount: parseFloat(amount.replace(',', '.')),
      type,
      status,
      category_id: categoryId,
      due_date: dueDate || undefined,
      month: currentMonth || month,
      year: currentYear || year,
      source: 'manual',
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full max-w-lg mx-auto rounded-t-3xl border-t border-x border-[#252525] overflow-hidden"
        style={{ background: '#141414' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[#333]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3">
          <h2 className="text-base font-semibold text-white">Novo lançamento</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-[#1e1e1e] text-zinc-500 hover:text-white transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Type toggle */}
        <div className="px-5 mb-4">
          <div className="flex bg-[#1a1a1a] rounded-2xl p-1 border border-[#252525]">
            <button
              onClick={() => setType('expense')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                type === 'expense' ? 'bg-[#252525] text-white' : 'text-zinc-600'
              }`}
            >
              <ArrowDownCircle size={15} className={type === 'expense' ? 'text-red-400' : ''} />
              Gasto
            </button>
            <button
              onClick={() => setType('income')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                type === 'income' ? 'bg-[#252525] text-white' : 'text-zinc-600'
              }`}
            >
              <ArrowUpCircle size={15} className={type === 'income' ? 'text-green-400' : ''} />
              Receita
            </button>
          </div>
        </div>

        {/* Fields */}
        <div className="px-5 space-y-3 pb-6" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
          <div>
            <label className="text-xs text-zinc-500 font-medium mb-1.5 block">Descrição</label>
            <input
              autoFocus
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ex: Conta de luz"
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
                <option value="">Nenhuma</option>
                {filteredCats.map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-zinc-500 font-medium mb-1.5 block">Vencimento</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#252525] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-500 transition-colors"
              />
            </div>
          </div>

          {type === 'expense' && (
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
            className="w-full py-3.5 rounded-xl bg-green-500 hover:bg-green-400 text-black font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-1"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
