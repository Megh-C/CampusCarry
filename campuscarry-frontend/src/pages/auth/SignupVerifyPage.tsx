import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import AuthLayout from '@/layouts/AuthLayout'
import OtpInput from '@/components/shared/OtpInput'
import { authApi } from '@/api/auth'

export default function SignupVerifyPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const email: string = location.state?.email ?? ''

  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')

  // Guard — if landed here without email, send back
  if (!email) {
    navigate('/signup', { replace: true })
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (otp.length < 6) {
      setError('Please enter the full 6-digit OTP.')
      return
    }

    setLoading(true)
    try {
      await authApi.verifyOtp(email, otp)
      toast.success('Email verified!')
      navigate('/signup/complete', { state: { email } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid OTP.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    setError('')
    try {
      await authApi.initiateSignup(email)
      toast.success('New OTP sent!')
      setOtp('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend.')
    } finally {
      setResending(false)
    }
  }

  return (
    <AuthLayout>
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        <div className="flex items-center gap-1.5">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className={`h-1.5 rounded-full transition-all ${
                step <= 2 ? 'w-6 bg-primary' : 'w-3 bg-gray-200'
              }`}
            />
          ))}
        </div>
        <span className="text-xs text-gray-400 ml-1">Step 2 of 3</span>
      </div>

      <h2 className="text-xl font-bold text-gray-900">Verify your email</h2>
      <p className="text-sm text-gray-500 mt-1 mb-2">
        We sent a 6-digit code to
      </p>
      <p className="text-sm font-semibold text-gray-800 mb-7 truncate">{email}</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <OtpInput value={otp} onChange={setOtp} disabled={loading} />

        {error && (
          <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-center">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || otp.length < 6}
          className="w-full py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? 'Verifying...' : 'Verify OTP'}
        </button>
      </form>

      <div className="text-center mt-5">
        <p className="text-xs text-gray-500">
          Didn't receive it?{' '}
          <button
            onClick={handleResend}
            disabled={resending}
            className="text-primary font-semibold hover:underline disabled:opacity-60"
          >
            {resending ? 'Resending...' : 'Resend OTP'}
          </button>
        </p>
      </div>
    </AuthLayout>
  )
}
