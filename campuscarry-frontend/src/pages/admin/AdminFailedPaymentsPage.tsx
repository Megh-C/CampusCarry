export default function AdminFailedPaymentsPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Failed Payments</h1>
      <p className="text-sm text-gray-500 mb-6">Orders where payout failed after 3 retries</p>
      <div className="h-64 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 text-sm shadow-sm">
        Failed payment orders — Phase 5
      </div>
    </div>
  )
}
