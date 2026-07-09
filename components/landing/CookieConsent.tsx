'use client'

import { useEffect, useState } from 'react'
import { Cookie, X } from 'lucide-react'

const STORAGE_KEY = 'invoplus-cookie-consent'

// No real cookie/analytics integrations are wired up yet — this only
// records the user's choice locally so the banner doesn't reappear. When
// real analytics/tracking is added later, gate it on
// localStorage.getItem('invoplus-cookie-consent') === 'accepted'.
export function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(STORAGE_KEY)) setVisible(true)
    } catch { /* storage unavailable — don't block on it */ }
  }, [])

  const choose = (value: 'accepted' | 'declined') => {
    try { window.localStorage.setItem(STORAGE_KEY, value) } catch { /* unavailable */ }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-4 md:p-6">
      <div className="mx-auto flex max-w-3xl flex-col items-start gap-4 rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-2xl backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/95 md:flex-row md:items-center">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/10">
            <Cookie className="h-4 w-4 text-violet-600 dark:text-violet-300" />
          </span>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            This site uses cookies to enhance your experience. By continuing to browse, you agree to our use of cookies.
          </p>
        </div>
        <div className="flex w-full shrink-0 items-center gap-2 md:w-auto">
          <button
            onClick={() => choose('declined')}
            className="flex-1 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-white/5 md:flex-none"
          >
            Decline
          </button>
          <button
            onClick={() => choose('accepted')}
            className="flex-1 rounded-full bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-600 md:flex-none"
          >
            Accept
          </button>
          <button
            onClick={() => choose('declined')}
            className="hidden shrink-0 text-slate-400 hover:text-slate-950 dark:hover:text-white md:block"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
