import { NavLink } from 'react-router-dom'
import { Home, List, Receipt, BarChart2, Settings, Upload, TrendingUp } from 'lucide-react'

const navItems = [
  { to: '/',             icon: Home,     label: 'Início'      },
  { to: '/transacoes',   icon: List,     label: 'Lançamentos' },
  { to: '/contas',       icon: Receipt,  label: 'Contas'      },
  { to: '/analise',      icon: BarChart2,label: 'Análise'     },
  { to: '/importar',     icon: Upload,   label: 'Importar'    },
  { to: '/configuracoes',icon: Settings, label: 'Config.'     },
]

export function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-56 bg-[#0d0d0d] border-r border-[#1e1e1e] z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-[#1e1e1e]">
        <div className="w-9 h-9 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
          <TrendingUp size={18} className="text-green-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-tight">Finanças</p>
          <p className="text-[10px] text-zinc-600">Pessoal</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-green-500/10 text-green-400 border border-green-500/15'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-[#161616]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
