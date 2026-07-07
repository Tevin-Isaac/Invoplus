'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/dashboard/Header'
import { Upload, Search, FileText, CheckCircle, Clock, XCircle, Zap, Loader2, AlertTriangle, X, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCanton } from '@/lib/canton'
import { useNotifications } from '@/lib/notifications'

type InvoiceStatus = 'funded' | 'bidding' | 'verified' | 'pending' | 'rejected'

const statusConfig: Record<InvoiceStatus, { label: string; icon: typeof CheckCircle; color: string }> = {
  funded:   { label: 'Funded',   icon: CheckCircle, color: 'text-emerald-700 bg-emerald-500/10 border-emerald-500/25 dark:text-emerald-300' },
  bidding:  { label: 'Bidding',  icon: Zap,         color: 'text-violet-700 bg-violet-500/10 border-violet-500/25 dark:text-violet-300' },
  verified: { label: 'Verified', icon: FileText,    color: 'text-sky-700 bg-sky-500/10 border-sky-500/25 dark:text-sky-300' },
  pending:  { label: 'Pending',  icon: Clock,       color: 'text-amber-700 bg-amber-500/10 border-amber-500/25 dark:text-amber-300' },
  rejected: { label: 'Rejected', icon: XCircle,     color: 'text-red-700 bg-red-500/10 border-red-500/25 dark:text-red-300' },
}

interface ScoreResult {
  ok: boolean
  contractId?: string
  invoiceId?: string
  invoiceHash?: string
  riskScore?: number
  riskGrade?: string
  advanceRateRange?: string
  tenorDays?: number
  summary?: string
  riskFactors?: string[]
  positiveFactors?: string[]
  cantonTemplateId?: string
  error?: string
}

interface ListOutcome {
  ok: boolean
  auctionContractId?: string
  auctionEnd?: string
  durationHours?: number
  message?: string
  error?: string
}

const today = new Date().toISOString().split('T')[0]
const panel = 'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900'
const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-violet-500/60 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500'

export default function InvoicesPage() {
  const { party } = useCanton()
  const { notify } = useNotifications()
  const [invoices, setInvoices] = useState<any[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [drag, setDrag] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<ScoreResult | null>(null)
  const [listing, setListing] = useState(false)
  const [listOutcome, setListOutcome] = useState<ListOutcome | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    invoiceId: '', debtorName: '', debtorTaxId: '', amount: '',
    currency: 'USD', issueDate: today, dueDate: '',
  })

  const lc = (s: string) => (s || '').toLowerCase()
  const filtered = invoices
    .filter(i => filter === 'all' || lc(i.status) === filter)
    .filter(i => !search || i.buyer.toLowerCase().includes(search.toLowerCase()) || i.id.toLowerCase().includes(search.toLowerCase()))

  useEffect(() => {
    if (!party?.id) return
    const load = async () => {
      try {
        const res = await fetch('/api/canton/contracts/list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parties: [party.id], template: 'invoice' }),
        })
        const data = await res.json()
        if (data.ok) {
          const rows = (data.contracts || []).map((c: any) => {
            const p = c.payload || {}
            const face = p.faceAmount && (p.faceAmount.value ?? p.faceAmount) ? Number(p.faceAmount.value ?? p.faceAmount) : 0
            return {
              id: c.contractId,
              buyer: (p.debtorName?.value ?? p.debtorName) || 'Unknown',
              amount: face,
              currency: (p.currency?.value ?? p.currency) || 'USD',
              dueDate: (p.dueDate?.value ?? p.dueDate) || '',
              status: (p.status?.value ?? p.status) || (p.settled ? 'funded' : 'pending'),
              grade: (p.riskGrade?.value ?? p.riskGrade) || '—',
              aiScore: Number(p.aiScore?.value ?? p.aiScore ?? 0),
            }
          })
          setInvoices(rows)
        }
      } catch { /* keep empty state */ }
    }
    load()
  }, [party])

  // Two ledger transactions, in the order the Daml contract enforces:
  // 1. VerifyInvoice (platform choice) — archives the Pending invoice and
  //    creates a Verified replacement (contracts are immutable on Canton).
  // 2. ListForAuction on the NEW contract — atomically creates the Auction
  //    plus the anti-fraud RegistryEntry. Listing an unverified invoice
  //    fails on-ledger with "Invoice must be Verified".
  const [listStage, setListStage] = useState<'verify' | 'list' | null>(null)
  const handleListForAuction = async () => {
    if (!result?.contractId || !party?.id) return
    setListing(true)
    setListOutcome(null)
    try {
      setListStage('verify')
      const vres = await fetch('/api/canton/contracts/verify-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platformPartyId: party.id,
          invoiceContractId: result.contractId,
          invoiceNumber: result.invoiceId,
          debtorName: form.debtorName,
          amount: parseFloat(form.amount),
          currency: form.currency,
          issueDate: form.issueDate,
          dueDate: form.dueDate,
        }),
      })
      const vdata = await vres.json()
      if (!vdata.ok || !vdata.newInvoiceContractId) {
        setListOutcome({ ok: false, error: vdata.error ?? 'Verification failed on Canton' })
        return
      }

      setListStage('list')
      const res = await fetch('/api/canton/contracts/list-auction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellerPartyId: party.id,
          platformPartyId: party.id,
          invoiceContractId: vdata.newInvoiceContractId,
          invoiceHash: result.invoiceHash,
          minAdvanceRate: 0.8,
          maxAnnualRate: 0.18,
          durationHours: 72,
        }),
      })
      const data = await res.json()
      setListOutcome(data)
      if (data.ok) {
        notify('auction', 'Listed for sealed-bid auction', `${result.invoiceId ?? 'Your invoice'} is live in the marketplace for ${data.durationHours ?? 72}h. You'll be notified as sealed bids arrive.`)
      }
    } catch (e) {
      setListOutcome({ ok: false, error: e instanceof Error ? e.message : 'Network error' })
    } finally {
      setListing(false)
      setListStage(null)
    }
  }

  const handleSubmit = async () => {
    if (!form.debtorName || !form.amount || !form.dueDate) return
    if (!party?.id) {
      setResult({ ok: false, error: 'Connect your Canton identity first — the invoice is signed by your party on the ledger.' })
      return
    }
    setSubmitting(true)
    setResult(null)
    setListOutcome(null)
    try {
      const res = await fetch('/api/canton/contracts/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellerPartyId: party.id,
          platformPartyId: party.id,
          invoiceId: form.invoiceId || `INV-${Date.now()}`,
          debtorName: form.debtorName,
          debtorTaxId: form.debtorTaxId,
          faceAmount: parseFloat(form.amount),
          currency: form.currency,
          issueDate: form.issueDate,
          dueDate: form.dueDate,
        }),
      })
      const data = await res.json()
      setResult(data)
      if (data.ok) {
        setShowForm(false)
        notify('invoice', 'Invoice created on Canton', `${data.invoiceId} · ${form.debtorName} · risk grade ${data.riskGrade} (score ${data.riskScore}/100).`)
      }
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : 'Network error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Header title="Invoices" />
      <div className="flex-1 space-y-5 overflow-y-auto p-4 md:p-6">

        {/* Upload zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); setShowForm(true) }}
          onClick={() => !submitting && setShowForm(true)}
          className={cn(
            'relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed p-8 text-center transition-all md:p-10',
            drag
              ? 'border-violet-500 bg-violet-500/10'
              : 'border-slate-300 bg-white hover:border-violet-500/60 hover:bg-violet-500/[0.03] dark:border-slate-700 dark:bg-slate-900/60'
          )}
        >
          {submitting ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-violet-500" />
              <p className="text-sm font-semibold text-slate-950 dark:text-white">Submitting to Canton ledger…</p>
              <p className="font-data text-xs text-slate-500 dark:text-slate-400">InvoiceContract · risk scoring · registry entry</p>
            </div>
          ) : (
            <div>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10">
                <Upload className="h-6 w-6 text-violet-600 dark:text-violet-300" />
              </div>
              <p className="mb-1 text-sm font-semibold text-slate-950 dark:text-white">Submit invoice to Canton Network</p>
              <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
                Creates a real <span className="font-data text-violet-600 dark:text-violet-300">InvoiceContract</span> on the ledger · risk scored · anti-fraud registry entry, atomically
              </p>
              <span className="rounded-xl bg-violet-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-violet-600">
                New Invoice
              </span>
            </div>
          )}
        </div>

        {/* Invoice form */}
        {showForm && !submitting && (
          <div className={cn(panel, 'space-y-4 border-violet-500/40 p-5 md:p-6')}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-violet-600 dark:text-violet-300" />
                <h3 className="text-sm font-semibold text-slate-950 dark:text-white">New Invoice → Canton InvoiceContract</h3>
              </div>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-950 dark:hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                { label: 'Invoice Number', key: 'invoiceId', placeholder: 'INV-2026-0043' },
                { label: 'Debtor Company (who owes you)', key: 'debtorName', placeholder: 'GlobalTech Solutions Ltd' },
                { label: 'Debtor Tax ID (for fraud check)', key: 'debtorTaxId', placeholder: 'GB123456789' },
                { label: 'Amount', key: 'amount', placeholder: '125000', type: 'number' },
              ].map(f => (
                <div key={f.key}>
                  <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">{f.label}</label>
                  <input
                    value={(form as any)[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    type={f.type ?? 'text'}
                    className={inputCls}
                  />
                </div>
              ))}
              <div>
                <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Currency</label>
                <select value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))} className={inputCls}>
                  {['USD', 'EUR', 'GBP', 'CHF', 'CAD', 'AUD'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Due Date</label>
                <input value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
                  type="date" min={today} className={inputCls} />
              </div>
            </div>

            <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
              <p className="mb-2 text-xs font-semibold text-slate-950 dark:text-white">What happens on Canton when you submit:</p>
              {[
                'InvoiceContract created with your party as signatory',
                'Risk score computed (tenor, amount, currency, debtor profile)',
                'RegistryEntry created — blocks double financing',
                'Invoice status: Pending → awaiting platform verification',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="font-data shrink-0 text-xs font-bold text-violet-600 dark:text-violet-300">{i + 1}.</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{step}</p>
                </div>
              ))}
            </div>

            {!party && (
              <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                Connect your Canton wallet first to submit as a real party on the ledger.
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!form.debtorName || !form.amount || !form.dueDate}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-600 disabled:opacity-50"
            >
              <ShieldCheck className="h-4 w-4" />
              Create InvoiceContract on Canton
            </button>
          </div>
        )}

        {/* Canton result */}
        {result && (
          <div className={cn(panel, 'space-y-4 p-5 md:p-6', result.ok ? 'border-emerald-500/40' : 'border-red-500/40')}>
            {result.ok ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm font-semibold text-slate-950 dark:text-white">InvoiceContract created on Canton</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn('font-data rounded-md border px-2.5 py-1 text-xs font-bold',
                      result.riskGrade === 'A' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' :
                      result.riskGrade === 'B' ? 'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300' :
                      'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                    )}>Grade {result.riskGrade}</span>
                    <span className="font-data text-2xl font-bold text-slate-950 dark:text-white">{result.riskScore}<span className="text-sm text-slate-500 dark:text-slate-400">/100</span></span>
                  </div>
                </div>

                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${result.riskScore}%`, background: (result.riskScore ?? 0) >= 80 ? '#34D399' : (result.riskScore ?? 0) >= 60 ? '#14B892' : '#F59E0B' }} />
                </div>

                <p className="text-sm italic text-slate-500 dark:text-slate-400">"{result.summary}"</p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[
                    { label: 'Contract ID', val: result.contractId?.slice(0, 20) + '…' },
                    { label: 'Advance Rate Range', val: result.advanceRateRange },
                    { label: 'Tenor', val: `${result.tenorDays} days` },
                  ].map(item => (
                    <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
                      <p className="text-xs text-slate-500 dark:text-slate-400">{item.label}</p>
                      <p className="font-data truncate text-sm font-medium text-slate-950 dark:text-white">{item.val}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {(result.positiveFactors ?? []).length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">Positive Factors</p>
                      <ul className="space-y-1">{result.positiveFactors?.map((f, i) => <li key={i} className="flex gap-1.5 text-xs text-slate-500 dark:text-slate-400"><span className="text-emerald-500">+</span>{f}</li>)}</ul>
                    </div>
                  )}
                  {(result.riskFactors ?? []).length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold text-amber-600 dark:text-amber-400">Risk Factors</p>
                      <ul className="space-y-1">{result.riskFactors?.map((f, i) => <li key={i} className="flex gap-1.5 text-xs text-slate-500 dark:text-slate-400"><span className="text-amber-500">−</span>{f}</li>)}</ul>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
                  <p className="font-data text-xs text-slate-500 dark:text-slate-400">{result.cantonTemplateId}</p>
                </div>

                {listOutcome?.ok ? (
                  <div className="space-y-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                      <p className="text-sm font-semibold text-slate-950 dark:text-white">Listed for sealed-bid auction</p>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Auction runs {listOutcome.durationHours ?? 72}h — financiers can now bid blind. Auction + anti-fraud registry entry created in one atomic Canton transaction.
                    </p>
                    {listOutcome.auctionContractId && (
                      <p className="font-data truncate text-xs text-slate-400 dark:text-slate-500">{listOutcome.auctionContractId}</p>
                    )}
                    <a href="/dashboard/marketplace" className="inline-block text-xs font-semibold text-violet-600 hover:underline dark:text-violet-300">
                      View it in the marketplace →
                    </a>
                  </div>
                ) : (
                  <>
                    {listOutcome && !listOutcome.ok && (
                      <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                        <div>
                          <p className="text-xs font-medium text-red-600 dark:text-red-300">Listing failed</p>
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{listOutcome.error}</p>
                        </div>
                      </div>
                    )}
                    <button
                      onClick={handleListForAuction}
                      disabled={listing || !party}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-600 disabled:opacity-60"
                    >
                      {listing && <Loader2 className="h-4 w-4 animate-spin" />}
                      {listing
                        ? (listStage === 'verify' ? 'Verifying invoice on Canton…' : 'Creating auction + registry entry…')
                        : 'List for Sealed-Bid Auction →'}
                    </button>
                  </>
                )}
              </>
            ) : (
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <div>
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">Submission failed</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{result.error}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filters + search */}
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-2">
            {['all', 'pending', 'verified', 'bidding', 'funded'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={cn('rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-all',
                  filter === f
                    ? 'border-violet-500 bg-violet-500 text-white'
                    : 'border-slate-200 bg-white text-slate-500 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white')}>
                {f === 'all' ? 'All Invoices' : f}
              </button>
            ))}
          </div>
          <div className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 sm:w-auto">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search invoices…"
              className="w-full bg-transparent text-slate-950 outline-none placeholder:text-slate-400 dark:text-white sm:w-40"
            />
          </div>
        </div>

        {/* Invoice list — table on desktop, cards on mobile */}
        <div className={cn(panel, 'overflow-hidden')}>
          <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 border-b border-slate-200 px-5 py-3.5 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500 dark:border-slate-800 dark:text-slate-400 md:grid">
            <span>Invoice / Debtor</span><span>Amount</span><span>Due Date</span>
            <span>Risk Score</span><span>Status</span><span>Action</span>
          </div>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
              <FileText className="h-5 w-5 text-slate-400 dark:text-slate-500" />
              <p className="text-sm font-medium text-slate-950 dark:text-white">{party ? 'No invoices yet' : 'Connect your Canton wallet'}</p>
              <p className="max-w-xs text-xs text-slate-500 dark:text-slate-400">
                {party ? 'Submit your first invoice above and it lands here as a live contract.' : 'Invoices are read from your party\'s contracts on the ledger.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map(inv => {
                const sc = statusConfig[lc(inv.status) as InvoiceStatus] ?? statusConfig.pending
                const Icon = sc.icon
                return (
                  <div key={inv.id} className="grid grid-cols-1 gap-3 px-5 py-4 transition-colors hover:bg-violet-500/[0.04] md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] md:items-center md:gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-xs font-bold text-violet-600 dark:text-violet-300">{inv.buyer[0]}</div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-950 dark:text-white">{inv.buyer}</p>
                        <p className="font-data truncate text-xs text-slate-400 dark:text-slate-500">{inv.id.slice(0, 24)}…</p>
                      </div>
                    </div>
                    <span className="font-data text-sm font-bold text-violet-600 dark:text-violet-300">
                      <span className="mr-2 text-[10px] uppercase text-slate-400 md:hidden">Amount</span>${inv.amount.toLocaleString()}
                    </span>
                    <span className="font-data text-sm text-slate-500 dark:text-slate-400">
                      <span className="mr-2 text-[10px] uppercase text-slate-400 md:hidden">Due</span>{inv.dueDate}
                    </span>
                    <div className="flex items-center gap-2">
                      {inv.aiScore > 0 ? (
                        <>
                          <div className="h-1.5 max-w-16 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-400" style={{ width: `${inv.aiScore}%` }} />
                          </div>
                          <span className="font-data text-xs font-medium text-slate-950 dark:text-white">{inv.aiScore}</span>
                        </>
                      ) : <span className="text-xs text-slate-400 dark:text-slate-500">Pending</span>}
                    </div>
                    <span className={cn('inline-flex w-fit items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium', sc.color)}>
                      <Icon className="h-3 w-3" />{sc.label}
                    </span>
                    <div>
                      {lc(inv.status) === 'verified' && (
                        <a href="/dashboard/marketplace" className="rounded-lg bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-600 transition-all hover:bg-violet-500 hover:text-white dark:text-violet-300">List for Bids</a>
                      )}
                      {lc(inv.status) === 'bidding' && (
                        <a href="/dashboard/marketplace" className="rounded-lg bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-600 transition-all hover:bg-violet-500 hover:text-white dark:text-violet-300">View Offers</a>
                      )}
                      {['funded', 'pending'].includes(lc(inv.status)) && <span className="hidden text-xs text-slate-400 md:inline">—</span>}
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
