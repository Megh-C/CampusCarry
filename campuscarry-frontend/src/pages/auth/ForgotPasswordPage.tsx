import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import AuthLayout from '@/layouts/AuthLayout'
import { authApi } from '@/api/auth'

const inputCls =
  'w-full px-4 py-3 rounded-xl border border-input bg-muted/40 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-card disabled:opacity-60'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('Please enter your email.')
      return
    }

    setLoading(true)
    try {
      await authApi.forgotPassword(email.trim())
      toast.success('If registered, an OTP has been sent.')
      navigate('/reset-password', { state: { email: email.trim() } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <Link
        to="/login"
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6 w-fit transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to login
      </Link>

      <h2 className="text-xl font-extrabold text-foreground">Forgot password?</h2>
      <p className="text-sm text-muted-foreground mt-1 mb-7">
        Enter your registered email and we'll send you a reset OTP
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Email
          </label>
          <input
            type="email"
            autoComplete="email"
            placeholder="you@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className={inputCls}
          />
        </div>

        {error && (
          <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-gradient-to-br from-primary to-orange-600 text-white text-sm font-semibold shadow-lg shadow-primary/25 hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? 'Sending OTP...' : 'Send Reset OTP'}
        </button>
      </form>
    </AuthLayout>
  )
}
