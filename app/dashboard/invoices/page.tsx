'use client'

import { useState } from 'react'
import { Header } from '@/components/dashboard/Header'
import { Upload, Search, Filter, FileText, CheckCircle, Clock, XCircle, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

const invoices = [
  { id: '#INV-2841', buyer: 'TechCorp Ltd',       amount: 84200,  currency: 'USD', dueDate: '2025-08-15', status: 'funded',   grade: 'A+', advanceRate: 91, aiScore: 96 },
  { id: '#INV-2840', buyer: 'RetailGroup Inc',     amount: 32100,  currency: 'USD', dueDate: '2025-07-30', status: 'bidding',  grade: 'A',  advanceRate: 88, aiScore: 91 },
  { id: '#INV-2839', buyer: 'ManuCo Systems',      amount: 127500, currency: 'USD', dueDate: '2025-09-01', status: 'verified', grade: 'B+', advanceRate: 85, aiScore: 84 },
  { id: '#INV-2838', buyer: 'Global Supplies Co',  amount: 19800,  currency: 'USD', dueDate: '2025-07-22', status: 'funded',   grade: 'A',  advanceRate: 89, aiScore: 93 },
  { id: '#INV-2837', buyer: 'Nexus Partners',      amount: 55000,  currency: 'USD', dueDate: '2025-08-05', status: 'pending',  grade: '—',  advanceRate: 0,  aiScore: 0  },
]

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle; color: string }> = {
  funded:   { label: 'Funded',    icon: CheckCircle, color: 'text-green-400 bg-green-500/10 border-green-500/20' },
  bidding:  { label: 'Bidding',   icon: Zap,         color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
  verified: { label: 'Verified',  icon: FileText,    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  pending:  { label: 'Pending',   icon: Clock,       color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  rejected: { label: 'Rejected',  icon: XCircle,     color: 'text-red-400 bg-red-500/10 border-red-500/20' },
}

export default function InvoicesPage() {
  const [filter, setFilter] = useState<string>('all')
  const [drag, setDrag] = useState(false)

  const filtered = filter === 'all' ? invoices : invoices.filter(i => i.status === filter)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Invoices" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Upload zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false) }}
          className={cn(
            'border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer',
            drag
              ? 'border-violet-500 bg-violet-500/5'
              : 'border-dark-border hover:border-violet-500/50 hover:bg-violet-500/2'
          )}
        >
          <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
            <Upload className="w-6 h-6 text-violet-400" />
          </div>
          <p className="text-sm font-semibold text-white mb-1">Drop invoice here or click to upload</p>
          <p className="text-xs text-dark-muted">PDF, PNG, JPEG up to 50MB · AI extracts all fields automatically</p>
          <button className="mt-4 text-xs font-semibold text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 px-4 py-2 rounded-xl transition-colors">
            Choose File
          </button>
        </div>

        {/* Filters + search */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            {['all', 'pending', 'verified', 'bidding', 'funded'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={cn(
                  'text-xs font-medium px-3 py-1.5 rounded-lg capitalize border transition-all',
                  filter === f
                    ? 'bg-violet-500 border-violet-500 text-white'
                    : 'bg-dark-card border-dark-border text-dark-muted hover:text-white'
                )}>
                {f === 'all' ? 'All Invoices' : f}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-dark-card border border-dark-border rounded-xl px-3 py-2 text-sm text-dark-muted">
              <Search className="w-4 h-4" />
              <input placeholder="Search invoices..." className="bg-transparent outline-none text-white placeholder:text-dark-muted w-40" />
            </div>
            <button className="w-9 h-9 bg-dark-card border border-dark-border rounded-xl flex items-center justify-center text-dark-muted hover:text-white transition-colors">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Invoice table */}
        <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-3 border-b border-dark-border text-xs font-semibold text-dark-muted uppercase tracking-wider">
            <span>Invoice / Buyer</span>
            <span>Amount</span>
            <span>Due Date</span>
            <span>AI Score</span>
            <span>Status</span>
            <span>Action</span>
          </div>
          <div className="divide-y divide-dark-border">
            {filtered.map(inv => {
              const sc = statusConfig[inv.status]
              const Icon = sc.icon
              return (
                <div key={inv.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-4 items-center hover:bg-white/2 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-dark-border flex items-center justify-center text-xs font-bold text-dark-muted shrink-0">
                      {inv.buyer[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{inv.buyer}</p>
                      <p className="text-xs text-dark-muted">{inv.id}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-white">
                    ${inv.amount.toLocaleString()}
                  </span>
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
                      <span className="text-xs text-dark-muted">Analysing…</span>
                    )}
                  </div>
                  <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border w-fit', sc.color)}>
                    <Icon className="w-3 h-3" /> {sc.label}
                  </span>
                  <div>
                    {inv.status === 'verified' && (
                      <a href="/dashboard/marketplace"
                        className="text-xs font-semibold text-violet-400 hover:text-white bg-violet-500/10 hover:bg-violet-500 border border-violet-500/20 px-3 py-1.5 rounded-lg transition-all">
                        List for Bids
                      </a>
                    )}
                    {inv.status === 'bidding' && (
                      <a href="/dashboard/marketplace"
                        className="text-xs font-semibold text-violet-400 hover:text-white bg-violet-500/10 hover:bg-violet-500 border border-violet-500/20 px-3 py-1.5 rounded-lg transition-all">
                        View Offers
                      </a>
                    )}
                    {(inv.status === 'funded' || inv.status === 'pending') && (
                      <span className="text-xs text-dark-muted">—</span>
                    )}
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
