'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Header } from '@/components/dashboard/Header'
import { ConfirmDialog, ConfirmState } from '@/components/dashboard/ConfirmDialog'
import { Upload, Search, FileText, CheckCircle, Clock, XCircle, Zap, Loader2, AlertTriangle, X, ShieldCheck, Pencil, Trash2, Paperclip, Sparkles } from 'lucide-react'
import { cn, humanizeCantonError } from '@/lib/utils'
import { useCanton } from '@/lib/canton'
import { useNotifications } from '@/lib/notifications'

type InvoiceStatus = 'funded' | 'overdue' | 'bidding' | 'verified' | 'pending' | 'rejected'

const statusConfig: Record<InvoiceStatus, { label: string; icon: typeof CheckCircle; color: string }> = {
  funded:   { label: 'Funded',   icon: CheckCircle,   color: 'text-emerald-700 bg-emerald-500/10 border-emerald-500/25 dark:text-emerald-300' },
  // Repayment is self-attested off-ledger (the debtor isn't a Canton party,
  // so nothing enforces the seller actually clicking Mark as Repaid) — this
  // is the one visible pressure point once the due date passes with no
  // repayment yet.
  overdue:  { label: 'Overdue',  icon: AlertTriangle, color: 'text-red-700 bg-red-500/10 border-red-500/25 dark:text-red-300' },
  bidding:  { label: 'Bidding',  icon: Zap,         color: 'text-violet-700 bg-violet-500/10 border-violet-500/25 dark:text-violet-300' },
  verified: { label: 'Verified', icon: FileText,    color: 'text-sky-700 bg-sky-500/10 border-sky-500/25 dark:text-sky-300' },
  pending:  { label: 'Pending',  icon: Clock,       color: 'text-amber-700 bg-amber-500/10 border-amber-500/25 dark:text-amber-300' },
  rejected: { label: 'Rejected', icon: XCircle,     color: 'text-red-700 bg-red-500/10 border-red-500/25 dark:text-red-300' },
}

const isOverdue = (status: string, dueDate: string) =>
  status.toLowerCase() === 'funded' && !!dueDate && new Date(dueDate).getTime() < Date.now()

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
  // Real file, real hash — not a decorative drop zone. docHash sent to
  // create-invoice is the actual SHA-256 of the attached document; when no
  // file is attached, the server falls back to fingerprinting the typed
  // fields instead (see create-invoice/route.ts).
  const [attachedFile, setAttachedFile] = useState<{ name: string; hash: string } | null>(null)
  const [hashing, setHashing] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [extractNote, setExtractNote] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const hashFile = async (file: File) => {
    setHashing(true)
    setExtractNote(null)
    try {
      const buf = await file.arrayBuffer()
      const digest = await crypto.subtle.digest('SHA-256', buf)
      const hex = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
      setAttachedFile({ name: file.name, hash: `sha256:${hex}` })
      setShowForm(true)

      // Real extraction — Claude reads the actual document. Only fields
      // the model returns non-null overwrite the form, so a partial read
      // never wipes something the seller already typed.
      const isPdf = file.type === 'application/pdf'
      if (isPdf || file.type.startsWith('image/')) {
        setExtracting(true)
        try {
          // btoa needs a binary string, not raw bytes — chunk the conversion
          // so large files don't blow the call stack via String.fromCharCode(...bytes).
          const bytes = new Uint8Array(buf)
          let binary = ''
          const chunk = 8192
          for (let i = 0; i < bytes.length; i += chunk) {
            binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)))
          }
          const base64 = btoa(binary)
          const res = await fetch('/api/extract-invoice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileBase64: base64, mimeType: file.type }),
          })
          const data = await res.json()
          if (data.ok) {
            const f = data.fields ?? {}
            const filled: string[] = []
            setForm(prev => {
              const next = { ...prev }
              if (f.invoiceId) { next.invoiceId = String(f.invoiceId); filled.push('invoice number') }
              if (f.debtorName) { next.debtorName = String(f.debtorName); filled.push('debtor') }
              if (f.debtorTaxId) { next.debtorTaxId = String(f.debtorTaxId); filled.push('tax ID') }
              if (typeof f.faceAmount === 'number') { next.amount = String(f.faceAmount); filled.push('amount') }
              if (f.currency) { next.currency = String(f.currency).toUpperCase(); filled.push('currency') }
              if (f.issueDate) { next.issueDate = String(f.issueDate); filled.push('issue date') }
              if (f.dueDate) { next.dueDate = String(f.dueDate); filled.push('due date') }
              return next
            })
            setExtractNote(filled.length > 0
              ? `Read from the document: ${filled.join(', ')}. Review before submitting.`
              : "Couldn't confidently read any fields from this document — fill them in below.")
          } else {
            setExtractNote(`Extraction failed (${data.error ?? 'unknown error'}) — fill the form in manually below.`)
          }
        } catch {
          setExtractNote('Extraction failed — fill the form in manually below.')
        } finally {
          setExtracting(false)
        }
      }
    } catch {
      setResult({ ok: false, error: 'Could not read that file — try again or continue without attaching one.' })
    } finally {
      setHashing(false)
    }
  }

  const lc = (s: string) => (s || '').toLowerCase()
  // Tax ID is optional (most invoices worldwide don't carry one) — the
  // server derives a deterministic reference when it's blank or short.
  // Only a hard on-ledger limit (>30 chars) blocks submission.
  const taxIdValid = form.debtorTaxId.trim().length <= 30
  const filtered = invoices
    .filter(i => filter === 'all' || (filter === 'overdue' ? isOverdue(i.status, i.dueDate) : lc(i.status) === filter))
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
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null)
  const [confirmBusy, setConfirmBusy] = useState(false)

  const runMarkRepaid = async (inv: any) => {
    if (!party?.id) return
    setConfirmBusy(true)
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
      setConfirmBusy(false)
      setConfirmState(null)
    }
  }
  const handleMarkRepaid = (inv: any) => {
    setConfirmState({
      title: 'Mark this invoice as repaid?',
      message: `This sends principal + yield for ${inv.invoiceId} to the financier on Canton and can't be undone.`,
      confirmLabel: 'Mark as repaid',
      onConfirm: () => runMarkRepaid(inv),
    })
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
    setAttachedFile(null)
    setExtractNote(null)
    setResult(null)
    setListOutcome(null)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const runDelete = async (inv: any) => {
    if (!party?.id) return
    setConfirmBusy(true)
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
      setConfirmBusy(false)
      setConfirmState(null)
    }
  }
  const handleDelete = (inv: any) => {
    setConfirmState({
      title: 'Delete this invoice?',
      message: `${inv.invoiceId || ''} (${inv.buyer}) will be archived on the ledger.`,
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: () => runDelete(inv),
    })
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
          ...(attachedFile ? { docHash: attachedFile.hash } : {}),
        }),
      })
      const data = await res.json()
      setResult(data)
      if (data.ok) {
        setShowForm(false)
        setAttachedFile(null)
        setExtractNote(null)
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
      <ConfirmDialog state={confirmState} busy={confirmBusy} onClose={() => setConfirmState(null)} />
      <AnimatePresence>
        {repayResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            >
              <div className={cn(
                'relative overflow-hidden px-6 pb-8 pt-8 text-center',
                repayResult.data.balanceTransferred
                  ? 'bg-gradient-to-b from-emerald-500/15 to-transparent'
                  : 'bg-gradient-to-b from-amber-500/15 to-transparent'
              )}>
                <div className="pointer-events-none absolute -top-10 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-emerald-400/20 blur-3xl" />
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 14 }}
                  className={cn(
                    'relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full shadow-lg',
                    repayResult.data.balanceTransferred ? 'bg-emerald-500 shadow-emerald-500/40' : 'bg-amber-500 shadow-amber-500/40'
                  )}
                >
                  {repayResult.data.balanceTransferred
                    ? <CheckCircle className="h-8 w-8 text-white" />
                    : <AlertTriangle className="h-8 w-8 text-white" />}
                </motion.div>
                <h3 className="relative text-xl font-bold text-slate-950 dark:text-white">
                  {repayResult.data.balanceTransferred ? 'Repayment Complete' : 'Confirmed — Balance Pending'}
                </h3>
                <p className="relative mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {repayResult.inv.invoiceId} · {repayResult.data.balanceTransferred ? 'the financier has been repaid in full on Canton' : 'confirmation recorded on-ledger'}
                </p>
              </div>

              <div className="px-6 pb-6">
                <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Principal + Yield</span>
                    <span className="font-data text-lg font-bold text-slate-950 dark:text-white">${repayResult.inv.amount.toLocaleString()}</span>
                  </div>
                  <div className="space-y-2 pt-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Confirmation Tx</span>
                      <span className="font-data max-w-[150px] truncate text-slate-700 dark:text-slate-300">{repayResult.data.transactionId?.slice(0, 18)}…</span>
                    </div>
                    {repayResult.data.balanceTransferTransactionId && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400">Balance Transfer Tx</span>
                        <span className="font-data max-w-[150px] truncate text-emerald-600 dark:text-emerald-300">{repayResult.data.balanceTransferTransactionId.slice(0, 18)}…</span>
                      </div>
                    )}
                  </div>
                </div>

                {repayResult.data.balanceTransferred ? (
                  <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] p-3">
                    <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-300" />
                    <p className="text-xs leading-relaxed text-emerald-700 dark:text-emerald-300">Balance moved on-ledger — a separate, verifiable Canton transaction from the confirmation itself.</p>
                  </div>
                ) : (
                  <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                      {repayResult.data.balanceTransferError ?? 'The balance transfer did not complete — repayment is confirmed on-ledger, but no cash has moved yet.'}
                    </p>
                  </div>
                )}

                <button onClick={() => setRepayResult(null)} className="w-full rounded-xl bg-violet-500 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-colors hover:bg-violet-600">Done</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex-1 space-y-5 overflow-y-auto p-4 md:p-6">

        {/* Upload zone — a real file, really hashed. Dropping/choosing a
            document computes its SHA-256 client-side and attaches that as
            docHash; the "New Invoice (no document)" link below skips
            straight to the form for anyone without a file handy. */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) hashFile(f); e.target.value = '' }}
        />
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) hashFile(f) }}
          onClick={() => !submitting && !hashing && fileInputRef.current?.click()}
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
          ) : extracting ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-violet-500" />
              <p className="text-sm font-semibold text-slate-950 dark:text-white">Reading document…</p>
              <p className="font-data text-xs text-slate-500 dark:text-slate-400">Claude is extracting invoice fields to pre-fill the form below</p>
            </div>
          ) : hashing ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-violet-500" />
              <p className="text-sm font-semibold text-slate-950 dark:text-white">Hashing document…</p>
              <p className="font-data text-xs text-slate-500 dark:text-slate-400">Computing SHA-256 locally — the file itself never leaves your browser</p>
            </div>
          ) : (
            <div>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10">
                <Upload className="h-6 w-6 text-violet-600 dark:text-violet-300" />
              </div>
              <p className="mb-1 text-sm font-semibold text-slate-950 dark:text-white">Attach an invoice document</p>
              <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
                PDF or image — we read it and pre-fill the form below, and its hash becomes part of the real <span className="font-data text-violet-600 dark:text-violet-300">InvoiceContract</span> on Canton
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <span className="rounded-xl bg-violet-500 px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-violet-600">
                  Choose file
                </span>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); setAttachedFile(null); setShowForm(true) }}
                  className="rounded-xl border border-slate-300 px-5 py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:border-violet-500 hover:text-violet-600 dark:border-slate-600 dark:text-slate-300 dark:hover:border-violet-400 dark:hover:text-violet-300"
                >
                  Create a new invoice
                </button>
              </div>
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
              <button onClick={() => { setShowForm(false); setEditingId(null); setAttachedFile(null); setExtractNote(null) }} className="text-slate-400 hover:text-slate-950 dark:hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            {attachedFile && (
              <div className="flex items-center gap-2.5 rounded-xl border border-violet-500/25 bg-violet-500/[0.06] px-3.5 py-2.5">
                <Paperclip className="h-3.5 w-3.5 shrink-0 text-violet-600 dark:text-violet-300" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-slate-950 dark:text-white">{attachedFile.name}</p>
                  <p className="font-data truncate text-[10px] text-slate-500 dark:text-slate-400">{attachedFile.hash.slice(0, 26)}…</p>
                </div>
                <button type="button" onClick={() => setAttachedFile(null)} className="shrink-0 text-slate-400 hover:text-red-500"><X className="h-3.5 w-3.5" /></button>
              </div>
            )}
            {extractNote && (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-3.5 py-2.5">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">{extractNote}</p>
              </div>
            )}
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
            {['all', 'pending', 'verified', 'bidding', 'funded', 'overdue'].map(f => (
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
          <div className="flex items-start gap-2.5 overflow-hidden rounded-xl border border-red-500/30 bg-red-500/10 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <p className="min-w-0 flex-1 break-words text-xs text-red-600 dark:text-red-300">{humanizeCantonError(rowError)}</p>
            <button onClick={() => setRowError(null)} className="shrink-0 text-red-400 hover:text-red-600"><X className="h-3.5 w-3.5" /></button>
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
                const overdue = isOverdue(inv.status, inv.dueDate)
                const sc = statusConfig[(overdue ? 'overdue' : lc(inv.status)) as InvoiceStatus] ?? statusConfig.pending
                const Icon = sc.icon
                return (
                  <div key={inv.id} className={cn(
                    'grid grid-cols-1 gap-3 px-5 py-4 transition-colors hover:bg-violet-500/[0.04] md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] md:items-center md:gap-4',
                    overdue && 'border-l-2 border-l-red-500 bg-red-500/[0.03]'
                  )}>
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
                          title={overdue ? 'Past due date — the financier is waiting on this repayment' : undefined}
                          className={cn(
                            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-60',
                            overdue
                              ? 'animate-pulse-slow bg-red-500 text-white hover:bg-red-600'
                              : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white dark:text-emerald-300'
                          )}
                        >
                          {repayingId === inv.id && <Loader2 className="h-3 w-3 animate-spin" />}
                          {repayingId === inv.id ? 'Repaying…' : overdue ? 'Overdue — Mark as Repaid' : 'Mark as Repaid'}
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
