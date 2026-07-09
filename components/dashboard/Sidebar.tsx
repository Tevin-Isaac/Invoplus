'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Logo } from '@/components/brand/Logo'
import {
  LayoutDashboard, FileText, Store, Tag, BarChart3,
  Settings, Menu, X, TrendingUp, PanelLeftOpen, PanelLeftClose, Landmark,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCanton } from '@/lib/canton'
import { useAuth } from '@/lib/auth-context'

const navItems = [
  { href: '/dashboard',             icon: LayoutDashboard, label: 'Overview' },
  { href: '/dashboard/invoices',    icon: FileText,        label: 'Invoices' },
  { href: '/dashboard/marketplace', icon: Store,           label: 'Marketplace' },
  { href: '/dashboard/offers',      icon: Tag,             label: 'My Offers' },
  { href: '/dashboard/portfolio',   icon: TrendingUp,      label: 'Portfolio' },
  { href: '/dashboard/analytics',   icon: BarChart3,       label: 'Analytics' },
  { href: '/dashboard/platform',    icon: Landmark,        label: 'Platform' },
  { href: '/dashboard/settings',    icon: Settings,        label: 'Settings' },
]

export function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  // Icon rail by default; expands on toggle. Persisted across visits.
  const [expanded, setExpanded] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const { ledgerStatus, ledgerLoading, party } = useCanton()
  const { user } = useAuth()

  useEffect(() => {
    setExpanded(window.localStorage.getItem('invoplus-sidebar') === 'expanded')
  }, [])

  const toggleExpanded = () => {
    setExpanded(prev => {
      window.localStorage.setItem('invoplus-sidebar', prev ? 'collapsed' : 'expanded')
      return !prev
    })
  }

  useEffect(() => {
    const stored = window.localStorage.getItem('invoplus-theme') as 'light' | 'dark' | null
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    setTheme(stored || preferred)
  }, [])

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light')
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const initial = (user?.email?.[0] ?? party?.displayName?.[0] ?? 'I').toUpperCase()
  const displayName = user?.email?.split('@')[0] ?? party?.displayName ?? 'Not connected'
  const role = user?.role ?? party?.type ?? 'guest'

  // Shared nav list — labels always render in the DOM (so widths animate
  // smoothly) but collapse to zero width on the icon rail.
  const NavList = ({ showLabels, onNavigate }: { showLabels: boolean; onNavigate?: () => void }) => (
    <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-1">
      {navItems.map(item => {
        const Icon = item.icon
        const active = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={showLabels ? undefined : item.label}
            className={cn(
              'group relative flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium transition-all',
              showLabels ? 'px-3' : 'justify-center px-0',
              active
                ? 'bg-violet-500/10 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white'
            )}
          >
            {active && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-violet-500" />}
            <Icon className="h-[18px] w-[18px] shrink-0" />
            <span className={cn(
              'whitespace-nowrap transition-all duration-200',
              showLabels ? 'opacity-100' : 'w-0 overflow-hidden opacity-0'
            )}>
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )

  const LedgerDot = ({ showLabel }: { showLabel: boolean }) => (
    <div
      className={cn('flex items-center gap-2.5 py-2', showLabel ? 'px-3' : 'justify-center px-0')}
      title={ledgerLoading ? 'Connecting to Canton…' : ledgerStatus?.ok ? 'Connected to Canton DevNet' : 'Canton DevNet unreachable'}
    >
      <span className={cn(
        'h-2 w-2 shrink-0 rounded-full',
        ledgerLoading ? 'bg-amber-400 animate-pulse' : ledgerStatus?.ok ? 'bg-emerald-500 animate-pulse' : 'bg-red-400'
      )} />
      {showLabel && (
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-950 dark:text-white">Canton Network</p>
          <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
            {ledgerLoading ? 'Connecting…' : ledgerStatus?.ok ? 'DevNet · connected' : 'DevNet · offline'}
          </p>
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-3.5 left-4 z-50 lg:hidden rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X className="h-5 w-5 text-slate-950 dark:text-white" /> : <Menu className="h-5 w-5 text-slate-950 dark:text-white" />}
      </button>

      {/* ── Desktop: collapsible icon rail ── */}
      <aside className={cn(
        'hidden lg:flex h-screen shrink-0 flex-col',
        'border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950',
        'transition-[width] duration-300 ease-in-out',
        expanded ? 'w-60' : 'w-[76px]'
      )}>
        {/* Logo + expand toggle */}
        <div className={cn(
          'flex items-center border-b border-slate-200 py-4 dark:border-slate-800',
          expanded ? 'justify-between px-4' : 'flex-col gap-3 px-0'
        )}>
          <Link href="/" className="flex items-center" title="Invoplus">
            <Logo size={32} showText={expanded} textClassName="text-lg font-semibold" tone={theme === 'dark' ? 'dark' : 'light'} />
          </Link>
          <button
            onClick={toggleExpanded}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-white/5 dark:hover:text-white"
            aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
            title={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <PanelLeftClose className="h-[18px] w-[18px]" /> : <PanelLeftOpen className="h-[18px] w-[18px]" />}
          </button>
        </div>

        <NavList showLabels={expanded} />

        {/* Bottom: ledger status + profile (display only — all identity
            actions, including logout/disconnect, live in the header
            profile menu so there's exactly one place for them) */}
        <div className="border-t border-slate-200 px-3 py-3 dark:border-slate-800">
          <LedgerDot showLabel={expanded} />
          <div className={cn('mt-1 flex items-center gap-2.5 py-2', expanded ? 'px-3' : 'justify-center px-0')}>
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-violet-700 text-sm font-semibold text-white"
              title={`${displayName} · ${role}`}
            >
              {initial}
            </div>
            {expanded && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-950 dark:text-white">{displayName}</p>
                <p className="truncate text-[10px] uppercase tracking-wider text-violet-600 dark:text-violet-400">{role}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Mobile: slide-in drawer (always full labels) ── */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-40 flex w-64 flex-col lg:hidden',
        'border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950',
        'transform transition-transform duration-300',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 pl-16 dark:border-slate-800">
          <Link href="/" className="flex items-center gap-2">
            <Logo size={30} textClassName="text-lg font-semibold" tone={theme === 'dark' ? 'dark' : 'light'} />
          </Link>
        </div>

        <NavList showLabels onNavigate={() => setMobileOpen(false)} />

        <div className="border-t border-slate-200 px-3 py-3 dark:border-slate-800">
          <LedgerDot showLabel />
          <div className="mt-1 flex items-center gap-2.5 px-3 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-violet-700 text-sm font-semibold text-white">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-950 dark:text-white">{displayName}</p>
              <p className="truncate text-[10px] uppercase tracking-wider text-violet-600 dark:text-violet-400">{role}</p>
            </div>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
    </>
  )
}
