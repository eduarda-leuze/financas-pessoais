import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { formatMonthYear } from '../../lib/utils'

interface PageHeaderProps {
  title?: string
  showMonthNav?: boolean
}

export function PageHeader({ title, showMonthNav = false }: PageHeaderProps) {
  const { currentMonth, currentYear, setCurrentMonth, setCurrentYear } = useApp()

  const prevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const nextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  if (showMonthNav) {
    return (
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button
          onClick={prevMonth}
          className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-base font-semibold text-white capitalize">
          {formatMonthYear(currentMonth, currentYear)}
        </h1>
        <button
          onClick={nextMonth}
          className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    )
  }

  return (
    <div className="px-4 pt-4 pb-2">
      <h1 className="text-lg font-semibold text-white">{title}</h1>
    </div>
  )
}
