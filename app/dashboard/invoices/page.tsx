'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/dashboard/Header'
import { Upload, Search, Filter, FileText, CheckCircle, Clock, XCircle, Zap, Loader2, AlertTriangle, X, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCanton } from '@/lib/canton'

type InvoiceStatus = 'funded' | 'bidding' | 'verified' | 'pending' | 'rejected'

const statusConfig: Record<InvoiceStatus, { label: string; icon: typeof CheckCircle; color: string }> = {
  funded:   { label: 'Funded',   icon: CheckCircle, color: 'text-violet-300 bg-violet-500/10 border-violet-400/25' },
  bidding:  { label: 'Bidding',  icon: Zap,         color: 'text-violet-300 bg-violet-500/10 border-violet-500/25' },
  verified: { label: 'Verified', icon: FileText,    color: 'text-sky-300 bg-sky-500/10 border-sky-500/25' },
  pending:  { label: 'Pending',  icon: Clock,       color: 'text-yellow-300 bg-yellow-500/10 border-yellow-500/25' },
  rejected: { label: 'Rejected', icon: XCircle,     color: 'text-red-300 bg-red-500/10 border-red-500/25' },
}

interface ScoreResult {
  ok: boolean
  contractId?: string
  invoiceId?: string
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

const today = new Date().toISOString().split('T')[0]
const panel = 'rounded-3xl border border-white/[0.07] bg-[#120E1F] shadow-[0_10px_35px_rgba(0,0,0,0.45)]'

export default function InvoicesPage() {
  const { party } = useCanton()
  const [invoices, setInvoices] = useState<any[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [drag, setDrag] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<ScoreResult | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    invoiceId: '', debtorName: '', debtorTaxId: '', amount: '',
    currency: 'USD', issueDate: today, dueDate: '',
  })

  const filtered = filter === 'all' ? invoices : invoices.filter(i => i.status === filter)

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

  const handleSubmit = async () => {
    if (!form.debtorName || !form.amount || !form.dueDate) return
    setSubmitting(true)
    setResult(null)
    try {
      const res = await fetch('/api/canton/contracts/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellerPartyId: party?.id ?? 'demo-seller',
          platformPartyId: party?.id ?? 'demo-seller',
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
      if (data.ok) setShowForm(false)
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : 'Network error' })
    } finally {
      setSubmitting(false)
    }
  }

  const lc = (s: string) => (s || '').toLowerCase()

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Invoices" />
      <div className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* Upload zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); setShowForm(true) }}
          onClick={() => !submitting && setShowForm(true)}
          className={cn(
            'relative overflow-hidden rounded-3xl border-2 border-dashed p-10 text-center transition-all cursor-pointer',
            drag ? 'border-violet-500 bg-violet-500/10' : 'border-white/10 bg-[#120E1F]/60 hover:border-violet-500/50 hover:bg-violet-500/[0.04]'
          )}
        >
          <div className="pointer-events-none absolute -top-20 right-0 h-48 w-48 rounded-full bg-violet-600/15 blur-3xl" />
          {submitting ? (
            <div className="relative flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-violet-400 animate-spin" />
              <p className="text-sm font-semibold text-white">Submitting to Canton ledger…</p>
              <p className="font-data text-xs text-slate-500">InvoiceContract · risk scoring · registry entry</p>
            </div>
          ) : (
            <div className="relative">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-500/25 bg-violet-500/10">
                <Upload className="w-6 h-6 text-violet-300" />
              </div>
              <p className="text-sm font-semibold text-white mb-1">Submit invoice to Canton Network</p>
              <p className="text-xs text-slate-500 mb-4">
                Creates a real <span className="font-data text-violet-300">InvoiceContract</span> on the ledger · risk scored · anti-fraud registry entry, atomically
              </p>
              <span className="rounded-xl border border-violet-500/25 bg-violet-500/10 px-4 py-2 text-xs font-semibold text-violet-300 transition-colors hover:bg-violet-500/20">
                New Invoice
              </span>
            </div>
          )}
        </div>

        {/* Invoice form */}
        {showForm && !submitting && (
          <div className={cn(panel, 'border-violet-500/30 p-6 space-y-4')}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-violet-300" />
                <h3 className="font-display text-sm font-semibold text-white">New Invoice → Canton InvoiceContract</h3>
              </div>
              <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Invoice Number', key: 'invoiceId', placeholder: 'INV-2026-0043' },
                { label: 'Debtor Company (who owes you)', key: 'debtorName', placeholder: 'GlobalTech Solutions Ltd' },
                { label: 'Debtor Tax ID (for fraud check)', key: 'debtorTaxId', placeholder: 'GB123456789' },
                { label: 'Amount', key: 'amount', placeholder: '125000', type: 'number' },
              ].map(f => (
                <div key={f.key}>
                  <label className="mb-1 block text-xs text-slate-500">{f.label}</label>
                  <input
                    value={(form as any)[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    type={f.type ?? 'text'}
                    className="w-full rounded-xl border border-white/10 bg-[#0B0814] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-500/50"
                  />
                </div>
              ))}
              <div>
                <label className="mb-1 block text-xs text-slate-500">Currency</label>
                <select value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-[#0B0814] px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500/50">
                  {['USD', 'EUR', 'GBP', 'CHF', 'CAD', 'AUD'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Due Date</label>
                <input value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
                  type="date" min={today}
                  className="w-full rounded-xl border border-white/10 bg-[#0B0814] px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500/50" />
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-[#0B0814] p-4 space-y-1.5">
              <p className="mb-2 text-xs font-semibold text-white">What happens on Canton when you submit:</p>
              {[
                'InvoiceContract created with your party as signatory',
                'Risk score computed (tenor, amount, currency, debtor profile)',
                'RegistryEntry created — a ledger key blocks double financing',
                'Invoice status: Pending → awaiting platform verification',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="font-data shrink-0 text-xs font-bold text-violet-300">{i + 1}.</span>
                  <p className="text-xs text-slate-500">{step}</p>
                </div>
              ))}
            </div>

            {!party && (
              <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs text-yellow-300">
                Connect your Canton wallet first to submit as a real party on the ledger.
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!form.debtorName || !form.amount || !form.dueDate}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-400 disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              Create InvoiceContract on Canton
            </button>
          </div>
        )}

        {/* Canton result */}
        {result && (
          <div className={cn('rounded-3xl border p-6 space-y-4', result.ok ? cn(panel, 'border-emerald-500/30') : 'border-red-500/30 bg-red-500/5')}>
            {result.ok ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-semibold text-white">InvoiceContract created on Canton</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn('font-data rounded-md border px-2.5 py-1 text-xs font-bold',
                      result.riskGrade === 'A' ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300' :
                      result.riskGrade === 'B' ? 'border-violet-500/30 bg-violet-500/15 text-violet-300' :
                      'border-yellow-500/30 bg-yellow-500/15 text-yellow-300'
                    )}>Grade {result.riskGrade}</span>
                    <span className="font-data text-2xl font-bold text-white">{result.riskScore}<span className="text-sm text-slate-500">/100</span></span>
                  </div>
                </div>

                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${result.riskScore}%`, background: (result.riskScore ?? 0) >= 80 ? '#34D399' : (result.riskScore ?? 0) >= 60 ? '#14B892' : '#F59E0B' }} />
                </div>

                <p className="text-sm italic text-slate-400">"{result.summary}"</p>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Contract ID', val: result.contractId?.slice(0, 20) + '…' },
                    { label: 'Advance Rate Range', val: result.advanceRateRange },
                    { label: 'Tenor', val: `${result.tenorDays} days` },
                  ].map(item => (
                    <div key={item.label} className="rounded-2xl border border-white/[0.07] bg-[#0B0814] p-3">
                      <p className="text-xs text-slate-500">{item.label}</p>
                      <p className="font-data truncate text-sm font-medium text-white">{item.val}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {(result.positiveFactors ?? []).length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold text-emerald-400">Positive Factors</p>
                      <ul className="space-y-1">{result.positiveFactors?.map((f, i) => <li key={i} className="flex gap-1.5 text-xs text-slate-500"><span className="text-emerald-400">+</span>{f}</li>)}</ul>
                    </div>
                  )}
                  {(result.riskFactors ?? []).length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold text-yellow-400">Risk Factors</p>
                      <ul className="space-y-1">{result.riskFactors?.map((f, i) => <li key={i} className="flex gap-1.5 text-xs text-slate-500"><span className="text-yellow-400">−</span>{f}</li>)}</ul>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-violet-500/20 bg-[#0B0814] p-3">
                  <p className="font-data text-xs text-slate-500">{result.cantonTemplateId}</p>
                </div>

                <button className="w-full rounded-xl bg-violet-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-400">
                  List for Sealed-Bid Auction →
                </button>
              </>
            ) : (
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 w-4 h-4 shrink-0 text-red-400" />
                <div>
                  <p className="text-sm font-medium text-red-400">Submission failed</p>
                  <p className="mt-0.5 text-xs text-slate-500">{result.error}</p>
                  {result.error?.includes('INVOPLUS_PACKAGE_ID') && (
                    <p className="mt-2 text-xs text-violet-300">Deploy the Daml DAR via Seaport IDE first, then set INVOPLUS_PACKAGE_ID in .env.local</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-2">
            {['all', 'pending', 'verified', 'bidding', 'funded'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={cn('rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-all',
                  filter === f ? 'border-violet-500 bg-violet-500 text-white' : 'border-white/10 bg-[#120E1F] text-slate-400 hover:text-white')}>
                {f === 'all' ? 'All Invoices' : f}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#120E1F] px-3 py-2 text-sm text-slate-500">
              <Search className="w-4 h-4" />
              <input placeholder="Search invoices…" className="w-40 bg-transparent text-white outline-none placeholder:text-slate-600" />
            </div>
            <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-[#120E1F] text-slate-500 transition-colors hover:text-white">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Invoice table */}
        <div className={cn(panel, 'overflow-hidden')}>
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 border-b border-white/[0.07] px-5 py-3.5 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
            <span>Invoice / Debtor</span><span>Amount</span><span>Due Date</span>
            <span>Risk Score</span><span>Status</span><span>Action</span>
          </div>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
              <FileText className="h-5 w-5 text-slate-600" />
              <p className="text-sm font-medium text-white">{party ? 'No invoices yet' : 'Connect your Canton wallet'}</p>
              <p className="max-w-xs text-xs text-slate-500">
                {party ? 'Submit your first invoice above and it lands here as a live contract.' : 'Invoices are read from your party\'s contracts on the ledger.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {filtered.map(inv => {
                const sc = statusConfig[lc(inv.status) as InvoiceStatus] ?? statusConfig.pending
                const Icon = sc.icon
                return (
                  <div key={inv.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] items-center gap-4 px-5 py-4 transition-colors hover:bg-violet-500/[0.05]">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/30 to-violet-800/30 text-xs font-bold text-violet-200">{inv.buyer[0]}</div>
                      <div>
                        <p className="max-w-[180px] truncate text-sm font-medium text-white">{inv.buyer}</p>
                        <p className="font-data max-w-[180px] truncate text-xs text-slate-600">{inv.id}</p>
                      </div>
                    </div>
                    <span className="font-data text-sm font-bold text-violet-300">${inv.amount.toLocaleString()}</span>
                    <span className="font-data text-sm text-slate-400">{inv.dueDate}</span>
                    <div className="flex items-center gap-2">
                      {inv.aiScore > 0 ? (
                        <>
                          <div className="h-1.5 max-w-16 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                            <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-400" style={{ width: `${inv.aiScore}%` }} />
                          </div>
                          <span className="font-data text-xs font-medium text-white">{inv.aiScore}</span>
                        </>
                      ) : <span className="text-xs text-slate-600">Pending</span>}
                    </div>
                    <span className={cn('inline-flex w-fit items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium', sc.color)}>
                      <Icon className="w-3 h-3" />{sc.label}
                    </span>
                    <div>
                      {lc(inv.status) === 'verified' && (
                        <a href="/dashboard/marketplace" className="rounded-lg border border-violet-500/25 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-300 transition-all hover:bg-violet-500 hover:text-white">List for Bids</a>
                      )}
                      {lc(inv.status) === 'bidding' && (
                        <a href="/dashboard/marketplace" className="rounded-lg border border-violet-500/25 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-300 transition-all hover:bg-violet-500 hover:text-white">View Offers</a>
                      )}
                      {['funded', 'pending'].includes(lc(inv.status)) && <span className="text-xs text-slate-600">—</span>}
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
