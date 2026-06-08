import { useNavigate } from 'react-router-dom'
import { ArrowLeft, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'

interface Props {
  title?: string
  showBack?: boolean
  right?: React.ReactNode
  transparent?: boolean
  className?: string | undefined
  showLogout?: boolean
}

export default function TopBar({ title, showBack, right, transparent, className, showLogout }: Props) {
  const navigate = useNavigate()
  const { logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-40 h-14',
        transparent
          ? 'bg-transparent'
          : 'bg-white/95 backdrop-blur-sm border-b border-gray-100',
        className ?? ''
      )}
    >
      <div className="max-w-lg mx-auto flex items-center justify-between h-full px-4">
        {/* Left */}
        {showBack ? (
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors -ml-1"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white text-xs font-bold">CC</span>
            </div>
            <span className="font-bold text-gray-900 text-base tracking-tight">CampusCarry</span>
          </div>
        )}

        {/* Center title when back button is shown */}
        {showBack && title && (
          <h1 className="absolute left-1/2 -translate-x-1/2 font-semibold text-gray-900 text-base">
            {title}
          </h1>
        )}

        {/* Right slot */}
        <div className="flex items-center gap-1">
          {right}
          {showLogout && (
            <button
              onClick={handleLogout}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
