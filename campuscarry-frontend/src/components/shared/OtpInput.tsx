import { useRef, type KeyboardEvent, type ClipboardEvent } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  value: string
  onChange: (val: string) => void
  length?: number
  disabled?: boolean
}

export default function OtpInput({ value, onChange, length = 6, disabled }: Props) {
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  const digits = value.split('').concat(Array(length).fill('')).slice(0, length)

  const focus = (i: number) => {
    inputs.current[i]?.focus()
    inputs.current[i]?.select()
  }

  const handleChange = (i: number, char: string) => {
    const digit = char.replace(/\D/g, '').slice(-1)
    const next = digits.map((d, idx) => (idx === i ? digit : d))
    onChange(next.join(''))
    if (digit && i < length - 1) focus(i + 1)
  }

  const handleKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[i]) {
        const next = digits.map((d, idx) => (idx === i ? '' : d))
        onChange(next.join(''))
      } else if (i > 0) {
        focus(i - 1)
        const next = digits.map((d, idx) => (idx === i - 1 ? '' : d))
        onChange(next.join(''))
      }
    } else if (e.key === 'ArrowLeft' && i > 0) {
      focus(i - 1)
    } else if (e.key === 'ArrowRight' && i < length - 1) {
      focus(i + 1)
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    onChange(pasted.padEnd(length, '').slice(0, length))
    focus(Math.min(pasted.length, length - 1))
  }

  return (
    <div className="flex gap-2 justify-center">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { inputs.current[i] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={cn(
            'w-11 h-12 text-center text-lg font-semibold rounded-xl border bg-gray-50',
            'transition-all outline-none',
            'border-gray-200 text-gray-900',
            'focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white',
            digit ? 'border-primary/40 bg-white' : '',
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          )}
        />
      ))}
    </div>
  )
}
