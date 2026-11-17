import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Upload, CheckCircle, AlertCircle, ArrowRight, ChevronDown } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { formatCurrency } from '../../lib/utils'
import type { Transaction } from '../../types'

type Step = 'upload' | 'map' | 'preview' | 'done'

interface RawRow { [key: string]: string | number | null }

interface ColMap {
  date: string
  description: string
  amount: string
  amountCredit?: string  // separate credit column if any
  type?: string
  category?: string
  status?: string
  dueDate?: string
}

// Auto-detect column names (case-insensitive, strips accents)
function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

const DATE_HINTS     = ['data', 'date', 'dt ', 'dia', 'competencia']
const DESC_HINTS     = ['descri', 'historico', 'memo', 'detalhe', 'lancamento', 'estabelec']
const AMT_HINTS      = ['valor', 'amount', 'value', 'montante', 'debito', 'debit', 'saida', 'gasto']
const CREDIT_HINTS   = ['credito', 'credit', 'entrada', 'receita']
const CAT_HINTS      = ['categ', 'grupo', 'tipo de gasto']
const STATUS_HINTS   = ['status', 'situacao', 'pago', 'pagamento']
const DUEDATE_HINTS  = ['vencimento', 'vence', 'due']
const TYPE_HINTS     = ['tipo', 'type', 'd/c', 'natureza', 'operacao']

function autoDetect(headers: string[]): Partial<ColMap> {
  const find = (hints: string[]) =>
    headers.find(h => hints.some(hint => normalize(h).includes(hint)))
  return {
    date:        find(DATE_HINTS),
    description: find(DESC_HINTS),
    amount:      find(AMT_HINTS),
    amountCredit:find(CREDIT_HINTS),
    type:        find(TYPE_HINTS),
    category:    find(CAT_HINTS),
    status:      find(STATUS_HINTS),
    dueDate:     find(DUEDATE_HINTS),
  }
}

function parseDate(raw: string | number | null): string | null {
  if (!raw) return null
  // Excel serial number
  if (typeof raw === 'number') {
    const d = XLSX.SSF.parse_date_code(raw)
    if (d) return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`
  }
  const s = String(raw).trim()
  // dd/mm/yyyy
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (br) return `${br[3].length===2?'20'+br[3]:br[3]}-${br[2].padStart(2,'0')}-${br[1].padStart(2,'0')}`
  // yyyy-mm-dd
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  // mm/dd/yyyy
  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (us) return `${us[3]}-${us[1].padStart(2,'0')}-${us[2].padStart(2,'0')}`
  return null
}

function parseAmount(raw: string | number | null): number {
  if (raw === null || raw === undefined || raw === '') return 0
  if (typeof raw === 'number') return Math.abs(raw)
  const s = String(raw).replace(/[R$\s]/g,'').replace(/\./g,'').replace(',','.')
  return Math.abs(parseFloat(s) || 0)
}

function parseType(raw: string | number | null): 'expense' | 'income' {
  if (!raw) return 'expense'
  const s = normalize(String(raw))
  if (s.includes('c') || s.includes('cred') || s.includes('entr') || s.includes('receit')) return 'income'
  return 'expense'
}

export function SpreadsheetImport() {
  const { categories, bulkImport } = useApp()
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('upload')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<RawRow[]>([])
  const [colMap, setColMap] = useState<Partial<ColMap>>({})
  const [preview, setPreview] = useState<Omit<Transaction,'id'|'user_id'|'created_at'>[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ count: number; error?: string } | null>(null)
  const [fileName, setFileName] = useState('')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  const handleFile = async (file: File) => {
    setError(''); setProcessing(true); setFileName(file.name)
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array', cellDates: false })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const data: RawRow[] = XLSX.utils.sheet_to_json(ws, { defval: null, raw: true })
      if (!data.length) { setError('Planilha vazia ou sem dados.'); setProcessing(false); return }
      const hdrs = Object.keys(data[0])
      setHeaders(hdrs)
      setRows(data)
      setColMap(autoDetect(hdrs))
      setStep('map')
    } catch {
      setError('Não foi possível ler o arquivo. Certifique-se que é .xlsx, .xls ou .csv.')
    }
    setProcessing(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) await handleFile(file)
  }

  const buildPreview = () => {
    if (!colMap.date || !colMap.description || !colMap.amount) return

    const mapped = rows.flatMap(row => {
      const rawDate  = row[colMap.date!]
      const rawDesc  = row[colMap.description!]
      const rawAmt   = row[colMap.amount!]
      const rawCredit= colMap.amountCredit ? row[colMap.amountCredit] : null

      const dateStr = parseDate(rawDate)
      if (!dateStr) return []
      const desc = String(rawDesc || '').trim()
      if (!desc) return []

      const expenseAmt = parseAmount(rawAmt)
      const creditAmt  = rawCredit !== null ? parseAmount(rawCredit) : 0

      const [year, month] = dateStr.split('-').map(Number)

      const makeRow = (amount: number, type: 'expense' | 'income') => {
        const catText = colMap.category ? String(row[colMap.category!] || '') : ''
        const matchCat = categories.find(c =>
          normalize(c.name).includes(normalize(catText)) || normalize(catText).includes(normalize(c.name))
        )
        const rawType = colMap.type ? row[colMap.type!] : null
        const finalType = rawType ? parseType(rawType) : type
        const finalCat = matchCat || categories.find(c => c.type === finalType) || categories[0]

        const rawStatus = colMap.status ? String(row[colMap.status!] || '') : ''
        const status: 'paid' | 'pending' = normalize(rawStatus).includes('pag') ? 'paid' : 'pending'

        const rawDue = colMap.dueDate ? row[colMap.dueDate!] : null
        const dueDate = rawDue ? parseDate(rawDue) : dateStr

        return {
          description: desc,
          amount,
          type: finalType,
          status,
          category_id: finalCat?.id || '',
          due_date: dueDate || undefined,
          source: 'import' as const,
          month,
          year,
        }
      }

      if (creditAmt > 0 && expenseAmt > 0) {
        // separate debit/credit columns
        const out = []
        if (expenseAmt > 0) out.push(makeRow(expenseAmt, 'expense'))
        if (creditAmt  > 0) out.push(makeRow(creditAmt,  'income'))
        return out
      }
      if (creditAmt > 0) return [makeRow(creditAmt, 'income')]
      if (expenseAmt > 0) return [makeRow(expenseAmt, 'expense')]
      return []
    })

    setPreview(mapped)
    setStep('preview')
  }

  const handleImport = async () => {
    setImporting(true)
    const res = await bulkImport(preview)
    setResult(res)
    setImporting(false)
    setStep('done')
  }

  const totalExpense = preview.filter(r => r.type==='expense').reduce((s,r)=>s+r.amount,0)
  const totalIncome  = preview.filter(r => r.type==='income').reduce((s,r)=>s+r.amount,0)

  const ColSelect = ({ field, label, required }: { field: keyof ColMap; label: string; required?: boolean }) => (
    <div>
      <label className="text-[11px] text-zinc-500 font-medium block mb-1">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      <div className="relative">
        <select
          value={colMap[field] || ''}
          onChange={e => setColMap(m => ({ ...m, [field]: e.target.value || undefined }))}
          className="w-full bg-[#1a1a1a] border border-[#252525] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-500 appearance-none pr-8"
        >
          <option value="">— não usar —</option>
          {headers.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
      </div>
    </div>
  )

  if (step === 'done') {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        {result?.error ? (
          <>
            <AlertCircle size={48} className="text-red-400 mb-4" />
            <h2 className="text-lg font-semibold text-white mb-2">Erro na importação</h2>
            <p className="text-zinc-400 text-sm mb-6">{result.error}</p>
          </>
        ) : (
          <>
            <CheckCircle size={48} className="text-green-400 mb-4" />
            <h2 className="text-lg font-semibold text-white mb-2">Importação concluída!</h2>
            <p className="text-zinc-400 text-sm mb-1">{result?.count} transações importadas.</p>
            <p className="text-zinc-600 text-xs mb-6">Os dados estão distribuídos nos meses corretos.</p>
          </>
        )}
        <button
          onClick={() => { setStep('upload'); setRows([]); setHeaders([]); setPreview([]); setResult(null) }}
          className="py-3 px-6 rounded-xl bg-green-500 text-black font-semibold text-sm"
        >
          Nova importação
        </button>
      </div>
    )
  }

  if (step === 'preview') {
    const years = [...new Set(preview.map(r => r.year))].sort()
    return (
      <div className="pb-24">
        <div className="sticky top-0 z-10 bg-[#0d0d0d] px-5 py-3 border-b border-[#1f1f1f]">
          <h2 className="text-base font-semibold text-white">Pré-visualização</h2>
          <p className="text-xs text-zinc-500">{preview.length} lançamentos · {years[0]}–{years[years.length-1]}</p>
        </div>

        {/* Summary */}
        <div className="px-5 py-3 grid grid-cols-2 gap-2">
          <div className="bg-[#161616] border border-[#252525] rounded-2xl p-3">
            <p className="text-[10px] text-zinc-500 mb-1">Gastos</p>
            <p className="text-sm font-bold text-red-400">{formatCurrency(totalExpense)}</p>
            <p className="text-[10px] text-zinc-600">{preview.filter(r=>r.type==='expense').length} lançamentos</p>
          </div>
          <div className="bg-[#161616] border border-[#252525] rounded-2xl p-3">
            <p className="text-[10px] text-zinc-500 mb-1">Receitas</p>
            <p className="text-sm font-bold text-green-400">{formatCurrency(totalIncome)}</p>
            <p className="text-[10px] text-zinc-600">{preview.filter(r=>r.type==='income').length} lançamentos</p>
          </div>
        </div>

        {/* Sample rows */}
        <div className="px-5 space-y-2 pb-4">
          <p className="text-[10px] text-zinc-600 font-semibold uppercase tracking-widest mb-2">Primeiros registros</p>
          {preview.slice(0, 20).map((r, i) => (
            <div key={i} className="flex items-center gap-3 bg-[#161616] border border-[#252525] rounded-xl px-3 py-2.5">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: r.type === 'income' ? '#22c55e' : '#f87171' }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white truncate">{r.description}</p>
                <p className="text-[10px] text-zinc-600">{r.due_date} · {r.month}/{r.year}</p>
              </div>
              <p className={`text-xs font-semibold shrink-0 ${r.type==='income' ? 'text-green-400' : 'text-red-400'}`}>
                {r.type==='income'?'+':'-'}{formatCurrency(r.amount)}
              </p>
            </div>
          ))}
          {preview.length > 20 && (
            <p className="text-xs text-zinc-600 text-center py-2">... e mais {preview.length - 20} registros</p>
          )}
        </div>

        {/* Footer */}
        <div className="fixed bottom-[72px] left-0 right-0 max-w-lg mx-auto px-5 pb-4 pt-3 bg-[#0d0d0d] border-t border-[#1f1f1f] z-10">
          <div className="flex gap-3">
            <button onClick={() => setStep('map')} className="flex-1 py-3 rounded-xl bg-[#1a1a1a] border border-[#252525] text-sm text-zinc-400">
              Voltar
            </button>
            <button
              onClick={handleImport}
              disabled={importing}
              className="flex-1 py-3 rounded-xl bg-green-500 text-black font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {importing ? (
                <><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> Importando...</>
              ) : (
                <>Importar {preview.length} lançamentos <ArrowRight size={14} /></>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'map') {
    const canProceed = !!(colMap.date && colMap.description && colMap.amount)
    return (
      <div className="pb-32">
        <div className="px-5 pt-4 pb-3 border-b border-[#1f1f1f]">
          <h2 className="text-base font-semibold text-white">Mapeamento de colunas</h2>
          <p className="text-xs text-zinc-500">{fileName} · {rows.length} linhas</p>
        </div>

        {/* Column sample */}
        <div className="px-5 py-3">
          <p className="text-[10px] text-zinc-600 font-semibold uppercase tracking-widest mb-2">Colunas detectadas</p>
          <div className="flex flex-wrap gap-1.5">
            {headers.map(h => (
              <span key={h} className="text-[11px] bg-[#1a1a1a] border border-[#252525] rounded-lg px-2 py-1 text-zinc-400">{h}</span>
            ))}
          </div>
        </div>

        <div className="px-5 space-y-3">
          <ColSelect field="date"        label="Coluna de data"            required />
          <ColSelect field="description" label="Coluna de descrição"       required />
          <ColSelect field="amount"      label="Coluna de valor (gasto/débito)" required />
          <ColSelect field="amountCredit"label="Coluna de crédito/entrada (se separado)" />
          <ColSelect field="type"        label="Coluna de tipo (D/C, entrada/saída)" />
          <ColSelect field="category"    label="Coluna de categoria" />
          <ColSelect field="status"      label="Coluna de status (pago/pendente)" />
          <ColSelect field="dueDate"     label="Coluna de vencimento" />
        </div>

        {/* Preview of raw data */}
        <div className="px-5 mt-4">
          <p className="text-[10px] text-zinc-600 font-semibold uppercase tracking-widest mb-2">Exemplo (3 primeiras linhas)</p>
          <div className="overflow-x-auto rounded-xl border border-[#252525]">
            <table className="text-[10px] text-zinc-400 min-w-full">
              <thead>
                <tr className="bg-[#1a1a1a]">
                  {headers.slice(0, 6).map(h => (
                    <th key={h} className="px-3 py-2 text-left text-zinc-500 font-medium border-b border-[#252525]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 3).map((row, i) => (
                  <tr key={i} className="border-b border-[#1f1f1f]">
                    {headers.slice(0, 6).map(h => (
                      <td key={h} className="px-3 py-2 truncate max-w-[80px]">{String(row[h] ?? '')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="fixed bottom-[72px] left-0 right-0 max-w-lg mx-auto px-5 pb-4 pt-3 bg-[#0d0d0d] border-t border-[#1f1f1f]">
          <button
            onClick={buildPreview}
            disabled={!canProceed}
            className="w-full py-3.5 rounded-xl bg-green-500 text-black font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
          >
            Pré-visualizar <ArrowRight size={14} />
          </button>
          {!canProceed && <p className="text-[11px] text-zinc-600 text-center mt-2">Selecione data, descrição e valor para continuar</p>}
        </div>
      </div>
    )
  }

  // Upload step
  return (
    <div className="px-5 py-4 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-white">Importar planilha</h2>
        <p className="text-sm text-zinc-500 mt-0.5">Envie sua planilha de 4 anos — o app distribui tudo nos meses certos</p>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-[#2a2a2a] hover:border-green-500/40 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-colors"
      >
        {processing ? (
          <>
            <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-zinc-400 text-sm">Lendo planilha...</p>
          </>
        ) : (
          <>
            <Upload size={32} className="text-zinc-600 mb-3" />
            <p className="text-white text-sm font-medium text-center">Arraste ou clique para selecionar</p>
            <p className="text-zinc-600 text-xs mt-1">.xlsx · .xls · .csv</p>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-400 flex gap-2">
          <AlertCircle size={15} className="shrink-0 mt-0.5" /> {error}
        </div>
      )}

      <div className="bg-[#161616] rounded-2xl p-4 border border-[#252525] space-y-2">
        <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wide">O que funciona</p>
        <div className="space-y-1.5 text-xs text-zinc-400">
          <p>✓ Excel (.xlsx, .xls) e CSV</p>
          <p>✓ Datas em qualquer formato (dd/mm/aaaa, etc.)</p>
          <p>✓ Colunas separadas para débito e crédito</p>
          <p>✓ Categorias mapeadas automaticamente</p>
          <p>✓ Distribui os lançamentos pelos meses corretos</p>
        </div>
      </div>
    </div>
  )
}
