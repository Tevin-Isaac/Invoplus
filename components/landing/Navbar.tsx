'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const links = [
  { label: 'Home', href: '/' },
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Invoices', href: '/dashboard/invoices' },
  { label: 'Marketplace', href: '/dashboard/marketplace' },
  { label: 'Offers', href: '/dashboard/offers' },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={cn(
      'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
      scrolled ? 'bg-slate-950/95 backdrop-blur-xl border-b border-slate-800' : 'bg-transparent'
    )}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <Link href="/" className="text-xl font-bold text-white">InvoPlus</Link>

          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-slate-300">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="transition hover:text-white">
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-3">
            <Link href="/dashboard" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:border-violet-300 hover:bg-white/10">
              Dashboard
            </Link>
            <Link href="/dashboard" className="rounded-2xl bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400">
              Open App
            </Link>
          </div>

          <button className="lg:hidden p-2 text-white" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden bg-slate-950 border-t border-slate-800 px-6 py-4 space-y-3">
          {links.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)} className="block rounded-2xl px-4 py-3 text-sm text-slate-200 hover:bg-white/5">
              {link.label}
            </Link>
          ))}
          <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="block rounded-2xl bg-violet-500 px-5 py-3 text-center text-sm font-semibold text-white">
            Open App
          </Link>
        </div>
      )}
    </header>
  )
}
