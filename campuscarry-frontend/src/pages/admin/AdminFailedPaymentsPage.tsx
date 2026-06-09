import { useState, useEffect, useCallback } from 'react'
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { adminApi } from '@/api/admin'
import type { Order } from '@/types'

const today = () => new Date().toISOString().slice(0, 10)

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function AdminFailedPaymentsPage() {
  const navigate  = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [total, setTotal]   = useState(0)
  const [page, setPage]     = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)

  const [from, setFrom] = useState('')
  const [to, setTo]     = useState('')

  const load = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const res = await adminApi.getFailedPayments({
        from: from || undefined,
        to:   to   || undefined,
        page: p, size: 15,
      })
      setOrders(res.content)
      setTotal(res.totalElements)
      setTotalPages(res.totalPages)
    } catch {
      toast.error('Could not load failed payments.')
    } finally {
      setLoading(false)
    }
  }, [from, to])

  useEffect(() => { setPage(0); load(0) }, [from, to])

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Failed Payments</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Orders where payout to deliverer failed after 3 retries · {total} total
          </p>
        </div>
        <button
          onClick={() => load(page)}
          disabled={loading}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </button>
      </div>

      {/* Alert banner */}
      <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
        <p className="text-xs text-red-600 font-medium">
          These orders completed successfully (OTP confirmed) but the payout to the deliverer's UPI failed
          after 3 automatic retries. Manual intervention required — contact the deliverer and process payment manually.
        </p>
      </div>

      {/* Date filter */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
          <span className="text-xs text-gray-400 font-medium">From</span>
          <input type="date" value={from} max={today()}
            onChange={e => setFrom(e.target.value)}
            className="text-sm text-gray-700 outline-none bg-transparent w-[120px]" />
        </div>
        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
          <span className="text-xs text-gray-400 font-medium">To</span>
          <input type="date" value={to} max={today()}
            onChange={e => setTo(e.target.value)}
            className="text-sm text-gray-700 outline-none bg-transparent w-[120px]" />
        </div>
        {(from || to) && (
          <button onClick={() => { setFrom(''); setTo('') }}
            className="text-xs text-gray-400 hover:text-gray-600 underline">
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-200" />
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm font-semibold text-gray-400">No failed payments</p>
            <p className="text-xs text-gray-300 mt-1">{(from || to) ? 'Try a different date range' : 'Everything looks good!'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Delivered at</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Route</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Requester</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Deliverer</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Payout owed</th>
                  <th className="w-16 px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map(o => (
                  <tr key={o.id} className="hover:bg-red-50/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-gray-700">#{o.orderNumber}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {o.deliveredAt ? formatDateTime(o.deliveredAt) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-800">{o.pickupLocationName ?? '—'}</p>
                      <p className="text-xs text-gray-400">→ {o.dropHostelBlock.replace('_', ' ')}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-800">{o.requesterName}</p>
                      {o.requesterPhone && <p className="text-xs text-gray-400">{o.requesterPhone}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-800 font-semibold">{o.delivererName ?? '—'}</p>
                      {o.delivererPhone && <p className="text-xs text-gray-400">{o.delivererPhone}</p>}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-red-500">
                      ₹{Number(o.deliveryFee)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/admin/orders/${o.id}`)}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400 text-xs">Page {page + 1} of {totalPages}</span>
          <div className="flex gap-2">
            <button onClick={() => { const p = page - 1; setPage(p); load(p) }}
              disabled={page === 0 || loading}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 text-xs font-semibold">
              Previous
            </button>
            <button onClick={() => { const p = page + 1; setPage(p); load(p) }}
              disabled={page >= totalPages - 1 || loading}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 text-xs font-semibold">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
