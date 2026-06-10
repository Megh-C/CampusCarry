import { useState, useEffect } from 'react'
import { Eye, EyeOff, Loader2, Star, Pencil, X } from 'lucide-react'
import toast from 'react-hot-toast'
import TopBar from '@/components/shared/TopBar'
import { usersApi } from '@/api/users'
import type { UserProfile } from '@/types'

const MH_BLOCKS = ['A_MH','B_MH','C_MH','D_MH','E_MH','F_MH','G_MH','H_MH','J_MH','K_MH','L_MH','M_MH','N_MH','P_MH','Q_MH','R_MH','S_MH','T_MH']
const LH_BLOCKS = ['A_LH','B_LH','C_LH','D_LH','E_LH','F_LH','G_LH','H_LH','J_LH']

const AVATAR_COLORS = ['bg-violet-500','bg-blue-500','bg-emerald-500','bg-orange-500','bg-pink-500']

const inputCls = 'w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/15 focus:bg-white disabled:opacity-60'
const labelCls = 'text-xs font-semibold text-gray-500 uppercase tracking-wide'

function yearLabel(y: number) {
  return ['', '1st', '2nd', '3rd', '4th'][y] ? `${['','1st','2nd','3rd','4th'][y]} Year` : `Year ${y}`
}

function avatarColor(name: string) {
  return AVATAR_COLORS[(name.charCodeAt(0) ?? 0) % AVATAR_COLORS.length]
}

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star key={s} className={`w-4 h-4 ${s <= Math.round(value) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-100'}`} />
      ))}
    </div>
  )
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Edit profile
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState({ fullName: '', phone: '', hostelBlock: '', upiId: '' })
  const [saving, setSaving] = useState(false)

  // Change password
  const [pwOpen, setPwOpen] = useState(false)
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' })
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false })
  const [savingPw, setSavingPw] = useState(false)

  useEffect(() => {
    usersApi.getProfile()
      .then(p => {
        setProfile(p)
        setForm({ fullName: p.fullName, phone: p.phone, hostelBlock: p.hostelBlock, upiId: p.upiId ?? '' })
      })
      .catch(() => toast.error('Could not load profile.'))
      .finally(() => setLoading(false))
  }, [])

  const hostelOptions = profile?.gender === 'MALE' ? MH_BLOCKS : profile?.gender === 'FEMALE' ? LH_BLOCKS : [...MH_BLOCKS, ...LH_BLOCKS]

  const handleSaveProfile = async () => {
    if (!form.fullName.trim()) { toast.error('Name cannot be empty.'); return }
    setSaving(true)
    try {
      const updated = await usersApi.updateProfile({
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        hostelBlock: form.hostelBlock,
        upiId: form.upiId.trim() || undefined,
      })
      setProfile(updated)
      // Sync name in localStorage so TopBar etc. reflect the change
      const raw = localStorage.getItem('cc_user')
      if (raw) {
        const stored = JSON.parse(raw)
        stored.fullName = updated.fullName
        localStorage.setItem('cc_user', JSON.stringify(stored))
      }
      setEditMode(false)
      toast.success('Profile updated!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!pw.currentPassword || !pw.newPassword || !pw.confirmNewPassword) {
      toast.error('Please fill in all fields.'); return
    }
    if (pw.newPassword !== pw.confirmNewPassword) {
      toast.error('New passwords do not match.'); return
    }
    if (pw.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters.'); return
    }
    setSavingPw(true)
    try {
      await usersApi.changePassword(pw)
      setPw({ currentPassword: '', newPassword: '', confirmNewPassword: '' })
      setPwOpen(false)
      toast.success('Password changed!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not change password.')
    } finally {
      setSavingPw(false)
    }
  }

  if (loading) {
    return (
      <>
        <TopBar title="Profile" showBack />
        <div className="flex justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
      </>
    )
  }

  if (!profile) return null

  const initials = profile.fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <>
      <TopBar title="Profile" showBack />

      <div className="px-4 pt-4 pb-24 max-w-lg mx-auto space-y-4">

        {/* ── Avatar + Identity ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl ${avatarColor(profile.fullName)} flex items-center justify-center shrink-0`}>
              <span className="text-white text-xl font-bold">{initials}</span>
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-gray-900 truncate">{profile.fullName}</h2>
              <p className="text-sm text-gray-400 truncate">{profile.email}</p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <span className="text-xs bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full">{yearLabel(profile.year)}</span>
                <span className="text-xs bg-gray-100 text-gray-600 font-semibold px-2 py-0.5 rounded-full">{profile.hostelBlock.replace('_', ' ')}</span>
                <span className="text-xs bg-gray-100 text-gray-600 font-semibold px-2 py-0.5 rounded-full capitalize">{profile.gender.toLowerCase()}</span>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100">
            <div className="text-center">
              <p className="text-xl font-bold text-gray-900">{profile.totalDeliveries}</p>
              <p className="text-xs text-gray-400 mt-0.5">Deliveries</p>
            </div>
            <div className="text-center border-x border-gray-100">
              {profile.rating != null && profile.totalDeliveries > 0 ? (
                <>
                  <div className="flex justify-center">
                    <StarRating value={profile.rating} />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{profile.rating.toFixed(1)} rating</p>
                </>
              ) : (
                <>
                  <p className="text-xl font-bold text-gray-300">—</p>
                  <p className="text-xs text-gray-400 mt-0.5">No rating yet</p>
                </>
              )}
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-gray-900">
                {(profile.activeSmall ?? 0) + (profile.activeMedium ?? 0) + (profile.activeLarge ?? 0)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Active orders</p>
            </div>
          </div>
        </div>

        {/* ── Edit Profile ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <button
            onClick={() => { setEditMode(v => !v); setPwOpen(false) }}
            className="w-full flex items-center justify-between px-5 py-4"
          >
            <span className="text-sm font-semibold text-gray-800">Edit Profile</span>
            {editMode ? <X className="w-4 h-4 text-gray-400" /> : <Pencil className="w-4 h-4 text-gray-400" />}
          </button>

          {editMode && (
            <div className="px-5 pb-5 space-y-4 border-t border-gray-100 pt-4">
              <div className="space-y-1.5">
                <label className={labelCls}>Full Name</label>
                <input type="text" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} disabled={saving} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Phone</label>
                <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} maxLength={10} disabled={saving} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Hostel Block</label>
                <select value={form.hostelBlock} onChange={e => setForm(f => ({ ...f, hostelBlock: e.target.value }))} disabled={saving} className={inputCls}>
                  {hostelOptions.map(b => <option key={b} value={b}>{b.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>UPI ID <span className="normal-case font-normal text-gray-400">(optional)</span></label>
                <input type="text" placeholder="yourname@upi" value={form.upiId} onChange={e => setForm(f => ({ ...f, upiId: e.target.value }))} disabled={saving} className={inputCls} />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={handleSaveProfile} disabled={saving} className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button onClick={() => { setEditMode(false); setForm({ fullName: profile.fullName, phone: profile.phone, hostelBlock: profile.hostelBlock, upiId: profile.upiId ?? '' }) }} disabled={saving} className="px-4 py-3 rounded-xl bg-gray-100 text-sm font-semibold text-gray-600">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Change Password ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <button
            onClick={() => { setPwOpen(v => !v); setEditMode(false) }}
            className="w-full flex items-center justify-between px-5 py-4"
          >
            <span className="text-sm font-semibold text-gray-800">Change Password</span>
            {pwOpen ? <X className="w-4 h-4 text-gray-400" /> : <Pencil className="w-4 h-4 text-gray-400" />}
          </button>

          {pwOpen && (
            <div className="px-5 pb-5 space-y-4 border-t border-gray-100 pt-4">
              {(['currentPassword', 'newPassword', 'confirmNewPassword'] as const).map((field, i) => {
                const labels = ['Current Password', 'New Password', 'Confirm New Password']
                const showKeys = ['current', 'next', 'confirm'] as const
                const show = showPw[showKeys[i]]
                return (
                  <div key={field} className="space-y-1.5">
                    <label className={labelCls}>{labels[i]}</label>
                    <div className="relative">
                      <input
                        type={show ? 'text' : 'password'}
                        value={pw[field]}
                        onChange={e => setPw(p => ({ ...p, [field]: e.target.value }))}
                        disabled={savingPw}
                        className={`${inputCls} pr-11`}
                      />
                      <button type="button" onClick={() => setShowPw(s => ({ ...s, [showKeys[i]]: !s[showKeys[i]] }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )
              })}
              <div className="flex gap-2 pt-1">
                <button onClick={handleChangePassword} disabled={savingPw} className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                  {savingPw && <Loader2 className="w-4 h-4 animate-spin" />}
                  {savingPw ? 'Saving...' : 'Update Password'}
                </button>
                <button onClick={() => { setPwOpen(false); setPw({ currentPassword: '', newPassword: '', confirmNewPassword: '' }) }} disabled={savingPw} className="px-4 py-3 rounded-xl bg-gray-100 text-sm font-semibold text-gray-600">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Read-only info ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className={`${labelCls} mb-3`}>Account Info</p>
          <div className="space-y-3">
            {[
              { label: 'Email', value: profile.email },
              { label: 'UPI ID', value: profile.upiId || '—' },
              { label: 'Phone', value: profile.phone },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{label}</span>
                <span className="text-sm font-medium text-gray-700">{value}</span>
              </div>
            ))}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Status</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${profile.status === 'ACTIVE' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                {profile.status}
              </span>
            </div>
          </div>
        </div>

      </div>
    </>
  )
}
