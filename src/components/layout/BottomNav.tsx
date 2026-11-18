import { NavLink } from 'react-router-dom'
import { Home, List, Receipt, BarChart2, Upload } from 'lucide-react'

const tabs = [
  { to: '/',           icon: Home,     label: 'Início'      },
  { to: '/transacoes', icon: List,     label: 'Lançamentos' },
  { to: '/contas',     icon: Receipt,  label: 'Contas'      },
  { to: '/analise',    icon: BarChart2,label: 'Análise'     },
  { to: '/importar',   icon: Upload,   label: 'Importar'    },
]

export function BottomNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
      <div className="max-w-lg mx-auto">
        <div
          className="flex items-stretch border-t border-[#1e1e1e]"
          style={{ background: 'rgba(13,13,13,0.96)', backdropFilter: 'blur(20px)', paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {tabs.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors relative ${
                  isActive ? 'text-green-400' : 'text-zinc-600 hover:text-zinc-400'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-green-400" />
                  )}
                  <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
                  <span className="text-[10px] font-medium">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  )
}
