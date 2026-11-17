import type { ExtractedTransaction } from '../types'

function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

function parseOFXDate(raw: string): string {
  // OFX date format: YYYYMMDD or YYYYMMDDHHMMSS
  const str = raw.trim().substring(0, 8)
  const year = str.substring(0, 4)
  const month = str.substring(4, 6)
  const day = str.substring(6, 8)
  return `${year}-${month}-${day}`
}

export function parseOFX(content: string): ExtractedTransaction[] {
  const transactions: ExtractedTransaction[] = []
  const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi
  let match

  while ((match = stmtTrnRegex.exec(content)) !== null) {
    const block = match[1]
    const dtposted = block.match(/<DTPOSTED>(.*?)(?:<|\n)/i)?.[1]?.trim()
    const trnamt = block.match(/<TRNAMT>(.*?)(?:<|\n)/i)?.[1]?.trim()
    const memo = block.match(/<MEMO>(.*?)(?:<|\n)/i)?.[1]?.trim()
    const name = block.match(/<NAME>(.*?)(?:<|\n)/i)?.[1]?.trim()

    if (dtposted && trnamt) {
      const amount = parseFloat(trnamt.replace(',', '.'))
      transactions.push({
        id: generateId(),
        date: parseOFXDate(dtposted),
        description: memo || name || 'Transação importada',
        amount: Math.abs(amount),
        selected: true,
      })
    }
  }

  return transactions
}

export function parseCSV(content: string): ExtractedTransaction[] {
  const lines = content.split('\n').filter(l => l.trim())
  if (lines.length < 2) return []

  const header = lines[0].split(/[;,]/).map(h => h.trim().toLowerCase().replace(/"/g, ''))

  const dateIdx = header.findIndex(h => ['data', 'date', 'dt', 'data lançamento', 'data lancamento'].some(k => h.includes(k)))
  const descIdx = header.findIndex(h => ['descrição', 'descricao', 'description', 'historico', 'histórico', 'memo', 'estabelecimento'].some(k => h.includes(k)))
  const amountIdx = header.findIndex(h => ['valor', 'amount', 'value', 'vlr', 'débito', 'debito', 'crédito', 'credito'].some(k => h.includes(k)))

  if (amountIdx === -1) return []

  const transactions: ExtractedTransaction[] = []
  const separator = lines[0].includes(';') ? ';' : ','

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(separator).map(c => c.trim().replace(/^"|"$/g, ''))
    const rawDate = dateIdx >= 0 ? cols[dateIdx] : ''
    const desc = descIdx >= 0 ? cols[descIdx] : `Transação linha ${i}`
    const rawAmount = cols[amountIdx] || '0'

    // Parse date: dd/mm/yyyy or yyyy-mm-dd
    let date = ''
    if (rawDate) {
      if (rawDate.includes('/')) {
        const [d, m, y] = rawDate.split('/')
        date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
      } else {
        date = rawDate.substring(0, 10)
      }
    }

    const amount = Math.abs(parseFloat(rawAmount.replace(/\./g, '').replace(',', '.')))
    if (isNaN(amount) || amount === 0) continue

    transactions.push({
      id: generateId(),
      date,
      description: desc || 'Transação importada',
      amount,
      selected: true,
    })
  }

  return transactions
}
