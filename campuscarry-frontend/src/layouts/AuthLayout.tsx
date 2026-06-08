import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

interface Props {
  children: React.ReactNode
}

export default function AuthLayout({ children }: Props) {
  const { user, isAuthenticated } = useAuth()

  if (isAuthenticated) {
    return <Navigate to={user?.role === 'ADMIN' ? '/admin' : '/'} replace />
  }

  return (
    <div className="min-h-screen bg-zinc-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Logo above card */}
        <div className="flex items-center gap-2 mb-6 justify-center">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-sm">
            <span className="text-white text-xs font-bold tracking-tight">CC</span>
          </div>
          <span className="font-bold text-gray-800 text-lg tracking-tight">CampusCarry</span>
        </div>

        {/* White card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 px-8 py-8">
          {children}
        </div>
      </div>
    </div>
  )
}
