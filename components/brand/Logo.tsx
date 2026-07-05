import { Space_Grotesk } from 'next/font/google'
import { cn } from '@/lib/utils'

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['600'], display: 'swap' })

// Official InvoPlus mark — "The Invoice Wallet" v3.0 (June 2026).
// Geometry and colors must match daml/../invoplus-logo-master.svg exactly.
// Ink #07121A · Teal #14B892→#0E8C6F · Mist #EAF4F0
// tone='light' = mark sits on a light background → wallet ink, invoice mist.
// tone='dark'  = mark sits on a dark background  → wallet mist, invoice ink.
const INK = '#07121A'
const MIST = '#EAF4F0'

interface LogoProps {
  size?: number
  textClassName?: string
  className?: string
  tone?: 'dark' | 'light'
  showText?: boolean
}

export function Logo({ size = 32, textClassName = 'text-xl', className, tone = 'dark', showText = true }: LogoProps) {
  const onDarkBg = tone === 'dark'
  const walletFill = onDarkBg ? MIST : INK
  const invoiceFill = onDarkBg ? INK : MIST
  const invoiceStroke = onDarkBg ? MIST : INK
  const detailFill = onDarkBg ? MIST : INK
  const keyline = onDarkBg ? '#0B1622' : '#FFFFFF'
  const invoTextColor = onDarkBg ? MIST : INK

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden="true" className="shrink-0">
        <defs>
          <linearGradient id="invoplus-teal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#14B892" />
            <stop offset="1" stopColor="#0E8C6F" />
          </linearGradient>
        </defs>

        {/* Invoice sheet tucked behind the wallet */}
        <path
          d="M32 6 H56 L66 16 V40 H26 V12 Q26 6 32 6 Z"
          fill={invoiceFill}
          stroke={invoiceStroke}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {/* Fold flap */}
        <path d="M56 6 L66 16 H58 Q56 16 56 14 Z" fill="url(#invoplus-teal)" />
        {/* Ledger line */}
        <rect x="33" y="20" width="20" height="4.5" rx="2.25" fill={detailFill} />

        {/* Wallet body */}
        <rect x="10" y="32" width="76" height="50" rx="12" fill={walletFill} />
        {/* Card slot */}
        <rect x="19" y="44" width="26" height="5" rx="2.5" fill={invoiceFill} opacity="0.9" />

        {/* Coin-plus badge */}
        <circle cx="68" cy="66" r="21" fill="url(#invoplus-teal)" stroke={keyline} strokeWidth="4" />
        <circle cx="68" cy="66" r="15.5" fill="none" stroke={MIST} strokeWidth="2.5" opacity="0.55" />
        <rect x="64.5" y="56" width="7" height="20" rx="3.5" fill={MIST} />
        <rect x="58" y="62.5" width="20" height="7" rx="3.5" fill={MIST} />
      </svg>
      {showText && (
        <span className={cn('font-semibold leading-none', spaceGrotesk.className, textClassName)}>
          <span style={{ color: invoTextColor }}>invo</span>
          <span style={{ color: '#14B892' }}>plus</span>
        </span>
      )}
    </span>
  )
}
