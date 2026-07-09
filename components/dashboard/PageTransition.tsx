'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { LoadingScreen } from '@/components/brand/LoadingScreen'

// Next.js's route-level loading.tsx only fires for an actual Suspense
// boundary (a Server Component awaiting data) — every dashboard page here is
// a 'use client' component that mounts instantly and fetches its own data
// client-side, so loading.tsx never shows during in-app navigation, only on
// a cold full-page load. This gives every sidebar click the same branded
// transition instead of an abrupt swap.
export function PageTransition() {
  const pathname = usePathname()
  const [show, setShow] = useState(false)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    setShow(true)
    const timer = setTimeout(() => setShow(false), 450)
    return () => clearTimeout(timer)
  }, [pathname])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <LoadingScreen label="Loading…" />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
