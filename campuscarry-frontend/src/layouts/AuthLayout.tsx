import { Navigate } from 'react-router-dom'
import { Package } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import ThemeToggle from '@/components/shared/ThemeToggle'

interface Props {
  children: React.ReactNode
}

export default function AuthLayout({ children }: Props) {
  const { user, isAuthenticated } = useAuth()

  if (isAuthenticated) {
    return <Navigate to={user?.role === 'ADMIN' ? '/admin' : '/'} replace />
  }

  return (
    <div className="relative min-h-screen bg-background flex items-center justify-center px-4 py-12 overflow-hidden">
      {/* Decorative glow blobs */}
      <div aria-hidden className="pointer-events-none absolute -top-32 -left-24 w-96 h-96 rounded-full bg-primary/15 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-40 -right-24 w-[28rem] h-[28rem] rounded-full bg-primary/10 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute top-1/3 right-1/4 w-56 h-56 rounded-full bg-amber-400/10 blur-3xl" />

      {/* Theme toggle */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle className="bg-card/70 backdrop-blur border border-border shadow-sm" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo above card */}
        <div className="flex items-center gap-2.5 mb-6 justify-center">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center shadow-lg shadow-primary/25">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div className="leading-tight">
            <span className="block font-extrabold text-foreground text-lg tracking-tight">CampusCarry</span>
            <span className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.18em]">Campus delivery</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-card/95 backdrop-blur rounded-3xl shadow-xl shadow-black/[0.04] dark:shadow-black/30 border border-border px-8 py-8">
          {children}
        </div>

        <p className="text-center text-[11px] text-muted-foreground/70 mt-6">
          By students, for students · VIT Vellore
        </p>
      </div>
    </div>
  )
}
