import { useState } from 'react'
import { X } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import type { TransactionType, TransactionStatus } from '../../types'

interface TransactionModalProps {
  onClose: () => void
  defaultType?: TransactionType
}

export function TransactionModal({ onClose, defaultType = 'expense' }: TransactionModalProps) {
  const { categories, addTransaction, currentMonth, currentYear } = useApp()
  const { user } = useAuth()
  const [type, setType] = useState<TransactionType>(defaultType)
  const [description, setDescription] = useState('')
  const [amountStr, setAmountStr] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [status, setStatus] = useState<TransactionStatus>('pending')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const filteredCategories = categories.filter(c => c.type === type)

  const handleAmountChange = (val: string) => {
    // Allow only numbers and comma/dot
    const clean = val.replace(/[^\d,]/g, '')
    setAmountStr(clean)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim()) return setError('Informe a descrição')
    if (!amountStr) return setError('Informe o valor')
    if (!categoryId) return setError('Selecione uma categoria')
    if (!user) return

    const amount = parseFloat(amountStr.replace(',', '.'))
    if (isNaN(amount) || amount <= 0) return setError('Valor inválido')

    setSaving(true)
    setError('')
    await addTransaction({
      description: description.trim(),
      amount,
      type,
      category_id: categoryId,
      due_date: dueDate || undefined,
      status: type === 'income' ? 'paid' : status,
      source: 'manual',
      month: currentMonth,
      year: currentYear,
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70">
      <div className="bg-[#1a1a1a] rounded-t-2xl sm:rounded-2xl w-full max-w-lg border border-[#2a2a2a] max-h-[90dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2a2a2a]">
          <h2 className="text-base font-semibold text-white">Novo lançamento</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Type toggle */}
          <div className="flex rounded-xl overflow-hidden border border-[#2a2a2a]">
            {(['expense', 'income'] as TransactionType[]).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => { setType(t); setCategoryId('') }}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  type === t
                    ? t === 'income' ? 'bg-green-500 text-black' : 'bg-red-500 text-white'
                    : 'text-zinc-500 hover:text-white'
                }`}
              >
                {t === 'expense' ? '💸 Gasto' : '💰 Receita'}
              </button>
            ))}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">Descrição</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ex: Conta de luz"
              className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-3.5 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 text-sm"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">Valor (R$)</label>
            <input
              type="text"
              inputMode="decimal"
              value={amountStr}
              onChange={e => handleAmountChange(e.target.value)}
              placeholder="0,00"
              className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-3.5 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 text-lg font-semibold"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">Categoria</label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-3.5 py-3 text-white focus:outline-none focus:border-zinc-500 text-sm appearance-none"
            >
              <option value="">Selecione...</option>
              {filteredCategories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Due date */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">Data de vencimento</label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-3.5 py-3 text-white focus:outline-none focus:border-zinc-500 text-sm"
            />
          </div>

          {/* Status (only for expenses) */}
          {type === 'expense' && (
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">Status</label>
              <div className="flex gap-2">
                {(['pending', 'paid'] as TransactionStatus[]).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                      status === s
                        ? s === 'paid'
                          ? 'bg-green-500/20 border-green-500/40 text-green-400'
                          : 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400'
                        : 'border-[#2a2a2a] text-zinc-500 hover:text-white'
                    }`}
                  >
                    {s === 'pending' ? '⏰ Pendente' : '✅ Pago'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 rounded-xl bg-green-500 text-black font-semibold text-sm hover:bg-green-400 transition-colors disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      </div>
    </div>
  )
}
