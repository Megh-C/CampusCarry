import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import TopBar from '@/components/shared/TopBar'
import { locationsApi } from '@/api/locations'
import { ordersApi } from '@/api/orders'
import type { Location, OrderSize, FeeEstimate } from '@/types'

const MH_BLOCKS = ['A_MH','B_MH','C_MH','D_MH','E_MH','F_MH','G_MH','H_MH','J_MH','K_MH','L_MH','M_MH','N_MH','P_MH','Q_MH','R_MH','S_MH','T_MH']
const LH_BLOCKS = ['A_LH','B_LH','C_LH','D_LH','E_LH','F_LH','G_LH','H_LH','J_LH']
const ALL_BLOCKS = [...MH_BLOCKS, ...LH_BLOCKS]

const SIZES: { value: OrderSize; label: string; hint: string }[] = [
  { value: 'SMALL',  label: 'Small',  hint: 'Envelope / small snack' },
  { value: 'MEDIUM', label: 'Medium', hint: 'Lunchbox / bag item'    },
  { value: 'LARGE',  label: 'Large',  hint: 'Multiple items / bulky' },
]

const selectCls = 'w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/15 focus:bg-white disabled:opacity-60 appearance-none cursor-pointer'
const inputCls  = 'w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/15 focus:bg-white disabled:opacity-60'
const labelCls  = 'text-xs font-semibold text-gray-600 uppercase tracking-wide'

export default function CreateOrderPage() {
  const navigate = useNavigate()

  const [locations, setLocations]     = useState<Location[]>([])
  const [locsLoading, setLocsLoading] = useState(true)
  const [pickupId, setPickupId]       = useState('')
  const [dropBlock, setDropBlock]     = useState('')
  const [description, setDescription] = useState('')
  const [size, setSize]               = useState<OrderSize | ''>('')
  const [estimate, setEstimate]       = useState<FeeEstimate | null>(null)
  const [estimating, setEstimating]   = useState(false)
  const [submitting, setSubmitting]   = useState(false)

  useEffect(() => {
    locationsApi.getActive()
      .then(setLocations)
      .catch(() => toast.error('Could not load pickup locations.'))
      .finally(() => setLocsLoading(false))
  }, [])

  useEffect(() => {
    setEstimate(null)
    if (!pickupId || !dropBlock || !size) return

    setEstimating(true)
    ordersApi.getEstimate({ pickupLocationId: pickupId, dropHostelBlock: dropBlock, size })
      .then(setEstimate)
      .catch(() => toast.error('Could not fetch fee estimate.'))
      .finally(() => setEstimating(false))
  }, [pickupId, dropBlock, size])

  const canSubmit = !!pickupId && !!dropBlock && !!size && !!estimate && !submitting

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      await ordersApi.create({
        pickupLocationId: pickupId,
        dropHostelBlock: dropBlock,
        description: description.trim() || undefined,
        size: size as OrderSize,
      })
      toast.success('Order placed!')
      navigate('/')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to place order.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <TopBar showBack title="Place Order" />
      <div className="px-4 pt-4 pb-24 max-w-lg mx-auto space-y-5">

        <div className="space-y-1.5">
          <label className={labelCls}>Pickup Location</label>
          <select
            value={pickupId}
            onChange={e => setPickupId(e.target.value)}
            disabled={locsLoading || submitting}
            className={selectCls}
          >
            <option value="">{locsLoading ? 'Loading...' : 'Select pickup location'}</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className={labelCls}>Drop Location</label>
          <select
            value={dropBlock}
            onChange={e => setDropBlock(e.target.value)}
            disabled={submitting}
            className={selectCls}
          >
            <option value="">Select your hostel block</option>
            {ALL_BLOCKS.map(b => (
              <option key={b} value={b}>{b.replace('_', ' ')}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className={labelCls}>
            Description{' '}
            <span className="normal-case font-normal text-gray-400">(optional)</span>
          </label>
          <textarea
            placeholder="What needs to be picked up? e.g. 1 Chicken Burger + Fries from OFW"
            value={description}
            onChange={e => setDescription(e.target.value)}
            disabled={submitting}
            rows={3}
            className={`${inputCls} resize-none`}
          />
        </div>

        <div className="space-y-2">
          <label className={labelCls}>Order Size</label>
          <div className="grid grid-cols-3 gap-2">
            {SIZES.map(({ value, label, hint }) => (
              <button
                key={value}
                type="button"
                onClick={() => setSize(value)}
                disabled={submitting}
                className={`rounded-xl border p-3 text-left transition-all ${
                  size === value
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                }`}
              >
                <p className={`text-sm font-semibold ${size === value ? 'text-primary' : 'text-gray-800'}`}>
                  {label}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{hint}</p>
              </button>
            ))}
          </div>
        </div>

        {(estimating || estimate) && (
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4">
            {estimating ? (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading fee estimate...
              </div>
            ) : estimate && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Delivery Fee</p>
                  <p className="text-2xl font-bold text-gray-900 mt-0.5">₹{estimate.estimatedFee}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {estimate.pickupLocationName} → {estimate.dropHostelBlock.replace('_', ' ')}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                  <span className="text-green-600 font-bold text-xl">₹</span>
                </div>
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full py-3.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitting ? 'Placing order...' : estimate ? `Place Order · ₹${estimate.estimatedFee}` : 'Place Order'}
        </button>
      </div>
    </>
  )
}
