'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/dashboard/Header'
import { Lock, CheckCircle, Clock, XCircle, EyeOff, Zap, Loader2, AlertTriangle, Tag, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCanton } from '@/lib/canton'

interface MyOffer {
  id: string
  auctionId: string
  buyer: string
  invoiceAmount: number
  advanceRate: number
  annualRate: number
  netToSeller: number
  estimatedYield: number
  status: 'won' | 'pending' | 'lost' | 'withdrawn'
  closedAt: string | null
  cantonRef: string
  bidContractId: string
}

const statusConfig = {
  won:       { label: 'Won',       icon: CheckCircle, color: 'text-emerald-700 bg-emerald-500/10 border-emerald-500/25 dark:text-emerald-300', note: 'Settlement complete · Atomic on Canton' },
  pending:   { label: 'Sealed',    icon: EyeOff,      color: 'text-violet-700 bg-violet-500/10 border-violet-500/25 dark:text-violet-300',     note: 'Awaiting auction close · Only you can see this bid' },
  lost:      { label: 'Lost',      icon: XCircle,     color: 'text-slate-500 bg-slate-500/10 border-slate-500/25 dark:text-slate-400',          note: 'Outbid · Your bid content stayed private' },
  withdrawn: { label: 'Withdrawn', icon: XCircle,     color: 'text-red-700 bg-red-500/10 border-red-500/25 dark:text-red-300',                  note: 'You withdrew this bid before settlement' },
}

const panel = 'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900'

export default function OffersPage() {
  const { party } = useCanton()
  // Real ledger contracts only — starts empty until a party connects.
  const [offers, setOffers] = useState<MyOffer[]>([])
  const [loading, setLoading] = useState(true)
  const [withdrawing, setWithdrawing] = useState<string | null>(null)
  const [withdrawError, setWithdrawError] = useState<string | null>(null)

  const won = offers.filter(o => o.status === 'won')
  const totalDeployed = won.reduce((s, o) => s + o.netToSeller, 0)
  const totalYield = won.reduce((s, o) => s + o.estimatedYield, 0)

  const handleWithdraw = async (offer: MyOffer) => {
    setWithdrawing(offer.id)
    setWithdrawError(null)
    try {
      const res = await fetch('/api/canton/contracts/withdraw-bid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          financierPartyId: party?.id ?? 'demo-financier',
          bidContractId: offer.bidContractId,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setOffers(prev => prev.map(o => o.id === offer.id ? { ...o, status: 'withdrawn' as const } : o))
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

    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/canton/contracts/list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parties: [party.id], template: 'bid' }),
        })
        const data = await res.json()
        if (data.ok) {
          const rows: MyOffer[] = (data.contracts || []).map((c: any, idx: number) => {
            const p = c.payload || {}
            const face = Number(p.faceAmount?.value ?? p.faceAmount ?? 0)
            const advance = Number(p.advanceRate?.value ?? p.advanceRate ?? 0)
            const annual = Number(p.annualRate?.value ?? p.annualRate ?? 0)
            const net = Math.round(face * advance)
            const estYield = Math.round(net * annual)
            const status = p.isRevealed ? 'won' : 'pending'
            return {
              id: c.contractId,
              auctionId: p.invoiceId?.value ?? p.invoiceId ?? `inv-${idx}`,
              buyer: p.seller?.value ?? p.seller ?? 'seller',
              invoiceAmount: face,
              advanceRate: Math.round(advance * 100),
              annualRate: Math.round(annual * 100),
              netToSeller: net,
              estimatedYield: estYield,
              status: status as any,
              closedAt: null,
              cantonRef: c.contractId,
              bidContractId: c.contractId,
            }
          })
          setOffers(rows)
        }
      } catch { /* keep empty */ } finally {
        setLoading(false)
      }
    }

    load()
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

        {/* Offers list */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-950 dark:text-white">All Offers</h2>

          {loading ? (
            <div className={cn(panel, 'flex flex-col items-center justify-center gap-3 py-16')}>
              <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
              <p className="text-sm text-slate-500 dark:text-slate-400">Loading bids from Canton…</p>
            </div>
          ) : !party ? (
            <div className={cn(panel, 'flex flex-col items-center justify-center gap-2 px-6 py-16 text-center')}>
              <Wallet className="h-6 w-6 text-slate-400 dark:text-slate-500" />
              <p className="text-sm font-medium text-slate-950 dark:text-white">Connect your Canton wallet</p>
              <p className="max-w-xs text-xs text-slate-500 dark:text-slate-400">Your sealed bids are read from the ledger. Connect a financier party to see them.</p>
            </div>
          ) : offers.length === 0 ? (
            <div className={cn(panel, 'flex flex-col items-center justify-center gap-2 px-6 py-16 text-center')}>
              <Tag className="h-6 w-6 text-slate-400 dark:text-slate-500" />
              <p className="text-sm font-medium text-slate-950 dark:text-white">No bids yet</p>
              <p className="max-w-xs text-xs text-slate-500 dark:text-slate-400">Place a sealed bid in the marketplace and it appears here as a private contract.</p>
            </div>
          ) : (
            offers.map(offer => {
              const sc = statusConfig[offer.status]
              const Icon = sc.icon
              const isPending = offer.status === 'pending'
              return (
                <div key={offer.id} className={cn(panel, 'p-5 transition-colors hover:border-violet-500/40')}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className={cn('inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium', sc.color)}>
                          <Icon className="h-3 w-3" />{sc.label}
                        </span>
                        <span className="font-data text-xs text-slate-400 dark:text-slate-500">{offer.auctionId}</span>
                      </div>
                      <h3 className="text-base font-semibold text-slate-950 dark:text-white">{offer.buyer}</h3>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{sc.note}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-6 text-sm lg:gap-8">
                      <div>
                        <p className="mb-0.5 text-xs text-slate-500 dark:text-slate-400">Invoice Value</p>
                        <p className="font-data font-semibold text-slate-950 dark:text-white">${offer.invoiceAmount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="mb-0.5 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400"><Lock className="h-3 w-3" /> My Advance</p>
                        <p className="font-data font-semibold text-slate-950 dark:text-white">{offer.advanceRate}%</p>
                      </div>
                      <div>
                        <p className="mb-0.5 text-xs text-slate-500 dark:text-slate-400">Annual Rate</p>
                        <p className="font-data font-semibold text-slate-950 dark:text-white">{offer.annualRate}%</p>
                      </div>
                      <div>
                        <p className="mb-0.5 text-xs text-slate-500 dark:text-slate-400">Est. Yield</p>
                        <p className={cn('font-data font-semibold', offer.status === 'won' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-950 dark:text-white')}>
                          {offer.status === 'won' ? `+$${offer.estimatedYield.toLocaleString()}` : `$${offer.estimatedYield.toLocaleString()}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      {offer.status === 'won' && (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                          <Zap className="h-3.5 w-3.5" />
                          <span>Settled on Canton</span>
                        </div>
                      )}
                      {isPending && (
                        <>
                          <div className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-300">
                            <Clock className="h-3.5 w-3.5 animate-pulse" />
                            <span>Awaiting close</span>
                          </div>
                          <button
                            onClick={() => handleWithdraw(offer)}
                            disabled={withdrawing === offer.id}
                            className="flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                          >
                            {withdrawing === offer.id ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                            Withdraw Bid
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Canton: <span className="font-data max-w-[220px] truncate text-violet-600/80 dark:text-violet-300/80">{offer.cantonRef.slice(0, 32)}…</span>
                      {offer.closedAt && <span className="ml-3">· Closed {offer.closedAt}</span>}
                    </p>
                    {offer.status === 'lost' && (
                      <p className="text-xs italic text-slate-400 dark:text-slate-500">Bid content permanently sealed</p>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
