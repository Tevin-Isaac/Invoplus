'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/dashboard/Header'
import { Lock, Timer, Shield, CheckCircle, Loader2, AlertTriangle, X, EyeOff, Wallet, Store } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCanton } from '@/lib/canton'

interface Auction {
  id: string
  invoiceId: string
  buyer: string
  amount: number
  currency: string
  dueDate: string
  grade: string
  riskScore: number
  bidsReceived: number
  myBid: number | null
  status: string
  auctionContractId: string
}

interface BidResult { ok: boolean; message?: string; transactionId?: string; error?: string }

const panel = 'rounded-3xl border border-white/[0.07] bg-[#120E1F] shadow-[0_10px_35px_rgba(0,0,0,0.45)]'

const gradeStyle: Record<string, string> = {
  A: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300',
  B: 'border-violet-500/30 bg-violet-500/15 text-violet-300',
  C: 'border-slate-500/30 bg-slate-500/15 text-slate-300',
  D: 'border-amber-500/30 bg-amber-500/15 text-amber-300',
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
      if (data.ok) onBidPlaced(auction.id, advance)
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : 'Network error' })
    } finally {
      setSubmitting(false)
    }
  }

  if (result?.ok) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
        <div className={cn(panel, 'w-full max-w-sm p-8 text-center')}>
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-violet-500/20">
            <CheckCircle className="h-8 w-8 text-violet-300" />
          </div>
          <h3 className="font-display mb-2 text-xl font-bold text-white">Sealed Bid Submitted</h3>
          <p className="mb-4 text-sm text-slate-400">{result.message ?? 'Your bid is a private contract, visible only to you and the platform.'}</p>
          <div className="mb-5 space-y-2 rounded-2xl border border-white/[0.07] bg-[#0B0814] p-4 text-left text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Advance Rate</span><span className="font-data font-semibold text-white">{advance}%</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Annual Rate</span><span className="font-data font-semibold text-white">{annualRate}%</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Net to Seller</span><span className="font-data font-semibold text-amber-300">${netAmount.toLocaleString()}</span></div>
            {result.transactionId && (
              <div className="flex justify-between"><span className="text-slate-500">Canton Tx</span><span className="font-data max-w-[140px] truncate text-xs text-violet-300">{result.transactionId}</span></div>
            )}
          </div>
          <button onClick={onClose} className="w-full rounded-xl bg-violet-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-400">Done</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className={cn(panel, 'w-full max-w-md p-6')}>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="font-data text-[11px] uppercase tracking-[0.24em] text-violet-300">Sealed bid</p>
            <h3 className="font-display mt-1 text-lg font-semibold text-white">{auction.invoiceId || auction.id}</h3>
            <p className="text-xs text-slate-500">{auction.buyer} · <span className="font-data text-amber-300">${auction.amount.toLocaleString()}</span></p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-5">
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-slate-400">Advance rate</span>
              <span className="font-data font-bold text-white">{advance}%</span>
            </div>
            <input type="range" min={70} max={95} step={0.5} value={advance}
              onChange={e => setAdvance(Number(e.target.value))} className="w-full accent-violet-500" />
            <p className="mt-1 font-data text-xs text-slate-500">seller receives <span className="text-amber-300">${netAmount.toLocaleString()}</span> now</p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-slate-400">Annual rate</span>
              <span className="font-data font-bold text-white">{annualRate}%</span>
            </div>
            <input type="range" min={6} max={20} step={0.1} value={annualRate}
              onChange={e => setAnnualRate(Number(e.target.value))} className="w-full accent-amber-400" />
            <p className="mt-1 font-data text-xs text-slate-500">projected yield <span className="text-amber-300">${yieldAmount.toLocaleString()}</span> APR-basis</p>
          </div>

          <div className="flex items-start gap-2.5 rounded-2xl border border-violet-500/20 bg-violet-500/[0.06] p-3">
            <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
            <p className="text-xs leading-relaxed text-slate-400">Your bid becomes a private Canton contract. The seller and rival financiers cannot see it — enforced by the ledger's observer rules.</p>
          </div>

          {result && !result.ok && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-red-500/25 bg-red-500/10 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <div>
                <p className="text-xs font-medium text-red-300">Bid failed</p>
                <p className="mt-0.5 text-xs text-slate-500">{result.error}</p>
              </div>
            </div>
          )}

          <button onClick={handleSubmit} disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-400 disabled:opacity-60">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            {submitting ? 'Submitting sealed bid…' : 'Submit sealed bid'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MarketplacePage() {
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null)
  const { party } = useCanton()

  useEffect(() => {
    if (!party?.id) { setAuctions([]); setLoading(false); return }
    let cancelled = false
    setLoading(true)
    const load = async () => {
      try {
        const res = await fetch('/api/canton/contracts/list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parties: [party.id], template: 'auction' }),
        })
        const data = await res.json()
        if (!cancelled && data.ok) {
          const rows = (data.contracts || []).map((c: any) => {
            const p = c.payload || {}
            return {
              id: c.contractId.slice(0, 12),
              invoiceId: p.invoiceId?.value ?? p.invoiceId ?? '',
              buyer: p.debtorName?.value ?? p.debtorName ?? 'Unknown',
              amount: Number(p.faceAmount?.value ?? p.faceAmount ?? 0),
              currency: p.currency?.value ?? p.currency ?? 'USD',
              dueDate: p.dueDate?.value ?? p.dueDate ?? '',
              grade: String(p.riskGrade?.value ?? p.riskGrade ?? '—').replace('Grade_', ''),
              riskScore: Number(p.aiScore?.value ?? p.aiScore ?? 0),
              bidsReceived: Number(p.bidCount ?? 0),
              myBid: null,
              status: p.settled ? 'settled' : 'open',
              auctionContractId: c.contractId,
            } as Auction
          })
          setAuctions(rows)
        }
      } catch { /* keep empty */ } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [party])

  const handleBidPlaced = (auctionId: string, advanceRate: number) => {
    setAuctions(prev => prev.map(a => a.id === auctionId ? { ...a, myBid: advanceRate, bidsReceived: a.bidsReceived + 1 } : a))
  }

  const open = auctions.filter(a => a.status === 'open')

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Marketplace" />
      {selectedAuction && (
        <BidModal auction={selectedAuction} onClose={() => setSelectedAuction(null)} onBidPlaced={handleBidPlaced} />
      )}

      <div className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-r from-violet-950/50 via-[#130E24] to-[#100C1E] p-5">
          <div className="pointer-events-none absolute -top-20 -right-12 h-48 w-48 rounded-full bg-violet-600/20 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-500/25 bg-violet-500/10">
                <Lock className="h-4 w-4 text-violet-300" />
              </span>
              <div>
                <p className="font-display font-semibold text-white">Sealed-bid auctions</p>
                <p className="text-xs text-slate-400">Bids are private Canton contracts — the seller and rival financiers never see your numbers.</p>
              </div>
            </div>
            <span className="font-data rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300">
              {loading ? '…' : `${open.length} open`}
            </span>
          </div>
        </div>

        {/* Auctions */}
        {loading ? (
          <div className={cn(panel, 'flex flex-col items-center justify-center gap-3 py-16')}>
            <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
            <p className="text-sm text-slate-500">Loading auctions from Canton…</p>
          </div>
        ) : !party ? (
          <div className={cn(panel, 'flex flex-col items-center justify-center gap-2 py-16 text-center px-6')}>
            <Wallet className="h-6 w-6 text-slate-600" />
            <p className="text-sm font-medium text-white">Connect your Canton wallet</p>
            <p className="max-w-xs text-xs text-slate-500">Live auctions are read from the ledger. Connect a financier party to browse and bid.</p>
          </div>
        ) : auctions.length === 0 ? (
          <div className={cn(panel, 'flex flex-col items-center justify-center gap-2 py-16 text-center px-6')}>
            <Store className="h-6 w-6 text-slate-600" />
            <p className="text-sm font-medium text-white">No auctions yet</p>
            <p className="max-w-xs text-xs text-slate-500">When sellers list verified invoices, the sealed-bid auctions appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {auctions.map(a => (
              <div key={a.id} className={cn(panel, 'p-5 transition-all hover:-translate-y-0.5 hover:border-violet-500/30')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-data text-xs text-slate-600">{a.id}</p>
                    <p className="mt-0.5 truncate font-display font-semibold text-white">{a.invoiceId || 'Auction'}</p>
                    <p className="truncate text-xs text-slate-500">{a.buyer}</p>
                  </div>
                  <span className={cn('font-data shrink-0 rounded-md border px-2 py-1 text-xs font-bold', gradeStyle[a.grade] ?? gradeStyle.C)}>
                    {a.grade}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-600">Face value</p>
                    <p className="font-data mt-1 text-lg font-bold text-amber-300">${a.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-600">Score</p>
                    <p className="font-data mt-1 text-lg font-bold text-white">{a.riskScore || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-600">Due</p>
                    <p className="font-data mt-1 text-sm text-slate-300">{a.dueDate || '—'}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-4">
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-violet-400" /><span className="font-data">{a.bidsReceived}</span> sealed</span>
                    {a.status !== 'open' && <span className="flex items-center gap-1.5"><Timer className="h-3.5 w-3.5" />settled</span>}
                    {a.myBid != null && <span className="font-data text-amber-300">your bid: {a.myBid}%</span>}
                  </div>
                  <button
                    onClick={() => a.status === 'open' && setSelectedAuction(a)}
                    disabled={a.status !== 'open'}
                    className={cn('rounded-xl px-4 py-2 text-xs font-semibold transition-colors',
                      a.status === 'open' ? 'bg-violet-500 text-white hover:bg-violet-400' : 'cursor-not-allowed bg-white/5 text-slate-600')}
                  >
                    {a.status === 'open' ? 'Place sealed bid' : 'Settled'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
