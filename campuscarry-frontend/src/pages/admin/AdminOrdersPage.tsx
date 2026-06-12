import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, ChevronUp, ChevronDown, Loader2, ChevronsUpDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { adminApi } from '@/api/admin'
import type { Order, OrderStatus, OrderSize, PaymentStatus } from '@/types'

const today = () => new Date().toISOString().slice(0, 10)

const STATUS_STYLE: Record<OrderStatus, string> = {
  PENDING:   'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  ACCEPTED:  'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  DELIVERED: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  EXPIRED:   'bg-muted text-muted-foreground',
  UNPAID:    'bg-red-500/10 text-red-600 dark:text-red-400',
}

const PAY_STYLE: Record<PaymentStatus, string> = {
  PENDING:  'bg-muted text-muted-foreground',
  HELD:     'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  RELEASED: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  FAILED:   'bg-red-500/10 text-red-600 dark:text-red-400',
}

const SIZE_LABEL: Record<OrderSize, string> = { SMALL: 'S', MEDIUM: 'M', LARGE: 'L' }

const ORDER_STATUS_OPTIONS: OrderStatus[] = ['PENDING', 'ACCEPTED', 'DELIVERED', 'EXPIRED', 'UNPAID']
const SIZE_OPTIONS: OrderSize[] = ['SMALL', 'MEDIUM', 'LARGE']
const PAY_STATUS_OPTIONS: PaymentStatus[] = ['PENDING', 'HELD', 'RELEASED', 'FAILED']

const selectCls = 'text-sm border border-border rounded-xl px-3 py-2 bg-card text-foreground outline-none cursor-pointer'

export default function AdminOrdersPage() {
  const navigate = useNavigate()
  const [orders, setOrders]   = useState<Order[]>([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch]               = useState('')
  const [status, setStatus]               = useState<OrderStatus | ''>('')
  const [size, setSize]                   = useState<OrderSize | ''>('')
  const [payStatus, setPayStatus]         = useState<PaymentStatus | ''>('')
  const [from, setFrom]                   = useState('')
  const [to, setTo]                       = useState('')
  const [sortBy, setSortBy]               = useState('createdAt')
  const [sortDir, setSortDir]             = useState<'asc' | 'desc'>('desc')

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const load = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const res = await adminApi.getOrders({
        search:        search.trim() || undefined,
        status:        status        || undefined,
        size:          size          || undefined,
        paymentStatus: payStatus     || undefined,
        from:          from          || undefined,
        to:            to            || undefined,
        page: p, pageSize: 15,
        sortBy, sortDir,
      })
      setOrders(res.content)
      setTotal(res.totalElements)
      setTotalPages(res.totalPages)
    } catch {
      toast.error('Could not load orders.')
    } finally {
      setLoading(false)
    }
  }, [search, status, size, payStatus, from, to, sortBy, sortDir])

  useEffect(() => {
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => { setPage(0); load(0) }, 300)
    return () => clearTimeout(searchTimeout.current)
  }, [search, status, size, payStatus, from, to, sortBy, sortDir])

  const toggleSort = (col: string) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const SortIcon = ({ col }: { col: string }) =>
    sortBy === col
      ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
      : <ChevronsUpDown className="w-3 h-3 opacity-30" />

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold text-foreground tracking-tight">Orders</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Full order history with search and filters · {total} total</p>
      </div>

      {/* Filter bar */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-4 space-y-2.5">
        <div className="flex flex-wrap gap-2.5">
          <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-xl px-3 py-2 flex-1 min-w-[180px] focus-within:border-primary/50 transition-colors">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              placeholder="Order #, requester, deliverer…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground/60 text-foreground"
            />
          </div>

          <select value={status} onChange={e => setStatus(e.target.value as OrderStatus | '')} className={selectCls}>
            <option value="">All status</option>
            {ORDER_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
          </select>

          <select value={size} onChange={e => setSize(e.target.value as OrderSize | '')} className={selectCls}>
            <option value="">All sizes</option>
            {SIZE_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
          </select>

          <select value={payStatus} onChange={e => setPayStatus(e.target.value as PaymentStatus | '')} className={selectCls}>
            <option value="">All payments</option>
            {PAY_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
          </select>
        </div>

        <div className="flex flex-wrap gap-2.5 items-center">
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
              Clear dates
            </button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className={selectCls}>
              <option value="createdAt">Sort: Date</option>
              <option value="deliveryFee">Sort: Fee</option>
            </select>
            <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
              className="flex items-center gap-1 text-sm border border-border rounded-xl px-3 py-2 bg-card text-foreground hover:bg-muted transition-colors">
              {sortDir === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary/40" />
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground font-medium">No orders found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">#</th>
                  <th
                    className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground select-none"
                    onClick={() => toggleSort('createdAt')}
                  >
                    <span className="flex items-center gap-1">Date <SortIcon col="createdAt" /></span>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Route</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Parties</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sz</th>
                  <th
                    className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground select-none"
                    onClick={() => toggleSort('deliveryFee')}
                  >
                    <span className="flex items-center gap-1">Fee <SortIcon col="deliveryFee" /></span>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {orders.map(o => (
                  <tr
                    key={o.id}
                    onClick={() => navigate(`/admin/orders/${o.id}`)}
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold text-foreground/80">#{o.orderNumber}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-foreground font-medium">{o.pickupLocationName ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">→ {o.dropHostelBlock.replace('_', ' ')}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-foreground/80">{o.requesterName}</p>
                      <p className="text-xs text-muted-foreground">{o.delivererName ?? 'No deliverer'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                        {SIZE_LABEL[o.size]}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-foreground">₹{Number(o.deliveryFee)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLE[o.status]}`}>
                        {o.status.charAt(0) + o.status.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PAY_STYLE[o.paymentStatus]}`}>
                        {o.paymentStatus.charAt(0) + o.paymentStatus.slice(1).toLowerCase()}
                      </span>
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
