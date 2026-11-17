import type { Category } from '../types'

const DEFAULT_KEYWORDS: Record<string, string[]> = {
  CASA: [
    'condomínio', 'condominio', 'energia', 'light', 'enel', 'cemig', 'coelba', 'cpfl', 'elektro',
    'comgás', 'comgas', 'gas', 'gás', 'internet', 'claro', 'vivo', 'tim', 'oi', 'net', 'aluguel',
    'iptu', 'água', 'agua', 'sabesp', 'sanepar', 'copasa', 'garagem', 'portaria',
  ],
  CARTÕES: [
    'nubank', 'itau', 'itaú', 'bradesco', 'santander', 'caixa', 'inter', 'c6', 'c6 bank',
    'pagamento fatura', 'pagto fatura', 'fatura cartão', 'fatura cartao', 'credicard',
  ],
  MOTO: [
    'shell', 'posto', 'gasolina', 'combustível', 'combustivel', 'ipva', 'seguro moto',
    'lubrificante', 'óleo', 'oleo', 'br distribuidora', 'petrobras', 'ipiranga', 'raizen',
  ],
  PESSOAIS: [
    'netflix', 'spotify', 'amazon', 'amazon prime', 'apple', 'google', 'youtube', 'disney',
    'academia', 'smart fit', 'bluefit', 'bio ritmo', 'terapia', 'psicólogo', 'psicologo',
    'farmácia', 'farmacia', 'drogaria', 'ultrafarma', 'droga raia', 'óculos', 'otica', 'ótica',
    'faculdade', 'mensalidade', 'plano de saúde', 'unimed', 'amil', 'sulamerica', 'hapvida',
    'celular', 'iphone', 'samsung',
  ],
  RECEITA: [
    'salário', 'salario', 'freelance', 'pagamento', 'transferência recebida',
    'pix recebido', 'deposito', 'depósito', 'receita', 'honorarios', 'honorários',
  ],
}

export function categorizeByKeywords(
  description: string,
  categories: Category[]
): Category | undefined {
  const desc = description.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

  for (const category of categories) {
    const keywords = category.keywords.length > 0
      ? category.keywords
      : DEFAULT_KEYWORDS[category.name] || []

    for (const kw of keywords) {
      const normalized = kw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      if (desc.includes(normalized)) {
        return category
      }
    }
  }

  return undefined
}

export function getDefaultCategories(userId: string): Omit<import('../types').Category, 'id' | 'created_at'>[] {
  return [
    { user_id: userId, name: 'CASA', type: 'expense', color: '#3b82f6', icon: '🏠', keywords: DEFAULT_KEYWORDS.CASA },
    { user_id: userId, name: 'CARTÕES', type: 'expense', color: '#8b5cf6', icon: '💳', keywords: DEFAULT_KEYWORDS['CARTÕES'] },
    { user_id: userId, name: 'MOTO', type: 'expense', color: '#f59e0b', icon: '🏍️', keywords: DEFAULT_KEYWORDS.MOTO },
    { user_id: userId, name: 'PESSOAIS', type: 'expense', color: '#ec4899', icon: '👤', keywords: DEFAULT_KEYWORDS.PESSOAIS },
    { user_id: userId, name: 'OUTRAS', type: 'expense', color: '#6b7280', icon: '📦', keywords: [] },
    { user_id: userId, name: 'Sem categoria', type: 'expense', color: '#374151', icon: '❓', keywords: [] },
    { user_id: userId, name: 'RECEITA', type: 'income', color: '#22c55e', icon: '💰', keywords: DEFAULT_KEYWORDS.RECEITA },
  ]
}
