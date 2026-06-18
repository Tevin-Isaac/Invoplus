'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, FileText, Store, Tag, BarChart3,
  Settings, Menu, X, TrendingUp
} from 'lucide-react'
import { cn } from '@/lib/utils'

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

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-dark-card border border-dark-border p-2.5 rounded-xl"
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
      </button>

      {/* Sidebar */}
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
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <Image src="/invoplus.png" alt="InvoPlus" width={22} height={22} className="rounded-md" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">InvoPlus</p>
              <p className="text-xs text-dark-muted">Canton Network</p>
            </div>
          </Link>
        </div>

        {/* Nav */}
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

        {/* Canton status */}
        <div className="p-4 border-t border-dark-border">
          <div className="flex items-center gap-2.5 px-3 py-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <div>
              <p className="text-xs font-medium text-white">Canton Network</p>
              <p className="text-xs text-dark-muted">LocalNet · Connected</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
    </>
  )
}
