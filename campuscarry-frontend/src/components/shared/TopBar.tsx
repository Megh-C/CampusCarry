import { useNavigate } from 'react-router-dom'
import { ArrowLeft, LogOut, Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import ThemeToggle from '@/components/shared/ThemeToggle'

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
          : 'bg-background/80 backdrop-blur-md border-b border-border',
        className ?? ''
      )}
    >
      <div className="max-w-lg mx-auto flex items-center justify-between h-full px-4">
        {/* Left */}
        {showBack ? (
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors -ml-1"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center shadow-sm shadow-primary/30">
              <Package className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-extrabold text-foreground text-base tracking-tight">CampusCarry</span>
          </div>
        )}

        {/* Center title when back button is shown */}
        {showBack && title && (
          <h1 className="absolute left-1/2 -translate-x-1/2 font-semibold text-foreground text-base">
            {title}
          </h1>
        )}

        {/* Right slot */}
        <div className="flex items-center gap-1">
          <ThemeToggle />
          {right}
          {showLogout && (
            <button
              onClick={handleLogout}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
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
