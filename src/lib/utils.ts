import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr + 'T00:00:00')
  return new Intl.DateTimeFormat('pt-BR').format(date)
}

export function formatMonthYear(month: number, year: number): string {
  const date = new Date(year, month - 1, 1)
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date)
}

export function formatMonthShort(month: number): string {
  const date = new Date(2024, month - 1, 1)
  return new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date).replace('.', '')
}

export function getCurrentMonthYear(): { month: number; year: number } {
  const now = new Date()
  return { month: now.getMonth() + 1, year: now.getFullYear() }
}

export function isOverdue(dueDateStr: string, status: string): boolean {
  if (status === 'paid') return false
  if (!dueDateStr) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDateStr + 'T00:00:00')
  return due < today
}

export function getDaysUntilDue(dueDateStr: string): number {
  if (!dueDateStr) return 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDateStr + 'T00:00:00')
  const diff = due.getTime() - today.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}
