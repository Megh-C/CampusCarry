import TopBar from '@/components/shared/TopBar'

export default function OrderDetailPage() {
  return (
    <>
      <TopBar showBack title="Order Details" />
      <div className="px-4 pt-4">
        <div className="h-80 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 text-sm shadow-sm">
          Order detail + delivery flow + OTP — Phase 4
        </div>
      </div>
    </>
  )
}
