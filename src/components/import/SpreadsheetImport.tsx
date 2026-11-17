import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Upload, CheckCircle, AlertCircle, ArrowRight, FileSpreadsheet, Eye } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { formatCurrency } from '../../lib/utils'
import type { Transaction } from '../../types'

// ─── Types ───────────────────────────────────────────────────────────────────
type Step = 'upload' | 'sheets' | 'preview' | 'done'
interface RawRow { [key: string]: string | number | null }
interface SheetInfo {
  name: string
  rows: RawRow[]
  headers: string[]
  type: 'pivot' | 'flat' | 'empty'
  year: number
  preview: Omit<Transaction,'id'|'user_id'|'created_at'>[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const MONTH_MAP: Record<string, number> = {
  jan:1, fev:2, mar:3, abr:4, mai:5, jun:6,
  jul:7, ago:8, set:9, out:10, nov:11, dez:12,
  janeiro:1, fevereiro:2, março:3, marco:3, abril:4, maio:5, junho:6,
  julho:7, agosto:8, setembro:9, outubro:10, novembro:11, dezembro:12,
}

const SKIP_COLS = ['total','soma','saldo','acumulado','acumulados','subtotal','resultado','a pagar']
const SKIP_ROWS = ['total','soma','subtotal','resultado']

function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim()
}

function parseAmount(raw: string | number | null): number {
  if (raw === null || raw === '') return 0
  if (typeof raw === 'number') return Math.abs(raw)
  const s = String(raw).replace(/[R$\s]/g,'').replace(/\./g,'').replace(',','.')
  return Math.abs(parseFloat(s) || 0)
}

function detectYear(sheetName: string, rows: RawRow[]): number {
  // Try sheet name first
  const m = sheetName.match(/\b(20\d{2})\b/)
  if (m) return parseInt(m[1])
  // Try first few rows for a 4-digit year
  for (const row of rows.slice(0, 5)) {
    for (const val of Object.values(row)) {
      if (typeof val === 'number' && val >= 2015 && val <= 2030) return val
      if (typeof val === 'string') {
        const ym = val.match(/\b(20\d{2})\b/)
        if (ym) return parseInt(ym[1])
      }
    }
  }
  // Fallback: guess from sheet order (not ideal)
  return new Date().getFullYear()
}

function detectSheetType(rows: RawRow[]): 'pivot' | 'flat' | 'empty' {
  if (!rows.length) return 'empty'
  const firstKey = Object.keys(rows[0])[0]
  const firstVal = normalize(String(rows[0][firstKey] ?? ''))
  // If first column has month names → pivot
  if (Object.keys(MONTH_MAP).some(m => firstVal.startsWith(m))) return 'pivot'
  // Check a few more rows
  let monthHits = 0
  for (const row of rows.slice(0, 15)) {
    const v = normalize(String(Object.values(row)[0] ?? ''))
    if (Object.keys(MONTH_MAP).some(m => v.startsWith(m))) monthHits++
  }
  if (monthHits >= 3) return 'pivot'
  return 'flat'
}

function parsePivot(
  rows: RawRow[],
  headers: string[],
  year: number,
  categories: { id: string; name: string; type: string }[],
): Omit<Transaction,'id'|'user_id'|'created_at'>[] {
  const result: Omit<Transaction,'id'|'user_id'|'created_at'>[] = []
  const catCols = headers.slice(1).filter(h => !SKIP_COLS.some(s => normalize(h).includes(s)))

  for (const row of rows) {
    const monthRaw = normalize(String(Object.values(row)[0] ?? ''))
    // Skip total/sum rows
    if (SKIP_ROWS.some(s => monthRaw.startsWith(s))) continue
    const month = Object.entries(MONTH_MAP).find(([k]) => monthRaw.startsWith(k))?.[1]
    if (!month) continue

    for (const col of catCols) {
      const amount = parseAmount(row[col])
      if (!amount) continue
      const colNorm = normalize(col)
      // Try to match category by name
      const matchCat = categories.find(c =>
        normalize(c.name).includes(colNorm) || colNorm.includes(normalize(c.name))
      )
      result.push({
        description: col.trim(),
        amount,
        type: (matchCat?.type as 'expense'|'income') || 'expense',
        status: 'paid',
        category_id: matchCat?.id || categories.find(c => c.type === 'expense')?.id || '',
        due_date: `${year}-${String(month).padStart(2,'0')}-01`,
        source: 'import',
        month,
        year,
      })
    }
  }
  return result
}

function parseFlat(
  rows: RawRow[],
  headers: string[],
  categories: { id: string; name: string; type: string }[],
): Omit<Transaction,'id'|'user_id'|'created_at'>[] {
  const norm = (h: string) => normalize(h)
  const dateCols  = ['data','date','dt','dia','vencimento']
  const descCols  = ['descri','historico','memo','detalhe','lancamento']
  const amtCols   = ['valor','amount','value','debito','saida','gasto']
  const credCols  = ['credito','credit','entrada','receita']

  const findCol = (hints: string[]) => headers.find(h => hints.some(hint => norm(h).includes(hint)))
  const dateCol = findCol(dateCols)
  const descCol = findCol(descCols)
  const amtCol  = findCol(amtCols)
  const credCol = findCol(credCols)
  if (!dateCol || !descCol || !amtCol) return []

  return rows.flatMap(row => {
    const rawDate = row[dateCol]
    const rawDesc = row[descCol]
    const rawAmt  = row[amtCol]
    const rawCred = credCol ? row[credCol] : null

    // Date parsing
    let dateStr: string | null = null
    if (typeof rawDate === 'number') {
      const d = XLSX.SSF.parse_date_code(rawDate)
      if (d) dateStr = `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`
    } else if (rawDate) {
      const s = String(rawDate).trim()
      const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
      if (br) dateStr = `${br[3].length===2?'20'+br[3]:br[3]}-${br[2].padStart(2,'0')}-${br[1].padStart(2,'0')}`
      else {
        const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
        if (iso) dateStr = `${iso[1]}-${iso[2]}-${iso[3]}`
      }
    }
    if (!dateStr) return []
    const [yr, mo] = dateStr.split('-').map(Number)
    const desc = String(rawDesc || '').trim()
    if (!desc) return []

    const makeRow = (amount: number, type: 'expense'|'income') => {
      const matchCat = categories.find(c => normalize(c.name).includes(normalize(desc)) || normalize(desc).includes(normalize(c.name)))
      const finalCat = matchCat || categories.find(c => c.type === type) || categories[0]
      return {
        description: desc,
        amount,
        type,
        status: 'paid' as const,
        category_id: finalCat?.id || '',
        due_date: dateStr!,
        source: 'import' as const,
        month: mo,
        year: yr,
      }
    }

    const expAmt  = parseAmount(rawAmt)
    const credAmt = rawCred !== null ? parseAmount(rawCred) : 0
    if (credAmt > 0 && expAmt > 0) return [makeRow(expAmt,'expense'), makeRow(credAmt,'income')]
    if (credAmt > 0) return [makeRow(credAmt,'income')]
    if (expAmt  > 0) return [makeRow(expAmt,'expense')]
    return []
  })
}

// ─── Component ───────────────────────────────────────────────────────────────
export function SpreadsheetImport() {
  const { categories, bulkImport } = useApp()
  const fileRef = useRef<HTMLInputElement>(null)
  const [step,       setStep]       = useState<Step>('upload')
  const [sheets,     setSheets]     = useState<SheetInfo[]>([])
  const [allRows,    setAllRows]    = useState<Omit<Transaction,'id'|'user_id'|'created_at'>[]>([])
  const [importing,  setImporting]  = useState(false)
  const [result,     setResult]     = useState<{ count: number; error?: string } | null>(null)
  const [fileName,   setFileName]   = useState('')
  const [processing, setProcessing] = useState(false)
  const [error,      setError]      = useState('')
  const [openSheet,  setOpenSheet]  = useState<string | null>(null)
  const [yearOverrides, setYearOverrides] = useState<Record<string, number>>({})

  const handleFile = async (file: File) => {
    setError(''); setProcessing(true); setFileName(file.name)
    try {
      const buf = await file.arrayBuffer()
      const wb  = XLSX.read(buf, { type:'array', cellDates:false })

      const parsed: SheetInfo[] = wb.SheetNames.map(name => {
        const ws   = wb.Sheets[name]
        const rows: RawRow[] = XLSX.utils.sheet_to_json(ws, { defval: null, raw: true })
        if (!rows.length) return { name, rows:[], headers:[], type:'empty', year:0, preview:[] }

        const headers = Object.keys(rows[0])
        const type    = detectSheetType(rows)
        const year    = detectYear(name, rows)
        const preview = type === 'pivot'
          ? parsePivot(rows, headers, year, categories)
          : parseFlat(rows, headers, categories)

        return { name, rows, headers, type, year, preview }
      })

      setSheets(parsed)
      setStep('sheets')
    } catch {
      setError('Não foi possível ler o arquivo. Certifique-se que é .xlsx, .xls ou .csv.')
    }
    setProcessing(false)
  }

  const buildAll = () => {
    const all = sheets.flatMap(s => {
      if (s.type === 'empty') return []
      const yr = yearOverrides[s.name] ?? s.year
      const preview = s.type === 'pivot'
        ? parsePivot(s.rows, s.headers, yr, categories)
        : parseFlat(s.rows, s.headers, categories)
      return preview
    })
    setAllRows(all)
    setStep('preview')
  }

  const handleImport = async () => {
    setImporting(true)
    const res = await bulkImport(allRows)
    setResult(res)
    setImporting(false)
    setStep('done')
  }

  const totalExpense = allRows.filter(r => r.type==='expense').reduce((s,r)=>s+r.amount, 0)
  const totalIncome  = allRows.filter(r => r.type==='income').reduce((s,r)=>s+r.amount, 0)
  const years        = [...new Set(allRows.map(r => r.year))].sort()

  // ── DONE ──
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
            <p className="text-zinc-400 text-sm">{result?.count} transações importadas.</p>
            <p className="text-zinc-600 text-xs mt-1 mb-6">Histórico de {years[0]} a {years[years.length-1]} disponível nos meses.</p>
          </>
        )}
        <button
          onClick={() => { setStep('upload'); setSheets([]); setAllRows([]); setResult(null) }}
          className="py-3 px-6 rounded-xl bg-green-500 text-black font-semibold text-sm"
        >
          Nova importação
        </button>
      </div>
    )
  }

  // ── PREVIEW ──
  if (step === 'preview') {
    const byYear = years.map(y => ({
      year: y,
      rows: allRows.filter(r => r.year === y),
      expense: allRows.filter(r => r.year===y && r.type==='expense').reduce((s,r)=>s+r.amount,0),
      income:  allRows.filter(r => r.year===y && r.type==='income').reduce((s,r)=>s+r.amount,0),
    }))

    return (
      <div className="pb-32">
        <div className="sticky top-0 z-10 bg-[#0d0d0d] px-5 py-3 border-b border-[#1f1f1f]">
          <h2 className="text-base font-semibold text-white">Pré-visualização</h2>
          <p className="text-xs text-zinc-500">{allRows.length} lançamentos · {years.join(', ')}</p>
        </div>

        <div className="px-5 py-4 grid grid-cols-2 gap-3">
          <div className="bg-[#161616] border border-[#252525] rounded-2xl p-3">
            <p className="text-[10px] text-zinc-500 mb-1">Total gastos</p>
            <p className="text-sm font-bold text-red-400">{formatCurrency(totalExpense)}</p>
          </div>
          <div className="bg-[#161616] border border-[#252525] rounded-2xl p-3">
            <p className="text-[10px] text-zinc-500 mb-1">Total receitas</p>
            <p className="text-sm font-bold text-green-400">{formatCurrency(totalIncome)}</p>
          </div>
        </div>

        {/* Per-year breakdown */}
        <div className="px-5 space-y-3 pb-4">
          {byYear.map(({ year, rows, expense, income }) => (
            <div key={year} className="bg-[#161616] border border-[#252525] rounded-2xl overflow-hidden">
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer"
                onClick={() => setOpenSheet(openSheet === String(year) ? null : String(year))}
              >
                <div>
                  <p className="text-sm font-semibold text-white">{year}</p>
                  <p className="text-[11px] text-zinc-500">{rows.length} lançamentos</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-red-400">{formatCurrency(expense)}</p>
                  {income > 0 && <p className="text-xs text-green-400">{formatCurrency(income)}</p>}
                </div>
              </div>
              {openSheet === String(year) && (
                <div className="border-t border-[#252525] divide-y divide-[#1f1f1f]">
                  {rows.slice(0, 10).map((r, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: r.type==='income'?'#22c55e':'#f87171' }} />
                      <span className="text-xs text-zinc-300 flex-1 truncate">{r.description}</span>
                      <span className="text-[10px] text-zinc-600">{r.month}/{r.year}</span>
                      <span className={`text-xs font-semibold shrink-0 ${r.type==='income'?'text-green-400':'text-white'}`}>
                        {formatCurrency(r.amount)}
                      </span>
                    </div>
                  ))}
                  {rows.length > 10 && (
                    <p className="text-[11px] text-zinc-600 text-center py-2">+ {rows.length-10} mais</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="fixed bottom-[72px] left-0 right-0 max-w-lg mx-auto px-5 pb-4 pt-3 bg-[#0d0d0d] border-t border-[#1f1f1f] z-10 lg:bottom-0">
          <div className="flex gap-3">
            <button onClick={() => setStep('sheets')} className="px-5 py-3 rounded-xl bg-[#1a1a1a] border border-[#252525] text-sm text-zinc-400">
              Voltar
            </button>
            <button
              onClick={handleImport}
              disabled={importing}
              className="flex-1 py-3 rounded-xl bg-green-500 text-black font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {importing
                ? <><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> Importando...</>
                : <>Importar {allRows.length} lançamentos <ArrowRight size={14} /></>
              }
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── SHEETS OVERVIEW ──
  if (step === 'sheets') {
    const nonEmpty = sheets.filter(s => s.type !== 'empty')
    return (
      <div className="pb-32">
        <div className="px-5 pt-4 pb-3 border-b border-[#1f1f1f]">
          <h2 className="text-base font-semibold text-white">Abas encontradas</h2>
          <p className="text-xs text-zinc-500">{fileName} · {nonEmpty.length} abas com dados</p>
        </div>

        <div className="px-5 py-4 space-y-3">
          {sheets.map(s => {
            const yr = yearOverrides[s.name] ?? s.year
            return (
              <div key={s.name} className="bg-[#161616] border border-[#252525] rounded-2xl overflow-hidden">
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#1a1a1a] transition-colors"
                  onClick={() => setOpenSheet(openSheet===s.name?null:s.name)}
                >
                  <FileSpreadsheet size={16} className={s.type==='empty'?'text-zinc-700':'text-green-400'} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{s.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {s.type === 'empty' ? (
                        <span className="text-[10px] text-zinc-600">vazia</span>
                      ) : (
                        <>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                            s.type==='pivot' ? 'bg-amber-500/15 text-amber-400' : 'bg-blue-500/15 text-blue-400'
                          }`}>
                            {s.type==='pivot' ? 'tabela mensal' : 'lista'}
                          </span>
                          <span className="text-[10px] text-zinc-500">{s.preview.length} lançamentos detectados</span>
                        </>
                      )}
                    </div>
                  </div>
                  {s.type !== 'empty' && (
                    <div className="text-right shrink-0">
                      <p className="text-xs text-zinc-400">Ano:</p>
                      <input
                        type="number"
                        value={yr}
                        onClick={e => e.stopPropagation()}
                        onChange={e => setYearOverrides(o => ({ ...o, [s.name]: parseInt(e.target.value)||yr }))}
                        className="w-16 bg-[#1a1a1a] border border-[#252525] rounded-lg px-2 py-1 text-xs text-white text-center focus:outline-none focus:border-zinc-500 mt-0.5"
                      />
                    </div>
                  )}
                  {s.type !== 'empty' && (
                    <Eye size={14} className="text-zinc-600 shrink-0" />
                  )}
                </div>

                {/* Preview of sheet */}
                {openSheet === s.name && s.type !== 'empty' && (
                  <div className="border-t border-[#252525]">
                    {/* Raw headers */}
                    <div className="px-4 py-2 bg-[#131313]">
                      <p className="text-[10px] text-zinc-600 mb-1.5">Colunas: {s.headers.slice(0,8).join(' · ')}{s.headers.length>8?' …':''}</p>
                      <div className="overflow-x-auto">
                        <table className="text-[10px] text-zinc-400 min-w-full">
                          <thead>
                            <tr>{s.headers.slice(0,6).map(h=><th key={h} className="px-2 py-1 text-left text-zinc-600 border-b border-[#1f1f1f] whitespace-nowrap">{h}</th>)}</tr>
                          </thead>
                          <tbody>
                            {s.rows.slice(0,3).map((row,i)=>(
                              <tr key={i}>{s.headers.slice(0,6).map(h=><td key={h} className="px-2 py-1 truncate max-w-[80px] border-b border-[#1a1a1a]">{String(row[h]??'')}</td>)}</tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    {/* Parsed sample */}
                    {s.preview.slice(0,4).map((r,i)=>(
                      <div key={i} className="flex items-center gap-3 px-4 py-2 border-b border-[#1a1a1a]">
                        <div className="w-1.5 h-1.5 rounded-full" style={{background:r.type==='income'?'#22c55e':'#f87171'}} />
                        <span className="text-xs text-zinc-300 flex-1 truncate">{r.description}</span>
                        <span className="text-[10px] text-zinc-600">{r.month}/{r.year}</span>
                        <span className="text-xs font-semibold text-white">{formatCurrency(r.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {nonEmpty.length === 0 ? (
          <p className="text-center text-sm text-zinc-600 py-8">Nenhuma aba com dados encontrada.</p>
        ) : (
          <div className="fixed bottom-[72px] left-0 right-0 max-w-lg mx-auto px-5 pb-4 pt-3 bg-[#0d0d0d] border-t border-[#1f1f1f] z-10 lg:bottom-0">
            <p className="text-xs text-zinc-600 text-center mb-3">
              {nonEmpty.reduce((s,sh)=>s+sh.preview.length,0)} lançamentos detectados em {nonEmpty.length} abas
            </p>
            <button
              onClick={buildAll}
              className="w-full py-3.5 rounded-xl bg-green-500 text-black font-semibold text-sm flex items-center justify-center gap-2"
            >
              Ver pré-visualização <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── UPLOAD ──
  return (
    <div className="px-5 py-4 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-white">Importar planilha</h2>
        <p className="text-sm text-zinc-500 mt-0.5">Envia a planilha com as 4 abas — o app lê tudo e distribui o histórico nos meses certos</p>
      </div>

      <div
        onDrop={e => { e.preventDefault(); e.dataTransfer.files[0] && handleFile(e.dataTransfer.files[0]) }}
        onDragOver={e => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-[#2a2a2a] hover:border-green-500/40 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-colors"
      >
        {processing ? (
          <><div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin mb-3" /><p className="text-zinc-400 text-sm">Lendo abas da planilha...</p></>
        ) : (
          <>
            <Upload size={32} className="text-zinc-600 mb-3" />
            <p className="text-white text-sm font-medium text-center">Arraste ou clique para selecionar</p>
            <p className="text-zinc-600 text-xs mt-1">.xlsx · .xls · .csv</p>
          </>
        )}
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-400 flex gap-2">
          <AlertCircle size={15} className="shrink-0 mt-0.5" /> {error}
        </div>
      )}

      <div className="bg-[#161616] rounded-2xl p-4 border border-[#252525] space-y-2.5">
        <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wide">O que o app detecta</p>
        <div className="space-y-1.5 text-xs text-zinc-400">
          <p>✓ Todas as abas da planilha de uma vez</p>
          <p>✓ Tabela de meses × categorias (formato mais comum)</p>
          <p>✓ Lista de transações com data e valor</p>
          <p>✓ Ano de cada aba (pelo nome da aba ou dados)</p>
          <p>✓ Categorias mapeadas automaticamente</p>
          <p>✓ Cada lançamento vai pro mês e ano correto</p>
        </div>
      </div>
    </div>
  )
}
