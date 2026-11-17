import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  return (
    <div className="min-h-dvh bg-[#0d0d0d]">
      <Sidebar />

      {/* Main content — offset by sidebar width on desktop */}
      <div className="lg:ml-56">
        <div className="max-w-2xl mx-auto lg:mx-0 lg:max-w-none pb-[72px] lg:pb-0 lg:px-0">
          <div className="lg:max-w-3xl">
            <Outlet />
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
