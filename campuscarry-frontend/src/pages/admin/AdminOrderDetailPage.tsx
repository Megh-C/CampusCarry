import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Star, Phone, User, MapPin, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminApi } from '@/api/admin'
import type { Order, OrderStatus, PaymentStatus } from '@/types'

const STATUS_STYLE: Record<OrderStatus, string> = {
  PENDING:   'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  ACCEPTED:  'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  DELIVERED: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  EXPIRED:   'bg-muted text-muted-foreground border-border',
  UNPAID:    'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
}

const PAY_STYLE: Record<PaymentStatus, string> = {
  PENDING:  'bg-muted text-muted-foreground',
  HELD:     'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  RELEASED: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  FAILED:   'bg-red-500/10 text-red-600 dark:text-red-400',
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
        <Loader2 className="w-6 h-6 animate-spin text-primary/40" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground font-medium">Order not found.</p>
        <button onClick={() => navigate(-1)} className="mt-3 text-sm text-primary underline">Go back</button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-border bg-card hover:bg-muted transition-colors text-foreground/80">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-extrabold text-foreground">Order #{order.orderNumber}</h1>
          <p className="text-xs text-muted-foreground">{formatDateTime(order.createdAt)}</p>
        </div>
        <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${STATUS_STYLE[order.status]}`}>
          {order.status.charAt(0) + order.status.slice(1).toLowerCase()}
        </span>
      </div>

      {/* Route + fee summary */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-foreground">Route</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-muted/60 rounded-xl px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Pickup</p>
            <p className="text-sm font-semibold text-foreground">{order.pickupLocationName ?? '—'}</p>
          </div>
          <div className="text-muted-foreground/50 font-bold text-xl">→</div>
          <div className="flex-1 bg-muted/60 rounded-xl px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Drop</p>
            <p className="text-sm font-semibold text-foreground">{order.dropHostelBlock.replace('_', ' ')}</p>
          </div>
        </div>
        {order.description && (
          <p className="mt-3 text-sm text-muted-foreground bg-muted/60 rounded-xl px-4 py-3">
            "{order.description}"
          </p>
        )}
        <div className="flex items-center gap-3 mt-3">
          <span className="text-xs font-semibold bg-muted text-muted-foreground px-3 py-1 rounded-full">{order.size}</span>
          <span className="text-lg font-extrabold text-foreground">₹{Number(order.deliveryFee)}</span>
          <span className={`ml-auto text-xs font-semibold px-2.5 py-1 rounded-full ${PAY_STYLE[order.paymentStatus]}`}>
            Payment: {order.paymentStatus.charAt(0) + order.paymentStatus.slice(1).toLowerCase()}
          </span>
        </div>
      </div>

      {/* Parties */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Requester */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <User className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-foreground">Requester</span>
          </div>
          <p className="text-base font-bold text-foreground">{order.requesterName}</p>
          {order.requesterPhone && (
            <a href={`tel:${order.requesterPhone}`} className="flex items-center gap-1.5 text-sm text-primary mt-1">
              <Phone className="w-3.5 h-3.5" />
              {order.requesterPhone}
            </a>
          )}
        </div>

        {/* Deliverer */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <User className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-foreground">Deliverer</span>
          </div>
          {order.delivererName ? (
            <>
              <p className="text-base font-bold text-foreground">{order.delivererName}</p>
              {order.delivererPhone && (
                <a href={`tel:${order.delivererPhone}`} className="flex items-center gap-1.5 text-sm text-primary mt-1">
                  <Phone className="w-3.5 h-3.5" />
                  {order.delivererPhone}
                </a>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No deliverer assigned yet</p>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-foreground">Timeline</span>
        </div>
        <div className="space-y-3">
          {[
            { label: 'Created',   time: order.createdAt,   color: 'bg-blue-400' },
            { label: 'Expires',   time: order.expiresAt,   color: 'bg-amber-400' },
            { label: 'Accepted',  time: order.acceptedAt,  color: 'bg-orange-400' },
            { label: 'Delivered', time: order.deliveredAt, color: 'bg-emerald-400' },
          ].map(({ label, time, color }) => (
            <div key={label} className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full shrink-0 ${time ? color : 'bg-muted-foreground/25'}`} />
              <span className="text-xs text-muted-foreground w-20">{label}</span>
              <span className="text-sm text-foreground/80">{formatDateTime(time)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Rating */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <Star className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-foreground">Rating</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${order.isRated ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
              {order.isRated ? 'Rated' : 'Not rated'}
            </span>
            {order.isRatingSkipped && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                Skipped
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
