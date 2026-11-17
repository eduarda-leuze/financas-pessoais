export type TransactionType = 'expense' | 'income'
export type CategoryType = 'expense' | 'income' | 'savings'
export type TransactionStatus = 'paid' | 'pending' | 'overdue'
export type TransactionSource = 'manual' | 'import'
export type ImportFileType = 'pdf' | 'ofx' | 'csv'
export type ImportStatus = 'pending' | 'processing' | 'review' | 'done' | 'error'

export interface Category {
  id: string
  user_id?: string
  name: string
  type: CategoryType
  color: string
  icon: string
  keywords: string[]
  created_at?: string
}

export interface Account {
  id: string
  user_id?: string
  category_id: string
  name: string
  description?: string
  created_at?: string
}

export interface Transaction {
  id: string
  user_id?: string
  category_id: string
  account_id?: string
  description: string
  amount: number
  due_date?: string
  paid_date?: string
  status: TransactionStatus
  type: TransactionType
  source: TransactionSource
  month: number
  year: number
  notes?: string
  created_at?: string
  category?: Category
  account?: Account
}

export interface ImportRecord {
  id: string
  user_id?: string
  filename: string
  file_type: ImportFileType
  status: ImportStatus
  raw_data?: unknown
  extracted_transactions?: ExtractedTransaction[]
  created_at?: string
}

export interface ExtractedTransaction {
  id: string
  date: string
  description: string
  amount: number
  category_id?: string
  selected: boolean
}

export interface MonthlySummary {
  month: number
  year: number
  total_income: number
  total_expense: number
  balance: number
  by_category: { category: Category; total: number }[]
}

export interface FinancialInsight {
  type: 'info' | 'warning' | 'danger' | 'success'
  message: string
  value?: number
}
