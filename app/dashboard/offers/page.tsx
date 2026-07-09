'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/dashboard/Header'
import { Lock, CheckCircle, XCircle, EyeOff, Zap, Loader2, AlertTriangle, Tag, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCanton } from '@/lib/canton'
import { useNotifications } from '@/lib/notifications'

interface MyOffer {
  id: string
  auctionId: string
  buyer: string
  invoiceAmount: number
  advanceRate: number
  annualRate: number
  netToSeller: number
  estimatedYield: number
  status: 'won' | 'pending' | 'lost' | 'withdrawn' | 'repaid'
  closedAt: string | null
  cantonRef: string
  bidContractId: string
  dueDate: string | null
  overdue: boolean
}

const statusConfig = {
  // FundedInvoice (the source for 'won') is archived the moment the seller's
  // repayment completes — 'repaid' is sourced from RepaymentConfirmation,
  // the only template that survives that, so a won position doesn't just
  // vanish from history once it's paid back.
  repaid:    { label: 'Repaid',    icon: CheckCircle, color: 'text-violet-700 bg-violet-500/10 border-violet-500/25 dark:text-violet-300',       note: 'Principal + yield received in full' },
  won:       { label: 'Won',       icon: CheckCircle, color: 'text-emerald-700 bg-emerald-500/10 border-emerald-500/25 dark:text-emerald-300', note: 'Settlement complete · Atomic on InvoPlus' },
  pending:   { label: 'Sealed',    icon: EyeOff,      color: 'text-violet-700 bg-violet-500/10 border-violet-500/25 dark:text-violet-300',     note: 'Awaiting auction close · Only you can see this bid' },
  lost:      { label: 'Lost',      icon: XCircle,     color: 'text-slate-500 bg-slate-500/10 border-slate-500/25 dark:text-slate-400',          note: 'Outbid · Your bid content stayed private' },
  withdrawn: { label: 'Withdrawn', icon: XCircle,     color: 'text-red-700 bg-red-500/10 border-red-500/25 dark:text-red-300',                  note: 'You withdrew this bid before settlement' },
}

const panel = 'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900'

export default function OffersPage() {
  const { party } = useCanton()
  const { notify } = useNotifications()
  // Real ledger contracts only — starts empty until a party connects.
  const [offers, setOffers] = useState<MyOffer[]>([])
  const [loading, setLoading] = useState(true)
  const [withdrawing, setWithdrawing] = useState<string | null>(null)
  const [withdrawError, setWithdrawError] = useState<string | null>(null)

  const won = offers.filter(o => o.status === 'won' || o.status === 'repaid')
  const totalDeployed = won.reduce((s, o) => s + o.netToSeller, 0)
  const totalYield = won.reduce((s, o) => s + o.estimatedYield, 0)

  const handleWithdraw = async (offer: MyOffer) => {
    if (!party?.id) { setWithdrawError('Connect your Canton identity first.'); return }
    setWithdrawing(offer.id)
    setWithdrawError(null)
    try {
      const res = await fetch('/api/canton/contracts/withdraw-bid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          financierPartyId: party.id,
          bidContractId: offer.bidContractId,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setOffers(prev => prev.map(o => o.id === offer.id ? { ...o, status: 'withdrawn' as const } : o))
        notify('withdraw', 'Bid withdrawn', `Your sealed bid on ${offer.auctionId} was withdrawn before settlement.`)
      } else {
        setWithdrawError(data.error ?? 'Withdrawal failed')
      }
    } catch (e) {
      setWithdrawError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setWithdrawing(null)
    }
  }

  useEffect(() => {
    if (!party?.id) { setOffers([]); setLoading(false); return }

    const vv = (x: any) => (x && typeof x === 'object' && 'value' in x ? x.value : x)

    const load = async () => {
      setLoading(true)
      try {
        const [bidRes, fundedRes, repaymentRes] = await Promise.all([
          fetch('/api/canton/contracts/list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ parties: [party.id], template: 'bid' }),
          }).then(r => r.json()),
          fetch('/api/canton/contracts/list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ parties: [party.id], template: 'funded' }),
          }).then(r => r.json()),
          fetch('/api/canton/contracts/list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ parties: [party.id], template: 'repayment' }),
          }).then(r => r.json()),
        ])
        const now = Date.now()
        const rows: MyOffer[] = []

        // Winning bids are archived by Daml's SettleWin choice (default
        // consuming semantics, no replacement record) — they vanish from
        // the ledger entirely, so "won" can never be derived from the bid
        // template surviving a page reload. FundedInvoice is the record
        // that actually persists and has everything needed (the financier
        // is a signatory on it), so "won" rows come from there instead —
        // this also gives an exact yield instead of an estimate, and the
        // real due date for the overdue check.
        if (fundedRes.ok) {
          for (const c of fundedRes.contracts || []) {
            const p = c.payload || {}
            if (vv(p.financier) !== party.id) continue
            const dueDate = String(vv(p.dueDate) ?? '') || null
            const faceAmount = Number(vv(p.faceAmount) ?? 0)
            const fundedAmount = Number(vv(p.fundedAmount) ?? 0)
            rows.push({
              id: c.contractId,
              auctionId: String(vv(p.invoiceId) ?? ''),
              buyer: String(vv(p.seller) ?? 'seller'),
              invoiceAmount: faceAmount,
              advanceRate: Math.round((Number(vv(p.advanceRate) ?? 0)) * 100),
              annualRate: Math.round((Number(vv(p.annualRate) ?? 0)) * 100),
              netToSeller: fundedAmount,
              estimatedYield: Math.round(faceAmount - fundedAmount),
              status: 'won',
              closedAt: String(vv(p.settledAt) ?? '') || null,
              cantonRef: c.contractId,
              bidContractId: c.contractId,
              dueDate,
              overdue: !!dueDate && new Date(dueDate).getTime() < now,
            })
          }
        }

        // Repaid — RepaymentConfirmation is the only record that survives
        // once a won position's FundedInvoice is archived by repayment, so
        // it's the only place a completed position's history can come from.
        if (repaymentRes.ok) {
          for (const c of repaymentRes.contracts || []) {
            const p = c.payload || {}
            if (vv(p.financier) !== party.id) continue
            const totalDue = Number(vv(p.totalDue) ?? 0)
            const fundedAmount = Number(vv(p.fundedAmount) ?? 0)
            rows.push({
              id: c.contractId,
              auctionId: String(vv(p.invoiceId) ?? ''),
              buyer: String(vv(p.seller) ?? 'seller'),
              invoiceAmount: fundedAmount,
              advanceRate: 0,
              annualRate: 0,
              netToSeller: fundedAmount,
              estimatedYield: Math.round(totalDue - fundedAmount),
              status: 'repaid',
              closedAt: String(vv(p.completedAt) ?? '') || null,
              cantonRef: c.contractId,
              bidContractId: c.contractId,
              dueDate: null,
              overdue: false,
            })
          }
        }

        // Still-open sealed bids — the only bid-template state that
        // reliably survives a reload, since it hasn't been archived yet.
        if (bidRes.ok) {
          for (const c of bidRes.contracts || []) {
            const p = c.payload || {}
            const face = Number(p.faceAmount?.value ?? p.faceAmount ?? 0)
            const advance = Number(p.advanceRate?.value ?? p.advanceRate ?? 0)
            const annual = Number(p.annualRate?.value ?? p.annualRate ?? 0)
            rows.push({
              id: c.contractId,
              auctionId: p.invoiceId?.value ?? p.invoiceId ?? '',
              buyer: p.seller?.value ?? p.seller ?? 'seller',
              invoiceAmount: face,
              advanceRate: Math.round(advance * 100),
              annualRate: Math.round(annual * 100),
              netToSeller: Math.round(face * advance),
              estimatedYield: Math.round(face * advance * annual),
              status: 'pending',
              closedAt: null,
              cantonRef: c.contractId,
              bidContractId: c.contractId,
              dueDate: null,
              overdue: false,
            })
          }
        }

        setOffers(rows)
      } catch { /* keep empty */ } finally {
        setLoading(false)
      }
    }

    load()
    // A bid you just placed should show up here without a manual refresh —
    // poll periodically rather than relying on the one-shot mount fetch,
    // the same pattern the marketplace page uses for auctions.
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [party])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Header title="My Offers" />
      <div className="flex-1 space-y-5 overflow-y-auto p-4 md:p-6">

        <div className="flex items-center gap-3 rounded-2xl border border-violet-500/25 bg-violet-500/[0.06] px-5 py-3">
          <EyeOff className="h-4 w-4 shrink-0 text-violet-600 dark:text-violet-300" />
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Your sealed bids are private Canton contracts — other financiers cannot see your offers at any point.
            Losing bid contents remain sealed forever.
          </p>
        </div>

        {withdrawError && (
          <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <p className="text-xs text-red-600 dark:text-red-300">{withdrawError}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: 'Total Bids', value: offers.length.toString() },
            { label: 'Bids Won', value: won.length.toString() },
            { label: 'Capital Deployed', value: `$${totalDeployed.toLocaleString()}` },
            { label: 'Total Yield (est.)', value: `$${totalYield.toLocaleString()}` },
          ].map(s => (
            <div key={s.label} className={cn(panel, 'p-5')}>
              <p className="font-data mb-1 text-2xl font-bold text-slate-950 dark:text-white">{loading ? '—' : s.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Offers list — aligned table on desktop, stacked cards on mobile
            (same pattern as the Invoices page) instead of a flex-wrap row
            that reflowed differently per card and read as "scattered". */}
        <div className={cn(panel, 'overflow-hidden')}>
          <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-950 dark:text-white">All Offers</h2>
          </div>

          <div className="hidden grid-cols-[1.4fr_1fr_0.8fr_0.8fr_1fr_1fr] gap-4 border-b border-slate-100 px-5 py-3 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500 dark:border-slate-800 dark:text-slate-400 md:grid">
            <span>Auction / Buyer</span><span>Invoice Value</span>
            <span>Advance</span><span>Rate</span><span>Status</span><span>Action</span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
              <p className="text-sm text-slate-500 dark:text-slate-400">Loading bids from Canton…</p>
            </div>
          ) : !party ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
              <Wallet className="h-6 w-6 text-slate-400 dark:text-slate-500" />
              <p className="text-sm font-medium text-slate-950 dark:text-white">Connect your Canton wallet</p>
              <p className="max-w-xs text-xs text-slate-500 dark:text-slate-400">Your sealed bids are read from the ledger. Connect a financier party to see them.</p>
            </div>
          ) : offers.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
              <Tag className="h-6 w-6 text-slate-400 dark:text-slate-500" />
              <p className="text-sm font-medium text-slate-950 dark:text-white">No bids yet</p>
              <p className="max-w-xs text-xs text-slate-500 dark:text-slate-400">Place a sealed bid in the marketplace and it appears here as a private contract.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {offers.map(offer => {
                const sc = statusConfig[offer.status]
                const Icon = sc.icon
                const isPending = offer.status === 'pending'
                return (
                  <div key={offer.id} className={cn(
                    'grid grid-cols-1 gap-3 px-5 py-4 transition-colors hover:bg-violet-500/[0.04] md:grid-cols-[1.4fr_1fr_0.8fr_0.8fr_1fr_1fr] md:items-center md:gap-4',
                    offer.overdue && 'border-l-2 border-l-red-500 bg-red-500/[0.03]'
                  )}>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">{offer.buyer}</p>
                      <p className="font-data truncate text-xs text-slate-400 dark:text-slate-500">{offer.auctionId}</p>
                    </div>
                    <span className="font-data text-sm font-semibold text-slate-950 dark:text-white">
                      <span className="mr-2 text-[10px] uppercase text-slate-400 md:hidden">Invoice</span>${offer.invoiceAmount.toLocaleString()}
                    </span>
                    <span className="font-data flex items-center gap-1 text-sm font-semibold text-slate-950 dark:text-white">
                      <Lock className="h-3 w-3 text-slate-400 md:hidden" />{offer.advanceRate}%
                    </span>
                    <span className="font-data text-sm font-semibold text-slate-950 dark:text-white">{offer.annualRate}%</span>
                    <div>
                      <span className={cn('inline-flex w-fit items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium', sc.color)}>
                        <Icon className="h-3 w-3" />{sc.label}
                      </span>
                      <p className="mt-1 hidden text-[11px] leading-snug text-slate-500 dark:text-slate-400 md:block">{sc.note}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {offer.status === 'won' && (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          <Zap className="h-3.5 w-3.5" />+${offer.estimatedYield.toLocaleString()}
                        </span>
                      )}
                      {offer.overdue && (
                        <span className="flex items-center gap-1 rounded-lg bg-red-500/10 px-2 py-1 text-[10px] font-semibold uppercase text-red-600 dark:text-red-300" title="Past due date — the seller hasn't marked this repaid yet">
                          <AlertTriangle className="h-3 w-3" />Overdue
                        </span>
                      )}
                      {isPending && (
                        <button
                          onClick={() => handleWithdraw(offer)}
                          disabled={withdrawing === offer.id}
                          className="flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                        >
                          {withdrawing === offer.id ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                          Withdraw
                        </button>
                      )}
                      {offer.status === 'lost' && <span className="text-xs italic text-slate-400 dark:text-slate-500">Sealed forever</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
