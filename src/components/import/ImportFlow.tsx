import { useState, useRef } from 'react'
import { Upload, AlertCircle, CheckCircle, Trash2, CreditCard, Building2 } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { parseOFX, parseCSV } from '../../lib/parsers'
import { categorizeByKeywords } from '../../lib/categorizer'
import { formatCurrency, formatDate } from '../../lib/utils'
import type { ExtractedTransaction, ImportFileType } from '../../types'

type StatementType = 'credit' | 'debit'

export function ImportFlow() {
  const { categories, addTransaction, currentMonth, currentYear } = useApp()
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<'upload' | 'review'>('upload')
  const [fileType, setFileType] = useState<ImportFileType>('ofx')
  const [statementType, setStatementType] = useState<StatementType>('debit')
  const [extracted, setExtracted] = useState<ExtractedTransaction[]>([])
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const handleFile = async (file: File) => {
    setError('')
    setProcessing(true)

    const content = await file.text()
    let transactions: ExtractedTransaction[] = []

    if (fileType === 'ofx') {
      transactions = parseOFX(content)
    } else if (fileType === 'csv') {
      transactions = parseCSV(content)
    } else {
      setError('Extração automática de PDF requer configuração do backend. Use OFX ou CSV.')
      setProcessing(false)
      return
    }

    if (transactions.length === 0) {
      setError('Nenhuma transação encontrada no arquivo. Verifique o formato.')
      setProcessing(false)
      return
    }

    // Auto-categorize; credit card → force expense
    const categorized = transactions.map(t => {
      const cat = categorizeByKeywords(t.description, categories)
      const expCat = categories.find(c => c.type === 'expense')
      const forcedCatId = statementType === 'credit'
        ? (cat?.type === 'expense' ? cat.id : expCat?.id)
        : cat?.id
      return {
        ...t,
        category_id: forcedCatId || categories.find(c => c.name === 'Sem categoria')?.id,
        // flag for use at import time
        _statementType: statementType,
      }
    })

    setExtracted(categorized)
    setStep('review')
    setProcessing(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) await handleFile(file)
  }

  const toggleSelect = (id: string) => {
    setExtracted(prev => prev.map(t => t.id === id ? { ...t, selected: !t.selected } : t))
  }

  const updateCategory = (id: string, categoryId: string) => {
    setExtracted(prev => prev.map(t => t.id === id ? { ...t, category_id: categoryId } : t))
  }

  const removeItem = (id: string) => {
    setExtracted(prev => prev.filter(t => t.id !== id))
  }

  const selectAll = () => setExtracted(prev => prev.map(t => ({ ...t, selected: true })))
  const deselectAll = () => setExtracted(prev => prev.map(t => ({ ...t, selected: false })))

  const selectedItems = extracted.filter(t => t.selected)
  const totalSelected = selectedItems.reduce((s, t) => s + t.amount, 0)

  const handleImport = async () => {
    if (selectedItems.length === 0) return
    setSaving(true)

    for (const t of selectedItems) {
      const cat = categories.find(c => c.id === t.category_id)
      const isCredit = (t as ExtractedTransaction & { _statementType?: StatementType })._statementType === 'credit'
      const txType = isCredit ? 'expense' : (cat?.type === 'income' ? 'income' : 'expense')
      await addTransaction({
        description: t.description,
        amount: t.amount,
        due_date: t.date || undefined,
        type: txType,
        category_id: t.category_id || categories[0]?.id,
        status: 'pending',
        source: 'import',
        month: currentMonth,
        year: currentYear,
      })
    }

    setSaving(false)
    setDone(true)
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <CheckCircle size={48} className="text-green-400 mb-4" />
        <h2 className="text-lg font-semibold text-white mb-2">Importação concluída!</h2>
        <p className="text-zinc-400 text-sm mb-6">{selectedItems.length} transações importadas.</p>
        <button
          onClick={() => { setStep('upload'); setExtracted([]); setDone(false) }}
          className="py-3 px-6 rounded-xl bg-green-500 text-black font-semibold text-sm"
        >
          Nova importação
        </button>
      </div>
    )
  }

  if (step === 'review') {
    return (
      <div className="pb-4">
        <div className="px-4 py-3 border-b border-[#1f1f1f] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h2 className="text-base font-semibold text-white">Revisar importação</h2>
              <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                statementType === 'credit'
                  ? 'bg-purple-500/15 text-purple-400'
                  : 'bg-blue-500/15 text-blue-400'
              }`}>
                {statementType === 'credit' ? <CreditCard size={10} /> : <Building2 size={10} />}
                {statementType === 'credit' ? 'Cartão de crédito' : 'Conta débito'}
              </span>
            </div>
            <p className="text-xs text-zinc-500">{extracted.length} transações encontradas</p>
          </div>
          <div className="flex gap-2">
            <button onClick={selectAll} className="text-xs text-zinc-400 hover:text-white">Todos</button>
            <span className="text-zinc-700">·</span>
            <button onClick={deselectAll} className="text-xs text-zinc-400 hover:text-white">Nenhum</button>
          </div>
        </div>

        <div className="px-4 mt-3 space-y-2">
          {extracted.map(t => (
            <div key={t.id} className={`bg-[#1a1a1a] rounded-xl border ${t.selected ? 'border-zinc-600' : 'border-[#2a2a2a] opacity-50'} p-3`}>
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={t.selected}
                  onChange={() => toggleSelect(t.id)}
                  className="mt-1 accent-green-500"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{t.description}</p>
                  <p className="text-xs text-zinc-500">{t.date ? formatDate(t.date) : '—'}</p>
                  <select
                    value={t.category_id || ''}
                    onChange={e => updateCategory(t.id, e.target.value)}
                    className="mt-1.5 w-full bg-[#111] border border-[#333] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
                  >
                    <option value="">Sem categoria</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="text-sm font-semibold text-white">{formatCurrency(t.amount)}</span>
                  <button onClick={() => removeItem(t.id)} className="text-zinc-600 hover:text-red-400">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#0f0f0f] border-t border-[#1f1f1f] p-4 mt-4">
          <div className="flex justify-between text-sm mb-3">
            <span className="text-zinc-400">{selectedItems.length} selecionadas</span>
            <span className="text-white font-semibold">Total: {formatCurrency(totalSelected)}</span>
          </div>
          <button
            onClick={handleImport}
            disabled={saving || selectedItems.length === 0}
            className="w-full py-3.5 rounded-xl bg-green-500 text-black font-semibold text-sm disabled:opacity-50"
          >
            {saving ? 'Importando...' : `Confirmar importação (${selectedItems.length})`}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-4 space-y-4">
      <h2 className="text-base font-semibold text-white">Importar fatura / extrato</h2>

      {/* Statement type selector */}
      <div>
        <label className="block text-xs text-zinc-500 mb-2">Tipo de extrato</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setStatementType('credit')}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium border transition-colors ${
              statementType === 'credit'
                ? 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                : 'bg-[#1a1a1a] border-[#2a2a2a] text-zinc-400 hover:text-white'
            }`}
          >
            <CreditCard size={14} />
            Cartão de crédito
          </button>
          <button
            onClick={() => setStatementType('debit')}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium border transition-colors ${
              statementType === 'debit'
                ? 'bg-blue-500/15 border-blue-500/30 text-blue-300'
                : 'bg-[#1a1a1a] border-[#2a2a2a] text-zinc-400 hover:text-white'
            }`}
          >
            <Building2 size={14} />
            Conta débito
          </button>
        </div>
        <p className="text-[11px] text-zinc-600 mt-1.5">
          {statementType === 'credit'
            ? 'Fatura do cartão — todos os lançamentos entram como gasto'
            : 'Extrato de conta — entradas viram receita, saídas viram gasto'}
        </p>
      </div>

      {/* File type selector */}
      <div>
        <label className="block text-xs text-zinc-500 mb-2">Formato do arquivo</label>
        <div className="grid grid-cols-3 gap-2">
          {(['ofx', 'csv', 'pdf'] as ImportFileType[]).map(ft => (
            <button
              key={ft}
              onClick={() => setFileType(ft)}
              className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                fileType === ft
                  ? 'bg-green-500/15 border-green-500/30 text-green-400'
                  : 'bg-[#1a1a1a] border-[#2a2a2a] text-zinc-400 hover:text-white'
              }`}
            >
              {ft.toUpperCase()}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-zinc-600 mt-1.5">
          {fileType === 'ofx' && 'Extrato bancário no formato OFX (disponível na maioria dos bancos)'}
          {fileType === 'csv' && 'Extrato em CSV — Nubank, Inter, C6 e outros exportam neste formato'}
          {fileType === 'pdf' && 'PDF requer configuração do backend (Supabase Edge Function)'}
        </p>
      </div>

      {fileType === 'pdf' ? (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-sm text-yellow-300">
          <AlertCircle size={16} className="inline mr-2" />
          Extração de PDF requer uma Edge Function no Supabase. Por enquanto, exporte como OFX ou CSV no seu banco/app de cartão.
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-[#2a2a2a] hover:border-zinc-500 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-colors"
        >
          {processing ? (
            <>
              <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-zinc-400 text-sm">Processando arquivo...</p>
            </>
          ) : (
            <>
              <Upload size={32} className="text-zinc-600 mb-3" />
              <p className="text-white text-sm font-medium">Arraste ou clique para selecionar</p>
              <p className="text-zinc-600 text-xs mt-1">{fileType.toUpperCase()} · máx. 10MB</p>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept={fileType === 'ofx' ? '.ofx' : '.csv'}
            className="hidden"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] space-y-2">
        <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Como exportar</p>
        <div className="space-y-1.5 text-xs text-zinc-400">
          <p>• <strong className="text-zinc-300">Nubank:</strong> App → Perfil → Exportar extrato (CSV)</p>
          <p>• <strong className="text-zinc-300">Itaú/Bradesco:</strong> Internet banking → Extrato → Exportar OFX</p>
          <p>• <strong className="text-zinc-300">Inter/C6:</strong> App → Extrato → Exportar CSV</p>
        </div>
      </div>
    </div>
  )
}
