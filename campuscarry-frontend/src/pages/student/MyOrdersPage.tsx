import TopBar from '@/components/shared/TopBar'

export default function MyOrdersPage() {
  return (
    <>
      <TopBar title="My Orders" showBack showLogout />
      <div className="px-4 pt-4">
        <div className="h-64 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 text-sm shadow-sm">
          Requester / Deliverer tabs + order history — Phase 4
        </div>
      </div>
    </>
  )
}
