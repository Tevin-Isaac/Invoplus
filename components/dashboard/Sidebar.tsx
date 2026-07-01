'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Logo } from '@/components/brand/Logo'
import {
  LayoutDashboard, FileText, Store, Tag, BarChart3,
  Settings, Menu, X, TrendingUp
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCanton } from '@/lib/canton'


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
            <Logo size={38} textClassName="text-xl font-semibold" />
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
