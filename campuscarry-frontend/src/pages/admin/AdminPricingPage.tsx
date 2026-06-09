import { useState, useEffect } from 'react'
import { Loader2, Pencil, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminApi } from '@/api/admin'
import type { Pricing } from '@/types'

const CLUSTER_LABEL: Record<string, string> = {
  C1: 'C1 (A, B, C MH)',
  C2: 'C2 (D, E MH)',
  C3: 'C3 (F, G MH)',
  C4: 'C4 (H, J MH)',
  C5: 'C5 (K, L MH)',
  C6: 'C6 (M MH)',
  C7: 'C7 (N, P, Q, R MH)',
  C8: 'C8 (S, T MH)',
  C9: 'C9 (G, J, H LH)',
  C10: 'C10 (A, B LH)',
  C11: 'C11 (C, D LH)',
  C12: 'C12 (E, F LH)',
}

export default function AdminPricingPage() {
  const [pricing, setPricing] = useState<Pricing[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId]   = useState<string | null>(null)
  const [editVal, setEditVal] = useState('')
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    adminApi.getPricing()
      .then(setPricing)
      .catch(() => toast.error('Could not load pricing.'))
      .finally(() => setLoading(false))
  }, [])

  const startEdit = (p: Pricing) => {
    setEditId(p.id)
    setEditVal(String(Number(p.basePrice)))
  }

  const cancelEdit = () => { setEditId(null); setEditVal('') }

  const handleSave = async (id: string) => {
    const val = parseFloat(editVal)
    if (isNaN(val) || val <= 0) { toast.error('Enter a valid positive price.'); return }
    setSaving(true)
    try {
      const updated = await adminApi.updatePricing(id, val)
      setPricing(prev => prev.map(p => p.id === id ? { ...p, basePrice: updated.basePrice } : p))
      setEditId(null)
      toast.success('Price updated.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update pricing.')
    } finally {
      setSaving(false)
    }
  }

  // Group by location
  const grouped = pricing.reduce<Record<string, { locationName: string; rows: Pricing[] }>>((acc, p) => {
    const key = p.locationId
    if (!acc[key]) acc[key] = { locationName: p.locationName, rows: [] }
    acc[key].rows.push(p)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Pricing Matrix</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Location × cluster base prices · click the pencil to edit
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700 font-medium">
        Base price is per SMALL order. Medium = base + ₹7, Large = base + ₹15. Changes apply to new orders only.
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-gray-200" />
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400 font-medium">No pricing data</div>
      ) : (
        <div className="space-y-4">
          {Object.values(grouped).map(({ locationName, rows }) => (
            <div key={locationName} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60">
                <h2 className="text-sm font-bold text-gray-800">{locationName}</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Cluster</th>
                    <th className="text-right px-5 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Small (base)</th>
                    <th className="text-right px-5 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Medium (+₹7)</th>
                    <th className="text-right px-5 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Large (+₹15)</th>
                    <th className="w-20 px-5 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map(p => {
                    const base = Number(p.basePrice)
                    const isEditing = editId === p.id
                    return (
                      <tr key={p.id} className="hover:bg-gray-50/40 transition-colors">
                        <td className="px-5 py-3 font-medium text-gray-700">
                          {CLUSTER_LABEL[p.cluster] ?? p.cluster}
                        </td>
                        <td className="px-5 py-3 text-right">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editVal}
                              onChange={e => setEditVal(e.target.value)}
                              min="1"
                              step="0.5"
                              autoFocus
                              className="w-20 text-right px-2 py-1 rounded-lg border border-primary/50 bg-primary/5 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20"
                            />
                          ) : (
                            <span className="font-semibold text-gray-900">₹{base}</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right text-gray-500">
                          ₹{isEditing ? (parseFloat(editVal) ? parseFloat(editVal) + 7 : '—') : base + 7}
                        </td>
                        <td className="px-5 py-3 text-right text-gray-500">
                          ₹{isEditing ? (parseFloat(editVal) ? parseFloat(editVal) + 15 : '—') : base + 15}
                        </td>
                        <td className="px-5 py-3">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5 justify-end">
                              <button
                                onClick={() => handleSave(p.id)}
                                disabled={saving}
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
                              >
                                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={cancelEdit}
                                disabled={saving}
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-end">
                              <button
                                onClick={() => startEdit(p)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
