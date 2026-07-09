'use client'

import { motion } from 'framer-motion'
import { Logo } from '@/components/brand/Logo'

// The branded loading moment — used both as Next.js's route-level Suspense
// fallback (app/loading.tsx, app/dashboard/loading.tsx) and as the app's
// cold-boot splash (AppBootSplash). Same visual either way: the InvoPlus
// mark breathing inside a slowly rotating gradient ring, not a generic
// spinner, so "the app is thinking" reads as intentional and on-brand.
export function LoadingScreen({ label = 'Loading InvoPlus…' }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center gap-6 bg-white dark:bg-slate-950">
      <div className="relative flex h-24 w-24 items-center justify-center">
        {/* Rotating gradient ring */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'conic-gradient(from 0deg, transparent, #14B892, transparent 60%)',
            maskImage: 'radial-gradient(closest-side, transparent 76%, black 78%)',
            WebkitMaskImage: 'radial-gradient(closest-side, transparent 76%, black 78%)',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
        />
        {/* Soft breathing glow behind the mark */}
        <motion.div
          className="absolute h-14 w-14 rounded-full bg-emerald-400/30 blur-xl"
          animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          className="relative"
        >
          <Logo size={40} showText={false} />
        </motion.div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <p className="font-data text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{label}</p>
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <motion.span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-emerald-500"
              animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
              transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
