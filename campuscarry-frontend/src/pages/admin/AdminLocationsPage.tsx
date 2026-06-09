import { useState, useEffect } from 'react'
import { Loader2, Plus, ToggleLeft, ToggleRight, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminApi } from '@/api/admin'
import type { Location } from '@/types'

export default function AdminLocationsPage() {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading]     = useState(true)

  // Add form
  const [name, setName]       = useState('')
  const [code, setCode]       = useState('')
  const [adding, setAdding]   = useState(false)
  const [showForm, setShowForm] = useState(false)

  // Toggle tracking
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    adminApi.getLocations()
      .then(setLocations)
      .catch(() => toast.error('Could not load locations.'))
      .finally(() => setLoading(false))
  }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !code.trim()) { toast.error('Name and code are required.'); return }
    setAdding(true)
    try {
      const created = await adminApi.addLocation({ name: name.trim(), code: code.trim() })
      setLocations(prev => [...prev, created])
      setName(''); setCode(''); setShowForm(false)
      toast.success('Location added.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add location.')
    } finally {
      setAdding(false)
    }
  }

  const handleToggle = async (id: string) => {
    setTogglingId(id)
    try {
      const updated = await adminApi.toggleLocation(id)
      setLocations(prev => prev.map(l => l.id === id ? { ...l, active: updated.active } : l))
      toast.success(updated.active ? 'Location activated.' : 'Location deactivated.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not toggle location.')
    } finally {
      setTogglingId(null)
    }
  }

  const active   = locations.filter(l => l.active !== false)
  const inactive = locations.filter(l => l.active === false)

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Locations</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage pickup locations · {active.length} active, {inactive.length} inactive
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 text-sm font-semibold bg-primary text-white px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Location
        </button>
      </div>

      {/* Add location form */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">New Pickup Location</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Location Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Zaitoon Restaurant"
                disabled={adding}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 focus:bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Short Code <span className="normal-case font-normal text-gray-400">(unique identifier)</span>
              </label>
              <input
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. ZAITOON"
                disabled={adding}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 focus:bg-white font-mono"
              />
            </div>
          </div>
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-4">
            After adding, go to the Pricing page to set delivery fees for each cluster.
          </p>
          <div className="flex gap-2">
            <button type="submit" disabled={adding}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50">
              {adding && <Loader2 className="w-4 h-4 animate-spin" />}
              {adding ? 'Adding…' : 'Add Location'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} disabled={adding}
              className="px-4 py-2.5 rounded-xl bg-gray-100 text-sm font-semibold text-gray-600">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Locations list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-gray-200" />
        </div>
      ) : locations.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400 font-medium">No locations yet</div>
      ) : (
        <div className="space-y-3">
          {/* Active */}
          {active.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">Active</p>
              <div className="space-y-2">
                {active.map(l => (
                  <LocationRow
                    key={l.id}
                    location={l}
                    toggling={togglingId === l.id}
                    onToggle={() => handleToggle(l.id)}
                  />
                ))}
              </div>
            </div>
          )}
          {/* Inactive */}
          {inactive.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">Inactive</p>
              <div className="space-y-2">
                {inactive.map(l => (
                  <LocationRow
                    key={l.id}
                    location={l}
                    toggling={togglingId === l.id}
                    onToggle={() => handleToggle(l.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function LocationRow({
  location, toggling, onToggle,
}: {
  location: Location
  toggling: boolean
  onToggle: () => void
}) {
  const isActive = location.active !== false
  return (
    <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3.5 flex items-center gap-4">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isActive ? 'bg-primary/10' : 'bg-gray-100'}`}>
        <MapPin className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-gray-400'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>{location.name}</p>
        <p className="text-xs text-gray-400 font-mono mt-0.5">{location.code}</p>
      </div>
      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
      <button
        onClick={onToggle}
        disabled={toggling}
        className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-50 transition-colors text-gray-400 disabled:opacity-50"
        title={isActive ? 'Deactivate' : 'Activate'}
      >
        {toggling
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : isActive
            ? <ToggleRight className="w-5 h-5 text-green-500" />
            : <ToggleLeft className="w-5 h-5 text-gray-400" />
        }
      </button>
    </div>
  )
}
