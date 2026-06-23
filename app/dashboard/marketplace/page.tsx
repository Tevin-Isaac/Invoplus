'use client'

import { useState } from 'react'
import { Header } from '@/components/dashboard/Header'
import { Lock, Timer, TrendingUp, Shield, ChevronRight, Eye, EyeOff, CheckCircle, Zap, Loader2, AlertTriangle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCanton } from '@/lib/canton'

interface Auction {
  id: string
  invoiceId: string
  buyer: string
  industry: string
  amount: number
  currency: string
  dueDate: string
  grade: string
  riskScore: number
  timeLeft: string
  bidsReceived: number
  myBid: number | null
  status: string
  expectedYield: string
  auctionContractId: string
}

const demoAuctions: Auction[] = [
  {
    id: 'AUC-0042',
    invoiceId: 'INV-2026-0042',
    buyer: 'GlobalTech Solutions Ltd',
    industry: 'Technology',
    amount: 125000,
    currency: 'USD',
    dueDate: '2026-09-23',
    grade: 'A',
    riskScore: 87,
    timeLeft: '18h 32m',
    bidsReceived: 3,
    myBid: null,
    status: 'open',
    expectedYield: '10.5–12.8%',
    auctionContractId: 'demo::auction-0042',
  },
  {
    id: 'AUC-0041',
    invoiceId: 'INV-2026-0041',
    buyer: 'Apex Manufacturing Ltd',
    industry: 'Manufacturing',
    amount: 89500,
    currency: 'USD',
    dueDate: '2026-08-15',
    grade: 'A',
    riskScore: 91,
    timeLeft: '6h 10m',
    bidsReceived: 2,
    myBid: 88,
    status: 'open',
    expectedYield: '9.8–11.2%',
    auctionContractId: 'demo::auction-0041',
  },
  {
    id: 'AUC-0040',
    invoiceId: 'INV-2026-0040',
    buyer: 'Summit Retail Group',
    industry: 'Retail',
    amount: 234000,
    currency: 'USD',
    dueDate: '2026-10-05',
    grade: 'B',
    riskScore: 74,
    timeLeft: '2d 4h',
    bidsReceived: 5,
    myBid: null,
    status: 'open',
    expectedYield: '12.1–14.6%',
    auctionContractId: 'demo::auction-0040',
  },
  {
    id: 'AUC-0039',
    invoiceId: 'INV-2026-0039',
    buyer: 'NovaBuild Corp',
    industry: 'Construction',
    amount: 67200,
    currency: 'USD',
    dueDate: '2026-09-01',
    grade: 'B',
    riskScore: 79,
    timeLeft: '1d 12h',
    bidsReceived: 1,
    myBid: null,
    status: 'open',
    expectedYield: '11.0–13.5%',
    auctionContractId: 'demo::auction-0039',
  },
]

const gradeColors: Record<string, string> = {
  A: 'text-green-400 bg-green-500/10 border-green-500/20',
  B: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  C: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  D: 'text-red-400 bg-red-500/10 border-red-500/20',
}

interface BidResult {
  ok: boolean
  message?: string
  privacyNote?: string
  transactionId?: string
  error?: string
}

function BidModal({ auction, onClose, onBidPlaced }: {
  auction: Auction
  onClose: () => void
  onBidPlaced: (auctionId: string, advanceRate: number) => void
}) {
  const { party } = useCanton()
  const [advance, setAdvance] = useState(85)
  const [annualRate, setAnnualRate] = useState(11.5)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<BidResult | null>(null)

  const netAmount = Math.round((auction.amount * advance) / 100)
  const yieldAmount = Math.round(netAmount * annualRate / 100)

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/canton/contracts/submit-bid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          financierPartyId: party?.id ?? 'demo-financier',
          sellerPartyId: 'demo-seller',
          platformPartyId: party?.id ?? 'demo-financier',
          auctionContractId: auction.auctionContractId,
          advanceRate: advance / 100,
          annualRate: annualRate / 100,
        }),
      })
      const data = await res.json()
      setResult(data)
      if (data.ok) {
        onBidPlaced(auction.id, advance)
      }
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : 'Network error' })
    } finally {
      setSubmitting(false)
    }
  }

  if (result?.ok) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-dark-card border border-dark-border rounded-3xl p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-full bg-violet-500/20 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-violet-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Sealed Bid Submitted</h3>
          <p className="text-sm text-dark-muted mb-4">{result.message}</p>
          <div className="bg-dark-border/50 rounded-xl p-4 mb-5 text-left space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-dark-muted">Advance Rate</span>
              <span className="text-white font-semibold">{advance}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-muted">Annual Rate</span>
              <span className="text-white font-semibold">{annualRate}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-muted">Net to Seller</span>
              <span className="text-white font-semibold">${netAmount.toLocaleString()}</span>
            </div>
            {result.transactionId && (
              <div className="flex justify-between">
                <span className="text-dark-muted">Canton Tx</span>
                <span className="text-violet-400 font-mono text-xs truncate max-w-[140px]">{result.transactionId}</span>
              </div>
            )}
          </div>
          <p className="text-xs text-dark-muted mb-4 italic">{result.privacyNote}</p>
          <div className="flex items-center gap-2 text-xs text-green-400 justify-center mb-5">
            <Zap className="w-3.5 h-3.5" />
            SealedBid contract created on Canton Network
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
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-4 h-4 text-violet-400" />
              <span className="text-xs font-semibold text-violet-400">Sealed Bid — Private Canton Contract</span>
            </div>
            <h3 className="text-lg font-bold text-white">{auction.buyer}</h3>
            <p className="text-sm text-dark-muted">{auction.invoiceId} · ${auction.amount.toLocaleString()} {auction.currency}</p>
          </div>
          <button onClick={onClose} className="text-dark-muted hover:text-white transition-colors text-lg">✕</button>
        </div>

        <div className="flex items-start gap-2.5 bg-violet-500/10 border border-violet-500/20 rounded-xl p-3 mb-5">
          <EyeOff className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
          <p className="text-xs text-violet-300">
            Your bid becomes a private Canton contract. Other financiers cannot see your offer. Seller sees all bids simultaneously at close.
            {!party && ' Connect your Canton wallet to submit as a real party.'}
          </p>
        </div>

        {result?.error && (
          <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-400">{result.error}</p>
          </div>
        )}

        <div className="space-y-5">
          <div>
            <div className="flex justify-between text-xs mb-2">
              <label className="text-dark-muted font-medium">Advance Rate</label>
              <span className="text-white font-bold">{advance}%</span>
            </div>
            <input type="range" min={70} max={95} value={advance} onChange={e => setAdvance(+e.target.value)} className="w-full accent-violet-500" />
            <div className="flex justify-between text-xs text-dark-muted mt-1"><span>70%</span><span>95%</span></div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-2">
              <label className="text-dark-muted font-medium">Annual Rate</label>
              <span className="text-white font-bold">{annualRate}%</span>
            </div>
            <input type="range" min={5} max={18} step={0.1} value={annualRate} onChange={e => setAnnualRate(+e.target.value)} className="w-full accent-violet-500" />
            <div className="flex justify-between text-xs text-dark-muted mt-1"><span>5%</span><span>18%</span></div>
          </div>

          <div className="bg-dark-border/50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-dark-muted">Net to Seller</span>
              <span className="text-white font-semibold">${netAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-muted">Estimated Yield</span>
              <span className="text-green-400 font-semibold">+${yieldAmount.toLocaleString()}</span>
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
          <button onClick={handleSubmit} disabled={submitting}
            className="flex-1 bg-violet-500 hover:bg-violet-600 disabled:opacity-60 text-white py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            {submitting ? 'Submitting to Canton…' : 'Submit Sealed Bid'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MarketplacePage() {
  const [auctions, setAuctions] = useState<Auction[]>(demoAuctions)
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null)
  const { ledgerStatus } = useCanton()

  const handleBidPlaced = (auctionId: string, advanceRate: number) => {
    setAuctions(prev => prev.map(a => a.id === auctionId ? { ...a, myBid: advanceRate, bidsReceived: a.bidsReceived + 1 } : a))
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Marketplace" />
      {selectedAuction && (
        <BidModal
          auction={selectedAuction}
          onClose={() => setSelectedAuction(null)}
          onBidPlaced={handleBidPlaced}
        />
      )}

      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        <div className="bg-gradient-to-r from-violet-500/10 via-violet-500/5 to-transparent border border-violet-500/20 rounded-2xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white mb-1">Private Sealed-Bid Auctions · Powered by Canton Network</p>
            <p className="text-xs text-dark-muted leading-relaxed">
              Every bid is a private Canton smart contract. Competing financiers cannot see your offer.
              The seller sees all bids simultaneously at close. Settlement is atomic — all state changes happen in a single Canton transaction.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Open Auctions', value: auctions.length.toString() },
            { label: 'Avg Risk Score', value: Math.round(auctions.reduce((s, a) => s + a.riskScore, 0) / auctions.length).toString() },
            { label: 'Canton Block', value: ledgerStatus?.ok ? (ledgerStatus.offset?.toLocaleString() ?? '…') : 'Connecting…' },
          ].map(s => (
            <div key={s.label} className="bg-dark-card border border-dark-border rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-white mb-1">{s.value}</p>
              <p className="text-xs text-dark-muted">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-white">Open Auctions ({auctions.length})</h2>
          {auctions.map(auction => (
            <div key={auction.id} className="bg-dark-card border border-dark-border rounded-2xl p-5 hover:border-violet-500/30 transition-all group">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn('text-xs font-bold px-2 py-0.5 rounded-lg border', gradeColors[auction.grade] ?? gradeColors.B)}>
                      Grade {auction.grade}
                    </span>
                    <span className="text-xs text-dark-muted">{auction.industry}</span>
                    <span className="text-xs text-dark-muted">·</span>
                    <span className="text-xs text-dark-muted font-mono">{auction.invoiceId}</span>
                  </div>
                  <h3 className="text-base font-semibold text-white mb-1">{auction.buyer}</h3>
                  <p className="text-xs text-dark-muted">Due {auction.dueDate}</p>
                </div>

                <div className="flex items-center gap-6 flex-wrap">
                  <div>
                    <p className="text-xs text-dark-muted mb-0.5">Invoice Value</p>
                    <p className="text-lg font-bold text-white">${auction.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-dark-muted mb-0.5">Est. Yield</p>
                    <p className="text-sm font-semibold text-green-400">{auction.expectedYield}</p>
                  </div>
                  <div>
                    <p className="text-xs text-dark-muted mb-0.5">Risk Score</p>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-dark-border rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full', auction.riskScore >= 80 ? 'bg-green-500' : auction.riskScore >= 65 ? 'bg-violet-500' : 'bg-yellow-500')} style={{ width: `${auction.riskScore}%` }} />
                      </div>
                      <span className="text-sm font-semibold text-white">{auction.riskScore}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-dark-muted mb-0.5 flex items-center gap-1"><Lock className="w-3 h-3" /> Sealed Bids</p>
                    <p className="text-sm font-semibold text-white">{auction.bidsReceived} received</p>
                  </div>
                  <div>
                    <p className="text-xs text-dark-muted mb-0.5 flex items-center gap-1"><Timer className="w-3 h-3" /> Closes In</p>
                    <p className="text-sm font-semibold text-orange-400">{auction.timeLeft}</p>
                  </div>
                </div>

                <div className="lg:ml-4 shrink-0">
                  {auction.myBid !== null ? (
                    <div className="flex items-center gap-2 text-sm">
                      <Eye className="w-4 h-4 text-violet-400" />
                      <span className="text-violet-400 font-semibold">My Bid: {auction.myBid}%</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedAuction(auction)}
                      className="flex items-center gap-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
                      <Lock className="w-4 h-4" />
                      Place Sealed Bid
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-dark-border flex items-center justify-between text-xs text-dark-muted">
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-green-400" />
                  <span>Anti-fraud registry checked · Invoice hash: <span className="font-mono">{auction.id}::verified</span></span>
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
