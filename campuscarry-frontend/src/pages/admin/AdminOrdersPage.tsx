import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, ChevronUp, ChevronDown, Loader2, ChevronsUpDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { adminApi } from '@/api/admin'
import type { Order, OrderStatus, OrderSize, PaymentStatus } from '@/types'

const today = () => new Date().toISOString().slice(0, 10)

const STATUS_STYLE: Record<OrderStatus, string> = {
  PENDING:   'bg-blue-50 text-blue-600',
  ACCEPTED:  'bg-amber-50 text-amber-600',
  DELIVERED: 'bg-green-50 text-green-600',
  EXPIRED:   'bg-gray-100 text-gray-500',
  UNPAID:    'bg-red-50 text-red-500',
}

const PAY_STYLE: Record<PaymentStatus, string> = {
  PENDING:  'bg-gray-100 text-gray-500',
  HELD:     'bg-blue-50 text-blue-600',
  RELEASED: 'bg-green-50 text-green-600',
  FAILED:   'bg-red-50 text-red-500',
}

const SIZE_LABEL: Record<OrderSize, string> = { SMALL: 'S', MEDIUM: 'M', LARGE: 'L' }

const ORDER_STATUS_OPTIONS: OrderStatus[] = ['PENDING', 'ACCEPTED', 'DELIVERED', 'EXPIRED', 'UNPAID']
const SIZE_OPTIONS: OrderSize[] = ['SMALL', 'MEDIUM', 'LARGE']
const PAY_STATUS_OPTIONS: PaymentStatus[] = ['PENDING', 'HELD', 'RELEASED', 'FAILED']

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

  const searchTimeout = useRef<ReturnType<typeof setTimeout>>()

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
        <h1 className="text-xl font-bold text-gray-900">Orders</h1>
        <p className="text-sm text-gray-500 mt-0.5">Full order history with search and filters · {total} total</p>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2.5">
        <div className="flex flex-wrap gap-2.5">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 flex-1 min-w-[180px]">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              placeholder="Order #, requester, deliverer…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent text-sm outline-none w-full placeholder:text-gray-400"
            />
          </div>

          <select value={status} onChange={e => setStatus(e.target.value as OrderStatus | '')}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 outline-none cursor-pointer">
            <option value="">All status</option>
            {ORDER_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
          </select>

          <select value={size} onChange={e => setSize(e.target.value as OrderSize | '')}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 outline-none cursor-pointer">
            <option value="">All sizes</option>
            {SIZE_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
          </select>

          <select value={payStatus} onChange={e => setPayStatus(e.target.value as PaymentStatus | '')}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 outline-none cursor-pointer">
            <option value="">All payments</option>
            {PAY_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
          </select>
        </div>

        <div className="flex flex-wrap gap-2.5 items-center">
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
              Clear dates
            </button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 outline-none cursor-pointer">
              <option value="createdAt">Sort: Date</option>
              <option value="deliveryFee">Sort: Fee</option>
            </select>
            <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
              className="flex items-center gap-1 text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 hover:bg-gray-50 transition-colors">
              {sortDir === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-200" />
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400 font-medium">No orders found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">#</th>
                  <th
                    className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide cursor-pointer hover:text-gray-600 select-none"
                    onClick={() => toggleSort('createdAt')}
                  >
                    <span className="flex items-center gap-1">Date <SortIcon col="createdAt" /></span>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Route</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Parties</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Sz</th>
                  <th
                    className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide cursor-pointer hover:text-gray-600 select-none"
                    onClick={() => toggleSort('deliveryFee')}
                  >
                    <span className="flex items-center gap-1">Fee <SortIcon col="deliveryFee" /></span>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map(o => (
                  <tr
                    key={o.id}
                    onClick={() => navigate(`/admin/orders/${o.id}`)}
                    className="hover:bg-gray-50/60 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold text-gray-700">#{o.orderNumber}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-800 font-medium">{o.pickupLocationName ?? '—'}</p>
                      <p className="text-xs text-gray-400">→ {o.dropHostelBlock.replace('_', ' ')}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-800">{o.requesterName}</p>
                      <p className="text-xs text-gray-400">{o.delivererName ?? 'No deliverer'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {SIZE_LABEL[o.size]}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">₹{Number(o.deliveryFee)}</td>
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
