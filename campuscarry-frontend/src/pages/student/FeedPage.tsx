import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Loader2, PackageOpen, X, ChevronUp, Phone, CheckCircle, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import TopBar from '@/components/shared/TopBar'
import SlideToAction from '@/components/shared/SlideToAction'
import OtpInput from '@/components/shared/OtpInput'
import { ordersApi } from '@/api/orders'
import type { OrderFeedItem, Order } from '@/types'

const WS_URL = 'http://localhost:8080/api/v1/ws'

const SIZE_STYLE: Record<string, string> = {
  SMALL:  'bg-blue-50 text-blue-600',
  MEDIUM: 'bg-amber-50 text-amber-600',
  LARGE:  'bg-red-50 text-red-600',
}

function timeLeft(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return 'Expiring'
  const mins = Math.floor(diff / 60000)
  return mins < 1 ? 'Expiring soon' : `${mins}m left`
}

export default function FeedPage() {
  const navigate = useNavigate()

  // ── Feed ────────────────────────────────────────────────────────────────
  const [orders, setOrders]       = useState<OrderFeedItem[]>([])
  const [loading, setLoading]     = useState(true)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [, setTick]               = useState(0)
  const stompRef                  = useRef<Client | null>(null)

  // ── Active order ────────────────────────────────────────────────────────
  const [activeOrder, setActiveOrder]   = useState<Order | null>(null)
  const [activeRole, setActiveRole]     = useState<'requester' | 'deliverer' | null>(null)
  const [sheetOpen, setSheetOpen]       = useState(false)

  // Deliverer flow
  const [hasNotified, setHasNotified]   = useState(false)
  const [sliderKey, setSliderKey]       = useState(0)
  const [otp, setOtp]                   = useState('')
  const [notifying, setNotifying]       = useState(false)
  const [confirming, setConfirming]     = useState(false)

  // Requester flow — "order is here" via WS (backend needs to emit /topic/orders/{id}/arrived)
  const [isArrived, setIsArrived]       = useState(false)

  // Rating
  const [selectedStars, setSelectedStars]     = useState(0)
  const [submittingRating, setSubmittingRating] = useState(false)

  // ── Tick (keeps timeLeft fresh) ─────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 30_000)
    return () => clearInterval(t)
  }, [])

  // ── Fetch active ACCEPTED order ─────────────────────────────────────────
  const fetchActiveOrder = useCallback(async () => {
    try {
      const [delivererRes, requesterRes] = await Promise.all([
        ordersApi.getMyOrders({ role: 'deliverer', size: 10 }),
        ordersApi.getMyOrders({ role: 'requester', size: 10 }),
      ])
      const activeDelivery = delivererRes.content.find(o => o.status === 'ACCEPTED')
      if (activeDelivery) {
        setActiveOrder(activeDelivery)
        setActiveRole('deliverer')
        return
      }
      const activeRequest = requesterRes.content.find(o => o.status === 'ACCEPTED')
      if (activeRequest) {
        setActiveOrder(activeRequest)
        setActiveRole('requester')
        return
      }
      setActiveOrder(null)
      setActiveRole(null)
    } catch {
      // silently fail — feed still works
    }
  }, [])

  useEffect(() => { fetchActiveOrder() }, [fetchActiveOrder])

  // ── Reset per-order state when active order changes ─────────────────────
  useEffect(() => {
    setIsArrived(false)
    setHasNotified(false)
    setOtp('')
    setSelectedStars(0)
  }, [activeOrder?.id])

  // ── Poll for status changes when sheet is open ──────────────────────────
  useEffect(() => {
    if (!sheetOpen || !activeOrder || activeOrder.status === 'DELIVERED') return
    const poll = setInterval(async () => {
      try {
        const updated = await ordersApi.getById(activeOrder.id)
        setActiveOrder(updated)
      } catch {}
    }, 8_000)
    return () => clearInterval(poll)
  }, [sheetOpen, activeOrder?.id, activeOrder?.status])

  // ── Subscribe to arrived event when orderer's sheet is open ───────────
  useEffect(() => {
    if (!sheetOpen || activeRole !== 'requester' || !activeOrder || !stompRef.current?.connected) return
    const sub = stompRef.current.subscribe(
      `/topic/orders/${activeOrder.id}/arrived`,
      () => setIsArrived(true),
    )
    return () => sub.unsubscribe()
  }, [sheetOpen, activeRole, activeOrder?.id, stompRef.current?.connected])

  // ── Feed + WebSocket ────────────────────────────────────────────────────
  useEffect(() => {
    ordersApi.getFeed()
      .then(res => setOrders(res.content))
      .catch(() => toast.error('Could not load feed.'))
      .finally(() => setLoading(false))

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      onConnect: () => {
        client.subscribe('/topic/orders/new', msg => {
          const order: OrderFeedItem = JSON.parse(msg.body)
          setOrders(prev => [order, ...prev])
        })
        client.subscribe('/topic/orders/removed', msg => {
          const id: string = msg.body.replace(/^"|"$/g, '')
          setOrders(prev => prev.filter(o => o.id !== id))
        })
      },
      onStompError: () => toast.error('Live feed disconnected.'),
    })
    client.activate()
    stompRef.current = client
    return () => { client.deactivate() }
  }, [])

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleAccept = async (id: string) => {
    setAccepting(id)
    try {
      const accepted = await ordersApi.accept(id)
      toast.success('Order accepted!')
      setOrders(prev => prev.filter(o => o.id !== id))
      setActiveOrder(accepted)
      setActiveRole('deliverer')
      setSheetOpen(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not accept order.')
    } finally {
      setAccepting(null)
    }
  }

  const handleNotify = async () => {
    if (!activeOrder) return
    setNotifying(true)
    try {
      await ordersApi.notifyArrival(activeOrder.id)
      setHasNotified(true)
      toast.success('Requester notified!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not notify.')
      setSliderKey(k => k + 1)
    } finally {
      setNotifying(false)
    }
  }

  const handleConfirmDelivery = async () => {
    if (!activeOrder || otp.length < 6) return
    setConfirming(true)
    try {
      const delivered = await ordersApi.confirmDelivery(activeOrder.id, otp)
      setActiveOrder(delivered)
      toast.success('Delivery confirmed! Payment released.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invalid OTP. Try again.')
      setOtp('')
    } finally {
      setConfirming(false)
    }
  }

  const handleSubmitRating = async () => {
    if (!activeOrder || selectedStars === 0) return
    setSubmittingRating(true)
    try {
      await ordersApi.submitRating(activeOrder.id, selectedStars)
      toast.success('Rating submitted!')
      closeAndReset()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not submit rating.')
    } finally {
      setSubmittingRating(false)
    }
  }

  const handleSkipRating = async () => {
    if (!activeOrder) return
    try {
      await ordersApi.skipRating(activeOrder.id)
    } catch {}
    closeAndReset()
  }

  const closeAndReset = () => {
    setSheetOpen(false)
    setActiveOrder(null)
    setActiveRole(null)
    setHasNotified(false)
    setOtp('')
    setIsArrived(false)
    setSelectedStars(0)
  }

  const handleCloseSheet = () => {
    setSheetOpen(false)
    // Only fully clear if delivered — otherwise keep the banner alive
    if (activeOrder?.status === 'DELIVERED') closeAndReset()
  }

  // ── Derived ──────────────────────────────────────────────────────────────
  const isDelivered = activeOrder?.status === 'DELIVERED'
  const showRating  = isDelivered && activeRole === 'requester'
    && !activeOrder?.isRated && !activeOrder?.isRatingSkipped

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <TopBar
        right={
          <button
            onClick={() => navigate('/orders/new')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Place Order
          </button>
        }
      />

      <div className="px-4 pt-4 pb-24 max-w-lg mx-auto">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900">Live Feed</h1>
          <p className="text-sm text-gray-500 mt-0.5">Orders waiting for a deliverer</p>
        </div>

        {/* ── Active order banner ── */}
        {activeOrder && activeOrder.status === 'ACCEPTED' && (
          <button
            onClick={() => setSheetOpen(true)}
            className="w-full text-left bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-5 active:scale-[0.99] transition-all"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-orange-500 font-semibold uppercase tracking-wide">
                  {activeRole === 'deliverer' ? 'Active Delivery' : 'Your Order'}
                </p>
                <p className="text-sm font-bold text-gray-900 mt-0.5 truncate">
                  #{activeOrder.orderNumber} · {activeOrder.pickupLocationName} → {activeOrder.dropHostelBlock.replace('_', ' ')}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {activeRole === 'deliverer'
                    ? `Delivering for ${activeOrder.requesterName}`
                    : isArrived
                      ? '📦 Your order is here!'
                      : activeOrder.delivererName
                        ? `${activeOrder.delivererName} is on the way`
                        : 'Waiting for a deliverer'}
                </p>
              </div>
              <ChevronUp className="w-5 h-5 text-orange-400 shrink-0" />
            </div>
          </button>
        )}

        {/* ── Feed list ── */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <PackageOpen className="w-10 h-10 text-gray-200 mb-3" />
            <p className="text-sm font-medium text-gray-400">No orders right now</p>
            <p className="text-xs text-gray-300 mt-1">New orders will appear here instantly</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => (
              <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="text-xs text-gray-400">#{order.orderNumber} · {order.requesterName}</p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">
                      {order.pickupLocationName} → {order.dropHostelBlock.replace('_', ' ')}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${SIZE_STYLE[order.size]}`}>
                    {order.size}
                  </span>
                </div>

                {order.description && (
                  <p className="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2 mb-3 leading-relaxed">
                    {order.description}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-gray-900">₹{order.deliveryFee}</span>
                    <span className="text-xs text-gray-400">{timeLeft(order.expiresAt)}</span>
                  </div>
                  <button
                    onClick={() => handleAccept(order.id)}
                    disabled={!!accepting}
                    className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {accepting === order.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Deliver
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Full-screen order sheet ── */}
      {sheetOpen && activeOrder && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-12 pb-4 border-b border-gray-100 shrink-0">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">
                {activeRole === 'deliverer' ? 'Active Delivery' : 'Your Order'}
              </p>
              <h2 className="text-xl font-bold text-gray-900 mt-0.5">
                Order #{activeOrder.orderNumber}
              </h2>
            </div>
            <button
              onClick={handleCloseSheet}
              className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">

            {/* ── Rating screen (requester, post-delivery) ── */}
            {showRating && (
              <div className="flex flex-col items-center py-8 text-center space-y-6">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Delivery Complete</p>
                  <h3 className="text-xl font-bold text-gray-900">Rate your deliverer</h3>
                  <p className="text-sm text-gray-500 mt-1">{activeOrder.delivererName}</p>
                </div>

                {/* Stars */}
                <div className="flex gap-3">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => setSelectedStars(star)}
                      className="transition-transform active:scale-90"
                    >
                      <Star
                        className={`w-11 h-11 transition-colors ${
                          star <= selectedStars
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-200 fill-gray-100'
                        }`}
                      />
                    </button>
                  ))}
                </div>

                {selectedStars > 0 && (
                  <p className="text-sm font-medium text-gray-600">
                    {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][selectedStars]}
                  </p>
                )}

                <div className="w-full space-y-3 pt-2">
                  <button
                    onClick={handleSubmitRating}
                    disabled={selectedStars === 0 || submittingRating}
                    className="w-full py-3.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {submittingRating && <Loader2 className="w-4 h-4 animate-spin" />}
                    {submittingRating ? 'Submitting...' : 'Submit Rating'}
                  </button>
                  <button
                    onClick={handleSkipRating}
                    disabled={submittingRating}
                    className="w-full py-2.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    Skip for now
                  </button>
                </div>
              </div>
            )}

            {/* ── Deliverer delivered state ── */}
            {isDelivered && activeRole === 'deliverer' && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Delivery Complete!</h3>
                <p className="text-sm text-gray-500 mt-1.5">
                  ₹{activeOrder.deliveryFee} has been released to your account.
                </p>
                <button
                  onClick={closeAndReset}
                  className="mt-6 px-6 py-2.5 rounded-xl bg-gray-100 text-sm font-semibold text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  Back to Feed
                </button>
              </div>
            )}

            {/* ── Active order content ── */}
            {!isDelivered && (
              <>
                {/* Route */}
                <div className="bg-gray-50 rounded-2xl p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                      <div className="w-0.5 h-6 bg-gray-200" />
                      <div className="w-2.5 h-2.5 rounded-full bg-orange-400" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <p className="text-sm font-semibold text-gray-800 leading-none">{activeOrder.pickupLocationName}</p>
                      <p className="text-sm font-semibold text-gray-800 leading-none">{activeOrder.dropHostelBlock.replace('_', ' ')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">₹{activeOrder.deliveryFee}</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SIZE_STYLE[activeOrder.size]}`}>
                        {activeOrder.size}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contact */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-3">
                    {activeRole === 'deliverer' ? 'Requester' : 'Deliverer'}
                  </p>
                  {activeRole === 'deliverer' ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-base font-bold text-gray-900">{activeOrder.requesterName}</p>
                        {activeOrder.requesterPhone && (
                          <p className="text-sm text-gray-500 mt-0.5">{activeOrder.requesterPhone}</p>
                        )}
                      </div>
                      {activeOrder.requesterPhone && (
                        <a href={`tel:${activeOrder.requesterPhone}`}
                          className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                          <Phone className="w-4 h-4 text-green-600" />
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      {activeOrder.delivererName ? (
                        <>
                          <div>
                            <p className="text-base font-bold text-gray-900">{activeOrder.delivererName}</p>
                            {activeOrder.delivererPhone && (
                              <p className="text-sm text-gray-500 mt-0.5">{activeOrder.delivererPhone}</p>
                            )}
                          </div>
                          {activeOrder.delivererPhone && (
                            <a href={`tel:${activeOrder.delivererPhone}`}
                              className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                              <Phone className="w-4 h-4 text-green-600" />
                            </a>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-gray-400">Waiting for a deliverer...</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Requester: arrived banner + OTP hint */}
                {activeRole === 'requester' && (
                  <>
                    {isArrived && (
                      <div className="bg-green-50 rounded-2xl p-4 border border-green-100 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-green-800">Your order is here!</p>
                          <p className="text-xs text-green-600 mt-0.5">Head to your hostel block to collect it.</p>
                        </div>
                      </div>
                    )}
                    <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                      <p className="text-xs text-amber-600 font-semibold uppercase tracking-wide mb-1">Your OTP</p>
                      <p className="text-sm text-amber-800 leading-relaxed">
                        Your delivery OTP was sent to your email when the order was accepted.
                        Share it with the deliverer when they arrive.
                      </p>
                    </div>
                  </>
                )}

                {/* Description */}
                {activeOrder.description && (
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Note</p>
                    <p className="text-sm text-gray-600 leading-relaxed">{activeOrder.description}</p>
                  </div>
                )}

                {/* Deliverer actions */}
                {activeRole === 'deliverer' && (
                  <div className="space-y-3 pb-4">
                    {!hasNotified ? (
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-2">
                          Notify Arrival
                        </p>
                        <SlideToAction
                          key={sliderKey}
                          label="Slide to notify requester →"
                          onAction={handleNotify}
                          loading={notifying}
                        />
                        <p className="text-xs text-gray-400 text-center mt-2">
                          Slide when you arrive at the hostel block
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-2">
                          Confirm Delivery
                        </p>
                        <p className="text-sm text-gray-500 mb-4">
                          Requester notified. Ask them for the 6-digit OTP from their email.
                        </p>
                        <OtpInput
                          value={otp}
                          onChange={setOtp}
                          disabled={confirming}
                        />
                        <button
                          onClick={handleConfirmDelivery}
                          disabled={otp.length < 6 || confirming}
                          className="w-full mt-4 py-3.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                        >
                          {confirming && <Loader2 className="w-4 h-4 animate-spin" />}
                          {confirming ? 'Verifying...' : 'Confirm Delivery'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
