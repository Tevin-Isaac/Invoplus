'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const links = [
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Features', href: '#features' },
  { label: 'For Investors', href: '#investors' },
  { label: 'Pricing', href: '#pricing' },
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
      scrolled ? 'bg-white/90 backdrop-blur-xl border-b border-gray-100 shadow-sm' : 'bg-transparent'
    )}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <Image src="/invoplus.png" alt="InvoPlus" width={36} height={36} className="rounded-lg" />
            <span className="text-xl font-bold text-gray-900">InvoPlus</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-8">
            {links.map(l => (
              <a key={l.href} href={l.href} className="text-sm font-medium text-gray-600 hover:text-violet-500 transition-colors">
                {l.label}
              </a>
            ))}
          </nav>

          {/* CTA */}
          <div className="hidden lg:flex items-center gap-3">
            <Link href="/dashboard" className="text-sm font-medium text-gray-700 hover:text-violet-500 transition-colors px-4 py-2">
              Sign In
            </Link>
            <Link href="/dashboard" className="text-sm font-semibold bg-violet-500 hover:bg-violet-600 text-white px-5 py-2.5 rounded-xl transition-colors">
              Get Started Free
            </Link>
          </div>

          {/* Mobile toggle */}
          <button className="lg:hidden p-2 text-gray-600" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-white border-t border-gray-100 px-6 py-4 space-y-3">
          {links.map(l => (
            <a key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
              className="block text-sm font-medium text-gray-600 hover:text-violet-500 py-2">
              {l.label}
            </a>
          ))}
          <Link href="/dashboard" onClick={() => setMobileOpen(false)}
            className="block text-center text-sm font-semibold bg-violet-500 text-white px-5 py-3 rounded-xl">
            Get Started Free
          </Link>
        </div>
      )}
    </header>
  )
}
