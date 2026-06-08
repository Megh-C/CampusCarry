import { Outlet } from 'react-router-dom'
import BottomNav from '@/components/shared/BottomNav'

interface Props {
  topBar?: React.ReactNode
  hideTopBar?: boolean
}

export default function AppLayout({ topBar, hideTopBar }: Props) {
  return (
    <div className="min-h-screen bg-gray-50">
      {!hideTopBar && topBar}

      {/* Content — padded top for TopBar, bottom for BottomNav */}
      <main className="max-w-lg mx-auto pt-14 pb-24 min-h-screen">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  )
}
