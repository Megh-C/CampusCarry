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
  Delivered: '#22c55e',
  Pending:   '#3b82f6',
  Accepted:  '#f97316',
  Expired:   '#9ca3af',
}

const USER_FILLS = ['#22c55e', '#f59e0b', '#ef4444']

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
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl ${colorCls} flex items-center justify-center shrink-0`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide leading-none">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1 leading-none">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
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
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Platform overview and stats</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {PRESET_RANGES.map(r => (
            <button
              key={r.label}
              onClick={() => applyPreset(r.from, r.to)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                from === r.from && to === r.to
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-primary/40'
              }`}
            >
              {r.label}
            </button>
          ))}
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5">
            <input
              type="date" value={from}
              onChange={e => setFrom(e.target.value)}
              className="text-xs text-gray-700 outline-none w-[112px]"
            />
            <span className="text-gray-300 text-sm">–</span>
            <input
              type="date" value={to}
              onChange={e => setTo(e.target.value)}
              className="text-xs text-gray-700 outline-none w-[112px]"
            />
          </div>
          <button
            onClick={() => load(from, to)}
            disabled={loading}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {loading && !stats ? (
        <div className="flex justify-center py-24">
          <Loader2 className="w-7 h-7 animate-spin text-gray-200" />
        </div>
      ) : stats ? (
        <>
          {/* Row 1: Order stats */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <StatCard icon={ShoppingBag}  label="Total Orders"   value={Number(stats.totalOrders)}    sub={`${deliveryRate}% delivered`}  colorCls="bg-primary" />
            <StatCard icon={CheckCircle2} label="Delivered"      value={Number(stats.deliveredOrders)} sub="completed"                     colorCls="bg-green-500" />
            <StatCard icon={Clock}        label="Pending"        value={Number(stats.pendingOrders)}  sub="awaiting pickup"               colorCls="bg-blue-500" />
            <StatCard icon={ShoppingBag}  label="Accepted"       value={Number(stats.acceptedOrders)} sub="in progress"                   colorCls="bg-amber-500" />
          </div>

          {/* Row 2: User + revenue stats */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <StatCard icon={Users}       label="Total Users"    value={Number(stats.totalUsers)}     sub={`${Number(stats.activeUsers)} active`}  colorCls="bg-emerald-500" />
            <StatCard icon={TrendingUp}  label="Revenue"        value={`₹${Number(stats.totalRevenue ?? 0).toLocaleString('en-IN')}`} sub="delivered orders"  colorCls="bg-violet-500" />
            <StatCard icon={XCircle}     label="Expired"        value={Number(stats.expiredOrders)}  sub="no deliverer"                  colorCls="bg-gray-400" />
            <StatCard icon={AlertCircle} label="Failed Payouts" value={Number(stats.failedPayments)} sub="needs attention"               colorCls="bg-red-500" />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Order status donut */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="text-sm font-semibold text-gray-800">Order Status Breakdown</h2>
              <p className="text-xs text-gray-400 mb-3">Distribution for selected date range</p>
              {orderPie.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={orderPie}
                      cx="50%" cy="50%"
                      innerRadius={68} outerRadius={105}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {orderPie.map(entry => (
                        <Cell key={entry.name} fill={ORDER_COLORS[entry.name] ?? '#d1d5db'} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v) => [v ?? 0, 'Orders']}
                      contentStyle={{ borderRadius: 10, border: '1px solid #f3f4f6', fontSize: 12 }}
                    />
                    <Legend
                      iconType="circle" iconSize={8}
                      formatter={v => <span className="text-xs text-gray-500">{v}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[260px] flex items-center justify-center text-sm text-gray-300 font-medium">
                  No orders in this range
                </div>
              )}
            </div>

            {/* User health bar */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="text-sm font-semibold text-gray-800">User Account Health</h2>
              <p className="text-xs text-gray-400 mb-3">All-time account status counts</p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={userBar} barSize={52} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v) => [v ?? 0, 'Users']}
                    contentStyle={{ borderRadius: 10, border: '1px solid #f3f4f6', fontSize: 12 }}
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
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-800">Delivery Success Rate</h2>
                <p className="text-xs text-gray-400">Delivered ÷ total orders in selected range</p>
              </div>
              <span className={`text-3xl font-bold ${deliveryRate >= 70 ? 'text-green-500' : deliveryRate >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
                {deliveryRate}%
              </span>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${deliveryRate >= 70 ? 'bg-green-500' : deliveryRate >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${deliveryRate}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1.5">
              <span>{Number(stats.deliveredOrders)} delivered</span>
              <span>{Number(stats.totalOrders)} total</span>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
