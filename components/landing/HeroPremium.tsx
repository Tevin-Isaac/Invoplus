'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRightCircle, Zap, LockKeyhole, Fingerprint, Menu, X } from 'lucide-react'
import { useCanton } from '@/lib/canton'
import { WalletConnect } from '@/components/wallet-connect'

// Logo SVG Component - Just the icon
function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 200 200" fill="#7342E2" xmlns="http://www.w3.org/2000/svg">
      <path d="M60 80c0-22.09 17.91-40 40-40s40 17.91 40 40v20H60V80zm50-40c-27.61 0-50 22.39-50 50v20h100V90c0-27.61-22.39-50-50-50z"/>
      <path d="M140 120c22.09 0 40 17.91 40 40s-17.91 40-40 40-40-17.91-40-40v-20h40zm-30 40c0 27.61 22.39 50 50 50s50-22.39 50-50v-20H110v20z"/>
      <circle cx="100" cy="100" r="12" fill="#7342E2"/>
    </svg>
  )
}

// Navbar Component
function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { isConnected, connectWithWallet } = useCanton()

  const navLinks = ['Features', 'Pricing', 'Blog']

  const handleGetStarted = () => {
    if (isConnected) {
      window.location.href = '/dashboard'
    } else {
      // Trigger wallet connection dialog
      const walletButton = document.querySelector('[data-wallet-connect-trigger]') as HTMLButtonElement
      walletButton?.click()
    }
  }

  return (
    <>
      {/* Desktop Navbar */}
      <nav className="relative z-10 mx-auto max-w-5xl px-5 sm:px-8 py-4 sm:py-5 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="font-semibold text-lg" style={{ color: 'var(--color-text)' }}>Invoplus</span>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link}
              href="#"
              className="text-sm font-medium transition-opacity hover:opacity-70"
              style={{ color: 'var(--color-text)' }}
            >
              {link}
            </Link>
          ))}
        </div>

        {/* Desktop CTA Button */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={handleGetStarted}
            className="text-sm font-semibold px-6 py-2.5 rounded-full transition-all hover:shadow-lg active:scale-95"
            style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
          >
            {isConnected ? 'Go to Dashboard' : 'Get Started'}
          </button>
          {/* Hidden WalletConnect trigger */}
          <div className="hidden">
            <WalletConnect 
              onConnect={connectWithWallet}
              onDisconnect={() => window.location.href = '/'}
              isConnected={isConnected}
            />
          </div>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{ color: 'var(--color-text)' }}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-40"
              style={{ backgroundColor: 'rgba(25, 40, 55, 0.35)', backdropFilter: 'blur(4px)' }}
              onClick={() => setMobileOpen(false)}
            />

            {/* Sheet */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{
                duration: 0.45,
                ease: [0.22, 1, 0.36, 1],
                exit: { duration: 0.35, ease: [0.55, 0, 1, 0.45] },
              }}
              className="fixed right-0 top-0 z-50 h-screen p-6 flex flex-col"
              style={{
                width: `min(88vw, 360px)`,
                height: '100dvh',
                backgroundColor: '#CFC8C5',
                boxShadow: '-12px 0 48px rgba(25, 40, 55, 0.18)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Logo />
                  <span className="font-semibold" style={{ color: 'var(--color-text)' }}>Invoplus</span>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setMobileOpen(false)}
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(25, 40, 55, 0.1)' }}
                >
                  <X size={20} style={{ color: 'var(--color-text)' }} />
                </motion.button>
              </div>

              {/* Divider */}
              <div
                className="h-px mx-6 mb-6"
                style={{ backgroundColor: 'rgba(25, 40, 55, 0.12)' }}
              />

              {/* Nav Links */}
              <div className="space-y-3 mb-8">
                {navLinks.map((link, i) => (
                  <motion.div
                    key={link}
                    initial={{ x: 24, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{
                      delay: 0.18 + i * 0.07,
                      duration: 0.4,
                    }}
                  >
                    <Link
                      href="#"
                      className="block px-4 py-3 rounded-xl transition-all"
                      style={{
                        fontSize: '1.1rem',
                        color: 'var(--color-text)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.1)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {link}
                    </Link>
                  </motion.div>
                ))}
              </div>

              {/* CTA Button */}
              <div>
                <button
                  onClick={handleGetStarted}
                  className="w-full py-3.5 rounded-full font-semibold"
                  style={{
                    backgroundColor: 'var(--color-accent)',
                    color: 'white',
                    fontSize: '0.95rem',
                  }}
                >
                  {isConnected ? 'Go to Dashboard' : 'Get Started'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

// Hero Section
function HeroContent() {
  const { isConnected, connectWithWallet } = useCanton()
  const [showWalletDialog, setShowWalletDialog] = useState(false)

  const fadeUp = {
    hidden: { opacity: 0, y: 28 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.15,
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1],
      },
    }),
  }

  const handleStartFree = () => {
    if (isConnected) {
      window.location.href = '/dashboard'
    } else {
      setShowWalletDialog(true)
    }
  }

  const handleWalletConnect = async (provider: any) => {
    await connectWithWallet(provider)
    setShowWalletDialog(false)
    // Redirect to dashboard after successful connection
    setTimeout(() => {
      window.location.href = '/dashboard'
    }, 500)
  }

  return (
    <section
      className="relative w-full min-h-screen overflow-hidden"
      style={{
        backgroundColor: '#FFFFFF',
      }}
    >
      {/* Background Video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 z-0 w-full h-full object-cover"
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260606_131516_eca35265-ea66-4fbd-8d52-22aae6e1a503.mp4"
      />

      {/* Navbar */}
      <Navbar />

      {/* Hero Content */}
      <div className="relative z-10 mx-auto max-w-5xl px-5 sm:px-8 pt-[clamp(40px,8vw,72px)] pb-12 flex flex-col items-center justify-center">
        <div className="w-full max-w-[660px] mx-auto">
          {/* Heading */}
          <motion.h1
            custom={0}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="text-center leading-[1.05] tracking-tight mb-6"
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(1.65rem, 5vw, 3rem)',
              color: 'var(--color-text)',
              letterSpacing: '-0.01em',
            }}
          >
            <div className="mb-2">
              Get Paid Fast{' '}
              <Zap
                size={24}
                style={{
                  display: 'inline',
                  verticalAlign: 'middle',
                  position: 'relative',
                  top: '-2px',
                  margin: '0 4px',
                  color: 'var(--color-text)',
                }}
              />
            </div>
            <div>
              Professional Invoicing Made Simple{' '}
              <Fingerprint
                size={24}
                style={{
                  display: 'inline',
                  verticalAlign: 'middle',
                  position: 'relative',
                  top: '-2px',
                  marginLeft: '6px',
                  color: 'var(--color-text)',
                }}
              />
            </div>
          </motion.h1>

          {/* Subtext */}
          <motion.p
            custom={1}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="text-center mb-8 mx-auto"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)',
              color: 'var(--color-text)',
              opacity: 0.8,
              maxWidth: '560px',
              lineHeight: 1.65,
            }}
          >
            Create invoices, send to clients, track payments, and get paid faster. All in one place.
          </motion.p>

          {/* CTA Button */}
          <motion.div
            custom={2}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="flex items-center justify-center"
          >
            <motion.button
              onClick={handleStartFree}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="flex items-center justify-between gap-8 px-6 py-[17px] rounded-full font-semibold transition-all"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: 'white',
                fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                minWidth: '210px',
                boxShadow: '0 4px 24px rgba(115, 66, 226, 0.28)',
                filter: 'brightness(1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.filter = 'brightness(1.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = 'brightness(1)'
              }}
            >
              {isConnected ? 'Go to Dashboard' : 'Start Free'}
              <ArrowRightCircle size={20} />
            </motion.button>
          </motion.div>

          {/* Wallet Connection Dialog */}
          {showWalletDialog && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">Connect Canton Wallet</h3>
                    <p className="text-xs text-slate-600 mt-0.5">Select a CIP-103 compliant wallet to get started</p>
                  </div>
                  <button 
                    onClick={() => setShowWalletDialog(false)}
                    className="text-slate-600 hover:text-slate-900"
                  >
                    <X size={20} />
                  </button>
                </div>
                <WalletConnect 
                  onConnect={handleWalletConnect}
                  onDisconnect={() => setShowWalletDialog(false)}
                  isConnected={isConnected}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export function HeroPremium() {
  return <HeroContent />
}
