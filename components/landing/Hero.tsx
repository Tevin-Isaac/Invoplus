'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Fraunces } from 'next/font/google'
import { Menu, X, Moon, Sun, Lock, Zap, ShieldCheck } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'

const fraunces = Fraunces({ subsets: ['latin'], weight: ['500'], style: ['italic'], display: 'swap' })

const navLinks = [
  { label: 'platform', href: '#platform' },
  { label: 'how it works', href: '#how-it-works' },
  { label: 'features', href: '#features' },
  { label: 'support', href: '#support' },
]

// Real architectural guarantees — not marketing copy. Each maps to a Daml
// choice/template that actually enforces it on the ledger (see HowItWorks).
const pills = [
  { icon: Lock, label: 'Sealed-Bid Privacy' },
  { icon: Zap, label: 'Atomic Settlement' },
  { icon: ShieldCheck, label: 'Anti-Fraud Registry' },
]

// Verified against the current daml/InvoPlus source tree — update these if
// the module/template count changes.
const stats = [
  { value: '8', label: 'Daml Modules' },
  { value: '26', label: 'Contract Templates' },
  { value: '100%', label: 'On-Chain Settlement' },
]

export function Hero() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [currentVideo, setCurrentVideo] = useState(0)
  const videos = ['/cashflow.mp4', '/invoice.mp4', '/woman.mp4']

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
    <section className="relative min-h-screen w-full overflow-hidden bg-slate-950 text-white">
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

      <div className="absolute inset-0 bg-slate-950/70" />
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-b from-transparent to-slate-950" />

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
            launch app
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
            launch app
          </Link>
        </div>
      )}

      <div className="relative z-10 flex min-h-screen flex-col justify-end px-6 md:px-10 pb-10 md:pb-14">
        {/* Feature pills — each maps to a real Daml guarantee, not copy */}
        <div className="flex flex-wrap items-center gap-2.5 mb-6">
          {pills.map((p) => {
            const Icon = p.icon
            return (
              <span
                key={p.label}
                className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 backdrop-blur px-3.5 py-1.5 text-xs text-white/90"
              >
                <Icon className="w-3.5 h-3.5 text-violet-300" />
                {p.label}
              </span>
            )
          })}
        </div>

        <h1 className="max-w-3xl text-4xl md:text-6xl lg:text-[4.25rem] font-semibold leading-[1.05] tracking-tight text-white">
          Sealed-bid invoice{' '}
          <span className={`${fraunces.className} italic font-normal text-violet-200`}>financing</span>
          {' '}on Canton Network
        </h1>

        <p className="mt-6 max-w-xl text-base md:text-lg text-white/75 leading-relaxed">
          Businesses turn unpaid invoices into cash by auctioning them to financiers who bid blind.
          Every bid is a private Canton contract the seller cannot see until settlement — and settlement
          is atomic, so there's no partial state and no double-financing.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="/dashboard" className="bg-white text-black text-sm font-semibold rounded-full px-6 py-3.5 hover:bg-neutral-200 transition-colors">
            Launch App
          </Link>
          <a href="#how-it-works" className="text-white/90 text-sm font-medium hover:underline">See how it works</a>
        </div>

        {/* Stats — verified against the current Daml source tree */}
        <div className="mt-12 grid grid-cols-3 max-w-lg gap-6 border-t border-white/10 pt-6">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="font-data text-2xl md:text-3xl font-bold text-white">{s.value}</p>
              <p className="mt-1 text-xs text-white/50 uppercase tracking-wide">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
