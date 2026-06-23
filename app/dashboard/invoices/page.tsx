'use client'

import { useState, useRef } from 'react'
import { Header } from '@/components/dashboard/Header'
import { Upload, Search, Filter, FileText, CheckCircle, Clock, XCircle, Zap, Loader2, Bot, AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type InvoiceStatus = 'funded' | 'bidding' | 'verified' | 'pending' | 'rejected'

const mockInvoices = [
  { id: 'INV-2026-0042', buyer: 'GlobalTech Solutions Ltd',  amount: 125000, currency: 'USD', dueDate: '2026-09-23', status: 'funded'   as InvoiceStatus, grade: 'A',  aiScore: 87 },
  { id: 'INV-2026-0041', buyer: 'Apex Manufacturing',        amount: 89500,  currency: 'USD', dueDate: '2026-10-12', status: 'bidding'  as InvoiceStatus, grade: 'A',  aiScore: 91 },
  { id: 'INV-2026-0040', buyer: 'Summit Retail Group',       amount: 234000, currency: 'USD', dueDate: '2026-08-30', status: 'verified' as InvoiceStatus, grade: 'B',  aiScore: 74 },
  { id: 'INV-2026-0039', buyer: 'NovaBuild Corp',            amount: 67200,  currency: 'USD', dueDate: '2026-08-15', status: 'funded'   as InvoiceStatus, grade: 'B',  aiScore: 79 },
  { id: 'INV-2026-0038', buyer: 'Nexus Partners Ltd',        amount: 55000,  currency: 'USD', dueDate: '2026-09-05', status: 'pending'  as InvoiceStatus, grade: '—',  aiScore: 0  },
]

const statusConfig: Record<InvoiceStatus, { label: string; icon: typeof CheckCircle; color: string }> = {
  funded:   { label: 'Funded',   icon: CheckCircle, color: 'text-green-400 bg-green-500/10 border-green-500/20' },
  bidding:  { label: 'Bidding',  icon: Zap,         color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
  verified: { label: 'Verified', icon: FileText,    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  pending:  { label: 'Pending',  icon: Clock,       color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  rejected: { label: 'Rejected', icon: XCircle,     color: 'text-red-400 bg-red-500/10 border-red-500/20' },
}

interface AIResult {
  score: number
  grade: string
  isVerified: boolean
  extractedData: {
    invoiceNumber: string
    debtorName: string
    amount: number
    currency: string
    dueDate: string
    description: string
  }
  riskFactors: string[]
  positiveFactors: string[]
  fraudFlags: string[]
  reasoning: string
}

export default function InvoicesPage() {
  const [filter, setFilter] = useState<string>('all')
  const [drag, setDrag] = useState(false)
  const [scoring, setScoring] = useState(false)
  const [aiResult, setAiResult] = useState<AIResult | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ invoiceNumber: '', debtorName: '', amount: '', currency: 'USD', dueDate: '' })
  const fileRef = useRef<HTMLInputElement>(null)

  const filtered = filter === 'all' ? mockInvoices : mockInvoices.filter(i => i.status === filter)

  const handleFileOrSubmit = async (invoiceText?: string) => {
    setScoring(true)
    setAiResult(null)
    setAiError(null)
    try {
      const res = await fetch('/api/ai/score-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceText ? { invoiceText } : { ...form, amount: parseFloat(form.amount) }),
      })
      const data = await res.json()
      if (data.ok) {
        setAiResult(data)
        setShowForm(false)
      } else {
        setAiError(data.error ?? 'Scoring failed')
      }
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setScoring(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setDrag(false)
    const file = e.dataTransfer.files[0]
    if (!file) return
    // For text-based files, read content; for PDFs show form
    if (file.type === 'text/plain') {
      const text = await file.text()
      handleFileOrSubmit(text)
    } else {
      setShowForm(true)
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
          onDrop={handleDrop}
          onClick={() => !scoring && setShowForm(true)}
          className={cn(
            'border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer',
            drag ? 'border-violet-500 bg-violet-500/5' : 'border-dark-border hover:border-violet-500/50 hover:bg-violet-500/[0.02]'
          )}
        >
          <input ref={fileRef} type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.txt"
            onChange={async e => {
              const file = e.target.files?.[0]
              if (!file) return
              if (file.type === 'text/plain') { const t = await file.text(); handleFileOrSubmit(t) }
              else setShowForm(true)
            }} />
          {scoring ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto">
                <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
              </div>
              <p className="text-sm font-semibold text-white">Claude is analyzing your invoice…</p>
              <p className="text-xs text-dark-muted">Extracting data · Scoring risk · Checking for fraud</p>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
                <Upload className="w-6 h-6 text-violet-400" />
              </div>
              <p className="text-sm font-semibold text-white mb-1">Drop invoice here or click to upload</p>
              <p className="text-xs text-dark-muted mb-4">PDF, PNG, JPEG · AI (Claude) extracts all fields and scores risk automatically</p>
              <span className="text-xs font-semibold text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 px-4 py-2 rounded-xl transition-colors">
                Choose File or Enter Details
              </span>
            </>
          )}
        </div>

        {/* Manual entry form */}
        {showForm && !scoring && (
          <div className="bg-dark-card border border-violet-500/30 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-violet-400" />
                <h3 className="text-sm font-semibold text-white">Invoice Details → Claude AI Scoring</h3>
              </div>
              <button onClick={() => setShowForm(false)} className="text-dark-muted hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-dark-muted mb-1 block">Invoice Number</label>
                <input value={form.invoiceNumber} onChange={e => setForm(p => ({ ...p, invoiceNumber: e.target.value }))}
                  placeholder="INV-2026-0043"
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-dark-muted outline-none focus:border-violet-500/50" />
              </div>
              <div>
                <label className="text-xs text-dark-muted mb-1 block">Debtor Company (who owes you)</label>
                <input value={form.debtorName} onChange={e => setForm(p => ({ ...p, debtorName: e.target.value }))}
                  placeholder="GlobalTech Solutions Ltd"
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-dark-muted outline-none focus:border-violet-500/50" />
              </div>
              <div>
                <label className="text-xs text-dark-muted mb-1 block">Invoice Amount</label>
                <input value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                  placeholder="125000" type="number"
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-dark-muted outline-none focus:border-violet-500/50" />
              </div>
              <div>
                <label className="text-xs text-dark-muted mb-1 block">Due Date</label>
                <input value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
                  type="date"
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500/50" />
              </div>
            </div>
            <button
              onClick={() => handleFileOrSubmit()}
              disabled={!form.debtorName || !form.amount}
              className="w-full bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white font-semibold text-sm py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Bot className="w-4 h-4" />
              Score with Claude AI
            </button>
          </div>
        )}

        {/* AI error */}
        {aiError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-400">Scoring failed</p>
              <p className="text-xs text-dark-muted mt-0.5">{aiError}</p>
              <p className="text-xs text-dark-muted mt-1">Make sure ANTHROPIC_API_KEY is set in .env.local</p>
            </div>
          </div>
        )}

        {/* AI result */}
        {aiResult && (
          <div className="bg-dark-card border border-violet-500/30 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-violet-400" />
                <span className="text-sm font-semibold text-white">Claude AI Risk Assessment</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn('text-xs font-bold px-2.5 py-1 rounded-md border',
                  aiResult.grade === 'A' ? 'bg-green-500/15 text-green-400 border-green-500/30' :
                  aiResult.grade === 'B' ? 'bg-violet-500/15 text-violet-400 border-violet-500/30' :
                  'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
                )}>Grade {aiResult.grade}</span>
                <span className="text-2xl font-bold text-white">{aiResult.score}<span className="text-sm text-dark-muted">/100</span></span>
              </div>
            </div>

            {/* Score bar */}
            <div className="h-2 bg-dark-border rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${aiResult.score}%`, background: aiResult.score >= 80 ? '#22C55E' : aiResult.score >= 60 ? '#6D4AFF' : '#F59E0B' }} />
            </div>

            <p className="text-sm text-dark-muted italic">"{aiResult.reasoning}"</p>

            {/* Extracted data */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Invoice #', val: aiResult.extractedData.invoiceNumber },
                { label: 'Debtor', val: aiResult.extractedData.debtorName },
                { label: 'Amount', val: `${aiResult.extractedData.currency} ${aiResult.extractedData.amount?.toLocaleString()}` },
                { label: 'Due Date', val: aiResult.extractedData.dueDate },
                { label: 'Description', val: aiResult.extractedData.description },
                { label: 'Verified', val: aiResult.isVerified ? '✓ Yes' : '✗ No' },
              ].map(item => (
                <div key={item.label} className="bg-dark-bg border border-dark-border rounded-xl p-3">
                  <p className="text-xs text-dark-muted">{item.label}</p>
                  <p className="text-sm font-medium text-white truncate">{item.val}</p>
                </div>
              ))}
            </div>

            {/* Risk / positive factors */}
            <div className="grid grid-cols-2 gap-4">
              {aiResult.positiveFactors.length > 0 && (
                <div>
                  <p className="text-xs text-green-400 font-semibold mb-2">Positive Factors</p>
                  <ul className="space-y-1">
                    {aiResult.positiveFactors.map((f, i) => <li key={i} className="text-xs text-dark-muted flex gap-1.5"><span className="text-green-400">+</span>{f}</li>)}
                  </ul>
                </div>
              )}
              {aiResult.riskFactors.length > 0 && (
                <div>
                  <p className="text-xs text-yellow-400 font-semibold mb-2">Risk Factors</p>
                  <ul className="space-y-1">
                    {aiResult.riskFactors.map((f, i) => <li key={i} className="text-xs text-dark-muted flex gap-1.5"><span className="text-yellow-400">−</span>{f}</li>)}
                  </ul>
                </div>
              )}
            </div>

            {aiResult.fraudFlags.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                <p className="text-xs text-red-400 font-semibold mb-1">⚠ Fraud Flags</p>
                {aiResult.fraudFlags.map((f, i) => <p key={i} className="text-xs text-dark-muted">{f}</p>)}
              </div>
            )}

            <button
              disabled={!aiResult.isVerified}
              className="w-full bg-violet-500 hover:bg-violet-600 disabled:opacity-40 text-white font-semibold text-sm py-3 rounded-xl transition-colors"
            >
              {aiResult.isVerified ? 'Submit to Canton Ledger & List for Auction →' : 'Cannot list — verification failed'}
            </button>
            <p className="text-xs text-dark-muted text-center">
              This score will be recorded permanently in the Daml InvoiceContract on Canton Network
            </p>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            {['all', 'pending', 'verified', 'bidding', 'funded'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={cn(
                  'text-xs font-medium px-3 py-1.5 rounded-lg capitalize border transition-all',
                  filter === f ? 'bg-violet-500 border-violet-500 text-white' : 'bg-dark-card border-dark-border text-dark-muted hover:text-white'
                )}>
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
            <span>AI Score</span><span>Status</span><span>Action</span>
          </div>
          <div className="divide-y divide-dark-border">
            {filtered.map(inv => {
              const sc = statusConfig[inv.status]
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
                    ) : (
                      <span className="text-xs text-dark-muted">Pending</span>
                    )}
                  </div>
                  <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border w-fit', sc.color)}>
                    <Icon className="w-3 h-3" />{sc.label}
                  </span>
                  <div>
                    {inv.status === 'verified' && (
                      <a href="/dashboard/marketplace" className="text-xs font-semibold text-violet-400 hover:text-white bg-violet-500/10 hover:bg-violet-500 border border-violet-500/20 px-3 py-1.5 rounded-lg transition-all">
                        List for Bids
                      </a>
                    )}
                    {inv.status === 'bidding' && (
                      <a href="/dashboard/marketplace" className="text-xs font-semibold text-violet-400 hover:text-white bg-violet-500/10 hover:bg-violet-500 border border-violet-500/20 px-3 py-1.5 rounded-lg transition-all">
                        View Offers
                      </a>
                    )}
                    {(inv.status === 'funded' || inv.status === 'pending') && <span className="text-xs text-dark-muted">—</span>}
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
