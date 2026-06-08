import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import AuthLayout from '@/layouts/AuthLayout'
import { authApi } from '@/api/auth'

export default function SignupInitiatePage() {
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
      await authApi.initiateSignup(email.trim())
      toast.success('OTP sent! Check your email.')
      navigate('/signup/verify-otp', { state: { email: email.trim() } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP.')
    } finally {
      setLoading(false)
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
                step === 1 ? 'w-6 bg-primary' : 'w-3 bg-gray-200'
              }`}
            />
          ))}
        </div>
        <span className="text-xs text-gray-400 ml-1">Step 1 of 3</span>
      </div>

      <h2 className="text-xl font-bold text-gray-900">Create account</h2>
      <p className="text-sm text-gray-500 mt-1 mb-7">
        Enter your college email to get started
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            College Email
          </label>
          <input
            type="email"
            autoComplete="email"
            placeholder="you@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/15 focus:bg-white disabled:opacity-60"
          />
        </div>

        {error && (
          <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? 'Sending OTP...' : 'Send OTP'}
        </button>
      </form>

      <p className="text-xs text-gray-500 text-center mt-6">
        Already have an account?{' '}
        <Link to="/login" className="text-primary font-semibold hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
