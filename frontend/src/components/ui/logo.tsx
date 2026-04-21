// frontend/src/components/ui/logo.tsx — NeoStills v4
import { cn } from '@/lib/utils'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
  showTagline?: boolean
  animated?: boolean
  className?: string
}

const sizeMap = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
  xl: 'w-14 h-14',
}

const gapMap = {
  sm: 'gap-2',
  md: 'gap-2.5',
  lg: 'gap-3',
  xl: 'gap-3.5',
}

const wordmarkMap = {
  sm: 'text-sm',
  md: 'text-[17px]',
  lg: 'text-2xl',
  xl: 'text-3xl',
}

const taglineMap = {
  sm: 'hidden',
  md: 'hidden',
  lg: 'text-[9px]',
  xl: 'text-[10px]',
}

export function Logo({
  size = 'md',
  showText = true,
  showTagline = false,
  animated = false,
  className,
}: LogoProps) {
  return (
    <div className={cn('flex items-center', gapMap[size], className)}>
      <img
        src="/logo-industrial-v2.svg"
        alt="NeoStills"
        className={cn(
          sizeMap[size],
          'shrink-0 transition-transform duration-500 drop-shadow-[0_8px_20px_rgba(184,115,51,0.2)]',
          animated && 'hover:-translate-y-0.5 hover:scale-[1.04]',
        )}
      />
      {showText && (
        <div className="leading-none min-w-0">
          <div
            className={cn(
              'font-display font-semibold whitespace-nowrap tracking-[0.01em] bg-[linear-gradient(135deg,#F6DEC5_0%,#D1A178_36%,#B87333_68%,#7D4A22_100%)] bg-clip-text text-transparent drop-shadow-[0_1px_18px_rgba(184,115,51,0.12)]',
              wordmarkMap[size],
            )}
          >
            NeoStills
          </div>
          {showTagline && (
            <div
              className={cn(
                'mt-1 whitespace-nowrap uppercase tracking-[0.28em] text-[#7F8AA4]',
                taglineMap[size],
              )}
            >
              Grain To Glass
            </div>
          )}
        </div>
      )}
    </div>
  )
}
