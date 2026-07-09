'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { LoadingScreen } from '@/components/brand/LoadingScreen'

const MIN_DISPLAY_MS = 550

// The rest of the app mounts underneath immediately (nothing is blocked) —
// this just overlays the branded loader for a minimum stretch so the first
// thing anyone sees on a cold visit is intentional, not a blank flash
// followed by content popping in.
export function AppBootSplash({ children }: { children: React.ReactNode }) {
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    const id = setTimeout(() => setBooting(false), MIN_DISPLAY_MS)
    return () => clearTimeout(id)
  }, [])

  return (
    <>
      {children}
      <AnimatePresence>
        {booting && (
          <motion.div
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
          >
            <LoadingScreen label="Loading InvoPlus…" />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
