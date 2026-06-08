import AuthLayout from '@/layouts/AuthLayout'

export default function SignupPage() {
  return (
    <AuthLayout>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Create account</h2>
      <p className="text-sm text-gray-500 mb-6">Join CampusCarry today</p>
      <div className="h-40 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 text-sm">
        Signup flow — Phase 2
      </div>
    </AuthLayout>
  )
}
