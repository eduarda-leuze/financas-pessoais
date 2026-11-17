import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Upload, CheckCircle, AlertCircle, ArrowRight, FileSpreadsheet, Eye, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { formatCurrency } from '../../lib/utils'
import { categorizeByKeywords } from '../../lib/categorizer'
import type { Transaction } from '../../types'

// ─── Types ───────────────────────────────────────────────────────────────────
type Step = 'upload' | 'sheets' | 'generic' | 'preview' | 'done'
type RawCell = string | number | boolean | null
type RawRow  = RawCell[]
type SheetFormat = 'control' | 'income_pivot' | 'income_detail' | 'empty'
type TxRow = Omit<Transaction, 'id' | 'user_id' | 'created_at'>

interface SheetInfo {
  name: string
  rows: RawRow[]
  format: SheetFormat
  year: number
  parsed: TxRow[]
}

interface GenericColMap {
  desc:   number | null
  amount: number | null
  date:   number | null
  status: number | null
}

// ─── Constants ───────────────────────────────────────────────────────────────
const MONTH_ABBR: Record<string, number> = {
  JAN: 1, FEV: 2, MAR: 3, ABR: 4, MAI: 5, JUN: 6,
  JUL: 7, AGO: 8, SET: 9, OUT: 10, NOV: 11, DEZ: 12,
}
const MONTH_FULL: Record<string, number> = {
  JANEIRO: 1, FEVEREIRO: 2, MARCO: 3, ABRIL: 4, MAIO: 5, JUNHO: 6,
  JULHO: 7, AGOSTO: 8, SETEMBRO: 9, OUTUBRO: 10, NOVEMBRO: 11, DEZEMBRO: 12,
}
const SKIP_DESC_SET = new Set([
  'total', 'receita', 'saida', 'saidas', 'diferenca', 'diferencas',
  'subtotal', 'resultado', 'saldo',
])
function shouldSkipDesc(raw: string): boolean {
  const n = norm(raw)
  if (SKIP_DESC_SET.has(n)) return true
  if (n.startsWith('dia ') || n.startsWith('saida') || n.startsWith('saidas') || n.startsWith('diferenca')) return true
  return false
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

function isPaid(v: RawCell): boolean {
  if (typeof v !== 'string') return false
  const n = norm(v).replace(/[^a-z]/g, '')
  return n.startsWith('pg') || n === 'pago' || n === 'paga'
}

function toAmount(v: RawCell): number {
  if (typeof v === 'number' && v > 0 && v < 40000) return v
  if (typeof v === 'string') {
    const cleaned = v.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')
    const n = parseFloat(cleaned)
    if (!isNaN(n) && n > 0 && n < 40000) return n
  }
  return 0
}

function isDateSerial(v: RawCell): v is number {
  return typeof v === 'number' && v > 40000 && v < 60000
}

function clampDate(y: number, m: number, d: number): string {
  const last = new Date(y, m, 0).getDate()
  const day = Math.min(d, last)
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function parseVenc(v: RawCell, year: number, _month: number): string | null {
  if (v === null) return null
  if (isDateSerial(v)) {
    const d = XLSX.SSF.parse_date_code(v)
    if (d) return clampDate(d.y, d.m, d.d)
  }
  if (typeof v === 'string') {
    const m2 = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
    if (m2) {
      const y = parseInt(m2[3].length === 2 ? '20' + m2[3] : m2[3])
      return clampDate(y, parseInt(m2[2]), parseInt(m2[1]))
    }
    const m1 = v.match(/^(\d{1,2})\/(\d{1,2})$/)
    if (m1) return clampDate(year, parseInt(m1[2]), parseInt(m1[1]))
  }
  return null
}

function detectYear(sheetName: string, rows: RawRow[]): number {
  const m = sheetName.match(/\b(20\d{2})\b/)
  if (m) return parseInt(m[1])
  for (const row of rows.slice(0, 10)) {
    for (const v of row) {
      if (isDateSerial(v)) {
        const d = XLSX.SSF.parse_date_code(v)
        if (d?.y && d.y >= 2015 && d.y <= 2030) return d.y
      }
    }
  }
  return new Date().getFullYear()
}

// ─── Format Detection ─────────────────────────────────────────────────────────
function detectFormat(rows: RawRow[]): SheetFormat {
  if (!rows.length) return 'empty'
  for (const row of rows.slice(0, 5)) {
    const first = norm(String(row[0] ?? ''))
    if (first === 'saida') {
      const hasMonths = row.slice(1).some(v => typeof v === 'string' && MONTH_ABBR[v.trim().toUpperCase()])
      if (hasMonths) return 'control'
    }
  }
  for (const row of rows.slice(0, 5)) {
    const cnt = row.slice(1).filter(v => typeof v === 'string' && MONTH_ABBR[v.trim().toUpperCase()]).length
    if (cnt >= 4) return 'income_pivot'
  }
  for (const row of rows.slice(0, 10)) {
    const cnt = row.filter(v => typeof v === 'string' && MONTH_FULL[v.trim().toUpperCase()]).length
    if (cnt >= 2) return 'income_detail'
  }
  return 'empty'
}

// ─── CONTROLE Parser ─────────────────────────────────────────────────────────
function parseControl(
  rows: RawRow[],
  year: number,
  cats: { id: string; name: string; type: string; keywords?: string[] }[],
): TxRow[] {
  let headerRow: RawRow = []
  let headerIdx = -1
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    if (norm(String(rows[i][0] ?? '')) === 'saida') { headerRow = rows[i]; headerIdx = i; break }
  }
  if (headerIdx < 0) return []

  const monthCols: { month: number; col: number }[] = []
  headerRow.forEach((v, ci) => {
    if (typeof v === 'string') {
      const mn = MONTH_ABBR[v.trim().toUpperCase()]
      if (mn) monthCols.push({ month: mn, col: ci })
    }
  })
  if (!monthCols.length) return []

  const expCat = cats.find(c => c.type === 'expense')
  const result: TxRow[] = []

  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row  = rows[r]
    const desc = String(row[0] ?? '').trim()
    if (!desc) continue
    if (shouldSkipDesc(desc)) continue
    const hasData = monthCols.some(({ col }) => toAmount(row[col]) > 0)
    if (!hasData) continue

    for (const { month, col } of monthCols) {
      const amount = toAmount(row[col])
      if (!amount) continue
      const vencVal = row[col + 1] ?? null
      const statVal = row[col + 2] ?? null
      const paid    = isPaid(statVal) || isPaid(vencVal)
      const dueDate = parseVenc(vencVal, year, month) ?? `${year}-${String(month).padStart(2, '0')}-01`
      const matchCat = cats.find(c => {
        const cn = norm(c.name)
        const dn = norm(desc)
        return cn.includes(dn.slice(0, 4)) || dn.includes(cn.slice(0, 4))
      })
      result.push({
        description: desc,
        amount,
        type:        'expense',
        status:      paid ? 'paid' : 'pending',
        category_id: matchCat?.id ?? expCat?.id ?? cats[0]?.id ?? '',
        due_date:    dueDate,
        source:      'import',
        month,
        year,
      })
    }
  }
  return result
}

// ─── RECEITA pivot parser ─────────────────────────────────────────────────────
function parseIncomePivot(
  rows: RawRow[],
  year: number,
  cats: { id: string; name: string; type: string }[],
): TxRow[] {
  const incCat = cats.find(c => c.type === 'income') ?? cats[0]
  if (!incCat) return []
  let headerIdx = -1
  let monthCols: { month: number; col: number }[] = []
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const cols: { month: number; col: number }[] = []
    rows[i].forEach((v, ci) => {
      if (typeof v === 'string') {
        const mn = MONTH_ABBR[v.trim().toUpperCase()]
        if (mn) cols.push({ month: mn, col: ci })
      }
    })
    if (cols.length >= 4) { headerIdx = i; monthCols = cols; break }
  }
  if (headerIdx < 0) return []
  const result: TxRow[] = []
  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row  = rows[r]
    const desc = String(row[0] ?? '').trim()
    if (!desc || shouldSkipDesc(desc)) continue
    for (const { month, col } of monthCols) {
      const amount = toAmount(row[col])
      if (!amount) continue
      result.push({
        description: `Receita - ${desc}`,
        amount,
        type:        'income',
        status:      'paid',
        category_id: incCat.id,
        due_date:    `${year}-${String(month).padStart(2, '0')}-01`,
        source:      'import',
        month,
        year,
      })
    }
  }
  return result
}

// ─── RECEITA - MES detail parser ──────────────────────────────────────────────
function parseIncomeDetail(
  rows: RawRow[],
  defaultYear: number,
  cats: { id: string; name: string; type: string }[],
): TxRow[] {
  const incCat = cats.find(c => c.type === 'income') ?? cats[0]
  if (!incCat) return []
  let headerIdx = -1
  const groups: { month: number; col: number }[] = []
  for (let i = 0; i < rows.length; i++) {
    rows[i].forEach((v, ci) => {
      if (typeof v === 'string') {
        const mn = MONTH_FULL[v.trim().toUpperCase()]
        if (mn) groups.push({ month: mn, col: ci })
      }
    })
    if (groups.length >= 1) { headerIdx = i; break }
  }
  if (headerIdx < 0) return []
  const result: TxRow[] = []
  for (let r = headerIdx + 2; r < rows.length; r++) {
    const row = rows[r]
    if (!row.some(v => v !== null)) continue
    for (const { month, col } of groups) {
      const desc   = String(row[col] ?? '').trim()
      const amount = toAmount(row[col + 2])
      if (!desc || !amount) continue
      let rowYear = defaultYear
      let dueDate = `${defaultYear}-${String(month).padStart(2, '0')}-01`
      const dateCell = row[col + 3]
      if (isDateSerial(dateCell)) {
        const d = XLSX.SSF.parse_date_code(dateCell)
        if (d) { rowYear = d.y; dueDate = `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}` }
      }
      const isAReceber = typeof dateCell === 'string' && dateCell.toUpperCase().includes('RECEBER')
      result.push({
        description: desc,
        amount,
        type:        'income',
        status:      isAReceber ? 'pending' : 'paid',
        category_id: incCat.id,
        due_date:    dueDate,
        source:      'import',
        month,
        year:        rowYear,
      })
    }
  }
  return result
}

// ─── Generic flat-list parser ─────────────────────────────────────────────────
function parseGeneric(
  rows: RawRow[],
  colMap: GenericColMap,
  skipHeader: boolean,
  defaultType: 'expense' | 'income',
  defaultYear: number,
  defaultMonth: number,
  cats: { id: string; name: string; type: string; keywords?: string[] }[],
): TxRow[] {
  if (colMap.desc === null || colMap.amount === null) return []
  const data = skipHeader ? rows.slice(1) : rows
  const defCat = cats.find(c => c.type === defaultType) ?? cats[0]
  const result: TxRow[] = []

  for (const row of data) {
    const descRaw = row[colMap.desc]
    const desc = String(descRaw ?? '').trim()
    if (!desc || shouldSkipDesc(desc)) continue
    const amount = toAmount(row[colMap.amount])
    if (amount <= 0) continue

    let month = defaultMonth
    let year  = defaultYear
    let dueDate: string | undefined

    if (colMap.date !== null) {
      const parsed = parseVenc(row[colMap.date], defaultYear, defaultMonth)
      if (parsed) {
        dueDate = parsed
        const parts = parsed.split('-')
        year  = parseInt(parts[0])
        month = parseInt(parts[1])
      }
    }

    const status: 'paid' | 'pending' = colMap.status !== null
      ? (isPaid(row[colMap.status]) ? 'paid' : 'pending')
      : 'pending'

    const matchCat = categorizeByKeywords(desc, cats as Parameters<typeof categorizeByKeywords>[1])
      ?? cats.find(c => {
           const cn = norm(c.name); const dn = norm(desc)
           return cn.includes(dn.slice(0, 4)) || dn.includes(cn.slice(0, 4))
         })

    result.push({
      description: desc,
      amount,
      type:        defaultType,
      status,
      category_id: matchCat?.id ?? defCat?.id ?? cats[0]?.id ?? '',
      due_date:    dueDate,
      source:      'import',
      month,
      year,
    })
  }
  return result
}

// ─── Component ───────────────────────────────────────────────────────────────
export function SpreadsheetImport() {
  const { categories, bulkImport } = useApp()
  const fileRef = useRef<HTMLInputElement>(null)
  const [step,          setStep]          = useState<Step>('upload')
  const [sheets,        setSheets]        = useState<SheetInfo[]>([])
  const [allRows,       setAllRows]       = useState<TxRow[]>([])
  const [importing,     setImporting]     = useState(false)
  const [result,        setResult]        = useState<{ count: number; error?: string } | null>(null)
  const [fileName,      setFileName]      = useState('')
  const [processing,    setProcessing]    = useState(false)
  const [error,         setError]         = useState('')
  const [openSheet,     setOpenSheet]     = useState<string | null>(null)
  const [yearOverrides, setYearOverrides] = useState<Record<string, number>>({})

  // Generic mode state
  const [genericSheet,  setGenericSheet]  = useState('')
  const [colMap,        setColMap]        = useState<GenericColMap>({ desc: null, amount: null, date: null, status: null })
  const [skipHeader,    setSkipHeader]    = useState(true)
  const [genericType,   setGenericType]   = useState<'expense' | 'income'>('expense')
  const [genericYear,   setGenericYear]   = useState(new Date().getFullYear())
  const [genericMonth,  setGenericMonth]  = useState(new Date().getMonth() + 1)

  const handleFile = async (file: File) => {
    setError(''); setProcessing(true); setFileName(file.name)
    try {
      const buf = await file.arrayBuffer()
      const wb  = XLSX.read(buf, { type: 'array', cellDates: false, raw: true })
      const parsed: SheetInfo[] = wb.SheetNames.map(name => {
        const ws   = wb.Sheets[name]
        const rows: RawRow[] = (XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true }) as RawRow[])
          .filter(r => r.some(v => v !== null))
        const format = detectFormat(rows)
        const year   = detectYear(name, rows)
        const p = format === 'control'       ? parseControl(rows, year, categories)
                : format === 'income_pivot'  ? parseIncomePivot(rows, year, categories)
                : format === 'income_detail' ? parseIncomeDetail(rows, year, categories)
                : []
        return { name, rows, format, year, parsed: p }
      })
      setSheets(parsed)
      const hasControl = parsed.some(s => s.format === 'control')
      if (!hasControl && parsed.length > 0) {
        // No CONTROLE format found → go straight to generic column mapper
        setGenericSheet(parsed[0].name)
        setStep('generic')
      } else {
        setStep('sheets')
      }
    } catch (e) {
      setError('Não foi possível ler o arquivo. Certifique-se de usar .xlsx, .xls ou .csv.')
      console.error(e)
    }
    setProcessing(false)
  }

  const buildAll = () => {
    const all = sheets.flatMap(s => {
      if (s.format === 'empty' || s.format === 'income_pivot' || s.format === 'income_detail') return []
      const yr = yearOverrides[s.name] ?? s.year
      if (yr === s.year) return s.parsed
      return s.format === 'control' ? parseControl(s.rows, yr, categories) : []
    })
    setAllRows(all)
    setStep('preview')
  }

  const handleImportGeneric = async () => {
    const sheet = sheets.find(s => s.name === genericSheet)
    if (!sheet) return
    setImporting(true)
    const rows = parseGeneric(sheet.rows, colMap, skipHeader, genericType, genericYear, genericMonth, categories)
    const res = await bulkImport(rows)
    setResult(res)
    setImporting(false)
    setStep('done')
  }

  const handleImport = async () => {
    setImporting(true)
    const res = await bulkImport(allRows)
    setResult(res)
    setImporting(false)
    setStep('done')
  }

  const totalExpense = allRows.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0)
  const totalIncome  = allRows.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0)
  const years        = [...new Set(allRows.map(r => r.year))].sort()
  const nonEmpty     = sheets.filter(s => s.format === 'control')

  // ── DONE ──────────────────────────────────────────────────────────────────
  if (step === 'done') return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {result?.error
        ? <><AlertCircle size={48} className="text-red-400 mb-4" /><h2 className="text-lg font-semibold text-white mb-2">Erro</h2><p className="text-zinc-400 text-sm mb-6">{result.error}</p></>
        : <><CheckCircle size={48} className="text-green-400 mb-4" /><h2 className="text-lg font-semibold text-white mb-2">Importação concluída!</h2><p className="text-zinc-400 text-sm">{result?.count} lançamentos importados.</p>{years.length > 0 && <p className="text-zinc-600 text-xs mt-1">Histórico {years[0]}–{years[years.length - 1]}</p>}</>}
      <button onClick={() => { setStep('upload'); setSheets([]); setAllRows([]); setResult(null) }}
        className="mt-6 py-3 px-6 rounded-xl bg-green-500 text-black font-semibold text-sm">
        Nova importação
      </button>
    </div>
  )

  // ── PREVIEW ───────────────────────────────────────────────────────────────
  if (step === 'preview') {
    const byYear = years.map(y => ({
      year:    y,
      rows:    allRows.filter(r => r.year === y),
      expense: allRows.filter(r => r.year === y && r.type === 'expense').reduce((s, r) => s + r.amount, 0),
      income:  allRows.filter(r => r.year === y && r.type === 'income').reduce((s, r) => s + r.amount, 0),
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
        <div className="px-5 space-y-3 pb-4">
          {byYear.map(({ year, rows, expense, income }) => (
            <div key={year} className="bg-[#161616] border border-[#252525] rounded-2xl overflow-hidden">
              <button className="w-full flex items-center justify-between px-4 py-3"
                onClick={() => setOpenSheet(openSheet === String(year) ? null : String(year))}>
                <div className="text-left">
                  <p className="text-sm font-semibold text-white">{year}</p>
                  <p className="text-[11px] text-zinc-500">{rows.length} lançamentos</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs font-semibold text-red-400">{formatCurrency(expense)}</p>
                    {income > 0 && <p className="text-xs text-green-400">{formatCurrency(income)}</p>}
                  </div>
                  {openSheet === String(year) ? <ChevronUp size={14} className="text-zinc-500" /> : <ChevronDown size={14} className="text-zinc-500" />}
                </div>
              </button>
              {openSheet === String(year) && (
                <div className="border-t border-[#252525] divide-y divide-[#1f1f1f]">
                  {rows.slice(0, 10).map((r, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: r.type === 'income' ? '#22c55e' : '#f87171' }} />
                      <span className="text-xs text-zinc-300 flex-1 truncate">{r.description}</span>
                      <span className="text-[10px] text-zinc-600 shrink-0">{r.month}/{r.year}</span>
                      <span className={`text-xs font-semibold shrink-0 ${r.type === 'income' ? 'text-green-400' : 'text-white'}`}>{formatCurrency(r.amount)}</span>
                    </div>
                  ))}
                  {rows.length > 10 && <p className="text-[11px] text-zinc-600 text-center py-2">+ {rows.length - 10} mais</p>}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="fixed bottom-[72px] left-0 right-0 max-w-lg mx-auto px-5 pb-4 pt-3 bg-[#0d0d0d] border-t border-[#1f1f1f] z-10 lg:bottom-0">
          <div className="flex gap-3">
            <button onClick={() => setStep('sheets')} className="px-5 py-3 rounded-xl bg-[#1a1a1a] border border-[#252525] text-sm text-zinc-400">Voltar</button>
            <button onClick={handleImport} disabled={importing}
              className="flex-1 py-3 rounded-xl bg-green-500 text-black font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
              {importing ? <><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />Importando...</> : <>Importar {allRows.length} lançamentos <ArrowRight size={14} /></>}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── GENERIC COLUMN MAPPER ─────────────────────────────────────────────────
  if (step === 'generic') {
    const sheet = sheets.find(s => s.name === genericSheet) ?? sheets[0]
    if (!sheet) return null
    const previewRows = sheet.rows.slice(0, 8)
    const colCount = Math.max(...previewRows.map(r => r.length), 1)
    const colLetters = Array.from({ length: colCount }, (_, i) => String.fromCharCode(65 + i))

    // Guess column header names from first row if skipHeader
    const headerRow = skipHeader ? previewRows[0] : null
    const colLabel = (i: number) => {
      if (headerRow) {
        const h = String(headerRow[i] ?? '').trim()
        if (h) return `${colLetters[i]} — ${h}`
      }
      return colLetters[i]
    }

    const colOptions = colLetters.map((_, i) => ({ value: i, label: colLabel(i) }))

    // Preview the parsed result with current settings
    const previewParsed = parseGeneric(sheet.rows, colMap, skipHeader, genericType, genericYear, genericMonth, categories)

    const setCol = (field: keyof GenericColMap) => (val: string) =>
      setColMap(m => ({ ...m, [field]: val === '' ? null : parseInt(val) }))

    return (
      <div className="pb-32">
        <div className="px-5 pt-4 pb-3 border-b border-[#1f1f1f]">
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => setStep('upload')} className="text-zinc-600 hover:text-zinc-400 transition-colors">
              <ArrowLeft size={15} />
            </button>
            <h2 className="text-base font-semibold text-white">Mapear colunas</h2>
          </div>
          <p className="text-xs text-zinc-500">{fileName}</p>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Sheet picker */}
          {sheets.length > 1 && (
            <div>
              <label className="text-xs text-zinc-500 font-medium mb-1.5 block">Aba</label>
              <select value={genericSheet} onChange={e => setGenericSheet(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#252525] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none appearance-none">
                {sheets.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
              </select>
            </div>
          )}

          {/* Preview table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-zinc-500 font-medium">Prévia dos dados</label>
              <label className="flex items-center gap-1.5 text-xs text-zinc-500 cursor-pointer">
                <input type="checkbox" checked={skipHeader} onChange={e => setSkipHeader(e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-green-500" />
                1ª linha é cabeçalho
              </label>
            </div>
            <div className="overflow-x-auto rounded-xl border border-[#252525]">
              <table className="text-xs text-zinc-400 w-max min-w-full">
                <thead>
                  <tr className="bg-[#1a1a1a] border-b border-[#252525]">
                    {colLetters.map(l => (
                      <th key={l} className="px-3 py-2 text-zinc-600 font-semibold text-center">{l}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f1f1f]">
                  {previewRows.map((row, ri) => (
                    <tr key={ri} className={ri === 0 && skipHeader ? 'bg-[#161616] text-zinc-600' : 'bg-[#111]'}>
                      {colLetters.map((_, ci) => (
                        <td key={ci} className="px-3 py-1.5 max-w-[120px] truncate whitespace-nowrap">
                          {String(row[ci] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Column mapping */}
          <div>
            <p className="text-xs text-zinc-500 font-medium mb-3">Qual coluna corresponde a cada campo?</p>
            <div className="space-y-3">
              {([
                { field: 'desc'   as const, label: 'Descrição *',   required: true  },
                { field: 'amount' as const, label: 'Valor R$ *',    required: true  },
                { field: 'date'   as const, label: 'Data',          required: false },
                { field: 'status' as const, label: 'Status (pago)', required: false },
              ]).map(({ field, label, required }) => (
                <div key={field} className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400 w-28 shrink-0">{label}</span>
                  <select
                    value={colMap[field] ?? ''}
                    onChange={e => setCol(field)(e.target.value)}
                    className={`flex-1 bg-[#1a1a1a] border rounded-xl px-3 py-2 text-xs focus:outline-none appearance-none transition-colors ${
                      required && colMap[field] === null
                        ? 'border-zinc-700 text-zinc-600'
                        : 'border-[#252525] text-white'
                    }`}
                  >
                    <option value="">{required ? '— selecionar —' : '— não usar —'}</option>
                    {colOptions.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Type + Year/Month defaults */}
          <div className="space-y-3">
            <div>
              <p className="text-xs text-zinc-500 font-medium mb-2">Tipo padrão dos lançamentos</p>
              <div className="flex gap-2">
                {(['expense', 'income'] as const).map(t => (
                  <button key={t} onClick={() => setGenericType(t)}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                      genericType === t ? 'bg-green-500/20 border-green-500/30 text-green-400' : 'border-[#252525] text-zinc-500'
                    }`}>
                    {t === 'expense' ? 'Gasto' : 'Receita'}
                  </button>
                ))}
              </div>
            </div>
            {colMap.date === null && (
              <div>
                <p className="text-xs text-zinc-500 font-medium mb-2">Mês/ano dos lançamentos</p>
                <div className="flex gap-2">
                  <select value={genericMonth} onChange={e => setGenericMonth(parseInt(e.target.value))}
                    className="flex-1 bg-[#1a1a1a] border border-[#252525] rounded-xl px-3 py-2 text-xs text-white focus:outline-none appearance-none">
                    {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'].map((m, i) => (
                      <option key={i+1} value={i+1}>{m}</option>
                    ))}
                  </select>
                  <input type="number" value={genericYear} onChange={e => setGenericYear(parseInt(e.target.value) || genericYear)}
                    className="w-24 bg-[#1a1a1a] border border-[#252525] rounded-xl px-3 py-2 text-xs text-white text-center focus:outline-none" />
                </div>
              </div>
            )}
          </div>

          {/* Live count */}
          {previewParsed.length > 0 && (
            <div className="bg-green-500/10 border border-green-500/15 rounded-xl p-3 flex items-center gap-2">
              <CheckCircle size={14} className="text-green-400 shrink-0" />
              <p className="text-xs text-green-400">{previewParsed.length} lançamentos prontos para importar</p>
            </div>
          )}
          {colMap.desc !== null && colMap.amount !== null && previewParsed.length === 0 && (
            <div className="bg-amber-500/10 border border-amber-500/15 rounded-xl p-3 flex items-center gap-2">
              <AlertCircle size={14} className="text-amber-400 shrink-0" />
              <p className="text-xs text-amber-400">Nenhum lançamento válido encontrado. Verifique o mapeamento.</p>
            </div>
          )}
        </div>

        <div className="fixed bottom-[72px] left-0 right-0 max-w-lg mx-auto px-5 pb-4 pt-3 bg-[#0d0d0d] border-t border-[#1f1f1f] z-10 lg:bottom-0">
          <button
            onClick={handleImportGeneric}
            disabled={importing || colMap.desc === null || colMap.amount === null || previewParsed.length === 0}
            className="w-full py-3.5 rounded-xl bg-green-500 text-black font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2">
            {importing
              ? <><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />Importando...</>
              : <>Importar {previewParsed.length} lançamentos <ArrowRight size={14} /></>}
          </button>
        </div>
      </div>
    )
  }

  // ── SHEETS OVERVIEW (CONTROLE format) ─────────────────────────────────────
  if (step === 'sheets') {
    const fmtLabel: Record<SheetFormat, string> = {
      control: 'controle mensal', income_pivot: 'receita (ignorada)',
      income_detail: 'receita (ignorada)', empty: 'vazia / planejamento',
    }
    const fmtColor: Record<SheetFormat, string> = {
      control: 'bg-blue-500/15 text-blue-400', income_pivot: 'bg-zinc-500/10 text-zinc-500',
      income_detail: 'bg-zinc-500/10 text-zinc-500', empty: 'bg-zinc-500/10 text-zinc-600',
    }
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
                <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#1a1a1a] transition-colors"
                  onClick={() => s.format !== 'empty' && setOpenSheet(openSheet === s.name ? null : s.name)}>
                  <FileSpreadsheet size={16} className={s.format === 'empty' ? 'text-zinc-700' : 'text-green-400'} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{s.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${fmtColor[s.format]}`}>{fmtLabel[s.format]}</span>
                      {s.format !== 'empty' && <span className="text-[10px] text-zinc-500">{s.parsed.length} lançamentos</span>}
                    </div>
                  </div>
                  {s.format !== 'empty' && (
                    <div className="shrink-0 text-right" onClick={e => e.stopPropagation()}>
                      <p className="text-[10px] text-zinc-600 mb-0.5">Ano</p>
                      <input type="number" value={yr}
                        onChange={e => setYearOverrides(o => ({ ...o, [s.name]: parseInt(e.target.value) || yr }))}
                        className="w-16 bg-[#1a1a1a] border border-[#252525] rounded-lg px-2 py-1 text-xs text-white text-center focus:outline-none focus:border-zinc-500" />
                    </div>
                  )}
                  {s.format !== 'empty' && (openSheet === s.name ? <ChevronUp size={14} className="text-zinc-600 shrink-0" /> : <Eye size={14} className="text-zinc-600 shrink-0" />)}
                </div>
                {openSheet === s.name && s.format !== 'empty' && (
                  <div className="border-t border-[#252525] divide-y divide-[#1f1f1f]">
                    {s.parsed.slice(0, 6).map((r, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-2">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: r.type === 'income' ? '#22c55e' : '#f87171' }} />
                        <span className="text-xs text-zinc-300 flex-1 truncate">{r.description}</span>
                        <span className="text-[10px] text-zinc-600 shrink-0">{r.month}/{r.year}</span>
                        <span className={`text-xs font-semibold shrink-0 ${r.type === 'income' ? 'text-green-400' : 'text-white'}`}>{formatCurrency(r.amount)}</span>
                      </div>
                    ))}
                    {s.parsed.length > 6 && <p className="text-[11px] text-zinc-600 text-center py-2">+ {s.parsed.length - 6} mais</p>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        {nonEmpty.length === 0
          ? <p className="text-center text-sm text-zinc-600 py-8">Nenhuma aba reconhecida.</p>
          : (
            <div className="fixed bottom-[72px] left-0 right-0 max-w-lg mx-auto px-5 pb-4 pt-3 bg-[#0d0d0d] border-t border-[#1f1f1f] z-10 lg:bottom-0">
              <p className="text-xs text-zinc-600 text-center mb-3">{nonEmpty.reduce((s, sh) => s + sh.parsed.length, 0)} lançamentos em {nonEmpty.length} abas</p>
              <button onClick={buildAll} className="w-full py-3.5 rounded-xl bg-green-500 text-black font-semibold text-sm flex items-center justify-center gap-2">
                Ver pré-visualização <ArrowRight size={14} />
              </button>
            </div>
          )}
      </div>
    )
  }

  // ── UPLOAD ────────────────────────────────────────────────────────────────
  return (
    <div className="px-5 py-4 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-white">Importar planilha</h2>
        <p className="text-sm text-zinc-500 mt-0.5">Funciona com qualquer planilha — detecta o formato ou deixa você mapear as colunas</p>
      </div>
      <div onDrop={e => { e.preventDefault(); e.dataTransfer.files[0] && handleFile(e.dataTransfer.files[0]) }}
        onDragOver={e => e.preventDefault()} onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-[#2a2a2a] hover:border-green-500/40 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-colors">
        {processing
          ? <><div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin mb-3" /><p className="text-zinc-400 text-sm">Lendo abas...</p></>
          : <><Upload size={32} className="text-zinc-600 mb-3" /><p className="text-white text-sm font-medium text-center">Arraste ou clique para selecionar</p><p className="text-zinc-600 text-xs mt-1">.xlsx · .xls</p></>}
        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
      </div>
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-400 flex gap-2">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />{error}
        </div>
      )}
      <div className="bg-[#161616] rounded-2xl p-4 border border-[#252525] space-y-2">
        <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wide">Como funciona</p>
        <div className="space-y-1.5 text-xs text-zinc-400">
          <p>✓ Formato CONTROLE (planilha com abas mensais) — detectado automaticamente</p>
          <p>✓ Qualquer planilha simples — você escolhe qual coluna é descrição, valor e data</p>
          <p>✓ Categorias atribuídas automaticamente por palavras-chave</p>
        </div>
      </div>
    </div>
  )
}
