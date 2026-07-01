'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Menu, X, Moon, Sun } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'

const navLinks = [
  { label: 'platform', href: '#platform' },
  { label: 'features', href: '#features' },
  { label: 'company', href: '#company' },
  { label: 'support', href: '#support' },
]

export function Hero() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [currentVideo, setCurrentVideo] = useState(0)
  const videos = ['/cashflow.mp4', '/invoice.mp4']

  useEffect(() => {
    const stored = window.localStorage.getItem('invoplus-theme') as 'light' | 'dark' | null
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    setTheme(stored || preferred)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentVideo(prev => (prev + 1) % videos.length)
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    window.localStorage.setItem('invoplus-theme', theme)
  }, [theme])

  return (
    <section className="relative h-screen w-full overflow-hidden bg-slate-950 text-white">
      <video
        key={videos[currentVideo]}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        loop
        muted
        playsInline
      >
        <source src={videos[currentVideo]} type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-slate-950/60" />
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-b from-transparent to-slate-950" />

      <nav className="absolute top-0 left-0 right-0 z-20 px-6 md:px-10 pt-6 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 bg-slate-900/90 backdrop-blur rounded-full px-4 py-3 border border-white/10">
          <Logo size={28} showText={false} />
          <span className="sr-only">Invoplus</span>
        </Link>

        <div className="hidden md:flex items-center gap-1 bg-slate-900/90 backdrop-blur rounded-full px-3 py-2">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-neutral-300 hover:text-white transition-colors text-sm px-5 py-2 rounded-full"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="bg-white/10 text-white hover:bg-white/20 rounded-full p-3 transition"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <Link
            href="/dashboard"
            className="bg-white text-black text-sm font-semibold rounded-full px-6 py-3 hover:bg-neutral-200 transition-colors"
          >
            get started
          </Link>
        </div>

        <button
          className="md:hidden text-white"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Open mobile menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {mobileMenuOpen && (
        <div className="absolute top-20 left-0 right-0 z-10 bg-slate-950/95 backdrop-blur border-b border-white/10 px-6 py-4 space-y-3 md:hidden">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="block text-neutral-300 hover:text-white transition-colors text-sm font-medium px-4 py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-full flex items-center justify-center gap-2 bg-white/10 text-white hover:bg-white/20 rounded-full px-4 py-3 transition"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {theme === 'dark' ? 'light mode' : 'dark mode'}
          </button>
          <Link
            href="/dashboard"
            className="block w-full text-center bg-white text-black text-sm font-semibold rounded-full px-6 py-3 hover:bg-neutral-200 transition-colors"
            onClick={() => setMobileMenuOpen(false)}
          >
            get started
          </Link>
        </div>
      )}

      <div className="relative h-full w-full">
        <h1 className="absolute left-6 md:left-10 top-[28%] max-w-2xl text-4xl md:text-6xl font-semibold text-white">Secure your cash flow</h1>

        <p className="absolute left-6 md:left-10 top-[42%] max-w-lg text-lg md:text-xl text-white/85">Manage invoices, access funding, and keep cash moving — simple, secure, and fast.</p>

        <div className="absolute left-6 md:left-10 top-[54%] flex items-center gap-3">
          <Link href="/dashboard" className="bg-white text-black text-sm font-semibold rounded-full px-6 py-3 hover:bg-neutral-200 transition-colors">Get started</Link>
          <Link href="#platform" className="text-white/90 text-sm font-medium hover:underline">Learn how it works</Link>
        </div>
      </div>
    </section>
  )
}
