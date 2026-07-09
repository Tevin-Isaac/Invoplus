'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Header } from '@/components/dashboard/Header'
import { Lock, Shield, CheckCircle, Loader2, AlertTriangle, X, EyeOff, Wallet, Store, Building2, CalendarDays, Gauge, Timer, TrendingUp, Sparkles, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCanton } from '@/lib/canton'
import { useNotifications } from '@/lib/notifications'

interface Auction {
  id: string
  invoiceId: string
  invoiceHash: string     // matches SealedBid.invoiceHash — used to find bids at settlement
  buyer: string
  seller: string          // Canton party ID of the invoice seller, from the Auction payload
  amount: number
  currency: string
  dueDate: string
  grade: string
  riskScore: number
  bidsReceived: number
  myBid: number | null
  status: string
  auctionContractId: string
  auctionEnd: string
}

interface BidResult { ok: boolean; message?: string; transactionId?: string; error?: string }

const panel = 'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900'

const gradeStyle: Record<string, string> = {
  A: 'bg-emerald-500 text-white',
  B: 'bg-violet-500 text-white',
  C: 'bg-amber-500 text-white',
  D: 'bg-red-500 text-white',
}

// Per-grade visual identity for the marketplace cards — a quick color scan
// tells a financier the risk tier before they read a single number.
const gradeGlow: Record<string, { bar: string; badge: string; corner: string; text: string; hoverShadow: string }> = {
  A: {
    bar: 'from-emerald-500 via-emerald-400 to-emerald-500',
    badge: 'bg-emerald-500 text-white shadow-emerald-500/40',
    corner: 'bg-emerald-400/25',
    text: 'from-emerald-600 to-emerald-400 dark:from-emerald-300 dark:to-emerald-500',
    hoverShadow: 'hover:shadow-emerald-500/10',
  },
  B: {
    bar: 'from-violet-500 via-violet-400 to-violet-500',
    badge: 'bg-violet-500 text-white shadow-violet-500/40',
    corner: 'bg-violet-400/25',
    text: 'from-violet-600 to-violet-400 dark:from-violet-300 dark:to-violet-500',
    hoverShadow: 'hover:shadow-violet-500/10',
  },
  C: {
    bar: 'from-amber-500 via-amber-400 to-amber-500',
    badge: 'bg-amber-500 text-white shadow-amber-500/40',
    corner: 'bg-amber-400/25',
    text: 'from-amber-600 to-amber-400 dark:from-amber-300 dark:to-amber-500',
    hoverShadow: 'hover:shadow-amber-500/10',
  },
  D: {
    bar: 'from-red-500 via-red-400 to-red-500',
    badge: 'bg-red-500 text-white shadow-red-500/40',
    corner: 'bg-red-400/25',
    text: 'from-red-600 to-red-400 dark:from-red-300 dark:to-red-500',
    hoverShadow: 'hover:shadow-red-500/10',
  },
  default: {
    bar: 'from-slate-400 via-slate-300 to-slate-400',
    badge: 'bg-slate-400 text-white shadow-slate-400/30',
    corner: 'bg-slate-400/20',
    text: 'from-slate-700 to-slate-500 dark:from-slate-200 dark:to-slate-400',
    hoverShadow: 'hover:shadow-slate-400/10',
  },
}

function daysUntil(dateStr: string): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86_400_000))
}

// Ticks its own interval rather than the parent re-rendering the whole grid
// every second — each card's countdown is cheap and fully isolated.
function CountdownChip({ auctionEnd, settled }: { auctionEnd: string; settled: boolean }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (settled || !auctionEnd) return
    const msLeft = new Date(auctionEnd).getTime() - Date.now()
    // Sub-minute precision only matters in the closing minutes — tick fast
    // there, slow everywhere else, so a marketplace full of cards never
    // burns cycles on listings ending days from now.
    const tick = msLeft < 90_000 ? 1_000 : msLeft < 3_600_000 ? 15_000 : 60_000
    const id = setInterval(() => setNow(Date.now()), tick)
    return () => clearInterval(id)
  }, [auctionEnd, settled])

  if (settled) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500">
        <CheckCircle className="h-3 w-3" />Settled
      </span>
    )
  }
  if (!auctionEnd) return null

  const msLeft = new Date(auctionEnd).getTime() - now
  const expired = msLeft <= 0

  if (expired) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-red-500">
        <Timer className="h-3 w-3" />Expiring…
      </span>
    )
  }

  const totalMin = Math.floor(msLeft / 60_000)
  const days = Math.floor(totalMin / 1440)
  const hours = Math.floor((totalMin % 1440) / 60)
  const mins = totalMin % 60
  const secs = Math.floor((msLeft % 60_000) / 1000)
  const label = days > 0 ? `${days}d ${hours}h left`
    : hours > 0 ? `${hours}h ${mins}m left`
    : `${mins}m ${secs}s left`

  // Urgency escalates the closer the auction gets to closing — a plain
  // "ends in 12m" is easy to miss; the color doing the work means a
  // financier scanning the grid catches it without reading every card.
  const urgent = msLeft < 3_600_000        // < 1h
  const soon = msLeft < 24 * 3_600_000     // < 1d

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide',
      urgent
        ? 'animate-pulse-slow border-red-500/30 bg-red-500/10 text-red-500'
        : soon
          ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
          : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
    )}>
      <Timer className="h-3 w-3" />{label}
    </span>
  )
}

function BidModal({ auction, onClose, onBidPlaced }: {
  auction: Auction
  onClose: () => void
  onBidPlaced: (auctionId: string, advanceRate: number) => void
}) {
  const { party } = useCanton()
  const { notify } = useNotifications()
  const [advance, setAdvance] = useState(85)
  const [annualRate, setAnnualRate] = useState(11.5)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<BidResult | null>(null)

  const netAmount = Math.round((auction.amount * advance) / 100)
  const yieldAmount = Math.round(netAmount * annualRate / 100)

  const handleSubmit = async () => {
    if (!party?.id) {
      setResult({ ok: false, error: 'Connect your Canton identity first.' })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/canton/contracts/submit-bid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          financierPartyId: party.id,
          sellerPartyId: auction.seller,
          platformPartyId: party.id,
          auctionContractId: auction.auctionContractId,
          advanceRate: advance / 100,
          annualRate: annualRate / 100,
        }),
      })
      const data = await res.json()
      setResult(data)
      if (data.ok) {
        onBidPlaced(auction.id, advance)
        notify('bid', 'Sealed bid submitted', `${auction.invoiceId || 'Auction'} · ${advance}% advance at ${annualRate}% APR. Only you and the platform can see it.`)
      }
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : 'Network error' })
    } finally {
      setSubmitting(false)
    }
  }

  if (result?.ok) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
        <div className={cn(panel, 'w-full max-w-sm p-8 text-center')}>
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-violet-500/15">
            <CheckCircle className="h-8 w-8 text-violet-600 dark:text-violet-300" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-slate-950 dark:text-white">Sealed Bid Submitted</h3>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">{result.message ?? 'Your bid is a private Canton contract, visible only to you and the platform.'}</p>
          <div className="mb-5 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left text-sm dark:border-slate-700 dark:bg-slate-950">
            <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Advance Rate</span><span className="font-data font-semibold text-slate-950 dark:text-white">{advance}%</span></div>
            <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Annual Rate</span><span className="font-data font-semibold text-slate-950 dark:text-white">{annualRate}%</span></div>
            <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Net to Seller</span><span className="font-data font-semibold text-violet-600 dark:text-violet-300">${netAmount.toLocaleString()}</span></div>
            {result.transactionId && (
              <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Canton Tx</span><span className="font-data max-w-[140px] truncate text-xs text-violet-600 dark:text-violet-300">{result.transactionId}</span></div>
            )}
          </div>
          <button onClick={onClose} className="w-full rounded-xl bg-violet-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-600">Done</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className={cn(panel, 'w-full max-w-md p-6')}>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="font-data text-[11px] uppercase tracking-[0.2em] text-violet-600 dark:text-violet-300">Sealed bid</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{auction.invoiceId || auction.id}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{auction.buyer} · <span className="font-data text-violet-600 dark:text-violet-300">${auction.amount.toLocaleString()}</span></p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-950 dark:hover:text-white"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-5">
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Advance rate</span>
              <span className="font-data font-bold text-slate-950 dark:text-white">{advance}%</span>
            </div>
            <input type="range" min={70} max={95} step={0.5} value={advance}
              onChange={e => setAdvance(Number(e.target.value))} className="w-full accent-violet-500" />
            <p className="mt-1 font-data text-xs text-slate-500 dark:text-slate-400">seller receives <span className="text-violet-600 dark:text-violet-300">${netAmount.toLocaleString()}</span> now</p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Annual rate</span>
              <span className="font-data font-bold text-slate-950 dark:text-white">{annualRate}%</span>
            </div>
            <input type="range" min={6} max={20} step={0.1} value={annualRate}
              onChange={e => setAnnualRate(Number(e.target.value))} className="w-full accent-violet-500" />
            <p className="mt-1 font-data text-xs text-slate-500 dark:text-slate-400">projected yield <span className="text-violet-600 dark:text-violet-300">${yieldAmount.toLocaleString()}</span> APR-basis</p>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl border border-violet-500/25 bg-violet-500/[0.06] p-3">
            <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-violet-600 dark:text-violet-300" />
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">Your bid becomes a private Canton contract. The seller and rival financiers cannot see it — enforced by the ledger's observer rules.</p>
          </div>

          {result && !result.ok && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <div>
                <p className="text-xs font-medium text-red-600 dark:text-red-300">Bid failed</p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{result.error}</p>
              </div>
            </div>
          )}

          <button onClick={handleSubmit} disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-600 disabled:opacity-60">
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
  const [gradeFilter, setGradeFilter] = useState<string>('all')
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null)
  const { party } = useCanton()
  const { notify: notifyCancel } = useNotifications()

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
              invoiceHash: p.invoiceHash?.value ?? p.invoiceHash ?? '',
              seller: p.seller?.value ?? p.seller ?? '',
              buyer: p.debtorName?.value ?? p.debtorName ?? 'Unknown',
              amount: Number(p.faceAmount?.value ?? p.faceAmount ?? 0),
              currency: p.currency?.value ?? p.currency ?? 'USD',
              dueDate: p.dueDate?.value ?? p.dueDate ?? '',
              grade: String(p.riskGrade?.value ?? p.riskGrade ?? '—').replace('Grade_', ''),
              riskScore: Number(p.aiScore?.value ?? p.aiScore ?? 0),
              bidsReceived: Number(p.bidCount?.value ?? p.bidCount ?? 0),
              myBid: null,
              status: p.settled ? 'settled' : 'open',
              auctionContractId: c.contractId,
              auctionEnd: p.auctionEnd?.value ?? p.auctionEnd ?? '',
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

  // Sellers can pull their own listing: CancelAuction archives the Auction
  // + RegistryEntry and recreates the invoice as Verified (relist anytime).
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const handleCancelListing = async (a: Auction) => {
    if (!party?.id) return
    if (!window.confirm(`Cancel the listing for ${a.invoiceId}? Bids received so far are discarded and the invoice returns to your Invoices page.`)) return
    setCancellingId(a.id)
    try {
      // The registry entry lives with the same hash prefix as the invoice —
      // look it up by invoiceId through the party's own view.
      const regRes = await fetch('/api/canton/contracts/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parties: [party.id], template: 'registry' }),
      })
      const regData = await regRes.json()
      const pv2 = (x: any) => (x && typeof x === 'object' && 'value' in x ? x.value : x)
      const reg = (regData.contracts || []).find((c: any) => String(pv2(c.payload?.invoiceHash) ?? '').includes(a.invoiceId))
      if (!reg) throw new Error('Could not find the registry entry for this listing')
      const res = await fetch('/api/canton/contracts/cancel-auction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellerPartyId: party.id,
          auctionContractId: a.auctionContractId,
          registryEntryContractId: reg.contractId,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setAuctions(prev => prev.filter(x => x.id !== a.id))
        notifyCancel('auction', 'Listing cancelled', `${a.invoiceId} was withdrawn from the marketplace. Find it back under Invoices (Verified).`)
      } else {
        window.alert(data.error ?? 'Cancel failed')
      }
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Network error')
    } finally {
      setCancellingId(null)
    }
  }

  // Settle: platform auto-picks the best sealed bid (seller never sees bid
  // terms — that's the whole point of sealed-bid privacy) and atomically
  // funds the invoice. Losing bids are rejected in their own transactions
  // so their contents never touch anything the seller can read.
  const [settlingId, setSettlingId] = useState<string | null>(null)
  const [settleResult, setSettleResult] = useState<{ auction: Auction; data: any } | null>(null)
  const handleSettleAuction = async (a: Auction) => {
    if (!party?.id) return
    if (!window.confirm(`Settle ${a.invoiceId}? The best sealed bid is accepted automatically and funds are committed atomically on Canton. This can't be undone.`)) return
    setSettlingId(a.id)
    try {
      const res = await fetch('/api/canton/contracts/settle-auction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellerPartyId: party.id,
          auctionContractId: a.auctionContractId,
          invoiceHash: a.invoiceHash,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setAuctions(prev => prev.filter(x => x.id !== a.id))
        setSettleResult({ auction: a, data })
        notifyCancel('auction', 'Auction settled', `${a.invoiceId} funded on Canton. Find it under Invoices as Funded.`)
      } else {
        window.alert(data.error ?? 'Settlement failed')
      }
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Network error')
    } finally {
      setSettlingId(null)
    }
  }

  const open = auctions.filter(a => a.status === 'open')
  const totalValue = open.reduce((s, a) => s + a.amount, 0)
  const filtered = gradeFilter === 'all' ? auctions : auctions.filter(a => a.grade === gradeFilter)

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Header title="Marketplace" />
      {selectedAuction && (
        <BidModal auction={selectedAuction} onClose={() => setSelectedAuction(null)} onBidPlaced={handleBidPlaced} />
      )}
      {settleResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className={cn(panel, 'w-full max-w-sm p-8 text-center')}>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-slate-950 dark:text-white">Auction Settled</h3>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
              {settleResult.auction.invoiceId} is funded on Canton — winner and loser bids resolved atomically.
            </p>
            <div className="mb-5 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left text-sm dark:border-slate-700 dark:bg-slate-950">
              <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Invoice</span><span className="font-data font-semibold text-slate-950 dark:text-white">${settleResult.auction.amount.toLocaleString()}</span></div>
              {settleResult.data.fundedInvoiceContractId && (
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">FundedInvoice</span><span className="font-data max-w-[140px] truncate text-xs text-emerald-600 dark:text-emerald-300">{settleResult.data.fundedInvoiceContractId.slice(0, 20)}…</span></div>
              )}
              <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Settlement Tx</span><span className="font-data max-w-[140px] truncate text-xs text-slate-500 dark:text-slate-400">{settleResult.data.transactionId?.slice(0, 20)}…</span></div>
              {settleResult.data.balanceTransferTransactionId && (
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Balance Transfer Tx</span><span className="font-data max-w-[140px] truncate text-xs text-emerald-600 dark:text-emerald-300">{settleResult.data.balanceTransferTransactionId.slice(0, 20)}…</span></div>
              )}
            </div>
            {settleResult.data.balanceTransferTransactionId && (
              <p className="mb-2 text-xs font-medium text-emerald-600 dark:text-emerald-300">Balance moved on-ledger — a separate, verifiable Canton transaction from the settlement itself.</p>
            )}
            <p className="mb-4 text-xs text-slate-400 dark:text-slate-500">Find it under Invoices as Funded — you can request repayment once the debtor pays you.</p>
            <button onClick={() => setSettleResult(null)} className="w-full rounded-xl bg-violet-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-600">Done</button>
          </div>
        </div>
      )}

      <div className="flex-1 space-y-5 overflow-y-auto p-4 md:p-6">

        {/* Market summary strip */}
        <div className="relative overflow-hidden rounded-3xl border border-violet-500/25 bg-gradient-to-br from-violet-500/[0.12] via-slate-50 to-transparent p-6 dark:from-violet-500/20 dark:via-slate-950">
          <div className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-3.5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 shadow-[0_0_24px_-6px_rgba(20,184,146,0.5)]">
                <Lock className="h-5 w-5 text-violet-600 dark:text-violet-300" />
              </span>
              <div>
                <p className="flex items-center gap-1.5 text-base font-bold text-slate-950 dark:text-white">
                  Sealed-bid auction floor <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Bids are private Canton contracts — rivals never see your numbers.</p>
              </div>
            </div>
            <div className="flex items-center gap-7">
              <div className="text-right">
                <p className="font-data text-2xl font-bold text-slate-950 dark:text-white">{loading ? '—' : open.length}</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Live listings</p>
              </div>
              <div className="text-right">
                <p className="font-data bg-gradient-to-br from-violet-600 to-emerald-500 bg-clip-text text-2xl font-bold text-transparent dark:from-violet-300 dark:to-emerald-300">
                  {loading ? '—' : `$${totalValue >= 1000 ? (totalValue / 1000).toFixed(0) + 'K' : totalValue}`}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Total face value</p>
              </div>
            </div>
          </div>
        </div>

        {/* Grade filter */}
        <div className="flex flex-wrap items-center gap-2">
          {['all', 'A', 'B', 'C', 'D'].map(g => (
            <button key={g} onClick={() => setGradeFilter(g)}
              className={cn('relative rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition-all',
                gradeFilter === g
                  ? 'border-violet-500 bg-violet-500 text-white shadow-[0_4px_16px_-4px_rgba(20,184,146,0.6)]'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-violet-500/50 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white')}>
              {g === 'all' ? 'All grades' : `Grade ${g}`}
            </button>
          ))}
        </div>

        {/* Listings */}
        {loading ? (
          <div className={cn(panel, 'flex flex-col items-center justify-center gap-3 py-16')}>
            <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading auctions from Canton…</p>
          </div>
        ) : !party ? (
          <div className={cn(panel, 'flex flex-col items-center justify-center gap-2 px-6 py-16 text-center')}>
            <Wallet className="h-6 w-6 text-slate-400 dark:text-slate-500" />
            <p className="text-sm font-medium text-slate-950 dark:text-white">Connect your Canton wallet</p>
            <p className="max-w-xs text-xs text-slate-500 dark:text-slate-400">Live auctions are read from the ledger. Connect a financier party to browse and bid.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className={cn(panel, 'flex flex-col items-center justify-center gap-2 px-6 py-16 text-center')}>
            <Store className="h-6 w-6 text-slate-400 dark:text-slate-500" />
            <p className="text-sm font-medium text-slate-950 dark:text-white">No auctions{gradeFilter !== 'all' ? ` in Grade ${gradeFilter}` : ' yet'}</p>
            <p className="max-w-xs text-xs text-slate-500 dark:text-slate-400">When sellers list verified invoices, the sealed-bid auctions appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((a, i) => {
                const dueIn = daysUntil(a.dueDate)
                const glow = gradeGlow[a.grade] ?? gradeGlow.default
                return (
                  <motion.div
                    key={a.id}
                    layout
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.35, delay: Math.min(i * 0.04, 0.3), ease: 'easeOut' }}
                    whileHover={{ y: -6 }}
                    className={cn(
                      'group relative flex flex-col overflow-hidden rounded-3xl border bg-white shadow-sm transition-shadow duration-300 dark:bg-slate-900',
                      'border-slate-200 hover:shadow-2xl dark:border-slate-800',
                      glow.hoverShadow,
                    )}
                  >
                    {/* Grade-tinted top accent bar */}
                    <div className={cn('h-1 w-full bg-gradient-to-r', glow.bar)} />

                    {/* Subtle corner glow, revealed on hover */}
                    <div className={cn('pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100', glow.corner)} />

                    {/* Card header: grade badge + live/countdown + status */}
                    <div className="relative flex items-center justify-between px-5 pt-4">
                      <div className="flex items-center gap-2.5">
                        <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl font-data text-sm font-bold shadow-lg', glow.badge)}>
                          {a.grade}
                        </span>
                        <div>
                          <p className="font-data text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">{a.id}</p>
                          {a.status === 'open' && (
                            <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />Live
                            </span>
                          )}
                        </div>
                      </div>
                      <CountdownChip auctionEnd={a.auctionEnd} settled={a.status !== 'open'} />
                    </div>

                    {/* Body */}
                    <div className="relative flex-1 space-y-4 p-5">
                      <div>
                        <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <Building2 className="h-3.5 w-3.5" />{a.buyer}
                        </p>
                        <p className="mt-1 truncate text-sm font-semibold text-slate-950 dark:text-white">{a.invoiceId || 'Invoice auction'}</p>
                      </div>

                      <div>
                        <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Face value</p>
                        <p className={cn('font-data bg-gradient-to-br bg-clip-text text-3xl font-bold text-transparent', glow.text)}>
                          ${a.amount.toLocaleString()}
                          <span className="ml-1.5 bg-none text-xs font-normal text-slate-400 [-webkit-text-fill-color:theme(colors.slate.400)]">{a.currency}</span>
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-slate-50 p-3 transition-colors group-hover:bg-slate-100 dark:bg-slate-950 dark:group-hover:bg-slate-800/60">
                          <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500"><Gauge className="h-3 w-3" />Risk score</p>
                          <div className="mt-1.5 flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                              <motion.div
                                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-400"
                                initial={{ width: 0 }}
                                animate={{ width: `${a.riskScore}%` }}
                                transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
                              />
                            </div>
                            <span className="font-data text-sm font-bold text-slate-950 dark:text-white">{a.riskScore || '—'}</span>
                          </div>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3 transition-colors group-hover:bg-slate-100 dark:bg-slate-950 dark:group-hover:bg-slate-800/60">
                          <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500"><CalendarDays className="h-3 w-3" />Due</p>
                          <p className="font-data mt-1.5 text-sm font-bold text-slate-950 dark:text-white">
                            {dueIn != null ? `${dueIn}d` : '—'}
                            <span className="ml-1 text-[10px] font-normal text-slate-400">{a.dueDate}</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Footer: bids + CTA */}
                    <div className="relative flex items-center justify-between border-t border-slate-100 px-5 py-3.5 dark:border-slate-800">
                      <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <Shield className="h-3.5 w-3.5 text-violet-500" />
                        <span className="font-data font-semibold text-slate-950 dark:text-white">{a.bidsReceived}</span> sealed bid{a.bidsReceived === 1 ? '' : 's'}
                        {a.myBid != null && <span className="font-data ml-1 text-violet-600 dark:text-violet-300">· yours: {a.myBid}%</span>}
                      </span>
                      {party?.id === a.seller ? (
                        /* Your own listing: you can't bid on it, but you can
                           settle it (once it has bids) or pull it entirely.
                           You never see bid terms — settlement picks the best
                           offer automatically, preserving sealed-bid privacy. */
                        <div className="flex items-center gap-2">
                          {a.bidsReceived > 0 && (
                            <motion.button
                              whileTap={{ scale: 0.96 }}
                              onClick={() => handleSettleAuction(a)}
                              disabled={settlingId === a.id}
                              className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-500/20 transition-colors hover:bg-emerald-600 disabled:opacity-60"
                            >
                              <TrendingUp className="h-3.5 w-3.5" />{settlingId === a.id ? 'Settling…' : `Settle (${a.bidsReceived})`}
                            </motion.button>
                          )}
                          <button
                            onClick={() => handleCancelListing(a)}
                            disabled={cancellingId === a.id || settlingId === a.id}
                            className="rounded-xl border border-red-500/40 px-3 py-2 text-xs font-semibold text-red-500 transition-colors hover:bg-red-500/10 disabled:opacity-60"
                          >
                            {cancellingId === a.id ? 'Cancelling…' : 'Cancel'}
                          </button>
                        </div>
                      ) : party?.type === 'business' ? (
                        /* Bidding is a financier action — a business identity
                           funding invoices doesn't make sense in this product's
                           model, so make that explicit instead of letting the
                           API silently accept it. */
                        <span className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-400 dark:border-slate-700 dark:text-slate-500" title="Bidding is for financier accounts. Connect or switch to a financier identity to bid.">
                          Financiers only
                        </span>
                      ) : (
                        <motion.button
                          whileTap={{ scale: 0.96 }}
                          onClick={() => a.status === 'open' && setSelectedAuction(a)}
                          disabled={a.status !== 'open'}
                          className={cn('flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all',
                            a.status === 'open'
                              ? 'bg-violet-500 text-white shadow-md shadow-violet-500/30 hover:bg-violet-600 hover:shadow-lg hover:shadow-violet-500/40'
                              : 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500')}
                        >
                          {a.status === 'open' ? <>Place bid<ArrowUpRight className="h-3.5 w-3.5" /></> : 'Settled'}
                        </motion.button>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
