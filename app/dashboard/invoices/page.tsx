'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/dashboard/Header'
import { Upload, Search, Filter, FileText, CheckCircle, Clock, XCircle, Zap, Loader2, AlertTriangle, X, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCanton } from '@/lib/canton'

type InvoiceStatus = 'funded' | 'bidding' | 'verified' | 'pending' | 'rejected'

// Local invoice rows fetched from Canton ACS
const mockInvoices: any[] = []

const statusConfig: Record<InvoiceStatus, { label: string; icon: typeof CheckCircle; color: string }> = {
  funded:   { label: 'Funded',   icon: CheckCircle, color: 'text-green-400 bg-green-500/10 border-green-500/20' },
  bidding:  { label: 'Bidding',  icon: Zap,         color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
  verified: { label: 'Verified', icon: FileText,    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  pending:  { label: 'Pending',  icon: Clock,       color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  rejected: { label: 'Rejected', icon: XCircle,     color: 'text-red-400 bg-red-500/10 border-red-500/20' },
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

export default function InvoicesPage() {
  const { party } = useCanton()
  const [invoices, setInvoices] = useState<any[]>(mockInvoices)
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
      } catch (e) {
        // ignore — keep empty state
      }
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

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Invoices" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Upload zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); setShowForm(true) }}
          onClick={() => !submitting && setShowForm(true)}
          className={cn(
            'border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer',
            drag ? 'border-violet-500 bg-violet-500/5' : 'border-dark-border hover:border-violet-500/50 hover:bg-violet-500/[0.02]'
          )}
        >
          {submitting ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-violet-400 animate-spin" />
              <p className="text-sm font-semibold text-white">Submitting to Canton ledger…</p>
              <p className="text-xs text-dark-muted">Creating InvoiceContract · Running risk scoring · Registering anti-fraud entry</p>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
                <Upload className="w-6 h-6 text-violet-400" />
              </div>
              <p className="text-sm font-semibold text-white mb-1">Submit invoice to Canton Network</p>
              <p className="text-xs text-dark-muted mb-4">
                Creates a real <span className="text-violet-400 font-mono">InvoiceContract</span> on the ledger · Risk scored by InvoPlus engine · Anti-fraud registry entry created atomically
              </p>
              <span className="text-xs font-semibold text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 px-4 py-2 rounded-xl transition-colors">
                New Invoice
              </span>
            </>
          )}
        </div>

        {/* Invoice form */}
        {showForm && !submitting && (
          <div className="bg-dark-card border border-violet-500/30 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-violet-400" />
                <h3 className="text-sm font-semibold text-white">New Invoice → Canton InvoiceContract</h3>
              </div>
              <button onClick={() => setShowForm(false)} className="text-dark-muted hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Invoice Number', key: 'invoiceId', placeholder: 'INV-2026-0043' },
                { label: 'Debtor Company (who owes you)', key: 'debtorName', placeholder: 'GlobalTech Solutions Ltd' },
                { label: 'Debtor Tax ID (for fraud check)', key: 'debtorTaxId', placeholder: 'GB123456789' },
                { label: 'Amount', key: 'amount', placeholder: '125000', type: 'number' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs text-dark-muted mb-1 block">{f.label}</label>
                  <input
                    value={(form as any)[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    type={f.type ?? 'text'}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-dark-muted outline-none focus:border-violet-500/50"
                  />
                </div>
              ))}
              <div>
                <label className="text-xs text-dark-muted mb-1 block">Currency</label>
                <select value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500/50">
                  {['USD', 'EUR', 'GBP', 'CHF', 'CAD', 'AUD'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-dark-muted mb-1 block">Due Date</label>
                <input value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
                  type="date" min={today}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500/50" />
              </div>
            </div>

            {/* Canton flow info */}
            <div className="bg-dark-bg border border-dark-border rounded-xl p-4 space-y-1.5">
              <p className="text-xs font-semibold text-white mb-2">What happens on Canton when you submit:</p>
              {[
                'InvoiceContract created with your party as signatory',
                'Risk score computed (tenor, amount, currency, debtor profile)',
                'RegistryEntry created — prevents double-financing fraud',
                'Invoice status: Pending → awaiting platform verification',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-xs text-violet-400 font-bold shrink-0">{i + 1}.</span>
                  <p className="text-xs text-dark-muted">{step}</p>
                </div>
              ))}
            </div>

            {!party && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-xs text-yellow-400">
                Connect your Canton wallet first to submit as a real party on the ledger.
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!form.debtorName || !form.amount || !form.dueDate}
              className="w-full bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white font-semibold text-sm py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              Create InvoiceContract on Canton
            </button>
          </div>
        )}

        {/* Canton result */}
        {result && (
          <div className={cn('rounded-2xl p-6 border space-y-4', result.ok ? 'bg-dark-card border-green-500/30' : 'bg-red-500/5 border-red-500/30')}>
            {result.ok ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-semibold text-white">InvoiceContract created on Canton</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-xs font-bold px-2.5 py-1 rounded-md border',
                      result.riskGrade === 'A' ? 'bg-green-500/15 text-green-400 border-green-500/30' :
                      result.riskGrade === 'B' ? 'bg-violet-500/15 text-violet-400 border-violet-500/30' :
                      'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
                    )}>Grade {result.riskGrade}</span>
                    <span className="text-2xl font-bold text-white">{result.riskScore}<span className="text-sm text-dark-muted">/100</span></span>
                  </div>
                </div>

                <div className="h-1.5 bg-dark-border rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${result.riskScore}%`, background: (result.riskScore ?? 0) >= 80 ? '#22C55E' : (result.riskScore ?? 0) >= 60 ? '#6D4AFF' : '#F59E0B' }} />
                </div>

                <p className="text-sm text-dark-muted italic">"{result.summary}"</p>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Contract ID', val: result.contractId?.slice(0, 20) + '…' },
                    { label: 'Advance Rate Range', val: result.advanceRateRange },
                    { label: 'Tenor', val: `${result.tenorDays} days` },
                  ].map(item => (
                    <div key={item.label} className="bg-dark-bg border border-dark-border rounded-xl p-3">
                      <p className="text-xs text-dark-muted">{item.label}</p>
                      <p className="text-sm font-medium text-white font-mono truncate">{item.val}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {(result.positiveFactors ?? []).length > 0 && (
                    <div>
                      <p className="text-xs text-green-400 font-semibold mb-2">Positive Factors</p>
                      <ul className="space-y-1">{result.positiveFactors?.map((f, i) => <li key={i} className="text-xs text-dark-muted flex gap-1.5"><span className="text-green-400">+</span>{f}</li>)}</ul>
                    </div>
                  )}
                  {(result.riskFactors ?? []).length > 0 && (
                    <div>
                      <p className="text-xs text-yellow-400 font-semibold mb-2">Risk Factors</p>
                      <ul className="space-y-1">{result.riskFactors?.map((f, i) => <li key={i} className="text-xs text-dark-muted flex gap-1.5"><span className="text-yellow-400">−</span>{f}</li>)}</ul>
                    </div>
                  )}
                </div>

                <div className="bg-dark-bg border border-violet-500/20 rounded-xl p-3">
                  <p className="text-xs text-dark-muted font-mono">{result.cantonTemplateId}</p>
                </div>

                <button className="w-full bg-violet-500 hover:bg-violet-600 text-white font-semibold text-sm py-3 rounded-xl transition-colors">
                  List for Sealed-Bid Auction →
                </button>
              </>
            ) : (
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-400">Submission failed</p>
                  <p className="text-xs text-dark-muted mt-0.5">{result.error}</p>
                  {result.error?.includes('INVOPLUS_PACKAGE_ID') && (
                    <p className="text-xs text-violet-400 mt-2">Deploy the Daml DAR via Seaport IDE first, then set INVOPLUS_PACKAGE_ID in .env.local</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            {['all', 'pending', 'verified', 'bidding', 'funded'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={cn('text-xs font-medium px-3 py-1.5 rounded-lg capitalize border transition-all',
                  filter === f ? 'bg-violet-500 border-violet-500 text-white' : 'bg-dark-card border-dark-border text-dark-muted hover:text-white')}>
                {f === 'all' ? 'All Invoices' : f}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-dark-card border border-dark-border rounded-xl px-3 py-2 text-sm text-dark-muted">
              <Search className="w-4 h-4" />
              <input placeholder="Search invoices…" className="bg-transparent outline-none text-white placeholder:text-dark-muted w-40" />
            </div>
            <button className="w-9 h-9 bg-dark-card border border-dark-border rounded-xl flex items-center justify-center text-dark-muted hover:text-white transition-colors">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Invoice table */}
        <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-3 border-b border-dark-border text-xs font-semibold text-dark-muted uppercase tracking-wider">
            <span>Invoice / Debtor</span><span>Amount</span><span>Due Date</span>
            <span>Risk Score</span><span>Status</span><span>Action</span>
          </div>
          <div className="divide-y divide-dark-border">
            {filtered.map(inv => {
              const sc = statusConfig[inv.status as keyof typeof statusConfig]
              const Icon = sc.icon
              return (
                <div key={inv.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-4 items-center hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-dark-border flex items-center justify-center text-xs font-bold text-dark-muted shrink-0">{inv.buyer[0]}</div>
                    <div>
                      <p className="text-sm font-medium text-white truncate max-w-[180px]">{inv.buyer}</p>
                      <p className="text-xs text-dark-muted font-mono">{inv.id}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-white">${inv.amount.toLocaleString()}</span>
                  <span className="text-sm text-dark-muted">{inv.dueDate}</span>
                  <div className="flex items-center gap-2">
                    {inv.aiScore > 0 ? (
                      <>
                        <div className="flex-1 h-1.5 bg-dark-border rounded-full overflow-hidden max-w-16">
                          <div className="h-full bg-violet-500 rounded-full" style={{ width: `${inv.aiScore}%` }} />
                        </div>
                        <span className="text-xs text-white font-medium">{inv.aiScore}</span>
                      </>
                    ) : <span className="text-xs text-dark-muted">Pending</span>}
                  </div>
                  <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border w-fit', sc.color)}>
                    <Icon className="w-3 h-3" />{sc.label}
                  </span>
                  <div>
                    {inv.status === 'verified' && (
                      <a href="/dashboard/marketplace" className="text-xs font-semibold text-violet-400 hover:text-white bg-violet-500/10 hover:bg-violet-500 border border-violet-500/20 px-3 py-1.5 rounded-lg transition-all">List for Bids</a>
                    )}
                    {inv.status === 'bidding' && (
                      <a href="/dashboard/marketplace" className="text-xs font-semibold text-violet-400 hover:text-white bg-violet-500/10 hover:bg-violet-500 border border-violet-500/20 px-3 py-1.5 rounded-lg transition-all">View Offers</a>
                    )}
                    {['funded', 'pending'].includes(inv.status) && <span className="text-xs text-dark-muted">—</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
