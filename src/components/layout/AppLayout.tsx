import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'

export function AppLayout() {
  return (
    <div className="min-h-dvh flex flex-col bg-[#0f0f0f] max-w-lg mx-auto">
      <main className="flex-1 overflow-y-auto pb-[72px]">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
