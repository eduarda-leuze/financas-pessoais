import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  return (
    <div className="min-h-dvh bg-[#0d0d0d]">
      <Sidebar />

      {/* Main content — offset by sidebar width on desktop */}
      <div className="lg:ml-56 min-h-dvh">
        <div className="max-w-lg mx-auto lg:max-w-none lg:mx-0 lg:pb-0" style={{ paddingBottom: 'calc(4.5rem + env(safe-area-inset-bottom))' }}>
          <Outlet />
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
