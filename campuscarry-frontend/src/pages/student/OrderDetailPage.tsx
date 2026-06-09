import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Loader2, MapPin, User, Phone, Clock, Star, CreditCard } from 'lucide-react'
import toast from 'react-hot-toast'
import TopBar from '@/components/shared/TopBar'
import { ordersApi } from '@/api/orders'
import type { Order, OrderStatus, PaymentStatus } from '@/types'

const STATUS_STYLE: Record<OrderStatus, string> = {
  PENDING:   'bg-blue-50 text-blue-600 border-blue-100',
  ACCEPTED:  'bg-amber-50 text-amber-600 border-amber-100',
  DELIVERED: 'bg-green-50 text-green-600 border-green-100',
  EXPIRED:   'bg-gray-100 text-gray-500 border-gray-200',
  UNPAID:    'bg-red-50 text-red-500 border-red-100',
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING:   'Pending',
  ACCEPTED:  'In Progress',
  DELIVERED: 'Delivered',
  EXPIRED:   'Expired',
  UNPAID:    'Unpaid',
}

const PAY_STYLE: Record<PaymentStatus, string> = {
  PENDING:  'bg-gray-100 text-gray-500',
  HELD:     'bg-blue-50 text-blue-600',
  RELEASED: 'bg-green-50 text-green-600',
  FAILED:   'bg-red-50 text-red-500',
}

const PAY_LABEL: Record<PaymentStatus, string> = {
  PENDING:  'Not paid',
  HELD:     'Payment held',
  RELEASED: 'Paid out',
  FAILED:   'Payout failed',
}

const RATING_LABEL = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!']

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  // Rating state
  const [selectedStars, setSelectedStars] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!id) return
    ordersApi.getById(id)
      .then(setOrder)
      .catch(() => toast.error('Could not load order.'))
      .finally(() => setLoading(false))
  }, [id])

  const handleSubmitRating = async () => {
    if (!order || selectedStars === 0) return
    setSubmitting(true)
    try {
      await ordersApi.submitRating(order.id, selectedStars)
      setOrder(prev => prev ? { ...prev, isRated: true, ratingStars: selectedStars } : prev)
      toast.success('Rating submitted!')
      setSelectedStars(0)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not submit rating.')
    } finally {
      setSubmitting(false)
    }
  }

  const canRate = order?.status === 'DELIVERED' && !order.isRated

  return (
    <>
      <TopBar showBack title="Order Details" />

      <div className="px-4 pt-4 pb-24 max-w-lg mx-auto space-y-3">
        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-gray-200" />
          </div>
        ) : !order ? (
          <div className="py-20 text-center text-sm text-gray-400 font-medium">Order not found.</div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">#{order.orderNumber} · {formatDateTime(order.createdAt)}</p>
              </div>
              <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${STATUS_STYLE[order.status]}`}>
                {STATUS_LABEL[order.status]}
              </span>
            </div>

            {/* Route + item */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Route</span>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2.5 text-center">
                  <p className="text-xs text-gray-400 mb-0.5">Pickup</p>
                  <p className="text-sm font-semibold text-gray-900">{order.pickupLocationName ?? '—'}</p>
                </div>
                <span className="text-gray-300 font-bold">→</span>
                <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2.5 text-center">
                  <p className="text-xs text-gray-400 mb-0.5">Drop</p>
                  <p className="text-sm font-semibold text-gray-900">{order.dropHostelBlock.replace('_', ' ')}</p>
                </div>
              </div>
              {order.description && (
                <p className="text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2.5 mb-3 leading-relaxed">
                  "{order.description}"
                </p>
              )}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{order.size}</span>
                <span className="text-base font-bold text-gray-900">₹{Number(order.deliveryFee)}</span>
              </div>
            </div>

            {/* Payment */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment</span>
              </div>
              <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${PAY_STYLE[order.paymentStatus]}`}>
                {PAY_LABEL[order.paymentStatus]}
              </span>
            </div>

            {/* People */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">People</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">Requester</p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">{order.requesterName}</p>
                  </div>
                  {order.requesterPhone && (
                    <a href={`tel:${order.requesterPhone}`}
                      className="flex items-center gap-1.5 text-sm font-medium text-primary">
                      <Phone className="w-3.5 h-3.5" />
                      {order.requesterPhone}
                    </a>
                  )}
                </div>
                {order.delivererName ? (
                  <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                    <div>
                      <p className="text-xs text-gray-400">Deliverer</p>
                      <p className="text-sm font-semibold text-gray-900 mt-0.5">{order.delivererName}</p>
                    </div>
                    {order.delivererPhone && (
                      <a href={`tel:${order.delivererPhone}`}
                        className="flex items-center gap-1.5 text-sm font-medium text-primary">
                        <Phone className="w-3.5 h-3.5" />
                        {order.delivererPhone}
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="pt-3 border-t border-gray-50">
                    <p className="text-xs text-gray-400">Deliverer</p>
                    <p className="text-sm text-gray-400 mt-0.5">Not assigned yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Timeline</span>
              </div>
              <div className="space-y-2.5">
                {([
                  { label: 'Placed',    time: order.createdAt,   dot: 'bg-blue-400' },
                  { label: 'Expires',   time: order.expiresAt,   dot: 'bg-amber-400' },
                  { label: 'Accepted',  time: order.acceptedAt,  dot: 'bg-orange-400' },
                  { label: 'Delivered', time: order.deliveredAt, dot: 'bg-green-400' },
                ] as { label: string; time: string | null | undefined; dot: string }[]).map(({ label, time, dot }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${time ? dot : 'bg-gray-200'}`} />
                    <span className="text-xs text-gray-400 w-16">{label}</span>
                    <span className={`text-xs ${time ? 'text-gray-700 font-medium' : 'text-gray-300'}`}>
                      {formatDateTime(time)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Rating */}
            {order.status === 'DELIVERED' && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Rating</span>
                </div>
                {order.isRated ? (
                  order.ratingStars ? (
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-0.5">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className={`w-5 h-5 ${s <= order.ratingStars! ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-100'}`} />
                        ))}
                      </div>
                      <span className="text-sm font-semibold text-gray-700">{order.ratingStars} / 5</span>
                    </div>
                  ) : (
                    <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-green-50 text-green-600">Rated</span>
                  )
                ) : canRate ? (
                  <>
                    <p className="text-xs text-gray-400 mb-3">
                      Rate your experience with {order.delivererName}
                    </p>
                    <div className="flex gap-2 justify-center mb-2">
                      {[1, 2, 3, 4, 5].map(s => (
                        <button key={s} onClick={() => setSelectedStars(s)}
                          className="transition-transform active:scale-90">
                          <Star className={`w-9 h-9 transition-colors ${s <= selectedStars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-100'}`} />
                        </button>
                      ))}
                    </div>
                    {selectedStars > 0 && (
                      <p className="text-xs text-center text-gray-500 mb-3">{RATING_LABEL[selectedStars]}</p>
                    )}
                    <button
                      onClick={handleSubmitRating}
                      disabled={selectedStars === 0 || submitting}
                      className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Submit Rating
                    </button>
                  </>
                ) : null}
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
