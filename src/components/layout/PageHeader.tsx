import { ChevronLeft, ChevronRight, Settings } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { formatMonthYear } from '../../lib/utils'

interface Props {
  title?: string
  showMonthNav?: boolean
  showSettings?: boolean
}

export function PageHeader({ title, showMonthNav, showSettings }: Props) {
  const { currentMonth, currentYear, setCurrentMonth, setCurrentYear } = useApp()

  const prev = () => {
    if (currentMonth === 1) { setCurrentYear(currentYear - 1); setCurrentMonth(12) }
    else setCurrentMonth(currentMonth - 1)
  }

  const next = () => {
    if (currentMonth === 12) { setCurrentYear(currentYear + 1); setCurrentMonth(1) }
    else setCurrentMonth(currentMonth + 1)
  }

  return (
    <div className="flex items-center justify-between px-5 pt-5 pb-4 lg:px-6 lg:pt-6">
      {showMonthNav ? (
        <>
          <button onClick={prev} className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#161616] border border-[#252525] text-zinc-400 hover:text-white active:scale-95 transition-all">
            <ChevronLeft size={16} />
          </button>
          <span className="text-base font-semibold text-white capitalize">
            {formatMonthYear(currentMonth, currentYear)}
          </span>
          <button onClick={next} className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#161616] border border-[#252525] text-zinc-400 hover:text-white active:scale-95 transition-all">
            <ChevronRight size={16} />
          </button>
        </>
      ) : (
        <>
          <h1 className="text-lg font-semibold text-white">{title}</h1>
          {showSettings && (
            <Link
              to="/configuracoes"
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-[#161616] border border-[#252525] text-zinc-400 hover:text-white active:scale-95 transition-all"
            >
              <Settings size={16} />
            </Link>
          )}
        </>
      )}
    </div>
  )
}
