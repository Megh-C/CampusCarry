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
      'flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-colors min-w-[56px]',
      isActive ? 'text-primary' : 'text-gray-400 hover:text-gray-600'
    )

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
      <div className="max-w-lg mx-auto flex items-center justify-around px-2 h-16 relative">

        {/* Left two items */}
        {leftItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end} className={navLinkClass}>
            {({ isActive }) => (
              <>
                <Icon className={cn('w-5 h-5', isActive ? 'stroke-[2.5px]' : '')} />
                <span className="text-[10px] font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Centre FAB — create order */}
        <div className="flex items-center justify-center relative -top-4">
          <button
            onClick={() => navigate('/orders/new')}
            className="w-14 h-14 rounded-full bg-primary text-white shadow-lg shadow-primary/30 flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all"
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
                <Icon className={cn('w-5 h-5', isActive ? 'stroke-[2.5px]' : '')} />
                <span className="text-[10px] font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-colors min-w-[56px] text-gray-400 hover:text-red-500 active:text-red-500"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[10px] font-medium">Logout</span>
        </button>

      </div>
    </nav>
  )
}
