import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Star, Phone, User, MapPin, CreditCard, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminApi } from '@/api/admin'
import type { Order, OrderStatus, PaymentStatus } from '@/types'

const STATUS_STYLE: Record<OrderStatus, string> = {
  PENDING:   'bg-blue-50 text-blue-700 border-blue-100',
  ACCEPTED:  'bg-amber-50 text-amber-700 border-amber-100',
  DELIVERED: 'bg-green-50 text-green-700 border-green-100',
  EXPIRED:   'bg-gray-100 text-gray-500 border-gray-200',
  UNPAID:    'bg-red-50 text-red-600 border-red-100',
}

const PAY_STYLE: Record<PaymentStatus, string> = {
  PENDING:  'bg-gray-100 text-gray-500',
  HELD:     'bg-blue-50 text-blue-600',
  RELEASED: 'bg-green-50 text-green-600',
  FAILED:   'bg-red-50 text-red-500',
}

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-700">{value ?? '—'}</span>
    </div>
  )
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    adminApi.getOrderById(id)
      .then(setOrder)
      .catch(() => toast.error('Order not found.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-gray-200" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="py-16 text-center">
        <p className="text-gray-400 font-medium">Order not found.</p>
        <button onClick={() => navigate(-1)} className="mt-3 text-sm text-primary underline">Go back</button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-gray-900">Order #{order.orderNumber}</h1>
          <p className="text-xs text-gray-400">{formatDateTime(order.createdAt)}</p>
        </div>
        <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${STATUS_STYLE[order.status]}`}>
          {order.status.charAt(0) + order.status.slice(1).toLowerCase()}
        </span>
      </div>

      {/* Route + fee summary */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-800">Route</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-gray-50 rounded-xl px-4 py-3 text-center">
            <p className="text-xs text-gray-400 mb-1">Pickup</p>
            <p className="text-sm font-semibold text-gray-900">{order.pickupLocationName ?? '—'}</p>
          </div>
          <div className="text-gray-300 font-bold text-xl">→</div>
          <div className="flex-1 bg-gray-50 rounded-xl px-4 py-3 text-center">
            <p className="text-xs text-gray-400 mb-1">Drop</p>
            <p className="text-sm font-semibold text-gray-900">{order.dropHostelBlock.replace('_', ' ')}</p>
          </div>
        </div>
        {order.description && (
          <p className="mt-3 text-sm text-gray-500 bg-gray-50 rounded-xl px-4 py-3">
            "{order.description}"
          </p>
        )}
        <div className="flex items-center gap-3 mt-3">
          <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-3 py-1 rounded-full">{order.size}</span>
          <span className="text-lg font-bold text-gray-900">₹{Number(order.deliveryFee)}</span>
          <span className={`ml-auto text-xs font-semibold px-2.5 py-1 rounded-full ${PAY_STYLE[order.paymentStatus]}`}>
            Payment: {order.paymentStatus.charAt(0) + order.paymentStatus.slice(1).toLowerCase()}
          </span>
        </div>
      </div>

      {/* Parties */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Requester */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <User className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-800">Requester</span>
          </div>
          <p className="text-base font-bold text-gray-900">{order.requesterName}</p>
          {order.requesterPhone && (
            <a href={`tel:${order.requesterPhone}`} className="flex items-center gap-1.5 text-sm text-primary mt-1">
              <Phone className="w-3.5 h-3.5" />
              {order.requesterPhone}
            </a>
          )}
        </div>

        {/* Deliverer */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <User className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-800">Deliverer</span>
          </div>
          {order.delivererName ? (
            <>
              <p className="text-base font-bold text-gray-900">{order.delivererName}</p>
              {order.delivererPhone && (
                <a href={`tel:${order.delivererPhone}`} className="flex items-center gap-1.5 text-sm text-primary mt-1">
                  <Phone className="w-3.5 h-3.5" />
                  {order.delivererPhone}
                </a>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-400">No deliverer assigned yet</p>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-800">Timeline</span>
        </div>
        <div className="space-y-3">
          {[
            { label: 'Created',   time: order.createdAt,   color: 'bg-blue-400' },
            { label: 'Expires',   time: order.expiresAt,   color: 'bg-amber-400' },
            { label: 'Accepted',  time: order.acceptedAt,  color: 'bg-orange-400' },
            { label: 'Delivered', time: order.deliveredAt, color: 'bg-green-400' },
          ].map(({ label, time, color }) => (
            <div key={label} className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full shrink-0 ${time ? color : 'bg-gray-200'}`} />
              <span className="text-xs text-gray-400 w-20">{label}</span>
              <span className="text-sm text-gray-700">{formatDateTime(time)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Rating */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Star className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-800">Rating</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${order.isRated ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
              {order.isRated ? 'Rated' : 'Not rated'}
            </span>
            {order.isRatingSkipped && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-400">
                Skipped
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
