import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import AuthLayout from '@/layouts/AuthLayout'
import { authApi } from '@/api/auth'

const MH_BLOCKS = ['A_MH', 'B_MH', 'C_MH', 'D_MH', 'E_MH', 'F_MH', 'G_MH', 'H_MH', 'J_MH', 'K_MH', 'L_MH', 'M_MH', 'N_MH', 'P_MH', 'Q_MH', 'R_MH', 'S_MH', 'T_MH']
const LH_BLOCKS = ['A_LH', 'B_LH', 'C_LH', 'D_LH', 'E_LH', 'F_LH', 'G_LH', 'H_LH', 'J_LH']

const inputCls =
  'w-full px-4 py-3 rounded-xl border border-input bg-muted/40 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-card disabled:opacity-60'

const selectCls =
  'w-full px-4 py-3 rounded-xl border border-input bg-muted/40 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-card disabled:opacity-60 appearance-none cursor-pointer'

const labelCls = 'text-xs font-semibold text-muted-foreground uppercase tracking-wide'

export default function SignupCompletePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const email: string = location.state?.email ?? ''

  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    password: '',
    confirmPassword: '',
    gender: '',
    year: '',
    hostelBlock: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!email) {
    navigate('/signup', { replace: true })
    return null
  }

  const hostelBlockOptions =
    form.gender === 'MALE' ? MH_BLOCKS :
    form.gender === 'FEMALE' ? LH_BLOCKS :
    [...MH_BLOCKS, ...LH_BLOCKS]

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({
      ...f,
      [key]: e.target.value,
      ...(key === 'gender' ? { hostelBlock: '' } : {}),
    }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const { fullName, phone, password, confirmPassword, gender, year, hostelBlock } = form

    if (!fullName.trim() || !phone.trim() || !password || !gender || !year || !hostelBlock) {
      setError('Please fill in all fields.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    try {
      await authApi.completeSignup({
        email,
        fullName: fullName.trim(),
        phone: phone.trim(),
        password,
        confirmPassword,
        gender,
        year: Number(year),
        hostelBlock,
      })
      toast.success('Account created! Please sign in.')
      navigate('/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed.')
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
            <div key={step} className="h-1.5 w-6 rounded-full bg-primary" />
          ))}
        </div>
        <span className="text-xs text-muted-foreground ml-1">Step 3 of 3</span>
      </div>

      <h2 className="text-xl font-extrabold text-foreground">Complete your profile</h2>
      <p className="text-sm text-muted-foreground mt-1 mb-7">Almost there — just a few more details</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full name */}
        <div className="space-y-1.5">
          <label className={labelCls}>Full Name</label>
          <input
            type="text"
            placeholder="Your full name"
            value={form.fullName}
            onChange={set('fullName')}
            disabled={loading}
            className={inputCls}
          />
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <label className={labelCls}>Phone Number</label>
          <input
            type="tel"
            placeholder="10-digit mobile number"
            value={form.phone}
            onChange={set('phone')}
            disabled={loading}
            maxLength={10}
            className={inputCls}
          />
        </div>

        {/* Gender + Year — side by side */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className={labelCls}>Gender</label>
            <div className="relative">
              <select
                value={form.gender}
                onChange={set('gender')}
                disabled={loading}
                className={selectCls}
              >
                <option value="">Select</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Year</label>
            <select
              value={form.year}
              onChange={set('year')}
              disabled={loading}
              className={selectCls}
            >
              <option value="">Year</option>
              {[1, 2, 3, 4].map((y) => (
                <option key={y} value={y}>Year {y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Hostel block */}
        <div className="space-y-1.5">
          <label className={labelCls}>Hostel Block</label>
          <select
            value={form.hostelBlock}
            onChange={set('hostelBlock')}
            disabled={loading || !form.gender}
            className={selectCls}
          >
            <option value="">{form.gender ? 'Select block' : 'Select gender first'}</option>
            {hostelBlockOptions.map((b) => (
              <option key={b} value={b}>{b.replace('_', ' ')}</option>
            ))}
          </select>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label className={labelCls}>Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Min. 8 characters"
              value={form.password}
              onChange={set('password')}
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

        {/* Confirm password */}
        <div className="space-y-1.5">
          <label className={labelCls}>Confirm Password</label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              placeholder="Re-enter password"
              value={form.confirmPassword}
              onChange={set('confirmPassword')}
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
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>
    </AuthLayout>
  )
}
