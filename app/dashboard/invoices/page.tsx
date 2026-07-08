'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/dashboard/Header'
import { Upload, Search, FileText, CheckCircle, Clock, XCircle, Zap, Loader2, AlertTriangle, X, ShieldCheck, Pencil, Trash2 } from 'lucide-react'
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
  // Tax ID is optional (most invoices worldwide don't carry one) — the
  // server derives a deterministic reference when it's blank or short.
  // Only a hard on-ledger limit (>30 chars) blocks submission.
  const taxIdValid = form.debtorTaxId.trim().length <= 30
  const filtered = invoices
    .filter(i => filter === 'all' || lc(i.status) === filter)
    .filter(i => !search || i.buyer.toLowerCase().includes(search.toLowerCase()) || i.id.toLowerCase().includes(search.toLowerCase()))

  const vv = (x: any) => (x && typeof x === 'object' && 'value' in x ? x.value : x)

  useEffect(() => {
    if (!party?.id) return
    const post = async (template: string) => {
      try {
        const res = await fetch('/api/canton/contracts/list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parties: [party.id], template }),
        })
        const data = await res.json()
        return data.ok ? (data.contracts || []) : []
      } catch { return [] }
    }
    const load = async () => {
      // Once listed, the original InvoiceContract is archived and replaced
      // by an Auction (then a FundedInvoice at settlement) — Daml contracts
      // are immutable, so the invoice's lifecycle only shows in full by
      // merging all three templates instead of querying 'invoice' alone.
      const [invoiceContracts, auctionContracts, fundedContracts] = await Promise.all([
        post('invoice'), post('auction'), post('funded'),
      ])

      const pending: any[] = invoiceContracts.map((c: any) => {
        const p = c.payload || {}
        const face = p.faceAmount ? Number(vv(p.faceAmount)) : 0
        return {
          id: c.contractId,
          invoiceId: vv(p.invoiceId) || '',
          buyer: vv(p.debtorName) || 'Unknown',
          taxId: vv(p.debtorTaxId) || '',
          amount: face,
          currency: vv(p.currency) || 'USD',
          issueDate: vv(p.issueDate) || '',
          dueDate: vv(p.dueDate) || '',
          status: lc(vv(p.status) || 'pending'),
          grade: vv(p.riskGrade) || '—',
          aiScore: Number(vv(p.aiScore) ?? 0),
        }
      })

      // Listed invoices only exist as sellers' own Auctions now.
      const mine = (list: any[]) => list.filter((c: any) => vv(c.payload?.seller) === party.id)
      const bidding: any[] = mine(auctionContracts).filter((c: any) => !vv(c.payload?.settled)).map((c: any) => {
        const p = c.payload || {}
        return {
          id: c.contractId,
          invoiceId: vv(p.invoiceId) || '',
          buyer: vv(p.debtorName) || 'Unknown',
          taxId: '',
          amount: Number(vv(p.faceAmount) ?? 0),
          currency: vv(p.currency) || 'USD',
          issueDate: '',
          dueDate: vv(p.dueDate) || '',
          status: 'bidding',
          grade: String(vv(p.riskGrade) ?? '—').replace('Grade_', ''),
          aiScore: Number(vv(p.aiScore) ?? 0),
          bidsReceived: Number(p.bidCount?.value ?? p.bidCount ?? 0),
        }
      })

      const funded: any[] = mine(fundedContracts).map((c: any) => {
        const p = c.payload || {}
        return {
          id: c.contractId,
          invoiceId: vv(p.invoiceId) || '',
          buyer: vv(p.debtorName) || 'Unknown',
          taxId: '',
          amount: Number(vv(p.faceAmount) ?? 0),
          currency: vv(p.currency) || 'USD',
          issueDate: '',
          dueDate: vv(p.dueDate) || '',
          status: 'funded',
          grade: '—',
          aiScore: 0,
          financierPartyId: vv(p.financier),
          fundedAmount: Number(vv(p.fundedAmount) ?? 0),
        }
      })

      setInvoices([...pending, ...bidding, ...funded])
    }
    load()
  }, [party])

  // Edit = archive + recreate atomically on-ledger (contracts are
  // immutable); the form is reused in "edit mode" targeting this contract.
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [rowError, setRowError] = useState<string | null>(null)

  // Repayment: once the debtor has paid the seller off-chain, the seller
  // closes the loop with the financier. Chains RepayFinancier -> Approve ->
  // Complete in one call (see complete-repayment route for why).
  const [repayingId, setRepayingId] = useState<string | null>(null)
  const [repayResult, setRepayResult] = useState<{ inv: any; data: any } | null>(null)
  const handleMarkRepaid = async (inv: any) => {
    if (!party?.id) return
    if (!window.confirm(`Mark ${inv.invoiceId} as repaid? This sends principal + yield to the financier on Canton and can't be undone.`)) return
    setRepayingId(inv.id)
    setRowError(null)
    try {
      const res = await fetch('/api/canton/contracts/complete-repayment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellerPartyId: party.id,
          financierPartyId: inv.financierPartyId,
          fundedInvoiceContractId: inv.id,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setInvoices(prev => prev.filter(i => i.id !== inv.id))
        setRepayResult({ inv, data })
        notify('info', 'Repayment complete', `${inv.invoiceId} — financier repaid in full on Canton.`)
      } else {
        setRowError(data.error ?? 'Repayment failed')
      }
    } catch (e) {
      setRowError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setRepayingId(null)
    }
  }

  const startEdit = (inv: any) => {
    setForm({
      invoiceId: inv.invoiceId,
      debtorName: inv.buyer,
      debtorTaxId: inv.taxId,
      amount: String(inv.amount),
      currency: inv.currency,
      issueDate: inv.issueDate || today,
      dueDate: inv.dueDate,
    })
    setEditingId(inv.id)
    setResult(null)
    setListOutcome(null)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (inv: any) => {
    if (!party?.id) return
    if (!window.confirm(`Delete invoice ${inv.invoiceId || ''} (${inv.buyer})? This archives it on the ledger.`)) return
    setDeletingId(inv.id)
    setRowError(null)
    try {
      const res = await fetch('/api/canton/contracts/delete-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sellerPartyId: party.id, invoiceContractId: inv.id }),
      })
      const data = await res.json()
      if (data.ok) {
        setInvoices(prev => prev.filter(i => i.id !== inv.id))
        notify('info', 'Invoice deleted', `${inv.invoiceId || inv.buyer} was archived on Canton.`)
      } else {
        setRowError(data.error ?? 'Delete failed')
      }
    } catch (e) {
      setRowError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setDeletingId(null)
    }
  }

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
    if (!form.debtorName || !form.amount || !form.dueDate || !taxIdValid) return
    if (!party?.id) {
      setResult({ ok: false, error: 'Connect your Canton identity first — the invoice is signed by your party on the ledger.' })
      return
    }
    setSubmitting(true)
    setResult(null)
    setListOutcome(null)
    try {
      // Same form drives create and edit; edit hits update-invoice which
      // archives the old contract and creates the replacement atomically.
      const endpoint = editingId ? '/api/canton/contracts/update-invoice' : '/api/canton/contracts/create-invoice'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellerPartyId: party.id,
          platformPartyId: party.id,
          ...(editingId ? { invoiceContractId: editingId } : {}),
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
        if (editingId) {
          setInvoices(prev => prev.map(i => i.id === editingId ? {
            ...i, id: data.contractId, invoiceId: data.invoiceId, buyer: form.debtorName,
            taxId: form.debtorTaxId, amount: parseFloat(form.amount), currency: form.currency,
            issueDate: form.issueDate, dueDate: form.dueDate, status: 'pending',
            grade: data.riskGrade ?? i.grade, aiScore: data.riskScore ?? i.aiScore,
          } : i))
          notify('invoice', 'Invoice updated on Canton', `${data.invoiceId} re-scored: grade ${data.riskGrade} (${data.riskScore}/100). Status reset to Pending.`)
          setEditingId(null)
        } else {
          notify('invoice', 'Invoice created on Canton', `${data.invoiceId} · ${form.debtorName} · risk grade ${data.riskGrade} (score ${data.riskScore}/100).`)
        }
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
      {repayResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className={cn(panel, 'w-full max-w-sm p-8 text-center')}>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-slate-950 dark:text-white">Repayment Complete</h3>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
              {repayResult.inv.invoiceId} — the financier has been repaid in full on Canton.
            </p>
            <div className="mb-5 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left text-sm dark:border-slate-700 dark:bg-slate-950">
              <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Principal + Yield</span><span className="font-data font-semibold text-slate-950 dark:text-white">${repayResult.inv.amount.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Confirmation Tx</span><span className="font-data max-w-[140px] truncate text-xs text-slate-500 dark:text-slate-400">{repayResult.data.transactionId?.slice(0, 20)}…</span></div>
              {repayResult.data.balanceTransferTransactionId && (
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Balance Transfer Tx</span><span className="font-data max-w-[140px] truncate text-xs text-emerald-600 dark:text-emerald-300">{repayResult.data.balanceTransferTransactionId.slice(0, 20)}…</span></div>
              )}
            </div>
            {repayResult.data.balanceTransferTransactionId && (
              <p className="mb-4 text-xs font-medium text-emerald-600 dark:text-emerald-300">Balance moved on-ledger — a separate, verifiable Canton transaction from the confirmation itself.</p>
            )}
            <button onClick={() => setRepayResult(null)} className="w-full rounded-xl bg-violet-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-600">Done</button>
          </div>
        </div>
      )}
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
                <h3 className="text-sm font-semibold text-slate-950 dark:text-white">{editingId ? 'Edit Invoice — archives & recreates on Canton' : 'New Invoice → Canton InvoiceContract'}</h3>
              </div>
              <button onClick={() => { setShowForm(false); setEditingId(null) }} className="text-slate-400 hover:text-slate-950 dark:hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                { label: 'Invoice Number', key: 'invoiceId', placeholder: 'INV-2026-0043' },
                { label: 'Debtor Company (who owes you)', key: 'debtorName', placeholder: 'GlobalTech Solutions Ltd' },
                { label: 'Debtor Tax ID (optional — we generate a reference if blank)', key: 'debtorTaxId', placeholder: 'GB123456789' },
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
                  {f.key === 'debtorTaxId' && !taxIdValid && (
                    <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                      Tax ID can be at most 30 characters
                    </p>
                  )}
                </div>
              ))}
              <div>
                <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Currency</label>
                <div className={cn(inputCls, 'flex items-center text-slate-500 dark:text-slate-400')}>
                  USD <span className="ml-1.5 text-[10px] text-slate-400 dark:text-slate-500">(InvoPlus balance is USD-only)</span>
                </div>
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
              disabled={!form.debtorName || !form.amount || !form.dueDate || !taxIdValid}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-600 disabled:opacity-50"
            >
              <ShieldCheck className="h-4 w-4" />
              {editingId ? 'Save Changes on Canton' : 'Create InvoiceContract on Canton'}
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

        {rowError && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <p className="text-xs text-red-600 dark:text-red-300">{rowError}</p>
          </div>
        )}

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
                    <div className="flex items-center gap-1.5">
                      {lc(inv.status) === 'bidding' && (
                        <a href="/dashboard/marketplace" className="rounded-lg bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-600 transition-all hover:bg-violet-500 hover:text-white dark:text-violet-300">View Offers</a>
                      )}
                      {/* Pending/Verified invoices are still the seller's to
                          manage — editable (archive+recreate) and deletable. */}
                      {['pending', 'verified'].includes(lc(inv.status)) && (
                        <>
                          <button
                            onClick={() => startEdit(inv)}
                            className="rounded-lg border border-slate-200 p-1.5 text-slate-400 transition-colors hover:border-violet-500 hover:text-violet-500 dark:border-slate-700"
                            aria-label="Edit invoice" title="Edit invoice"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(inv)}
                            disabled={deletingId === inv.id}
                            className="rounded-lg border border-slate-200 p-1.5 text-slate-400 transition-colors hover:border-red-500 hover:text-red-500 disabled:opacity-50 dark:border-slate-700"
                            aria-label="Delete invoice" title="Delete invoice"
                          >
                            {deletingId === inv.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        </>
                      )}
                      {lc(inv.status) === 'funded' && (
                        <button
                          onClick={() => handleMarkRepaid(inv)}
                          disabled={repayingId === inv.id}
                          className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 transition-all hover:bg-emerald-500 hover:text-white disabled:opacity-60 dark:text-emerald-300"
                        >
                          {repayingId === inv.id && <Loader2 className="h-3 w-3 animate-spin" />}
                          {repayingId === inv.id ? 'Repaying…' : 'Mark as Repaid'}
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
    </div>
  )
}
