'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Fraunces } from 'next/font/google'
import { Menu, X, Moon, Sun } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'

const fraunces = Fraunces({ subsets: ['latin'], weight: ['500'], style: ['italic'], display: 'swap' })

const navLinks = [
  { label: 'platform', href: '#platform' },
  { label: 'how it works', href: '#how-it-works' },
  { label: 'features', href: '#features' },
  { label: 'support', href: '#support' },
]

// Real numbers pulled directly from the code: max advance rate is the
// Grade A ceiling in lib/risk-engine.ts, auction window is the default
// durationHours in the ListForAuction flow, settlement is 100% on-chain.
const stats = [
  { value: '93%', label: 'Max Advance Rate' },
  { value: '72h', label: 'Auction Window' },
  { value: '100%', label: 'On-Chain Settlement' },
]

// Rendered as separate always-mounted <video> elements crossfaded by opacity,
// instead of swapping a single element's `key`/`src`. Swapping key/src forces
// a full unmount+remount every rotation — the browser has to re-fetch and
// re-decode the whole file from scratch, which is what produced the visible
// freeze/flash ("hanging", "playing twice"). All three stay loaded and
// playing in the background; only the CSS opacity changes.
//
// Transitions are sequential, not simultaneous: the outgoing video fades to
// 0 first, then (after a short gap where nothing is visible but the black
// section background) the incoming one fades in. Cross-fading two different,
// unrelated clips at the same time read as "two videos overlapping" since
// they don't blend into each other narratively — a brief blackout between
// cuts reads as an intentional scene change instead.
const videos = ['/cashflow.mp4', '/invoice.mp4', '/woman.mp4']
const FADE_MS = 700
const HOLD_MS = 9000
const PLAYBACK_RATE = 0.65 // slower, calmer motion than native speed

export function Hero() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [currentVideo, setCurrentVideo] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const stored = window.localStorage.getItem('invoplus-theme') as 'light' | 'dark' | null
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    setTheme(stored || preferred)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false) // fade the current video out
      const swap = setTimeout(() => {
        setCurrentVideo(prev => (prev + 1) % videos.length)
        setVisible(true) // fade the next one in
      }, FADE_MS)
      return () => clearTimeout(swap)
    }, HOLD_MS + FADE_MS)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    window.localStorage.setItem('invoplus-theme', theme)
  }, [theme])

  return (
    <section className="relative min-h-screen w-full overflow-hidden bg-slate-950 text-white">
      {videos.map((src, i) => (
        <video
          key={src}
          ref={el => { if (el) el.playbackRate = PLAYBACK_RATE }}
          className="absolute inset-0 w-full h-full object-cover transition-opacity ease-in-out"
          style={{ opacity: currentVideo === i && visible ? 1 : 0, transitionDuration: `${FADE_MS}ms` }}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
        >
          <source src={src} type="video/mp4" />
        </video>
      ))}

      {/* Scrims: dark at both top (nav legibility) and bottom (content legibility),
          so neither the nav nor the hero copy ever fights the video underneath. */}
      <div className="absolute inset-0 bg-slate-950/60" />
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-slate-950/90 to-transparent" />
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-80 bg-gradient-to-b from-transparent to-slate-950" />

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

      {/* pt-32 reserves clearance under the nav so hero copy never crowds it
          on short viewports; justify-center (not justify-end) keeps the block
          balanced instead of glued to the very bottom edge. */}
      <div className="relative z-10 flex min-h-screen flex-col justify-center px-6 md:px-10 pt-32 pb-16 md:pb-20">
        <h1 className="max-w-3xl text-4xl md:text-6xl lg:text-[4.25rem] font-semibold leading-[1.05] tracking-tight text-white">
          Get paid today.
          <br />
          <span className={`${fraunces.className} italic font-normal text-violet-200`}>Not in 90 days.</span>
        </h1>

        <p className="mt-6 max-w-xl text-base md:text-lg text-white/70 leading-relaxed">
          Turn unpaid invoices into cash in days, not months. List your invoice, let financiers
          compete to fund it, and get paid the instant the winning bid is settled — no paperwork,
          no bank, no waiting.
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
