import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { cn } from '@/lib/utils'

interface Props {
  className?: string
}

export default function ThemeToggle({ className }: Props) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className={cn(
        'relative w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground',
        'hover:bg-muted hover:text-foreground active:scale-90 transition-all',
        className ?? ''
      )}
    >
      <Sun
        className={cn(
          'w-[18px] h-[18px] absolute transition-all duration-300',
          isDark ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
        )}
      />
      <Moon
        className={cn(
          'w-[18px] h-[18px] absolute transition-all duration-300',
          isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'
        )}
      />
    </button>
  )
}
