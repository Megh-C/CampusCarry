import TopBar from '@/components/shared/TopBar'

export default function ProfilePage() {
  return (
    <>
      <TopBar title="Profile" showBack showLogout />
      <div className="px-4 pt-4">
        <div className="h-64 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 text-sm shadow-sm">
          Profile info + edit + logout — Phase 4
        </div>
      </div>
    </>
  )
}
