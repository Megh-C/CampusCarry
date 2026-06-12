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
          <h1 className="text-xl font-extrabold text-foreground tracking-tight">Failed Payments</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Orders where payout to deliverer failed after 3 retries · {total} total
          </p>
        </div>
        <button
          onClick={() => load(page)}
          disabled={loading}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </button>
      </div>

      {/* Alert banner */}
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
        <p className="text-xs text-red-600 dark:text-red-400 font-medium">
          These orders completed successfully (OTP confirmed) but the payout to the deliverer's UPI failed
          after 3 automatic retries. Manual intervention required — contact the deliverer and process payment manually.
        </p>
      </div>

      {/* Date filter */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 bg-muted/50 border border-border rounded-xl px-3 py-2">
          <span className="text-xs text-muted-foreground font-medium">From</span>
          <input type="date" value={from} max={today()}
            onChange={e => setFrom(e.target.value)}
            className="text-sm text-foreground outline-none bg-transparent w-[120px]" />
        </div>
        <div className="flex items-center gap-1.5 bg-muted/50 border border-border rounded-xl px-3 py-2">
          <span className="text-xs text-muted-foreground font-medium">To</span>
          <input type="date" value={to} max={today()}
            onChange={e => setTo(e.target.value)}
            className="text-sm text-foreground outline-none bg-transparent w-[120px]" />
        </div>
        {(from || to) && (
          <button onClick={() => { setFrom(''); setTo('') }}
            className="text-xs text-muted-foreground hover:text-foreground underline">
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary/40" />
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm font-semibold text-muted-foreground">No failed payments</p>
            <p className="text-xs text-muted-foreground/60 mt-1">{(from || to) ? 'Try a different date range' : 'Everything looks good!'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Delivered at</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Route</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Requester</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Deliverer</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Payout owed</th>
                  <th className="w-16 px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {orders.map(o => (
                  <tr key={o.id} className="hover:bg-red-500/5 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-foreground/80">#{o.orderNumber}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {o.deliveredAt ? formatDateTime(o.deliveredAt) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-foreground/80">{o.pickupLocationName ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">→ {o.dropHostelBlock.replace('_', ' ')}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-foreground/80">{o.requesterName}</p>
                      {o.requesterPhone && <p className="text-xs text-muted-foreground">{o.requesterPhone}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-foreground font-semibold">{o.delivererName ?? '—'}</p>
                      {o.delivererPhone && <p className="text-xs text-muted-foreground">{o.delivererPhone}</p>}
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
          <span className="text-muted-foreground text-xs">Page {page + 1} of {totalPages}</span>
          <div className="flex gap-2">
            <button onClick={() => { const p = page - 1; setPage(p); load(p) }}
              disabled={page === 0 || loading}
              className="px-3 py-1.5 rounded-lg border border-border bg-card text-foreground/80 hover:bg-muted disabled:opacity-40 text-xs font-semibold transition-colors">
              Previous
            </button>
            <button onClick={() => { const p = page + 1; setPage(p); load(p) }}
              disabled={page >= totalPages - 1 || loading}
              className="px-3 py-1.5 rounded-lg border border-border bg-card text-foreground/80 hover:bg-muted disabled:opacity-40 text-xs font-semibold transition-colors">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
