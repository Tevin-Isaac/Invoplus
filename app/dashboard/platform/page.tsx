'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/dashboard/Header'
import { Landmark, TrendingUp, Users, Store, Loader2, Wallet, Percent } from 'lucide-react'
import { cn } from '@/lib/utils'

const panel = 'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900'
const fmtUSD = (n: number) => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${Math.round(n)}`

interface Stats {
  platformBalance: number
  estimatedLifetimeRevenue: number
  feeRate: number
  totalRepayments: number
  totalVolumeRepaid: number
  totalYieldGenerated: number
  activeFundedPositions: number
  activeFundedVolume: number
  totalFundedEver: number
  totalFundedVolumeEver: number
  activeAuctions: number
  totalInvoicesListed: number
  uniqueParties: number
}

export default function PlatformPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/canton/platform-stats')
        const data = await res.json()
        if (cancelled) return
        if (data.ok) { setStats(data); setError(null) }
        else setError(data.error ?? 'Failed to load platform stats')
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Network error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    const interval = setInterval(load, 30000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Header title="Platform" />
      <div className="flex-1 space-y-5 overflow-y-auto p-4 md:p-6">

        <div className="flex items-start gap-3 rounded-2xl border border-violet-500/25 bg-violet-500/[0.06] p-4">
          <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-violet-600 dark:text-violet-300" />
          <div>
            <p className="text-sm font-medium text-slate-950 dark:text-white">How InvoPlus makes money</p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              A {stats ? (stats.feeRate * 100).toFixed(0) : '10'}% servicing fee on the financier's yield, taken at repayment — the seller's advance and total amount repaid are never touched, only how the repayment is split between the financier and InvoPlus. This page is platform-wide across every user, not just you.
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300">{error}</div>
        )}

        {loading && !stats ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading platform stats from Canton…</p>
          </div>
        ) : stats && (
          <>
            {/* Revenue */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className={cn(panel, 'p-5')}>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Platform Balance</p>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10"><Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-300" /></span>
                </div>
                <p className="font-data text-2xl font-bold text-emerald-600 dark:text-emerald-300">{fmtUSD(stats.platformBalance)}</p>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Real fee revenue collected, on-ledger</p>
              </div>
              <div className={cn(panel, 'p-5')}>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Est. Lifetime Revenue</p>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10"><TrendingUp className="h-4 w-4 text-violet-600 dark:text-violet-300" /></span>
                </div>
                <p className="font-data text-2xl font-bold text-slate-950 dark:text-white">{fmtUSD(stats.estimatedLifetimeRevenue)}</p>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{(stats.feeRate * 100).toFixed(0)}% of all yield ever generated</p>
              </div>
              <div className={cn(panel, 'p-5')}>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Fee Rate</p>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10"><Percent className="h-4 w-4 text-violet-600 dark:text-violet-300" /></span>
                </div>
                <p className="font-data text-2xl font-bold text-slate-950 dark:text-white">{(stats.feeRate * 100).toFixed(0)}%</p>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">of financier yield, at repayment</p>
              </div>
            </div>

            {/* Volume */}
            <div className={cn(panel, 'p-5 md:p-6')}>
              <h3 className="mb-4 text-sm font-semibold text-slate-950 dark:text-white">Platform Volume</h3>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Total Volume Financed (ever)</p>
                  <p className="font-data mt-1 text-xl font-bold text-slate-950 dark:text-white">{fmtUSD(stats.totalFundedVolumeEver)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Currently Funded (open)</p>
                  <p className="font-data mt-1 text-xl font-bold text-slate-950 dark:text-white">{fmtUSD(stats.activeFundedVolume)}</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">{stats.activeFundedPositions} position{stats.activeFundedPositions === 1 ? '' : 's'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Repaid in Full</p>
                  <p className="font-data mt-1 text-xl font-bold text-slate-950 dark:text-white">{fmtUSD(stats.totalVolumeRepaid)}</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">{stats.totalRepayments} repayment{stats.totalRepayments === 1 ? '' : 's'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Total Yield Generated</p>
                  <p className="font-data mt-1 text-xl font-bold text-violet-600 dark:text-violet-300">{fmtUSD(stats.totalYieldGenerated)}</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">earned by financiers, pre-fee</p>
                </div>
              </div>
            </div>

            {/* Activity */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className={cn(panel, 'p-5')}>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Live Auctions</p>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10"><Store className="h-4 w-4 text-violet-600 dark:text-violet-300" /></span>
                </div>
                <p className="font-data text-2xl font-bold text-slate-950 dark:text-white">{stats.activeAuctions}</p>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">sealed-bid, in progress</p>
              </div>
              <div className={cn(panel, 'p-5')}>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Invoices Listed (ever)</p>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10"><Landmark className="h-4 w-4 text-violet-600 dark:text-violet-300" /></span>
                </div>
                <p className="font-data text-2xl font-bold text-slate-950 dark:text-white">{stats.totalInvoicesListed}</p>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">across every seller</p>
              </div>
              <div className={cn(panel, 'p-5')}>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Parties on InvoPlus</p>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10"><Users className="h-4 w-4 text-violet-600 dark:text-violet-300" /></span>
                </div>
                <p className="font-data text-2xl font-bold text-slate-950 dark:text-white">{stats.uniqueParties}</p>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">businesses + financiers, provisioned</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
