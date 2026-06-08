import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import type { Role } from '@/types'

interface Props {
  children: React.ReactNode
  role?: Role
}

export default function ProtectedRoute({ children, role }: Props) {
  const { user, isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (role && user?.role !== role) {
    return <Navigate to={user?.role === 'ADMIN' ? '/admin' : '/'} replace />
  }

  return <>{children}</>
}
