import { useNavigate } from 'react-router-dom'
import { PackageX } from 'lucide-react'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="relative min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -top-32 -right-24 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-5">
        <PackageX className="w-10 h-10 text-primary" />
      </div>
      <p className="text-xs font-bold text-primary uppercase tracking-[0.2em] mb-2">Error 404</p>
      <h1 className="text-2xl font-extrabold text-foreground mb-2">Page not found</h1>
      <p className="text-muted-foreground text-sm mb-7">This page doesn't exist or was moved.</p>
      <button
        onClick={() => navigate('/')}
        className="px-6 py-3 bg-gradient-to-br from-primary to-orange-600 text-white rounded-2xl text-sm font-semibold shadow-lg shadow-primary/25 hover:brightness-105 active:scale-[0.98] transition-all"
      >
        Back to home
      </button>
    </div>
  )
}
