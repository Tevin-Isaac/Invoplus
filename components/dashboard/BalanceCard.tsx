'use client'

import { useEffect, useState } from 'react'
import { CircleDollarSign, Loader2 } from 'lucide-react'
import { useCanton } from '@/lib/canton'

/**
 * Prominent balance showcase for a dashboard page — the compact chip in the
 * Header is easy to miss, and financiers/businesses both need to see this
 * balance is real and moves on Canton, not just a number in a corner.
 */
export function BalanceCard() {
  const { party } = useCanton()
  const [balance, setBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!party?.id) { setBalance(null); setLoading(false); return }
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/canton/contracts/balance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ partyId: party.id, role: party.type }),
        })
        const data = await res.json()
        if (!cancelled && data.ok) setBalance(data.amount)
      } catch { /* keep last known value */ } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    const interval = setInterval(load, 15000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [party?.id, party?.type])

  if (!party) return null

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-5">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
        <CircleDollarSign className="h-6 w-6 text-emerald-600 dark:text-emerald-300" />
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-emerald-700/70 dark:text-emerald-300/70">
          {party.type === 'financier' ? 'Available capital to deploy' : 'Available balance'}
        </p>
        {loading ? (
          <Loader2 className="mt-1 h-5 w-5 animate-spin text-emerald-500" />
        ) : (
          <p className="font-data text-2xl font-bold text-emerald-700 dark:text-emerald-300">
            ${(balance ?? 0).toLocaleString()} <span className="text-sm font-medium text-emerald-600/70 dark:text-emerald-400/70">USD</span>
          </p>
        )}
        <p className="mt-0.5 text-[11px] text-emerald-700/60 dark:text-emerald-300/60">
          A real Canton contract — demo balance, not USDC or real currency. Moves atomically on settlement and repayment.
        </p>
      </div>
    </div>
  )
}
