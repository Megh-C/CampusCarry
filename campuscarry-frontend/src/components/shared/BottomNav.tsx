import { NavLink, useNavigate } from 'react-router-dom'
import { Home, ClipboardList, Plus, User, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'

const leftItems = [
  { to: '/', icon: Home, label: 'Feed', end: true },
  { to: '/orders/me', icon: ClipboardList, label: 'My Orders', end: false },
]

const rightNavItems = [
  { to: '/profile', icon: User, label: 'Profile' },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'relative flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-colors min-w-[56px]',
      isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
    )

  return (
    <nav className="fixed bottom-3 left-3 right-3 z-50">
      <div className="max-w-lg mx-auto flex items-center justify-around px-2 h-16 relative rounded-3xl border border-border bg-card/90 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.45)]">

        {/* Left two items */}
        {leftItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end} className={navLinkClass}>
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute -top-px left-1/2 -translate-x-1/2 w-6 h-1 rounded-full bg-primary" />
                )}
                <Icon className={cn('w-5 h-5', isActive ? 'stroke-[2.5px]' : '')} />
                <span className="text-[10px] font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Centre FAB — create order */}
        <div className="flex items-center justify-center relative -top-5">
          <button
            onClick={() => navigate('/orders/new')}
            className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-orange-600 text-white shadow-lg shadow-primary/40 flex items-center justify-center hover:brightness-105 active:scale-95 transition-all ring-4 ring-background"
            aria-label="Place new order"
          >
            <Plus className="w-7 h-7 stroke-[2.5px]" />
          </button>
        </div>

        {/* Right: Profile */}
        {rightNavItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={navLinkClass}>
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute -top-px left-1/2 -translate-x-1/2 w-6 h-1 rounded-full bg-primary" />
                )}
                <Icon className={cn('w-5 h-5', isActive ? 'stroke-[2.5px]' : '')} />
                <span className="text-[10px] font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-colors min-w-[56px] text-muted-foreground hover:text-destructive active:text-destructive"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[10px] font-medium">Logout</span>
        </button>

      </div>
    </nav>
  )
}
