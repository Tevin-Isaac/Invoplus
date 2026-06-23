'use client'

import { useState } from 'react'
import { Header } from '@/components/dashboard/Header'
import { TrendingUp, DollarSign, Award, Clock, EyeOff, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

const positions = [
  {
    id: 'BID-001',
    invoiceRef: 'INV-2026-0042',
    debtor: 'GlobalTech Solutions Ltd',
    grade: 'A',
    faceAmount: 125000,
    fundedAmount: 110000,
    advanceRate: 0.88,
    annualRate: 0.115,
    dueDate: 'Sep 23, 2026',
    status: 'active',
    cantonRef: 'FND-0042::1220a14c',
    earned: 1264,
  },
  {
    id: 'BID-002',
    invoiceRef: 'INV-2026-0039',
    debtor: 'NovaBuild Corp',
    grade: 'B',
    faceAmount: 67200,
    fundedAmount: 57120,
    advanceRate: 0.85,
    annualRate: 0.132,
    dueDate: 'Aug 15, 2026',
    status: 'active',
    cantonRef: 'FND-0039::1220b22d',
    earned: 628,
  },
  {
    id: 'BID-003',
    invoiceRef: 'INV-2026-0031',
    debtor: 'Apex Logistics Ltd',
    grade: 'A',
    faceAmount: 188000,
    fundedAmount: 169200,
    advanceRate: 0.9,
    annualRate: 0.105,
    dueDate: 'Jul 30, 2026',
    status: 'repaid',
    cantonRef: 'FND-0031::1220c33e',
    earned: 4442,
  },
  {
    id: 'BID-004',
    invoiceRef: 'INV-2026-0028',
    debtor: 'Summit Retail Group',
    grade: 'B',
    faceAmount: 95000,
    fundedAmount: 80750,
    advanceRate: 0.85,
    annualRate: 0.128,
    dueDate: 'Jun 28, 2026',
    status: 'repaid',
    cantonRef: 'FND-0028::1220d44f',
    earned: 2067,
  },
  {
    id: 'BID-005',
    invoiceRef: 'INV-2026-0041',
    debtor: 'Apex Manufacturing',
    grade: 'A',
    faceAmount: 89500,
    fundedAmount: 0,
    advanceRate: 0.87,
    annualRate: 0.112,
    dueDate: 'Oct 12, 2026',
    status: 'pending',
    cantonRef: 'SLD-0041::sealed',
    earned: 0,
  },
]

const stats = [
  { label: 'Capital Deployed', value: '$417,070', icon: DollarSign, color: 'text-violet-400', bg: 'bg-violet-500/10' },
  { label: 'Total Earned', value: '$8,401', icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10' },
  { label: 'Positions Won', value: '8 / 12', icon: Award, color: 'text-violet-400', bg: 'bg-violet-500/10' },
  { label: 'Avg Yield (APR)', value: '11.4%', icon: Clock, color: 'text-green-400', bg: 'bg-green-500/10' },
]

export default function PortfolioPage() {
  const [filter, setFilter] = useState<'all' | 'active' | 'repaid' | 'pending'>('all')
  const filtered = filter === 'all' ? positions : positions.filter(p => p.status === filter)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Portfolio" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(s => {
            const Icon = s.icon
            return (
              <div key={s.label} className="bg-dark-card border border-dark-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-dark-muted">{s.label}</p>
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', s.bg)}>
                    <Icon className={cn('w-4 h-4', s.color)} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-white">{s.value}</p>
              </div>
            )
          })}
        </div>

        <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-4 flex items-start gap-3">
          <EyeOff className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-white">Your sealed bids are private Canton contracts</p>
            <p className="text-xs text-dark-muted mt-0.5">Pending bids are visible only to you and the InvoPlus platform — not to the seller or other financiers. Enforced cryptographically by Canton.</p>
          </div>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-dark-border">
            <h2 className="text-sm font-semibold text-white">Funded Positions</h2>
            <div className="flex gap-1">
              {(['all', 'active', 'pending', 'repaid'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all',
                    filter === f ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'text-dark-muted hover:text-white'
                  )}
                >{f}</button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-dark-border">
            {filtered.map(pos => (
              <div key={pos.id} className="p-5 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className={cn(
                      'shrink-0 text-xs font-bold px-2 py-1 rounded-md border',
                      pos.grade === 'A' ? 'bg-green-500/15 text-green-400 border-green-500/30' : 'bg-violet-500/15 text-violet-400 border-violet-500/30'
                    )}>
                      {pos.grade}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">{pos.invoiceRef}</p>
                      <p className="text-xs text-dark-muted truncate">{pos.debtor}</p>
                      <p className="text-xs text-dark-muted mt-0.5">Due {pos.dueDate}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 shrink-0 text-right flex-wrap">
                    <div>
                      <p className="text-xs text-dark-muted">Face Value</p>
                      <p className="text-sm font-semibold text-white">${pos.faceAmount.toLocaleString()}</p>
                    </div>
                    {pos.status !== 'pending' && (
                      <>
                        <div>
                          <p className="text-xs text-dark-muted">Advance Rate</p>
                          <p className="text-sm font-semibold text-white">{(pos.advanceRate * 100).toFixed(0)}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-dark-muted">Annual Rate</p>
                          <p className="text-sm font-semibold text-violet-400">{(pos.annualRate * 100).toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-dark-muted">Earned</p>
                          <p className="text-sm font-semibold text-green-400">${pos.earned.toLocaleString()}</p>
                        </div>
                      </>
                    )}
                    <span className={cn(
                      'text-xs px-2 py-1 rounded-md font-medium',
                      pos.status === 'active' ? 'bg-green-500/15 text-green-400' :
                      pos.status === 'repaid' ? 'bg-dark-border text-dark-muted' :
                      'bg-violet-500/15 text-violet-400'
                    )}>
                      {pos.status === 'pending' ? '🔒 sealed' : pos.status}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-1.5">
                  <span className="text-xs text-dark-muted font-mono">{pos.cantonRef}</span>
                  <ExternalLink className="w-3 h-3 text-dark-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
