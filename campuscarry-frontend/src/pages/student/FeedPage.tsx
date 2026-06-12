import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, PackageOpen, X, ChevronUp, Phone, CheckCircle, Star, MapPin, Navigation } from 'lucide-react'
import toast from 'react-hot-toast'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import TopBar from '@/components/shared/TopBar'
import SlideToAction from '@/components/shared/SlideToAction'
import OtpInput from '@/components/shared/OtpInput'
import { ordersApi } from '@/api/orders'
import { useAuth } from '@/context/AuthContext'
import type { OrderFeedItem, Order } from '@/types'

const AVATAR_COLORS = ['bg-violet-500','bg-blue-500','bg-emerald-500','bg-orange-500','bg-pink-500']
function avatarColor(name: string) {
  return AVATAR_COLORS[(name.charCodeAt(0) ?? 0) % AVATAR_COLORS.length]
}

const WS_URL = 'http://localhost:8080/api/v1/ws'

const SIZE_STYLE: Record<string, string> = {
  SMALL:  'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  MEDIUM: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  LARGE:  'bg-red-500/10 text-red-600 dark:text-red-400',
}

function timeLeft(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return 'Expiring'
  const mins = Math.floor(diff / 60000)
  return mins < 1 ? 'Expiring soon' : `${mins}m left`
}

export default function FeedPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const initials = user?.fullName
    ? user.fullName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

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
            onClick={() => navigate('/profile')}
            className={`w-8 h-8 rounded-full ${avatarColor(user?.fullName ?? '')} flex items-center justify-center hover:opacity-90 active:scale-95 transition-all ring-2 ring-background shadow-sm`}
            aria-label="Profile"
          >
            <span className="text-white text-xs font-bold">{initials}</span>
          </button>
        }
      />

      <div className="px-4 pt-4 pb-24 max-w-lg mx-auto">
        <div className="mb-5">
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Live Feed</h1>
          <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Orders waiting for a deliverer
          </p>
        </div>

        {/* ── Active order banner ── */}
        {activeOrder && activeOrder.status === 'ACCEPTED' && (
          <button
            onClick={() => setSheetOpen(true)}
            className="w-full text-left bg-gradient-to-r from-primary/15 to-orange-500/10 border border-primary/25 rounded-2xl p-4 mb-5 active:scale-[0.99] transition-all"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-primary font-bold uppercase tracking-wide">
                  {activeRole === 'deliverer' ? 'Active Delivery' : 'Your Order'}
                </p>
                <p className="text-sm font-bold text-foreground mt-0.5 truncate">
                  #{activeOrder.orderNumber} · {activeOrder.pickupLocationName} → {activeOrder.dropHostelBlock.replace('_', ' ')}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {activeRole === 'deliverer'
                    ? `Delivering for ${activeOrder.requesterName}`
                    : isArrived
                      ? '📦 Your order is here!'
                      : activeOrder.delivererName
                        ? `${activeOrder.delivererName} is on the way`
                        : 'Waiting for a deliverer'}
                </p>
              </div>
              <ChevronUp className="w-5 h-5 text-primary shrink-0" />
            </div>
          </button>
        )}

        {/* ── Feed list ── */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary/40" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-3xl bg-muted flex items-center justify-center mb-4">
              <PackageOpen className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground">No orders right now</p>
            <p className="text-xs text-muted-foreground/60 mt-1">New orders will appear here instantly</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => (
              <div
                key={order.id}
                className="bg-card rounded-2xl border border-border shadow-sm hover:shadow-md hover:border-primary/20 p-4 transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">#{order.orderNumber} · {order.requesterName}</p>
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground mt-1">
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate">{order.pickupLocationName}</span>
                      <span className="text-muted-foreground/50">→</span>
                      <Navigation className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="truncate">{order.dropHostelBlock.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${SIZE_STYLE[order.size]}`}>
                    {order.size}
                  </span>
                </div>

                {order.description && (
                  <p className="text-sm text-muted-foreground bg-muted/60 rounded-xl px-3 py-2 mb-3 leading-relaxed">
                    {order.description}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-extrabold text-foreground">₹{order.deliveryFee}</span>
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                      {timeLeft(order.expiresAt)}
                    </span>
                  </div>
                  <button
                    onClick={() => handleAccept(order.id)}
                    disabled={!!accepting}
                    className="px-4 py-2 rounded-xl bg-gradient-to-br from-primary to-orange-600 text-white text-sm font-semibold shadow-md shadow-primary/20 hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-1.5"
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
        <div className="fixed inset-0 z-50 bg-background flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-12 pb-4 border-b border-border shrink-0">
            <div>
              <p className="text-xs text-primary uppercase tracking-wide font-bold">
                {activeRole === 'deliverer' ? 'Active Delivery' : 'Your Order'}
              </p>
              <h2 className="text-xl font-extrabold text-foreground mt-0.5">
                Order #{activeOrder.orderNumber}
              </h2>
            </div>
            <button
              onClick={handleCloseSheet}
              className="w-9 h-9 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">

            {/* ── Rating screen (requester, post-delivery) ── */}
            {showRating && (
              <div className="flex flex-col items-center py-8 text-center space-y-6">
                <div>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wide font-bold mb-1">Delivery Complete</p>
                  <h3 className="text-xl font-extrabold text-foreground">Rate your deliverer</h3>
                  <p className="text-sm text-muted-foreground mt-1">{activeOrder.delivererName}</p>
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
                            : 'text-muted-foreground/25 fill-muted'
                        }`}
                      />
                    </button>
                  ))}
                </div>

                {selectedStars > 0 && (
                  <p className="text-sm font-medium text-foreground/80">
                    {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][selectedStars]}
                  </p>
                )}

                <div className="w-full space-y-3 pt-2">
                  <button
                    onClick={handleSubmitRating}
                    disabled={selectedStars === 0 || submittingRating}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-br from-primary to-orange-600 text-white text-sm font-semibold shadow-lg shadow-primary/25 hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {submittingRating && <Loader2 className="w-4 h-4 animate-spin" />}
                    {submittingRating ? 'Submitting...' : 'Submit Rating'}
                  </button>
                  <button
                    onClick={handleSkipRating}
                    disabled={submittingRating}
                    className="w-full py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Skip for now
                  </button>
                </div>
              </div>
            )}

            {/* ── Deliverer delivered state ── */}
            {isDelivered && activeRole === 'deliverer' && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-lg font-extrabold text-foreground">Delivery Complete!</h3>
                <p className="text-sm text-muted-foreground mt-1.5">
                  ₹{activeOrder.deliveryFee} has been released to your account.
                </p>
                <button
                  onClick={closeAndReset}
                  className="mt-6 px-6 py-2.5 rounded-xl bg-muted text-sm font-semibold text-foreground hover:bg-muted/70 transition-colors"
                >
                  Back to Feed
                </button>
              </div>
            )}

            {/* ── Active order content ── */}
            {!isDelivered && (
              <>
                {/* Route */}
                <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                      <div className="w-0.5 h-6 bg-border" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <p className="text-sm font-semibold text-foreground leading-none">{activeOrder.pickupLocationName}</p>
                      <p className="text-sm font-semibold text-foreground leading-none">{activeOrder.dropHostelBlock.replace('_', ' ')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-extrabold text-foreground">₹{activeOrder.deliveryFee}</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SIZE_STYLE[activeOrder.size]}`}>
                        {activeOrder.size}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contact */}
                <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-bold mb-3">
                    {activeRole === 'deliverer' ? 'Requester' : 'Deliverer'}
                  </p>
                  {activeRole === 'deliverer' ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-base font-bold text-foreground">{activeOrder.requesterName}</p>
                        {activeOrder.requesterPhone && (
                          <p className="text-sm text-muted-foreground mt-0.5">{activeOrder.requesterPhone}</p>
                        )}
                      </div>
                      {activeOrder.requesterPhone && (
                        <a href={`tel:${activeOrder.requesterPhone}`}
                          className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                          <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      {activeOrder.delivererName ? (
                        <>
                          <div>
                            <p className="text-base font-bold text-foreground">{activeOrder.delivererName}</p>
                            {activeOrder.delivererPhone && (
                              <p className="text-sm text-muted-foreground mt-0.5">{activeOrder.delivererPhone}</p>
                            )}
                          </div>
                          {activeOrder.delivererPhone && (
                            <a href={`tel:${activeOrder.delivererPhone}`}
                              className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                              <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            </a>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">Waiting for a deliverer...</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Requester: arrived banner + OTP hint */}
                {activeRole === 'requester' && (
                  <>
                    {isArrived && (
                      <div className="bg-emerald-500/10 rounded-2xl p-4 border border-emerald-500/20 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                          <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Your order is here!</p>
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">Head to your hostel block to collect it.</p>
                        </div>
                      </div>
                    )}
                    <div className="bg-amber-500/10 rounded-2xl p-4 border border-amber-500/20">
                      <p className="text-xs text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wide mb-1">Your OTP</p>
                      <p className="text-sm text-amber-700 dark:text-amber-300 leading-relaxed">
                        Your delivery OTP was sent to your email when the order was accepted.
                        Share it with the deliverer when they arrive.
                      </p>
                    </div>
                  </>
                )}

                {/* Description */}
                {activeOrder.description && (
                  <div className="bg-muted/60 rounded-2xl p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-bold mb-1">Note</p>
                    <p className="text-sm text-foreground/80 leading-relaxed">{activeOrder.description}</p>
                  </div>
                )}

                {/* Deliverer actions */}
                {activeRole === 'deliverer' && (
                  <div className="space-y-3 pb-4">
                    {!hasNotified ? (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-bold mb-2">
                          Notify Arrival
                        </p>
                        <SlideToAction
                          key={sliderKey}
                          label="Slide to notify requester →"
                          onAction={handleNotify}
                          loading={notifying}
                        />
                        <p className="text-xs text-muted-foreground text-center mt-2">
                          Slide when you arrive at the hostel block
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-bold mb-2">
                          Confirm Delivery
                        </p>
                        <p className="text-sm text-muted-foreground mb-4">
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
                          className="w-full mt-4 py-3.5 rounded-xl bg-gradient-to-br from-primary to-orange-600 text-white text-sm font-semibold shadow-lg shadow-primary/25 hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center gap-2"
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
