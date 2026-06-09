import { useState, useRef } from 'react'
import { ChevronRight, Loader2 } from 'lucide-react'

interface Props {
  label: string
  onAction: () => void
  loading?: boolean
}

const THUMB_W = 52
const PAD     = 4

export default function SlideToAction({ label, onAction, loading = false }: Props) {
  const [dragX, setDragX]         = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef               = useRef<HTMLDivElement>(null)

  const maxX = () =>
    containerRef.current ? containerRef.current.offsetWidth - THUMB_W - PAD * 2 : 200

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (loading) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setIsDragging(true)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - rect.left - THUMB_W / 2, maxX()))
    setDragX(x)
  }

  const handlePointerUp = () => {
    if (!isDragging) return
    setIsDragging(false)
    if (dragX / maxX() >= 0.82) {
      setDragX(maxX())
      onAction()
    } else {
      setDragX(0)
    }
  }

  const progress = maxX() > 0 ? Math.min(dragX / maxX(), 1) : 0

  return (
    <div
      ref={containerRef}
      className="relative h-14 rounded-2xl overflow-hidden select-none border border-orange-200"
      style={{
        background: `linear-gradient(to right, #f97316 0%, #fb923c ${progress * 100}%, #fff7ed ${progress * 100}%)`,
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-sm font-semibold text-orange-400">{label}</span>
      </div>

      <div
        className="absolute top-1 bottom-1 rounded-xl bg-orange-500 shadow-md flex items-center justify-center cursor-grab active:cursor-grabbing"
        style={{
          left: PAD + dragX,
          width: THUMB_W,
          transition: isDragging ? 'none' : 'left 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {loading
          ? <Loader2 className="w-5 h-5 text-white animate-spin" />
          : <ChevronRight className="w-5 h-5 text-white" />
        }
      </div>
    </div>
  )
}
