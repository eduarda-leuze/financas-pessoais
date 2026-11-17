import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'

export function AppLayout() {
  return (
    <div className="min-h-dvh bg-[#0d0d0d]">
      <div className="max-w-lg mx-auto pb-[72px]">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  )
}
