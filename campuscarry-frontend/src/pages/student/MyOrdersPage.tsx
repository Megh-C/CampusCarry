import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, PackageOpen, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import TopBar from '@/components/shared/TopBar'
import { ordersApi } from '@/api/orders'
import type { Order, OrderStatus } from '@/types'

type Tab = 'requester' | 'deliverer'

const STATUS_STYLE: Record<OrderStatus, string> = {
  PENDING:   'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  ACCEPTED:  'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  DELIVERED: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  EXPIRED:   'bg-muted text-muted-foreground',
  UNPAID:    'bg-red-500/10 text-red-600 dark:text-red-400',
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING:   'Pending',
  ACCEPTED:  'In Progress',
  DELIVERED: 'Delivered',
  EXPIRED:   'Expired',
  UNPAID:    'Unpaid',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const RATING_LABEL = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!']

export default function MyOrdersPage() {
  const navigate = useNavigate()
  const [tab, setTab]           = useState<Tab>('requester')
  const [orders, setOrders]     = useState<Order[]>([])
  const [loading, setLoading]   = useState(true)
  const [page, setPage]         = useState(0)
  const [hasMore, setHasMore]   = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  // Rating state
  const [ratingId, setRatingId]         = useState<string | null>(null)
  const [selectedStars, setSelectedStars] = useState(0)
  const [submitting, setSubmitting]       = useState(false)

  const loadOrders = useCallback(async (role: Tab, pageNum: number, append = false) => {
    try {
      const res = await ordersApi.getMyOrders({ role, page: pageNum, size: 10 })
      setOrders(prev => append ? [...prev, ...res.content] : res.content)
      setHasMore(!res.last)
    } catch {
      toast.error('Could not load orders.')
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    setPage(0)
    setOrders([])
    loadOrders(tab, 0).finally(() => setLoading(false))
  }, [tab, loadOrders])

  const handleLoadMore = async () => {
    const next = page + 1
    setLoadingMore(true)
    await loadOrders(tab, next, true)
    setPage(next)
    setLoadingMore(false)
  }

  const handleSubmitRating = async (orderId: string) => {
    if (selectedStars === 0) return
    setSubmitting(true)
    try {
      await ordersApi.submitRating(orderId, selectedStars)
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, isRated: true, ratingStars: selectedStars } : o))
      toast.success('Rating submitted!')
      setRatingId(null)
      setSelectedStars(0)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not submit rating.')
    } finally {
      setSubmitting(false)
    }
  }

  const canRate = (o: Order) =>
    tab === 'requester' && o.status === 'DELIVERED' && !o.isRated

  return (
    <>
      <TopBar title="My Orders" showBack />

      {/* Tab switcher */}
      <div className="px-4 pt-6 max-w-lg mx-auto">
        <div className="flex bg-muted rounded-2xl p-1 mb-4">
          {(['requester', 'deliverer'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                tab === t
                  ? 'bg-card shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'requester' ? 'My Requests' : 'My Deliveries'}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-28 max-w-lg mx-auto">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary/40" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-3xl bg-muted flex items-center justify-center mb-4">
              <PackageOpen className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground">
              {tab === 'requester' ? 'No orders placed yet' : 'No deliveries yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => {
              const isRating = ratingId === order.id
              return (
                <div
                  key={order.id}
                  onClick={() => navigate(`/orders/${order.id}`)}
                  className="bg-card rounded-2xl border border-border shadow-sm hover:shadow-md hover:border-primary/20 p-4 cursor-pointer active:scale-[0.99] transition-all"
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">#{order.orderNumber} · {formatDate(order.createdAt)}</p>
                      <p className="text-sm font-semibold text-foreground mt-0.5 truncate">
                        {order.pickupLocationName} → {order.dropHostelBlock.replace('_', ' ')}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${STATUS_STYLE[order.status]}`}>
                      {STATUS_LABEL[order.status]}
                    </span>
                  </div>

                  {/* Description */}
                  {order.description && (
                    <p className="text-xs text-muted-foreground bg-muted/60 rounded-xl px-3 py-2 mb-2 leading-relaxed">
                      {order.description}
                    </p>
                  )}

                  {/* Bottom row */}
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-extrabold text-foreground">₹{order.deliveryFee}</span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {order.size}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {order.isRated && (
                        order.ratingStars ? (
                          <span className="flex items-center gap-0.5">
                            {[1,2,3,4,5].map(s => (
                              <Star key={s} className={`w-3 h-3 ${s <= order.ratingStars! ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/25 fill-muted'}`} />
                            ))}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /> Rated
                          </span>
                        )
                      )}
                      {canRate(order) && !isRating && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setRatingId(order.id); setSelectedStars(0) }}
                          className="text-xs font-semibold text-primary border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-colors"
                        >
                          {order.isRatingSkipped ? 'Rate Now' : 'Rate'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline rating */}
                  {isRating && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-3 text-center">
                        Rate your experience with {order.delivererName}
                      </p>
                      <div className="flex gap-2 justify-center mb-2">
                        {[1,2,3,4,5].map(s => (
                          <button key={s} onClick={(e) => { e.stopPropagation(); setSelectedStars(s) }} className="transition-transform active:scale-90">
                            <Star className={`w-9 h-9 transition-colors ${s <= selectedStars ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/25 fill-muted'}`} />
                          </button>
                        ))}
                      </div>
                      {selectedStars > 0 && (
                        <p className="text-xs text-center text-muted-foreground mb-3">{RATING_LABEL[selectedStars]}</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSubmitRating(order.id) }}
                          disabled={selectedStars === 0 || submitting}
                          className="flex-1 py-2.5 rounded-xl bg-gradient-to-br from-primary to-orange-600 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
                        >
                          {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          Submit
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setRatingId(null); setSelectedStars(0) }}
                          disabled={submitting}
                          className="px-4 py-2.5 rounded-xl bg-muted text-sm font-semibold text-foreground/80"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {hasMore && (
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="w-full py-3 rounded-xl border border-border text-sm font-semibold text-muted-foreground flex items-center justify-center gap-2 hover:bg-muted/60 transition-colors"
              >
                {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                {loadingMore ? 'Loading...' : 'Load More'}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  )
}
