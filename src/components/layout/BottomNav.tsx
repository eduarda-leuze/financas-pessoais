import { NavLink } from 'react-router-dom'
import { Home, List, Upload, BarChart2, Settings } from 'lucide-react'
import { cn } from '../../lib/utils'

const navItems = [
  { to: '/', icon: Home, label: 'Início' },
  { to: '/transacoes', icon: List, label: 'Transações' },
  { to: '/importar', icon: Upload, label: 'Importar' },
  { to: '/analise', icon: BarChart2, label: 'Análise' },
  { to: '/configuracoes', icon: Settings, label: 'Config.' },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#111] border-t border-[#1f1f1f] safe-bottom">
      <div className="max-w-lg mx-auto flex items-stretch">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 py-2.5 text-[10px] font-medium transition-colors min-h-[56px]',
                isActive
                  ? 'text-green-400'
                  : 'text-zinc-500 hover:text-zinc-300'
              )
            }
          >
            <Icon size={20} strokeWidth={1.8} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
