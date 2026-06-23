'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/dashboard/Header'
import { Lock, CheckCircle, Clock, XCircle, EyeOff, Zap, Loader2, AlertTriangle } from 'lucide-react'
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

const myOffers: MyOffer[] = [
  {
    id: 'BID-0118',
    auctionId: 'AUC-0041',
    buyer: 'Apex Manufacturing Ltd',
    invoiceAmount: 89500,
    advanceRate: 88,
    annualRate: 11.5,
    netToSeller: 78760,
    estimatedYield: 2481,
    status: 'won',
    closedAt: '2026-06-21 14:22',
    cantonRef: 'AUC-0041::settlement',
    bidContractId: 'bid::0118::sealed',
  },
  {
    id: 'BID-0117',
    auctionId: 'AUC-0042',
    buyer: 'GlobalTech Solutions Ltd',
    invoiceAmount: 125000,
    advanceRate: 87,
    annualRate: 11.8,
    netToSeller: 108750,
    estimatedYield: 3555,
    status: 'pending',
    closedAt: null,
    cantonRef: 'AUC-0042::sealed',
    bidContractId: 'bid::0117::sealed',
  },
  {
    id: 'BID-0116',
    auctionId: 'AUC-0040',
    buyer: 'Summit Retail Group',
    invoiceAmount: 234000,
    advanceRate: 89,
    annualRate: 12.1,
    netToSeller: 208260,
    estimatedYield: 6900,
    status: 'lost',
    closedAt: '2026-06-18 09:10',
    cantonRef: 'AUC-0040::settled',
    bidContractId: 'bid::0116::archived',
  },
  {
    id: 'BID-0115',
    auctionId: 'AUC-0038',
    buyer: 'NovaBuild Corp',
    invoiceAmount: 67200,
    advanceRate: 86,
    annualRate: 13.2,
    netToSeller: 57792,
    estimatedYield: 2090,
    status: 'won',
    closedAt: '2026-06-14 16:55',
    cantonRef: 'AUC-0038::settlement',
    bidContractId: 'bid::0115::archived',
  },
]

const statusConfig = {
  won:       { label: 'Won',       icon: CheckCircle, color: 'text-green-400 bg-green-500/10 border-green-500/20',    note: 'Settlement complete · Atomic on Canton' },
  pending:   { label: 'Sealed',    icon: EyeOff,      color: 'text-violet-400 bg-violet-500/10 border-violet-500/20', note: 'Awaiting auction close · Only you can see this bid' },
  lost:      { label: 'Lost',      icon: XCircle,     color: 'text-gray-500 bg-gray-500/10 border-gray-500/20',       note: 'Outbid · Your bid content stayed private' },
  withdrawn: { label: 'Withdrawn', icon: XCircle,     color: 'text-red-400 bg-red-500/10 border-red-500/20',          note: 'You withdrew this bid before settlement' },
}

export default function OffersPage() {
  const { party } = useCanton()
  const [offers, setOffers] = useState<MyOffer[]>(myOffers)
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
    if (!party?.id) return
    // Only financiers will have SealedBid contracts as signatory
    if (party.type !== 'financier') return

    const load = async () => {
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
            const net = Math.round(face * (advance))
            const estYield = Math.round(net * (annual))
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
      } catch (e) {
        // ignore
      }
    }

    load()
  }, [party])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="My Offers" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        <div className="flex items-center gap-3 bg-violet-500/10 border border-violet-500/20 rounded-2xl px-5 py-3">
          <EyeOff className="w-4 h-4 text-violet-400 shrink-0" />
          <p className="text-xs text-violet-300">
            Your sealed bids are private Canton contracts — other financiers cannot see your offers at any point.
            Only the seller sees all bids simultaneously after auction close. Losing bid contents remain sealed forever.
          </p>
        </div>

        {withdrawError && (
          <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-400">{withdrawError}</p>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Bids', value: offers.length.toString() },
            { label: 'Bids Won', value: won.length.toString() },
            { label: 'Capital Deployed', value: `$${totalDeployed.toLocaleString()}` },
            { label: 'Total Yield (est.)', value: `$${totalYield.toLocaleString()}` },
          ].map(s => (
            <div key={s.label} className="bg-dark-card border border-dark-border rounded-2xl p-5">
              <p className="text-2xl font-bold text-white mb-1">{s.value}</p>
              <p className="text-xs text-dark-muted">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-white">All Offers</h2>
          {offers.map(offer => {
            const sc = statusConfig[offer.status]
            const Icon = sc.icon
            const isPending = offer.status === 'pending'
            return (
              <div key={offer.id} className="bg-dark-card border border-dark-border rounded-2xl p-5 hover:border-violet-500/20 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border', sc.color)}>
                        <Icon className="w-3 h-3" />{sc.label}
                      </span>
                      <span className="text-xs text-dark-muted font-mono">{offer.auctionId}</span>
                    </div>
                    <h3 className="text-base font-semibold text-white">{offer.buyer}</h3>
                    <p className="text-xs text-dark-muted mt-0.5">{sc.note}</p>
                  </div>

                  <div className="flex items-center gap-8 flex-wrap text-sm">
                    <div>
                      <p className="text-xs text-dark-muted mb-0.5">Invoice Value</p>
                      <p className="font-semibold text-white">${offer.invoiceAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-dark-muted mb-0.5 flex items-center gap-1"><Lock className="w-3 h-3" /> My Advance</p>
                      <p className="font-semibold text-white">{offer.advanceRate}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-dark-muted mb-0.5">Annual Rate</p>
                      <p className="font-semibold text-white">{offer.annualRate}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-dark-muted mb-0.5">Est. Yield</p>
                      <p className={cn('font-semibold', offer.status === 'won' ? 'text-green-400' : 'text-white')}>
                        {offer.status === 'won' ? `+$${offer.estimatedYield.toLocaleString()}` : `$${offer.estimatedYield.toLocaleString()}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {offer.status === 'won' && (
                      <div className="flex items-center gap-1.5 text-xs text-green-400">
                        <Zap className="w-3.5 h-3.5" />
                        <span>Settled on Canton</span>
                      </div>
                    )}
                    {isPending && (
                      <>
                        <div className="flex items-center gap-1.5 text-xs text-violet-400">
                          <Clock className="w-3.5 h-3.5 animate-pulse" />
                          <span>Awaiting close</span>
                        </div>
                        <button
                          onClick={() => handleWithdraw(offer)}
                          disabled={withdrawing === offer.id}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {withdrawing === offer.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                          Withdraw Bid
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-dark-border flex items-center justify-between">
                  <p className="text-xs text-dark-muted">
                    Canton: <span className="font-mono text-violet-400/70">{offer.cantonRef}</span>
                    {offer.closedAt && <span className="ml-3">· Closed {offer.closedAt}</span>}
                  </p>
                  {offer.status === 'lost' && (
                    <p className="text-xs text-dark-muted italic">Bid content permanently sealed · privacy preserved</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
