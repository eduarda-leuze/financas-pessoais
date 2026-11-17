import { Check, AlertTriangle, Clock, Calendar } from 'lucide-react'
import { formatCurrency } from '../../lib/utils'
import { useApp } from '../../context/AppContext'
import type { Transaction } from '../../types'

interface Props {
  bills: Transaction[]
}

function daysLabel(d: string | null | undefined) {
  if (!d) return null
  const today = new Date(); today.setHours(0,0,0,0)
  const due   = new Date(d + 'T00:00:00')
  const diff  = Math.round((due.getTime() - today.getTime()) / 86400000)
  if (diff < 0)  return { text: `${Math.abs(diff)}d atrás`, color: 'text-red-400',  bg: 'bg-red-500/10 border-red-500/20',  icon: AlertTriangle }
  if (diff === 0) return { text: 'Hoje',     color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: Clock }
  if (diff === 1) return { text: 'Amanhã',   color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: Clock }
  return { text: `em ${diff}d`, color: 'text-zinc-400', bg: 'bg-[#1e1e1e] border-[#2a2a2a]', icon: Calendar }
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${String(y).slice(2)}`
}

export function UpcomingBills({ bills }: Props) {
  const { markAsPaid } = useApp()

  if (bills.length === 0) {
    return (
      <div className="bg-[#161616] border border-[#252525] rounded-2xl p-5">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Próximas contas</p>
        <div className="text-center py-6">
          <div className="text-3xl mb-2">🎉</div>
          <p className="text-sm text-zinc-500">Nenhuma conta nos próximos 60 dias</p>
        </div>
      </div>
    )
  }

  const total = bills.filter(b => b.status !== 'paid').reduce((s, b) => s + b.amount, 0)

  return (
    <div className="bg-[#161616] border border-[#252525] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Próximas contas</p>
        <span className="text-xs font-semibold text-red-400">{formatCurrency(total)}</span>
      </div>

      <div className="space-y-2">
        {bills.map(b => {
          const dl = daysLabel(b.due_date)
          const DlIcon = dl?.icon || Calendar
          return (
            <div key={b.id} className="flex items-center gap-3 group">
              {/* Category color */}
              <div className="w-1.5 h-8 rounded-full shrink-0" style={{ background: b.category?.color || '#444' }} />

              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate leading-tight">{b.description}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {dl && (
                    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${dl.bg} ${dl.color}`}>
                      <DlIcon size={9} />
                      {dl.text}
                    </span>
                  )}
                  <span className="text-[10px] text-zinc-600">{fmtDate(b.due_date)}</span>
                </div>
              </div>

              <span className="text-sm font-semibold text-white shrink-0">{formatCurrency(b.amount)}</span>

              <button
                onClick={() => markAsPaid(b.id)}
                className="w-7 h-7 rounded-lg bg-[#1e1e1e] border border-[#2a2a2a] flex items-center justify-center text-zinc-600 hover:bg-green-500/15 hover:border-green-500/30 hover:text-green-400 transition-all shrink-0"
                title="Marcar como pago"
              >
                <Check size={12} strokeWidth={2.5} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
