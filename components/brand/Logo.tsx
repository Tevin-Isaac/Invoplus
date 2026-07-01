import { Fraunces } from 'next/font/google'
import { cn } from '@/lib/utils'

const fraunces = Fraunces({ subsets: ['latin'], weight: ['600'], display: 'swap' })

interface LogoProps {
  size?: number
  textClassName?: string
  className?: string
  tone?: 'dark' | 'light'
  showText?: boolean
}

export function Logo({ size = 32, textClassName = 'text-xl', className, tone = 'dark', showText = true }: LogoProps) {
  const invoColor = tone === 'dark' ? '#8B5CF6' : '#6D28D9'
  const plusColor = tone === 'dark' ? '#FBBF24' : '#B45309'
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden="true" className="shrink-0">
        <rect x="8" y="8" width="80" height="80" rx="20" fill="#6D28D9" />
        <rect x="14" y="14" width="68" height="68" rx="15" fill="none" stroke="#F59E0B" strokeWidth="2" />
        <rect x="22" y="58" width="28" height="12" rx="3" fill="#FCD34D" />
        <rect x="29" y="44" width="28" height="12" rx="3" fill="#F59E0B" />
        <rect x="36" y="30" width="28" height="12" rx="3" fill="#D97706" />
      </svg>
      {showText && (
        <span className={cn('font-semibold leading-none', fraunces.className, textClassName)}>
          <span style={{ color: invoColor }}>Invo</span><span style={{ color: plusColor }}>plus</span>
        </span>
      )}
    </span>
  )
}
