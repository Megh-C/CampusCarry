import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, ChevronUp, ChevronDown, Loader2, Star, ChevronsUpDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminApi } from '@/api/admin'
import type { AdminUser, UserStatus } from '@/types'

const STATUS_STYLE: Record<UserStatus, string> = {
  ACTIVE:    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  SUSPENDED: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  BANNED:    'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
}

const STATUS_OPTIONS: UserStatus[] = ['ACTIVE', 'SUSPENDED', 'BANNED']
const GENDER_OPTIONS = ['MALE', 'FEMALE', 'OTHER']
const YEAR_OPTIONS   = [1, 2, 3, 4]
const SORT_OPTIONS   = [
  { value: 'createdAt',       label: 'Joined date' },
  { value: 'totalDeliveries', label: 'Deliveries' },
  { value: 'rating',          label: 'Rating' },
]

const selectCls = 'text-sm border border-border rounded-xl px-3 py-2 bg-card text-foreground outline-none cursor-pointer'

function yearLabel(y: number) {
  return ['1st', '2nd', '3rd', '4th'][y - 1] ?? `Y${y}`
}

export default function AdminUsersPage() {
  const [users, setUsers]       = useState<AdminUser[]>([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading]   = useState(true)

  // Filters
  const [search, setSearch]     = useState('')
  const [status, setStatus]     = useState<UserStatus | ''>('')
  const [gender, setGender]     = useState('')
  const [year, setYear]         = useState<number | ''>('')
  const [sortBy, setSortBy]     = useState('createdAt')
  const [sortDir, setSortDir]   = useState<'asc' | 'desc'>('desc')

  // Status change popover
  const [changingId, setChangingId] = useState<string | null>(null)
  const [savingId, setSavingId]     = useState<string | null>(null)

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const load = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const res = await adminApi.getUsers({
        search:  search.trim() || undefined,
        status:  status  || undefined,
        gender:  gender  || undefined,
        year:    year    || undefined,
        page: p, size: 15,
        sortBy, sortDir,
      })
      setUsers(res.content)
      setTotal(res.totalElements)
      setTotalPages(res.totalPages)
    } catch {
      toast.error('Could not load users.')
    } finally {
      setLoading(false)
    }
  }, [search, status, gender, year, sortBy, sortDir])

  useEffect(() => {
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => { setPage(0); load(0) }, 300)
    return () => clearTimeout(searchTimeout.current)
  }, [search, status, gender, year, sortBy, sortDir])

  const handleStatusChange = async (userId: string, newStatus: UserStatus) => {
    setSavingId(userId)
    try {
      const updated = await adminApi.updateUserStatus(userId, newStatus)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: updated.status } : u))
      toast.success(`User ${newStatus.toLowerCase()}.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update status.')
    } finally {
      setSavingId(null)
      setChangingId(null)
    }
  }

  const toggleSort = (col: string) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const SortIcon = ({ col }: { col: string }) =>
    sortBy === col
      ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
      : <ChevronsUpDown className="w-3 h-3 opacity-30" />

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold text-foreground tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Search, filter and manage student accounts · {total} total</p>
      </div>

      {/* Filter bar */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-4 flex flex-wrap gap-2.5 items-center">
        <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-xl px-3 py-2 flex-1 min-w-[180px] focus-within:border-primary/50 transition-colors">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            placeholder="Search name, email, phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground/60 text-foreground"
          />
        </div>

        <select value={status} onChange={e => setStatus(e.target.value as UserStatus | '')} className={selectCls}>
          <option value="">All status</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
        </select>

        <select value={gender} onChange={e => setGender(e.target.value)} className={selectCls}>
          <option value="">All gender</option>
          {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g.charAt(0) + g.slice(1).toLowerCase()}</option>)}
        </select>

        <select value={year} onChange={e => setYear(e.target.value ? Number(e.target.value) : '')} className={selectCls}>
          <option value="">All years</option>
          {YEAR_OPTIONS.map(y => <option key={y} value={y}>{yearLabel(y)}</option>)}
        </select>

        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className={selectCls}>
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>Sort: {o.label}</option>)}
        </select>

        <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
          className="flex items-center gap-1.5 text-sm border border-border rounded-xl px-3 py-2 bg-card text-foreground hover:bg-muted transition-colors">
          {sortDir === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {sortDir === 'asc' ? 'Asc' : 'Desc'}
        </button>
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary/40" />
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground font-medium">No users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Hostel</th>
                  <th
                    className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground select-none"
                    onClick={() => toggleSort('totalDeliveries')}
                  >
                    <span className="flex items-center gap-1">Deliveries <SortIcon col="totalDeliveries" /></span>
                  </th>
                  <th
                    className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground select-none"
                    onClick={() => toggleSort('rating')}
                  >
                    <span className="flex items-center gap-1">Rating <SortIcon col="rating" /></span>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  <th
                    className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground select-none"
                    onClick={() => toggleSort('createdAt')}
                  >
                    <span className="flex items-center gap-1">Joined <SortIcon col="createdAt" /></span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{u.fullName}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-foreground/80">{u.phone || '—'}</p>
                      <p className="text-xs text-muted-foreground">{u.upiId || 'No UPI'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-foreground/80">{u.hostelBlock.replace('_', ' ')}</p>
                      <p className="text-xs text-muted-foreground">{yearLabel(u.year)} · {u.gender.charAt(0) + u.gender.slice(1).toLowerCase()}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-foreground">{u.totalDeliveries}</span>
                      {u.isOnDelivery && (
                        <span className="ml-1.5 text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full">On delivery</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {u.rating != null ? (
                        <span className="flex items-center gap-1 text-foreground/80 font-semibold">
                          <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                          {u.rating.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative">
                        <button
                          onClick={() => setChangingId(id => id === u.id ? null : u.id)}
                          disabled={savingId === u.id}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full border inline-flex items-center gap-1 transition-colors ${STATUS_STYLE[u.status]}`}
                        >
                          {savingId === u.id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : u.status.charAt(0) + u.status.slice(1).toLowerCase()
                          }
                        </button>
                        {changingId === u.id && (
                          <div className="absolute top-7 left-0 z-20 bg-popover rounded-xl shadow-lg border border-border py-1 min-w-[120px]">
                            {STATUS_OPTIONS.filter(s => s !== u.status).map(s => (
                              <button
                                key={s}
                                onClick={() => handleStatusChange(u.id, s)}
                                className="w-full text-left px-3 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors"
                              >
                                Set {s.charAt(0) + s.slice(1).toLowerCase()}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground text-xs">Page {page + 1} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => { const p = page - 1; setPage(p); load(p) }}
              disabled={page === 0 || loading}
              className="px-3 py-1.5 rounded-lg border border-border bg-card text-foreground/80 hover:bg-muted disabled:opacity-40 transition-colors text-xs font-semibold"
            >
              Previous
            </button>
            <button
              onClick={() => { const p = page + 1; setPage(p); load(p) }}
              disabled={page >= totalPages - 1 || loading}
              className="px-3 py-1.5 rounded-lg border border-border bg-card text-foreground/80 hover:bg-muted disabled:opacity-40 transition-colors text-xs font-semibold"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
