'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/dashboard/Header'
import { BalanceCard } from '@/components/dashboard/BalanceCard'
import { Lock, Shield, CheckCircle, Loader2, AlertTriangle, X, EyeOff, Wallet, Store, Building2, CalendarDays, Gauge } from 'lucide-react'
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
}

interface BidResult { ok: boolean; message?: string; transactionId?: string; error?: string }

const panel = 'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900'

const gradeStyle: Record<string, string> = {
  A: 'bg-emerald-500 text-white',
  B: 'bg-violet-500 text-white',
  C: 'bg-amber-500 text-white',
  D: 'bg-red-500 text-white',
}

function daysUntil(dateStr: string): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86_400_000))
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
              <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Canton Tx</span><span className="font-data max-w-[140px] truncate text-xs text-slate-500 dark:text-slate-400">{settleResult.data.transactionId?.slice(0, 20)}…</span></div>
            </div>
            <p className="mb-4 text-xs text-slate-400 dark:text-slate-500">Find it under Invoices as Funded — you can request repayment once the debtor pays you.</p>
            <button onClick={() => setSettleResult(null)} className="w-full rounded-xl bg-violet-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-600">Done</button>
          </div>
        </div>
      )}

      <div className="flex-1 space-y-5 overflow-y-auto p-4 md:p-6">

        <BalanceCard />

        {/* Market summary strip */}
        <div className="relative overflow-hidden rounded-2xl border border-violet-500/25 bg-gradient-to-r from-violet-500/10 via-transparent to-transparent p-5 dark:from-violet-500/15">
          <div className="pointer-events-none absolute -top-20 -right-12 h-48 w-48 rounded-full bg-violet-500/15 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15">
                <Lock className="h-4 w-4 text-violet-600 dark:text-violet-300" />
              </span>
              <div>
                <p className="font-semibold text-slate-950 dark:text-white">Sealed-bid auction floor</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Bids are private Canton contracts — rivals never see your numbers.</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="font-data text-xl font-bold text-slate-950 dark:text-white">{loading ? '—' : open.length}</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Live listings</p>
              </div>
              <div className="text-right">
                <p className="font-data text-xl font-bold text-violet-600 dark:text-violet-300">{loading ? '—' : `$${totalValue >= 1000 ? (totalValue / 1000).toFixed(0) + 'K' : totalValue}`}</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Total face value</p>
              </div>
            </div>
          </div>
        </div>

        {/* Grade filter */}
        <div className="flex flex-wrap items-center gap-2">
          {['all', 'A', 'B', 'C', 'D'].map(g => (
            <button key={g} onClick={() => setGradeFilter(g)}
              className={cn('rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
                gradeFilter === g
                  ? 'border-violet-500 bg-violet-500 text-white'
                  : 'border-slate-200 bg-white text-slate-500 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white')}>
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map(a => {
              const dueIn = daysUntil(a.dueDate)
              return (
                <div key={a.id} className={cn(panel, 'group flex flex-col overflow-hidden transition-all hover:-translate-y-1 hover:border-violet-500/50 hover:shadow-lg')}>
                  {/* Card header: grade ribbon + status */}
                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg font-data text-xs font-bold', gradeStyle[a.grade] ?? 'bg-slate-400 text-white')}>
                        {a.grade}
                      </span>
                      <span className="font-data text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">{a.id}</span>
                    </div>
                    <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide',
                      a.status === 'open'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500')}>
                      {a.status === 'open' ? '● Live' : 'Settled'}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="flex-1 space-y-4 p-5">
                    <div>
                      <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <Building2 className="h-3.5 w-3.5" />{a.buyer}
                      </p>
                      <p className="mt-1 truncate font-semibold text-slate-950 dark:text-white">{a.invoiceId || 'Invoice auction'}</p>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Face value</p>
                      <p className="font-data text-3xl font-bold text-slate-950 dark:text-white">${a.amount.toLocaleString()}
                        <span className="ml-1.5 text-xs font-normal text-slate-400">{a.currency}</span>
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
                        <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500"><Gauge className="h-3 w-3" />Risk score</p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                            <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-400" style={{ width: `${a.riskScore}%` }} />
                          </div>
                          <span className="font-data text-sm font-bold text-slate-950 dark:text-white">{a.riskScore || '—'}</span>
                        </div>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
                        <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500"><CalendarDays className="h-3 w-3" />Due</p>
                        <p className="font-data mt-1.5 text-sm font-bold text-slate-950 dark:text-white">
                          {dueIn != null ? `${dueIn}d` : '—'}
                          <span className="ml-1 text-[10px] font-normal text-slate-400">{a.dueDate}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Footer: bids + CTA */}
                  <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5 dark:border-slate-800">
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
                          <button
                            onClick={() => handleSettleAuction(a)}
                            disabled={settlingId === a.id}
                            className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-60"
                          >
                            {settlingId === a.id ? 'Settling…' : `Settle (${a.bidsReceived})`}
                          </button>
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
                      <button
                        onClick={() => a.status === 'open' && setSelectedAuction(a)}
                        disabled={a.status !== 'open'}
                        className={cn('rounded-xl px-4 py-2 text-xs font-semibold transition-colors',
                          a.status === 'open'
                            ? 'bg-violet-500 text-white hover:bg-violet-600'
                            : 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500')}
                      >
                        {a.status === 'open' ? 'Place bid' : 'Settled'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
