'use client'

import { Header } from '@/components/dashboard/Header'
import { Lock, CheckCircle, Clock, XCircle, EyeOff, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

const myOffers = [
  {
    id: 'BID-0118',
    auctionId: 'AUC-0041',
    buyer: 'RetailGroup Inc',
    invoiceAmount: 32100,
    advanceRate: 88,
    annualRate: 8.1,
    netToSeller: 28248,
    myFee: 2287,
    status: 'won',
    closedAt: '2025-07-18 14:22',
    cantonContract: 'AUC-0041::settlement',
  },
  {
    id: 'BID-0117',
    auctionId: 'AUC-0039',
    buyer: 'NexTech Corp',
    invoiceAmount: 95000,
    advanceRate: 87,
    annualRate: 9.2,
    netToSeller: 82650,
    myFee: 7604,
    status: 'pending',
    closedAt: null,
    cantonContract: 'AUC-0039::sealed',
  },
  {
    id: 'BID-0116',
    auctionId: 'AUC-0038',
    buyer: 'MegaCo Ltd',
    invoiceAmount: 250000,
    advanceRate: 90,
    annualRate: 7.5,
    netToSeller: 225000,
    myFee: 16875,
    status: 'lost',
    closedAt: '2025-07-15 09:10',
    cantonContract: 'AUC-0038::settled',
  },
  {
    id: 'BID-0115',
    auctionId: 'AUC-0037',
    buyer: 'FinGoods Inc',
    invoiceAmount: 48200,
    advanceRate: 86,
    annualRate: 10.1,
    netToSeller: 41452,
    myFee: 4187,
    status: 'won',
    closedAt: '2025-07-12 16:55',
    cantonContract: 'AUC-0037::settlement',
  },
]

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle; color: string; note: string }> = {
  won:     { label: 'Won',     icon: CheckCircle, color: 'text-green-400 bg-green-500/10 border-green-500/20', note: 'Settlement complete · Atomic on Canton' },
  pending: { label: 'Sealed',  icon: EyeOff,      color: 'text-violet-400 bg-violet-500/10 border-violet-500/20', note: 'Awaiting auction close · Only you can see this bid' },
  lost:    { label: 'Lost',    icon: XCircle,     color: 'text-gray-500 bg-gray-500/10 border-gray-500/20', note: 'Outbid · No settlement occurred' },
}

export default function OffersPage() {
  const won  = myOffers.filter(o => o.status === 'won')
  const totalDeployed  = won.reduce((s, o) => s + o.netToSeller, 0)
  const totalFees      = won.reduce((s, o) => s + o.myFee, 0)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="My Offers" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Privacy note */}
        <div className="flex items-center gap-3 bg-violet-500/10 border border-violet-500/20 rounded-2xl px-5 py-3">
          <EyeOff className="w-4 h-4 text-violet-400 shrink-0" />
          <p className="text-xs text-violet-300">
            Your sealed bids are private Canton contracts — other financiers cannot see your offers at any point.
            Only the seller sees all bids after auction close.
          </p>
        </div>

        {/* Portfolio summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Bids',        value: myOffers.length.toString() },
            { label: 'Bids Won',          value: won.length.toString() },
            { label: 'Capital Deployed',  value: `$${totalDeployed.toLocaleString()}` },
            { label: 'Fees Earned',       value: `$${totalFees.toLocaleString()}` },
          ].map(s => (
            <div key={s.label} className="bg-dark-card border border-dark-border rounded-2xl p-5">
              <p className="text-2xl font-bold text-white mb-1">{s.value}</p>
              <p className="text-xs text-dark-muted">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Offers list */}
        <div className="space-y-3">
          {myOffers.map(offer => {
            const sc = statusConfig[offer.status]
            const Icon = sc.icon
            return (
              <div key={offer.id} className="bg-dark-card border border-dark-border rounded-2xl p-5 hover:border-violet-500/20 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border', sc.color)}>
                        <Icon className="w-3 h-3" />{sc.label}
                      </span>
                      <span className="text-xs text-dark-muted">{offer.auctionId}</span>
                    </div>
                    <h3 className="text-base font-semibold text-white">{offer.buyer}</h3>
                    <p className="text-xs text-dark-muted mt-0.5">{sc.note}</p>
                  </div>

                  {/* Bid terms */}
                  <div className="flex items-center gap-8 text-sm">
                    <div>
                      <p className="text-xs text-dark-muted mb-0.5">Invoice Value</p>
                      <p className="font-semibold text-white">${offer.invoiceAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-dark-muted mb-0.5 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> My Advance
                      </p>
                      <p className="font-semibold text-white">{offer.advanceRate}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-dark-muted mb-0.5">Annual Rate</p>
                      <p className="font-semibold text-white">{offer.annualRate}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-dark-muted mb-0.5">My Fee</p>
                      <p className={cn('font-semibold', offer.status === 'won' ? 'text-green-400' : 'text-white')}>
                        {offer.status === 'won' ? `+$${offer.myFee.toLocaleString()}` : `$${offer.myFee.toLocaleString()}`}
                      </p>
                    </div>
                  </div>

                  {/* Canton proof */}
                  {offer.status === 'won' && (
                    <div className="flex items-center gap-1.5 text-xs text-green-400">
                      <Zap className="w-3.5 h-3.5" />
                      <span>Settled on Canton</span>
                    </div>
                  )}
                  {offer.status === 'pending' && (
                    <div className="flex items-center gap-1.5 text-xs text-violet-400">
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                      <span>Awaiting close</span>
                    </div>
                  )}
                </div>

                {/* Canton contract ref */}
                <div className="mt-3 pt-3 border-t border-dark-border">
                  <p className="text-xs text-dark-muted">
                    Canton contract:{' '}
                    <span className="font-mono text-violet-400/70">{offer.cantonContract}</span>
                    {offer.closedAt && <span className="ml-3">· Closed {offer.closedAt}</span>}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
