import type { Category } from '../types'

// ─── Built-in keyword library ──────────────────────────────────────────────
// Keys = common category name fragments (matched case-insensitively against category name)
// Values = transaction description fragments to match

const BUILTIN: Record<string, string[]> = {
  // ── Housing / CASA
  casa: [
    'condomínio', 'condominio', 'energia', 'light', 'enel', 'cemig', 'coelba', 'cpfl', 'elektro',
    'celesc', 'energisa', 'equatorial', 'coelce', 'ceron', 'boa energia', 'comgás', 'comgas',
    'gas encanado', 'gás natural', 'sabesp', 'sanepar', 'copasa', 'cagece', 'embasa', 'caesb',
    'cosanpa', 'caern', 'compesa', 'iptu', 'aluguel', 'portaria', 'garagem', 'zelador',
    'internet', 'claro residencial', 'vivo residencial', 'oi fibra', 'net claro', 'tim live',
    'embratel', 'sercomtel', 'brisanet', 'wi-fi', 'fibra',
  ],
  // ── Credit cards / CARTÕES
  'cartão': [
    'nubank', 'itaú', 'itau', 'bradesco', 'santander', 'caixa economica', 'inter', 'c6 bank',
    'c6bank', 'next', 'neon', 'will bank', 'digio', 'porto seguro', 'bn', 'bmg',
    'pagamento fatura', 'pagto fatura', 'fatura cartão', 'fatura cartao', 'fatura nu',
    'credicard', 'hipercard', 'elo', 'mastercard pgto', 'visa pgto', 'american express',
    'amex', 'pagamento cartao', 'renegociacao', 'parcelamento fatura',
  ],
  cartoes: [
    'nubank', 'itaú', 'itau', 'bradesco', 'santander', 'caixa economica', 'inter', 'c6 bank',
    'pagamento fatura', 'pagto fatura', 'fatura cartão', 'fatura cartao',
  ],
  // ── Fuel/Vehicle / MOTO / CARRO
  moto: [
    'shell', 'ipiranga', 'br petrobras', 'petrobras posto', 'raízen', 'raizen', 'ale combustível',
    'posto ', 'gasolina', 'etanol', 'combustível', 'combustivel', 'abastecimento',
    'lubrificante', 'óleo motor', 'oleo motor', 'troca oleo', 'filtro óleo',
    'borracharia', 'pneu', 'retífica', 'retifica', 'mecânico', 'mecanico',
    'ipva', 'dpvat', 'seguro moto', 'emplacamento',
  ],
  carro: [
    'shell', 'ipiranga', 'br petrobras', 'petrobras posto', 'raízen', 'raizen', 'ale combustível',
    'posto ', 'gasolina', 'etanol', 'combustível', 'combustivel', 'abastecimento',
    'lubrificante', 'óleo motor', 'oleo motor', 'troca oleo', 'borracharia', 'pneu',
    'ipva', 'dpvat', 'seguro auto', 'seguro carro', 'seguro veículo', 'multa', 'estacionamento',
    'detran', 'pedágio', 'pedagio', 'sem parar', 'move mais', 'conectcar',
  ],
  veiculo: [
    'shell', 'ipiranga', 'petrobras posto', 'raizen', 'gasolina', 'combustivel',
    'ipva', 'dpvat', 'seguro auto', 'seguro veiculo', 'estacionamento', 'pedagio',
  ],
  // ── Personal expenses / PESSOAIS
  pessoais: [
    'netflix', 'spotify', 'amazon prime', 'amazon video', 'prime video', 'disney+', 'disney plus',
    'globoplay', 'star+', 'star plus', 'hbo max', 'max ', 'deezer', 'apple music',
    'youtube premium', 'google one', 'google storage', 'dropbox', 'icloud',
    'academia', 'smart fit', 'bluefit', 'bio ritmo', 'bodytech', 'competition', 'crossfit',
    'terapia', 'psicólogo', 'psicologo', 'psiquiatra', 'dentista', 'odontolog',
    'farmácia', 'farmacia', 'drogaria', 'ultrafarma', 'droga raia', 'drogasil',
    'pacheco', 'nissei', 'araujo', 'catarinense', 'pague menos',
    'ótica', 'otica', 'óculo', 'oculo', 'óculos', 'lenscrafters',
    'faculdade', 'mensalidade', 'usp', 'unesp', 'unicamp', 'puc', 'mackenzie', 'anhanguera',
    'estácio', 'estacio', 'unip', 'unicsul', 'unit', 'univale', 'fgv', 'insper',
    'curso', 'alura', 'udemy', 'coursera', 'duolingo', 'linguagem',
    'plano de saúde', 'plano saude', 'unimed', 'amil', 'sulamerica', 'hapvida',
    'notredame', 'notre dame', 'bradesco saúde', 'bradesco saude', 'porto saúde',
    'celular', 'tim ', 'vivo ', 'claro ', 'oi ', 'porto seguro', 'claro movel',
    'barba', 'cabeleireiro', 'barbearia', 'salão', 'salao', 'manicure', 'estética', 'estetica',
    'lazer', 'cinema', 'ingresso', 'teatro', 'show', 'evento', 'ticket', 'eventbrite',
    'steam', 'playstation', 'xbox', 'nintendo', 'epic games', 'riot games',
    'shein', 'shopee', 'magalu', 'magazine luiza', 'americanas', 'submarino', 'casas bahia',
    'amazon.com.br', 'mercado livre', 'mercadolivre', 'aliexpress', 'wish',
    'renner', 'riachuelo', 'c&a ', 'hering', 'zara', 'h&m', 'forever21',
    'netshoes', 'centauro', 'decathlon', 'your shoe',
  ],
  // ── Food / ALIMENTAÇÃO
  alimentação: [
    'ifood', 'i food', 'rappi', 'uber eats', 'ubereats', '99food',
    'extra', 'carrefour', 'pão de açúcar', 'pao de acucar', 'grupo pao', 'grupo pão',
    'atacadão', 'atacadao', 'assaí', 'assai', 'fort atacado', 'maxxi atacado',
    'walmart', 'big', 'hiper bompreço', 'g. barbosa', 'gbarbosa', 'supermercado',
    'mercadinho', 'mercearia', 'hortifruti', 'ceasa', 'feira', 'varejão', 'varejao',
    'mcdonalds', 'mc donalds', 'burger king', 'bk ', 'subway', 'pizza hut', 'dominos',
    'habib', 'giraffas', 'frango assado', 'galeto', 'coxinha', 'padaria', 'panificadora',
    'coffelab', 'starbucks', 'dunkin', 'açaí', 'acai', 'sorvete', 'sorveteria',
    'restaurante', 'lanchonete', 'churrascaria', 'pizzaria', 'sushi', 'japonês', 'japones',
    'bar ', 'boteco', 'petiscaria', 'choperia', 'cervejaria',
  ],
  // ── Transport / TRANSPORTE
  transporte: [
    'uber', '99 ', '99pop', 'cabify', 'indriver', 'lyft', 'táxi', 'taxi',
    'ônibus', 'onibus', 'metrô', 'metro', 'trem', 'passagem', 'bilhete único', 'bilhete unico',
    'recarga cartão transporte', 'cartão bom', 'cartao bom', 'move', 'brt', 'vlt',
    'passagem aérea', 'passagem aerea', 'latam', 'gol ', 'azul ', 'avianca', 'tam ',
    'aeroporto', 'embarque', 'embraer',
    'estacionamento', 'rotativo', 'estapar', 'multipark',
    'pedagio', 'pedágio', 'sem parar', 'move mais', 'conectcar', 'veloe',
  ],
  // ── Health / SAÚDE
  saúde: [
    'farmácia', 'farmacia', 'drogaria', 'ultrafarma', 'droga raia', 'drogasil',
    'pacheco', 'nissei', 'araujo', 'catarinense', 'pague menos', 'panvel',
    'unimed', 'amil', 'sulamerica', 'hapvida', 'notredame', 'bradesco saude',
    'hospital', 'clínica', 'clinica', 'consultório', 'consultorio', 'laboratório', 'laboratorio',
    'exame', 'análise', 'analise', 'rx', 'raio x', 'ultrassom', 'ressonância',
    'dentista', 'odontolog', 'ortodontia', 'implante', 'psicolog', 'psiquiatra', 'terapia',
    'vacina', 'vacinação', 'farmácias nissei', 'raia drogasil',
  ],
  saude: [
    'farmácia', 'farmacia', 'drogaria', 'ultrafarma', 'droga raia', 'drogasil',
    'unimed', 'amil', 'hapvida', 'hospital', 'clinica', 'consultorio', 'laboratorio',
    'exame', 'dentista', 'psicolog', 'psiquiatra', 'terapia', 'vacina',
  ],
  // ── Subscriptions / ASSINATURAS
  assinaturas: [
    'netflix', 'spotify', 'amazon prime', 'prime video', 'disney+', 'disney plus',
    'globoplay', 'star+', 'hbo max', 'max ', 'deezer', 'apple music', 'youtube premium',
    'google one', 'dropbox', 'icloud', 'adobe', 'notion', 'figma', 'github',
    'chatgpt', 'openai', 'anthropic', 'midjourney', 'canva',
  ],
  // ── Education / EDUCAÇÃO
  educação: [
    'faculdade', 'universidade', 'mensalidade', 'usp', 'unicamp', 'unesp', 'puc', 'mackenzie',
    'anhanguera', 'estácio', 'estacio', 'unip', 'fgv', 'insper', 'ibmec',
    'curso', 'alura', 'udemy', 'coursera', 'dio', 'rocketseat', 'dio ', 'dio.',
    'duolingo', 'babbel', 'idioma', 'inglês', 'ingles', 'espanhol',
    'escola', 'colégio', 'colegio', 'creche', 'berçário', 'bercario', 'material escolar',
  ],
  educacao: [
    'faculdade', 'universidade', 'mensalidade', 'curso', 'alura', 'udemy',
    'escola', 'colegio', 'creche', 'idioma',
  ],
  // ── Clothing / VESTUÁRIO
  vestuário: [
    'renner', 'riachuelo', 'c&a ', 'hering', 'zara', 'h&m', 'forever21', 'levis',
    'reserva', 'farm ', 'animale', 'le lis blanc', 'arezzo', 'schutz', 'anacapri',
    'netshoes', 'centauro', 'decathlon', 'your shoe', 'nike ', 'adidas', 'puma ',
    'olympikus', 'havaianas', 'melissa',
  ],
  // ── Income / RECEITA
  receita: [
    'salário', 'salario', 'proventos', 'vencimentos', 'pagamento emp', 'folha pagamento',
    'freelance', 'freela', 'serviço prestado', 'servico prestado', 'nota fiscal',
    'pix recebido', 'transferência recebida', 'transf recebida', 'deposito recebido',
    'depósito', 'deposito', 'doc recebido', 'ted recebido', 'crédito', 'credito',
    'receita', 'honorários', 'honorarios', 'comissão', 'comissao',
    'rendimentos', 'dividendos', 'juros recebidos', 'aluguel recebido',
    'bolsa', 'auxílio', 'auxilio', 'benefício', 'beneficio', 'inss', 'fgts',
  ],
}

function normalizeStr(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// Find the best matching builtin key for a category name
function findBuiltinKeys(categoryName: string): string[] {
  const catNorm = normalizeStr(categoryName)
  return Object.keys(BUILTIN).filter(k => catNorm.includes(k) || k.includes(catNorm.slice(0, 4)))
}

export function categorizeByKeywords(
  description: string,
  categories: Category[]
): Category | undefined {
  const descNorm = normalizeStr(description)

  for (const category of categories) {
    // User-defined keywords take priority
    const userKw = category.keywords ?? []
    // Fallback to built-in dictionary by matching category name
    const builtinKw = findBuiltinKeys(category.name).flatMap(k => BUILTIN[k] ?? [])
    const allKw = [...userKw, ...builtinKw]

    for (const kw of allKw) {
      if (descNorm.includes(normalizeStr(kw))) return category
    }
  }

  return undefined
}

export function getDefaultCategories(userId: string): Omit<import('../types').Category, 'id' | 'created_at'>[] {
  return [
    { user_id: userId, name: 'CASA',       type: 'expense', color: '#3b82f6', icon: '🏠', keywords: [] },
    { user_id: userId, name: 'CARTÕES',    type: 'expense', color: '#8b5cf6', icon: '💳', keywords: [] },
    { user_id: userId, name: 'MOTO',       type: 'expense', color: '#f59e0b', icon: '🏍️', keywords: [] },
    { user_id: userId, name: 'PESSOAIS',   type: 'expense', color: '#ec4899', icon: '👤', keywords: [] },
    { user_id: userId, name: 'OUTRAS',     type: 'expense', color: '#6b7280', icon: '📦', keywords: [] },
    { user_id: userId, name: 'Sem categoria', type: 'expense', color: '#374151', icon: '❓', keywords: [] },
    { user_id: userId, name: 'RECEITA',    type: 'income',  color: '#22c55e', icon: '💰', keywords: [] },
  ]
}
