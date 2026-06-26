'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Fraunces } from 'next/font/google'
import {
  LayoutDashboard, FileText, Store, Tag, BarChart3,
  Settings, Menu, X, TrendingUp
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCanton } from '@/lib/canton'

const fraunces = Fraunces({ subsets: ['latin'], weight: ['600'], display: 'swap' })

const navItems = [
  { href: '/dashboard',             icon: LayoutDashboard, label: 'Overview' },
  { href: '/dashboard/invoices',    icon: FileText,         label: 'Invoices' },
  { href: '/dashboard/marketplace', icon: Store,            label: 'Marketplace' },
  { href: '/dashboard/offers',      icon: Tag,              label: 'My Offers' },
  { href: '/dashboard/portfolio',   icon: TrendingUp,       label: 'Portfolio' },
  { href: '/dashboard/analytics',   icon: BarChart3,        label: 'Analytics' },
  { href: '/dashboard/settings',    icon: Settings,         label: 'Settings' },
]

export function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { ledgerStatus, ledgerLoading } = useCanton()

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-dark-card border border-dark-border p-2.5 rounded-xl"
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
      </button>

      <aside className={cn(
        'fixed lg:relative inset-y-0 left-0 z-40',
        'w-64 h-screen flex flex-col shrink-0',
        'bg-dark-bg border-r border-dark-border',
        'transform transition-transform duration-300',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Logo */}
        <div className="px-6 py-6 border-b border-dark-border">
          <Link href="/" className="flex items-center gap-3">
            <svg width="38" height="38" viewBox="0 0 96 96" aria-hidden="true" className="shrink-0">
              <rect x="8" y="8" width="80" height="80" rx="20" fill="#6D28D9" />
              <rect x="14" y="14" width="68" height="68" rx="15" fill="none" stroke="#F59E0B" strokeWidth="2" />
              <rect x="22" y="58" width="28" height="12" rx="3" fill="#FCD34D" />
              <rect x="29" y="44" width="28" height="12" rx="3" fill="#F59E0B" />
              <rect x="36" y="30" width="28" height="12" rx="3" fill="#D97706" />
            </svg>
            <div className="flex flex-col leading-none">
              <span className={cn('text-xl font-semibold', fraunces.className)}>
                <span style={{ color: '#8B5CF6' }}>Invo</span><span style={{ color: '#FBBF24' }}>plus</span>
              </span>
              <span className="text-xs text-dark-muted mt-1.5">Canton Network</span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <p className="text-xs font-semibold text-dark-muted uppercase tracking-widest px-3 mb-3">Menu</p>
          {navItems.map(item => {
            const Icon = item.icon
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  active
                    ? 'bg-violet-500/15 text-white border border-violet-500/30'
                    : 'text-dark-muted hover:text-white hover:bg-white/5'
                )}
              >
                <Icon className={cn('w-4 h-4', active ? 'text-violet-400' : 'text-current')} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-dark-border">
          <div className="flex items-center gap-2.5 px-3 py-2">
            <span className={cn(
              'w-2 h-2 rounded-full',
              ledgerLoading ? 'bg-yellow-400 animate-pulse' :
              ledgerStatus?.ok ? 'bg-green-400 animate-pulse' : 'bg-red-400'
            )} />
            <div className="min-w-0">
              <p className="text-xs font-medium text-white">Canton Network</p>
              <p className="text-xs text-dark-muted truncate">
                {ledgerLoading
                  ? 'Connecting…'
                  : ledgerStatus?.ok
                    ? `DevNet · Block ${ledgerStatus.offset?.toLocaleString()}`
                    : 'DevNet · Offline'
                }
              </p>
            </div>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
    </>
  )
}
