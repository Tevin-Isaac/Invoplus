'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Header } from '@/components/dashboard/Header'
import { TrendingUp, DollarSign, Award, Clock, EyeOff, ExternalLink, Loader2, Wallet, FileText, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCanton } from '@/lib/canton'

const val = (x: any) => (x && typeof x === 'object' && 'value' in x ? x.value : x)
const num = (x: any) => Number(val(x) ?? 0) || 0
const money = (n: number, ccy = 'USD') => {
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: ccy, maximumFractionDigits: 0 }).format(n) }
  catch { return `$${Math.round(n).toLocaleString()}` }
}

interface Position {
  id: string; invoiceRef: string; debtor: string; faceAmount: number; fundedAmount: number
  advanceRate: number; annualRate: number; currency: string; dueDate: string
  status: 'active' | 'pending' | 'repaid'; cantonRef: string; returnAtRepayment: number
}

const panel = 'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900'

export default function PortfolioPage() {
  const { party } = useCanton()
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'pending' | 'repaid'>('all')

  useEffect(() => {
    if (!party?.id) { setPositions([]); setLoading(false); return }
    let cancelled = false
    setLoading(true)
    const post = async (template: string) => {
      try {
        const res = await fetch('/api/canton/contracts/list', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parties: [party.id], template }),
        })
        const data = await res.json()
        return data.ok ? (data.contracts || []) : []
      } catch { return [] }
    }
    const load = async () => {
      // FundedInvoice is archived the moment repayment completes — without
      // also reading RepaymentConfirmation (the record that survives that),
      // every position vanishes from the portfolio the instant it's repaid.
      const [funded, bids, repayments] = await Promise.all([post('funded'), post('bid'), post('repayment')])
      if (cancelled) return
      const fundedRows: Position[] = funded.map((c: any) => {
        const p = c.payload || {}
        const face = num(p.faceAmount); const fund = num(p.fundedAmount)
        return {
          id: c.contractId, invoiceRef: val(p.invoiceId) || '—', debtor: val(p.debtorName) || '—',
          faceAmount: face, fundedAmount: fund, advanceRate: num(p.advanceRate), annualRate: num(p.annualRate),
          currency: val(p.currency) || 'USD', dueDate: val(p.dueDate) || '', status: 'active',
          cantonRef: c.contractId, returnAtRepayment: Math.max(face - fund, 0),
        }
      })
      const repaidRows: Position[] = repayments.map((c: any) => {
        const p = c.payload || {}
        const fund = num(p.fundedAmount); const total = num(p.totalDue)
        return {
          id: c.contractId, invoiceRef: val(p.invoiceId) || '—', debtor: '—',
          faceAmount: total, fundedAmount: fund, advanceRate: 0, annualRate: 0,
          currency: val(p.currency) || 'USD', dueDate: '', status: 'repaid',
          cantonRef: c.contractId, returnAtRepayment: Math.max(total - fund, 0),
        }
      })
      const bidRows: Position[] = bids.filter((c: any) => !val(c.payload?.isRevealed)).map((c: any) => {
        const p = c.payload || {}
        return {
          id: c.contractId, invoiceRef: val(p.invoiceId) || '—', debtor: 'Sealed — hidden until settlement',
          faceAmount: num(p.faceAmount), fundedAmount: num(p.fundedAmount), advanceRate: num(p.advanceRate),
          annualRate: num(p.annualRate), currency: val(p.currency) || 'USD', dueDate: '', status: 'pending',
          cantonRef: c.contractId, returnAtRepayment: 0,
        }
      })
      setPositions([...fundedRows, ...repaidRows, ...bidRows])
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [party])

  const active = positions.filter(p => p.status === 'active')
  const repaid = positions.filter(p => p.status === 'repaid')
  const capitalDeployed = active.reduce((s, p) => s + p.fundedAmount, 0)
  // Currently outstanding return (still owed) plus what's already been
  // realized from repaid positions — otherwise this reads as $0 the moment
  // every position you've ever funded has been paid back, even though
  // you've genuinely earned real yield, which is exactly what looked like a
  // bug: an all-zero portfolio with real repaid history sitting right there.
  const totalReturn = active.reduce((s, p) => s + p.returnAtRepayment, 0)
  const totalYieldRealized = repaid.reduce((s, p) => s + p.returnAtRepayment, 0)
  const ccy = positions.find(p => p.currency)?.currency || 'USD'

  const stats = [
    { label: 'Capital Deployed (Active)', value: money(capitalDeployed, ccy), icon: DollarSign },
    { label: 'Return Still Owed (Active)', value: money(totalReturn, ccy), icon: Clock, accent: true },
    { label: 'Yield Realized (Repaid)', value: money(totalYieldRealized, ccy), icon: TrendingUp, accent: true },
    { label: 'Positions (Active / Repaid)', value: `${active.length} / ${repaid.length}`, icon: Award },
  ]

  const filtered = filter === 'all' ? positions : positions.filter(p => p.status === filter)

  // Portfolio is a financier concept (capital deployed, sealed bids, yield)
  // — a business's own funded/repaid history already lives on Invoices and
  // Offers. Without this gate, a business sees an all-zero "Capital
  // Deployed" page that reads as broken rather than "not relevant to you."
  if (party?.type === 'business') {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <Header title="Portfolio" />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10">
            <FileText className="h-7 w-7 text-violet-500" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-950 dark:text-white">Portfolio is for financier accounts</p>
            <p className="mt-1 max-w-xs text-xs text-slate-500 dark:text-slate-400">
              Portfolio tracks capital deployed and sealed bids — that's a financier's view. Your own funding history lives on Invoices and Offers.
            </p>
          </div>
          <Link
            href="/dashboard/invoices"
            className="flex items-center gap-1.5 rounded-xl bg-violet-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-violet-500/25 transition-colors hover:bg-violet-600"
          >
            Go to Invoices<ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Header title="Portfolio" />
      <div className="flex-1 space-y-5 overflow-y-auto p-4 md:p-6">

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map(s => {
            const Icon = s.icon
            return (
              <div key={s.label} className={cn(panel, 'p-5')}>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
                    <Icon className="h-4 w-4 text-violet-600 dark:text-violet-300" />
                  </div>
                </div>
                <p className={cn('font-data text-2xl font-bold', s.accent ? 'text-violet-600 dark:text-violet-300' : 'text-slate-950 dark:text-white')}>{loading ? '—' : s.value}</p>
              </div>
            )
          })}
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-violet-500/25 bg-violet-500/[0.06] p-4">
          <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-violet-600 dark:text-violet-300" />
          <div>
            <p className="text-sm font-medium text-slate-950 dark:text-white">Your sealed bids are private Canton contracts</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Pending bids are visible only to you and the InvoPlus platform, not to the seller or other financiers. Enforced by Canton.</p>
          </div>
        </div>

        {/* Positions */}
        <div className={cn(panel, 'overflow-hidden')}>
          <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-950 dark:text-white">Funded Positions</h2>
            <div className="flex gap-1">
              {(['all', 'active', 'pending', 'repaid'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)} className={cn(
                  'rounded-lg px-3 py-1 text-xs font-medium capitalize transition-all',
                  filter === f
                    ? 'bg-violet-500/15 text-violet-700 dark:text-violet-300'
                    : 'text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
                )}>{f}</button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
              <p className="text-sm text-slate-500 dark:text-slate-400">Loading positions from Canton…</p>
            </div>
          ) : !party ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
              <Wallet className="h-6 w-6 text-slate-400 dark:text-slate-500" />
              <p className="text-sm font-medium text-slate-950 dark:text-white">Connect your Canton wallet</p>
              <p className="max-w-xs text-xs text-slate-500 dark:text-slate-400">Connect a financier party to see your funded positions and sealed bids.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
              <TrendingUp className="h-6 w-6 text-slate-400 dark:text-slate-500" />
              <p className="text-sm font-medium text-slate-950 dark:text-white">No positions yet</p>
              <p className="max-w-xs text-xs text-slate-500 dark:text-slate-400">Win a sealed-bid auction in the marketplace and your funded positions will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map(pos => (
                <div key={pos.id} className="p-5 transition-colors hover:bg-violet-500/[0.03]">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className={cn('shrink-0 rounded-md border px-2 py-1 text-xs font-bold',
                        pos.status === 'active'
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          : pos.status === 'repaid'
                            ? 'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300'
                            : 'border-slate-300/30 bg-slate-500/10 text-slate-600 dark:text-slate-300')}>
                        {pos.status === 'active' ? 'Funded' : pos.status === 'repaid' ? 'Repaid' : 'Sealed'}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-950 dark:text-white">{pos.invoiceRef}</p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{pos.debtor}</p>
                        {pos.dueDate && <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">Due {pos.dueDate}</p>}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-6 text-right">
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Face Value</p>
                        <p className="font-data text-sm font-semibold text-slate-950 dark:text-white">{money(pos.faceAmount, pos.currency)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Advance Rate</p>
                        <p className="font-data text-sm font-semibold text-slate-950 dark:text-white">{(pos.advanceRate * 100).toFixed(0)}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Annual Rate</p>
                        <p className="font-data text-sm font-semibold text-violet-600 dark:text-violet-300">{(pos.annualRate * 100).toFixed(1)}%</p>
                      </div>
                      {(pos.status === 'active' || pos.status === 'repaid') && (
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{pos.status === 'repaid' ? 'Yield Earned' : 'Return at Repayment'}</p>
                          <p className="font-data text-sm font-semibold text-violet-600 dark:text-violet-300">{money(pos.returnAtRepayment, pos.currency)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5">
                    <span className="font-data max-w-[280px] truncate text-xs text-slate-400 dark:text-slate-500">{pos.cantonRef}</span>
                    <ExternalLink className="h-3 w-3 shrink-0 text-slate-400 dark:text-slate-500" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
