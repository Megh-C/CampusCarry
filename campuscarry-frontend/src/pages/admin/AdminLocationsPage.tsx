import { useState, useEffect } from 'react'
import { Loader2, Plus, ToggleLeft, ToggleRight, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminApi } from '@/api/admin'
import type { Location } from '@/types'

const inputCls = 'w-full px-4 py-2.5 rounded-xl border border-input bg-muted/40 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-card'

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
          <h1 className="text-xl font-extrabold text-foreground tracking-tight">Locations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage pickup locations · {active.length} active, {inactive.length} inactive
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 text-sm font-semibold bg-gradient-to-br from-primary to-orange-600 text-white px-4 py-2 rounded-xl shadow-md shadow-primary/25 hover:brightness-105 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Location
        </button>
      </div>

      {/* Add location form */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-card rounded-2xl border border-border shadow-sm p-5">
          <h2 className="text-sm font-bold text-foreground mb-4">New Pickup Location</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Location Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Zaitoon Restaurant"
                disabled={adding}
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Short Code <span className="normal-case font-normal text-muted-foreground/70">(unique identifier)</span>
              </label>
              <input
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. ZAITOON"
                disabled={adding}
                className={`${inputCls} font-mono`}
              />
            </div>
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mb-4">
            After adding, go to the Pricing page to set delivery fees for each cluster.
          </p>
          <div className="flex gap-2">
            <button type="submit" disabled={adding}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-br from-primary to-orange-600 text-white text-sm font-semibold shadow-md shadow-primary/20 disabled:opacity-50">
              {adding && <Loader2 className="w-4 h-4 animate-spin" />}
              {adding ? 'Adding…' : 'Add Location'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} disabled={adding}
              className="px-4 py-2.5 rounded-xl bg-muted text-sm font-semibold text-foreground/80">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Locations list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary/40" />
        </div>
      ) : locations.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground font-medium">No locations yet</div>
      ) : (
        <div className="space-y-3">
          {/* Active */}
          {active.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">Active</p>
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
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">Inactive</p>
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
    <div className="bg-card rounded-2xl border border-border shadow-sm px-4 py-3.5 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isActive ? 'bg-primary/12' : 'bg-muted'}`}>
        <MapPin className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{location.name}</p>
        <p className="text-xs text-muted-foreground font-mono mt-0.5">{location.code}</p>
      </div>
      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${isActive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
      <button
        onClick={onToggle}
        disabled={toggling}
        className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-muted transition-colors text-muted-foreground disabled:opacity-50"
        title={isActive ? 'Deactivate' : 'Activate'}
      >
        {toggling
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : isActive
            ? <ToggleRight className="w-5 h-5 text-emerald-500" />
            : <ToggleLeft className="w-5 h-5 text-muted-foreground" />
        }
      </button>
    </div>
  )
}
