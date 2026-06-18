'use client'

import { useState } from 'react'
import { Header } from '@/components/dashboard/Header'
import { Lock, Timer, TrendingUp, Shield, ChevronRight, Eye, EyeOff, CheckCircle, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

const auctions = [
  {
    id: 'AUC-0042',
    invoiceId: '#INV-2839',
    buyer: 'ManuCo Systems',
    industry: 'Manufacturing',
    amount: 127500,
    dueDate: '2025-09-01',
    grade: 'B+',
    aiScore: 84,
    timeLeft: '18h 32m',
    bidsReceived: 3,
    myBid: null,
    status: 'open',
    expectedYield: '9.2–11.4%',
  },
  {
    id: 'AUC-0041',
    invoiceId: '#INV-2840',
    buyer: 'RetailGroup Inc',
    industry: 'Retail',
    amount: 32100,
    dueDate: '2025-07-30',
    grade: 'A',
    aiScore: 91,
    timeLeft: '6h 10m',
    bidsReceived: 2,
    myBid: 88,
    status: 'open',
    expectedYield: '7.8–9.1%',
  },
  {
    id: 'AUC-0040',
    invoiceId: '#INV-2836',
    buyer: 'SupplyChain Co',
    industry: 'Logistics',
    amount: 220000,
    dueDate: '2025-08-20',
    grade: 'A+',
    aiScore: 97,
    timeLeft: '2d 4h',
    bidsReceived: 5,
    myBid: null,
    status: 'open',
    expectedYield: '6.5–8.2%',
  },
]

const gradeColors: Record<string, string> = {
  'A+': 'text-green-400 bg-green-500/10 border-green-500/20',
  'A':  'text-blue-400 bg-blue-500/10 border-blue-500/20',
  'B+': 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  'B':  'text-orange-400 bg-orange-500/10 border-orange-500/20',
}

function BidModal({ auction, onClose }: { auction: typeof auctions[0]; onClose: () => void }) {
  const [advance, setAdvance] = useState(85)
  const [rate, setRate] = useState(8.5)
  const [submitted, setSubmitted] = useState(false)

  const netAmount = (auction.amount * advance) / 100
  const fee = (netAmount * rate) / 100

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-dark-card border border-dark-border rounded-3xl p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-full bg-violet-500/20 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-violet-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Sealed Bid Submitted</h3>
          <p className="text-sm text-dark-muted mb-2">
            Your bid has been recorded on Canton Network as a private contract.
            The seller cannot see competing bids — only you can see yours.
          </p>
          <div className="bg-dark-border/50 rounded-xl p-4 mb-6 text-left">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-dark-muted">Advance Rate</span>
              <span className="text-white font-semibold">{advance}%</span>
            </div>
            <div className="flex justify-between text-xs mb-2">
              <span className="text-dark-muted">Net to Seller</span>
              <span className="text-white font-semibold">${netAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-dark-muted">Canton Contract</span>
              <span className="text-violet-400 font-mono">AUC-0042::sealed</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-green-400 justify-center mb-4">
            <Zap className="w-3.5 h-3.5" />
            Recorded atomically on Canton Network
          </div>
          <button onClick={onClose} className="w-full bg-violet-500 hover:bg-violet-600 text-white font-semibold py-3 rounded-xl transition-colors">
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-dark-card border border-dark-border rounded-3xl p-6 max-w-md w-full">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-4 h-4 text-violet-400" />
              <span className="text-xs font-semibold text-violet-400">Sealed Bid — Private to You</span>
            </div>
            <h3 className="text-lg font-bold text-white">{auction.buyer}</h3>
            <p className="text-sm text-dark-muted">{auction.invoiceId} · ${auction.amount.toLocaleString()}</p>
          </div>
          <button onClick={onClose} className="text-dark-muted hover:text-white transition-colors text-lg">✕</button>
        </div>

        {/* Privacy notice */}
        <div className="flex items-center gap-2.5 bg-violet-500/10 border border-violet-500/20 rounded-xl p-3 mb-5 text-xs text-violet-300">
          <EyeOff className="w-4 h-4 shrink-0" />
          Your bid is sealed on Canton Network. Other financiers cannot see it. Only the seller sees all bids simultaneously at auction close.
        </div>

        <div className="space-y-5">
          <div>
            <div className="flex justify-between text-xs mb-2">
              <label className="text-dark-muted font-medium">Advance Rate</label>
              <span className="text-white font-bold">{advance}%</span>
            </div>
            <input type="range" min={70} max={95} value={advance} onChange={e => setAdvance(+e.target.value)}
              className="w-full accent-violet-500" />
            <div className="flex justify-between text-xs text-dark-muted mt-1">
              <span>70%</span><span>95%</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-2">
              <label className="text-dark-muted font-medium">Annual Rate (Fee)</label>
              <span className="text-white font-bold">{rate}%</span>
            </div>
            <input type="range" min={5} max={18} step={0.1} value={rate} onChange={e => setRate(+e.target.value)}
              className="w-full accent-violet-500" />
            <div className="flex justify-between text-xs text-dark-muted mt-1">
              <span>5%</span><span>18%</span>
            </div>
          </div>

          <div className="bg-dark-border/50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-dark-muted">Net to Seller</span>
              <span className="text-white font-semibold">${netAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-muted">Your Fee (estimated)</span>
              <span className="text-green-400 font-semibold">+${fee.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="flex justify-between border-t border-dark-border pt-2">
              <span className="text-dark-muted">Face Value</span>
              <span className="text-white">${auction.amount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 border border-dark-border text-dark-muted hover:text-white py-3 rounded-xl text-sm font-medium transition-colors">
            Cancel
          </button>
          <button onClick={() => setSubmitted(true)}
            className="flex-1 bg-violet-500 hover:bg-violet-600 text-white py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
            <Lock className="w-4 h-4" />
            Submit Sealed Bid
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MarketplacePage() {
  const [selectedAuction, setSelectedAuction] = useState<typeof auctions[0] | null>(null)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Marketplace" />
      {selectedAuction && <BidModal auction={selectedAuction} onClose={() => setSelectedAuction(null)} />}

      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Privacy banner */}
        <div className="bg-gradient-to-r from-violet-500/10 via-violet-500/5 to-transparent border border-violet-500/20 rounded-2xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white mb-1">Private Sealed-Bid Auctions · Powered by Canton Network</p>
            <p className="text-xs text-dark-muted leading-relaxed">
              Every bid is a private Canton smart contract. Competing financiers cannot see your offer.
              The seller sees all bids simultaneously at close. Settlement is atomic — payment and invoice rights transfer in a single Canton transaction.
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Active Auctions', value: '12' },
            { label: 'Avg Advance Rate', value: '88.4%' },
            { label: 'Settlement Time', value: '3.2s' },
          ].map(s => (
            <div key={s.label} className="bg-dark-card border border-dark-border rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-white mb-1">{s.value}</p>
              <p className="text-xs text-dark-muted">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Auction listings */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-white">Open Auctions</h2>
          {auctions.map(auction => (
            <div key={auction.id} className="bg-dark-card border border-dark-border rounded-2xl p-5 hover:border-violet-500/30 transition-all group">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Left: invoice info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn('text-xs font-bold px-2 py-0.5 rounded-lg border', gradeColors[auction.grade])}>
                      {auction.grade}
                    </span>
                    <span className="text-xs text-dark-muted">{auction.industry}</span>
                    <span className="text-xs text-dark-muted">·</span>
                    <span className="text-xs text-dark-muted">{auction.invoiceId}</span>
                  </div>
                  <h3 className="text-base font-semibold text-white mb-1">{auction.buyer}</h3>
                  <p className="text-xs text-dark-muted">Due {auction.dueDate}</p>
                </div>

                {/* Center: stats */}
                <div className="flex items-center gap-8">
                  <div>
                    <p className="text-xs text-dark-muted mb-0.5">Invoice Value</p>
                    <p className="text-lg font-bold text-white">${auction.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-dark-muted mb-0.5">Expected Yield</p>
                    <p className="text-sm font-semibold text-green-400">{auction.expectedYield}</p>
                  </div>
                  <div>
                    <p className="text-xs text-dark-muted mb-0.5">AI Score</p>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-dark-border rounded-full overflow-hidden">
                        <div className="h-full bg-violet-500 rounded-full" style={{ width: `${auction.aiScore}%` }} />
                      </div>
                      <span className="text-sm font-semibold text-white">{auction.aiScore}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-dark-muted mb-0.5 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Sealed Bids
                    </p>
                    <p className="text-sm font-semibold text-white">{auction.bidsReceived} received</p>
                  </div>
                  <div>
                    <p className="text-xs text-dark-muted mb-0.5 flex items-center gap-1">
                      <Timer className="w-3 h-3" /> Closes In
                    </p>
                    <p className="text-sm font-semibold text-orange-400">{auction.timeLeft}</p>
                  </div>
                </div>

                {/* Right: CTA */}
                <div className="lg:ml-4">
                  {auction.myBid ? (
                    <div className="flex items-center gap-2 text-sm">
                      <Eye className="w-4 h-4 text-violet-400" />
                      <span className="text-violet-400 font-semibold">Bid: {auction.myBid}%</span>
                      <span className="text-xs text-dark-muted">(only you can see this)</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedAuction(auction)}
                      className="flex items-center gap-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors group-hover:shadow-lg group-hover:shadow-violet-500/20">
                      <Lock className="w-4 h-4" />
                      Place Sealed Bid
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Canton proof */}
              <div className="mt-4 pt-4 border-t border-dark-border flex items-center justify-between text-xs text-dark-muted">
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-green-400" />
                  <span>Canton proof: Invoice not double-financed · </span>
                  <span className="font-mono text-dark-border">{auction.id}::verified</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-violet-400" />
                  <span>Atomic settlement on acceptance</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
