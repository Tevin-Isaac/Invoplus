'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X, Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/brand/Logo'
import { AssistantChat } from '@/components/dashboard/AssistantChat'

const links = [
  { label: 'Platform', href: '/#platform' },
  { label: 'Features', href: '/#features' },
  { label: 'Company', href: '/#company' },
  { label: 'Support', href: '/#support' },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')

  useEffect(() => {
    const stored = window.localStorage.getItem('invoplus-theme') as 'light' | 'dark' | null
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    setTheme(stored || preferred)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    window.localStorage.setItem('invoplus-theme', theme)
  }, [theme])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={cn(
      'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
      scrolled 
        ? 'bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800' 
        : 'bg-transparent'
    )}>
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size={28} showText={false} />
          </Link>

          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition">
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-3">
            <AssistantChat />
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="bg-slate-200/50 dark:bg-white/10 text-slate-600 dark:text-white hover:bg-slate-200 dark:hover:bg-white/20 rounded-full p-2.5 transition"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link href="/dashboard" className="rounded-full border border-slate-200 dark:border-white/10 bg-white/5 dark:bg-white/5 px-4 py-2 text-sm text-slate-950 dark:text-white transition hover:bg-slate-100 dark:hover:bg-white/10">
              Get Started
            </Link>
          </div>

          <button className="lg:hidden p-2 text-slate-950 dark:text-white" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 px-6 py-4 space-y-3">
          {links.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)} className="block text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition py-2">
              {link.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => { setTheme(theme === 'dark' ? 'light' : 'dark'); setMobileOpen(false) }}
            className="w-full flex items-center justify-center gap-2 bg-slate-200/50 dark:bg-white/10 text-slate-600 dark:text-white hover:bg-slate-200 dark:hover:bg-white/20 rounded-full px-4 py-2.5 transition"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {theme === 'dark' ? 'Light' : 'Dark'} Mode
          </button>
          <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="block w-full text-center rounded-full bg-slate-950 dark:bg-white text-white dark:text-slate-950 text-sm font-semibold px-6 py-3 hover:opacity-90 transition">
            Get Started
          </Link>
          <div className="flex items-center justify-center gap-2 pt-1">
            <AssistantChat />
            <span className="text-xs text-slate-500 dark:text-slate-400">Ask the InvoPlus Assistant</span>
          </div>
        </div>
      )}
    </header>
  )
}
