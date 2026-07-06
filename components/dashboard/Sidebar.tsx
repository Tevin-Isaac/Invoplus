'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Logo } from '@/components/brand/Logo'
import {
  LayoutDashboard, FileText, Store, Tag, BarChart3,
  Settings, Menu, X, TrendingUp, LogOut
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCanton } from '@/lib/canton'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'


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
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const { ledgerStatus, ledgerLoading, party } = useCanton()
  const { user, logout } = useAuth()
  const router = useRouter()
  const handleLogout = async () => { await logout(); router.push('/login') }

  useEffect(() => {
    const stored = window.localStorage.getItem('invoplus-theme') as 'light' | 'dark' | null
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    setTheme(stored || preferred)
    const onStorage = () => {
      const next = window.localStorage.getItem('invoplus-theme') as 'light' | 'dark' | null
      if (next) setTheme(next)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light')
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900"
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X className="w-5 h-5 text-slate-950 dark:text-white" /> : <Menu className="w-5 h-5 text-slate-950 dark:text-white" />}
      </button>

      <aside className={cn(
        'fixed lg:relative inset-y-0 left-0 z-40',
        'w-64 h-screen flex flex-col shrink-0',
        'border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950',
        'transform transition-transform duration-300',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        <div className="px-6 py-6 border-b border-slate-200 dark:border-slate-800">
          <Link href="/" className="flex items-center gap-3">
            <Logo size={38} textClassName="text-xl font-semibold" tone={theme === 'dark' ? 'dark' : 'light'} />
          </Link>
        </div>

        {/* profile-block */}
        <div className="px-4 pt-5">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-violet-800 font-display text-xl font-semibold text-white">
              {(user?.email?.[0] ?? party?.displayName?.[0] ?? 'I').toUpperCase()}
            </div>
            <p className="mt-3 truncate text-sm font-semibold text-white">{user?.email?.split('@')[0] ?? party?.displayName ?? 'Not connected'}</p>
            <p className="mt-0.5 font-data text-[10px] uppercase tracking-[0.2em] text-violet-300/90">{user?.role ?? party?.type ?? 'guest'}</p>
          </div>
        </div>


        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest px-3 mb-3 dark:text-slate-400">Menu</p>
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
                    ? 'bg-slate-100 text-slate-950 border border-slate-200 dark:bg-white/10 dark:text-white dark:border-slate-700'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5'
                )}
              >
                <Icon className="w-4 h-4 text-current" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5 px-3 py-2">
            <span className={cn(
              'w-2 h-2 rounded-full',
              ledgerLoading ? 'bg-slate-400 animate-pulse' :
              ledgerStatus?.ok ? 'bg-slate-500 animate-pulse' : 'bg-slate-600'
            )} />
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-950 dark:text-white">Canton Network</p>
              <p className="text-xs text-slate-500 truncate dark:text-slate-400">
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
