import TopBar from '@/components/shared/TopBar'

export default function CreateOrderPage() {
  return (
    <>
      <TopBar showBack title="Place Order" />
      <div className="px-4 pt-4">
        <div className="h-80 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 text-sm shadow-sm">
          Create order form + fee estimate — Phase 3
        </div>
      </div>
    </>
  )
}
