import TopBar from '@/components/shared/TopBar'
import { Bell } from 'lucide-react'

export default function FeedPage() {
  return (
    <>
      <TopBar
        showLogout
        right={
          <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100">
            <Bell className="w-5 h-5 text-gray-600" />
          </button>
        }
      />
      <div className="px-4 pt-4">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900">Live Feed</h1>
          <p className="text-sm text-gray-500 mt-0.5">Orders waiting for a deliverer</p>
        </div>
        <div className="h-64 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 text-sm shadow-sm">
          Order feed cards + WebSocket — Phase 3
        </div>
      </div>
    </>
  )
}
