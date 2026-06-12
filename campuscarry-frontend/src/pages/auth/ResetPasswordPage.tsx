import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import AuthLayout from '@/layouts/AuthLayout'
import OtpInput from '@/components/shared/OtpInput'
import { authApi } from '@/api/auth'

const inputCls =
  'w-full px-4 py-3 rounded-xl border border-input bg-muted/40 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-card disabled:opacity-60'

const labelCls = 'text-xs font-semibold text-muted-foreground uppercase tracking-wide'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const email: string = location.state?.email ?? ''

  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!email) {
    navigate('/forgot-password', { replace: true })
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (otp.length < 6) {
      setError('Please enter the full 6-digit OTP.')
      return
    }
    if (!newPassword || !confirmNewPassword) {
      setError('Please fill in all fields.')
      return
    }
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match.')
      return
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    try {
      await authApi.resetPassword({ email, otp, newPassword, confirmNewPassword })
      toast.success('Password reset! Please sign in.')
      navigate('/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <h2 className="text-xl font-extrabold text-foreground">Reset password</h2>
      <p className="text-sm text-muted-foreground mt-1 mb-2">
        Enter the OTP sent to
      </p>
      <p className="text-sm font-semibold text-foreground mb-7 truncate">{email}</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* OTP */}
        <div className="space-y-3">
          <label className={`${labelCls} block text-center`}>
            Enter OTP
          </label>
          <OtpInput value={otp} onChange={setOtp} disabled={loading} />
        </div>

        {/* New password */}
        <div className="space-y-1.5">
          <label className={labelCls}>New Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Min. 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
              className={`${inputCls} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Confirm */}
        <div className="space-y-1.5">
          <label className={labelCls}>Confirm Password</label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              placeholder="Re-enter password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              disabled={loading}
              className={`${inputCls} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 text-center">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || otp.length < 6}
          className="w-full py-3 rounded-xl bg-gradient-to-br from-primary to-orange-600 text-white text-sm font-semibold shadow-lg shadow-primary/25 hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
    </AuthLayout>
  )
}
