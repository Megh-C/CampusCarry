import { useState, useEffect, useCallback } from 'react'
import {
  Users, ShoppingBag, TrendingUp, AlertCircle,
  CheckCircle2, Clock, XCircle, Loader2, RefreshCw,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from 'recharts'
import toast from 'react-hot-toast'
import { adminApi } from '@/api/admin'
import type { AdminStats } from '@/types'

const today = () => new Date().toISOString().slice(0, 10)
const daysAgo = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

const ORDER_COLORS: Record<string, string> = {
  Delivered: '#10b981',
  Pending:   '#3b82f6',
  Accepted:  '#f97316',
  Expired:   '#9ca3af',
}

const USER_FILLS = ['#10b981', '#f59e0b', '#ef4444']

const chartTooltipStyle = {
  borderRadius: 12,
  border: '1px solid var(--border)',
  background: 'var(--popover)',
  color: 'var(--popover-foreground)',
  fontSize: 12,
}

const PRESET_RANGES = [
  { label: 'Today',   from: today(),     to: today() },
  { label: '7 days',  from: daysAgo(6),  to: today() },
  { label: '30 days', from: daysAgo(29), to: today() },
  { label: '90 days', from: daysAgo(89), to: today() },
]

function StatCard({
  icon: Icon, label, value, sub, colorCls,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  colorCls: string
}) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 flex items-start gap-4 hover:shadow-md transition-shadow">
      <div className={`w-11 h-11 rounded-xl ${colorCls} flex items-center justify-center shrink-0 shadow-md`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide leading-none">{label}</p>
        <p className="text-2xl font-extrabold text-foreground mt-1 leading-none">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  )
}

export default function AdminDashboardPage() {
  const [from, setFrom] = useState(daysAgo(29))
  const [to, setTo]     = useState(today())
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (f: string, t: string) => {
    setLoading(true)
    try {
      const data = await adminApi.getStats({ from: f, to: t })
      setStats(data)
    } catch {
      toast.error('Could not load stats.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(from, to) }, [])

  const applyPreset = (f: string, t: string) => { setFrom(f); setTo(t); load(f, t) }

  const orderPie = stats ? [
    { name: 'Delivered', value: Number(stats.deliveredOrders) },
    { name: 'Pending',   value: Number(stats.pendingOrders) },
    { name: 'Accepted',  value: Number(stats.acceptedOrders) },
    { name: 'Expired',   value: Number(stats.expiredOrders) },
  ].filter(d => d.value > 0) : []

  const userBar = stats ? [
    { name: 'Active',    value: Number(stats.activeUsers) },
    { name: 'Suspended', value: Number(stats.suspendedUsers) },
    { name: 'Banned',    value: Number(stats.bannedUsers) },
  ] : []

  const deliveryRate = stats && Number(stats.totalOrders) > 0
    ? Math.round((Number(stats.deliveredOrders) / Number(stats.totalOrders)) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Page header + date range */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Platform overview and stats</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {PRESET_RANGES.map(r => (
            <button
              key={r.label}
              onClick={() => applyPreset(r.from, r.to)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                from === r.from && to === r.to
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/25'
                  : 'bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
              }`}
            >
              {r.label}
            </button>
          ))}
          <div className="flex items-center gap-1.5 bg-card border border-border rounded-lg px-2.5 py-1.5">
            <input
              type="date" value={from}
              onChange={e => setFrom(e.target.value)}
              className="text-xs text-foreground bg-transparent outline-none w-[112px]"
            />
            <span className="text-muted-foreground/50 text-sm">–</span>
            <input
              type="date" value={to}
              onChange={e => setTo(e.target.value)}
              className="text-xs text-foreground bg-transparent outline-none w-[112px]"
            />
          </div>
          <button
            onClick={() => load(from, to)}
            disabled={loading}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {loading && !stats ? (
        <div className="flex justify-center py-24">
          <Loader2 className="w-7 h-7 animate-spin text-primary/40" />
        </div>
      ) : stats ? (
        <>
          {/* Row 1: Order stats */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <StatCard icon={ShoppingBag}  label="Total Orders"   value={Number(stats.totalOrders)}    sub={`${deliveryRate}% delivered`}  colorCls="bg-gradient-to-br from-primary to-orange-600 shadow-primary/25" />
            <StatCard icon={CheckCircle2} label="Delivered"      value={Number(stats.deliveredOrders)} sub="completed"                     colorCls="bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/25" />
            <StatCard icon={Clock}        label="Pending"        value={Number(stats.pendingOrders)}  sub="awaiting pickup"               colorCls="bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/25" />
            <StatCard icon={ShoppingBag}  label="Accepted"       value={Number(stats.acceptedOrders)} sub="in progress"                   colorCls="bg-gradient-to-br from-amber-500 to-amber-600 shadow-amber-500/25" />
          </div>

          {/* Row 2: User + revenue stats */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <StatCard icon={Users}       label="Total Users"    value={Number(stats.totalUsers)}     sub={`${Number(stats.activeUsers)} active`}  colorCls="bg-gradient-to-br from-teal-500 to-teal-600 shadow-teal-500/25" />
            <StatCard icon={TrendingUp}  label="Revenue"        value={`₹${Number(stats.totalRevenue ?? 0).toLocaleString('en-IN')}`} sub="delivered orders"  colorCls="bg-gradient-to-br from-violet-500 to-violet-600 shadow-violet-500/25" />
            <StatCard icon={XCircle}     label="Expired"        value={Number(stats.expiredOrders)}  sub="no deliverer"                  colorCls="bg-gradient-to-br from-gray-400 to-gray-500 shadow-gray-400/25" />
            <StatCard icon={AlertCircle} label="Failed Payouts" value={Number(stats.failedPayments)} sub="needs attention"               colorCls="bg-gradient-to-br from-red-500 to-red-600 shadow-red-500/25" />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Order status donut */}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
              <h2 className="text-sm font-bold text-foreground">Order Status Breakdown</h2>
              <p className="text-xs text-muted-foreground mb-3">Distribution for selected date range</p>
              {orderPie.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={orderPie}
                      cx="50%" cy="50%"
                      innerRadius={68} outerRadius={105}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="var(--card)"
                    >
                      {orderPie.map(entry => (
                        <Cell key={entry.name} fill={ORDER_COLORS[entry.name] ?? '#d1d5db'} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v) => [v ?? 0, 'Orders']}
                      contentStyle={chartTooltipStyle}
                    />
                    <Legend
                      iconType="circle" iconSize={8}
                      formatter={v => <span className="text-xs text-muted-foreground">{v}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground/60 font-medium">
                  No orders in this range
                </div>
              )}
            </div>

            {/* User health bar */}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
              <h2 className="text-sm font-bold text-foreground">User Account Health</h2>
              <p className="text-xs text-muted-foreground mb-3">All-time account status counts</p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={userBar} barSize={52} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
                    formatter={(v) => [v ?? 0, 'Users']}
                    contentStyle={chartTooltipStyle}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {userBar.map((entry, i) => (
                      <Cell key={entry.name} fill={USER_FILLS[i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Delivery success rate bar */}
          <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-bold text-foreground">Delivery Success Rate</h2>
                <p className="text-xs text-muted-foreground">Delivered ÷ total orders in selected range</p>
              </div>
              <span className={`text-3xl font-extrabold ${deliveryRate >= 70 ? 'text-emerald-500' : deliveryRate >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
                {deliveryRate}%
              </span>
            </div>
            <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${deliveryRate >= 70 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : deliveryRate >= 40 ? 'bg-gradient-to-r from-amber-500 to-amber-400' : 'bg-gradient-to-r from-red-500 to-red-400'}`}
                style={{ width: `${deliveryRate}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
              <span>{Number(stats.deliveredOrders)} delivered</span>
              <span>{Number(stats.totalOrders)} total</span>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
