'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/dashboard/Header'
import { TrendingUp, DollarSign, Award, Clock, EyeOff, ExternalLink, Loader2, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCanton } from '@/lib/canton'

const val = (x: any) => (x && typeof x === 'object' && 'value' in x ? x.value : x)
const num = (x: any) => Number(val(x) ?? 0) || 0
const money = (n: number, ccy = 'USD') => {
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: ccy, maximumFractionDigits: 0 }).format(n) }
  catch { return `$${Math.round(n).toLocaleString()}` }
}

interface Position {
  id: string; invoiceRef: string; debtor: string; faceAmount: number; fundedAmount: number
  advanceRate: number; annualRate: number; currency: string; dueDate: string
  status: 'active' | 'pending'; cantonRef: string; returnAtRepayment: number
}

export default function PortfolioPage() {
  const { party } = useCanton()
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'pending'>('all')

  useEffect(() => {
    if (!party?.id) { setPositions([]); setLoading(false); return }
    let cancelled = false
    setLoading(true)
    const post = async (template: string) => {
      try {
        const res = await fetch('/api/canton/contracts/list', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parties: [party.id], template }),
        })
        const data = await res.json()
        return data.ok ? (data.contracts || []) : []
      } catch { return [] }
    }
    const load = async () => {
      const [funded, bids] = await Promise.all([post('funded'), post('bid')])
      if (cancelled) return
      const fundedRows: Position[] = funded.map((c: any) => {
        const p = c.payload || {}
        const face = num(p.faceAmount); const fund = num(p.fundedAmount)
        return {
          id: c.contractId, invoiceRef: val(p.invoiceId) || '—', debtor: val(p.debtorName) || '—',
          faceAmount: face, fundedAmount: fund, advanceRate: num(p.advanceRate), annualRate: num(p.annualRate),
          currency: val(p.currency) || 'USD', dueDate: val(p.dueDate) || '', status: 'active',
          cantonRef: c.contractId, returnAtRepayment: Math.max(face - fund, 0),
        }
      })
      const bidRows: Position[] = bids.filter((c: any) => !val(c.payload?.isRevealed)).map((c: any) => {
        const p = c.payload || {}
        return {
          id: c.contractId, invoiceRef: val(p.invoiceId) || '—', debtor: 'Sealed — hidden until settlement',
          faceAmount: num(p.faceAmount), fundedAmount: num(p.fundedAmount), advanceRate: num(p.advanceRate),
          annualRate: num(p.annualRate), currency: val(p.currency) || 'USD', dueDate: '', status: 'pending',
          cantonRef: c.contractId, returnAtRepayment: 0,
        }
      })
      setPositions([...fundedRows, ...bidRows])
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [party])

  const active = positions.filter(p => p.status === 'active')
  const capitalDeployed = active.reduce((s, p) => s + p.fundedAmount, 0)
  const totalReturn = active.reduce((s, p) => s + p.returnAtRepayment, 0)
  const avgYield = active.length ? active.reduce((s, p) => s + p.annualRate, 0) / active.length : 0
  const ccy = positions[0]?.currency || 'USD'

  const stats = [
    { label: 'Capital Deployed', value: money(capitalDeployed, ccy), icon: DollarSign, gold: false },
    { label: 'Return at Repayment', value: money(totalReturn, ccy), icon: TrendingUp, gold: true },
    { label: 'Funded Positions', value: String(active.length), icon: Award, gold: false },
    { label: 'Avg Yield (APR)', value: `${(avgYield * 100).toFixed(1)}%`, icon: Clock, gold: true },
  ]

  const filtered = filter === 'all' ? positions : positions.filter(p => p.status === filter)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Portfolio" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(s => {
            const Icon = s.icon
            return (
              <div key={s.label} className={cn(
                'bg-dark-card border border-dark-border rounded-2xl p-5 border-t-2',
                s.gold ? 'border-t-amber-400/70' : 'border-t-violet-500/50'
              )}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-dark-muted">{s.label}</p>
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', s.gold ? 'bg-amber-500/15' : 'bg-violet-500/10')}>
                    <Icon className={cn('w-4 h-4', s.gold ? 'text-amber-300' : 'text-violet-400')} />
                  </div>
                </div>
                <p className={cn('text-2xl font-bold font-data', s.gold ? 'text-amber-300' : 'text-white')}>{loading ? '—' : s.value}</p>
              </div>
            )
          })}
        </div>

        <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-4 flex items-start gap-3">
          <EyeOff className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-white">Your sealed bids are private Canton contracts</p>
            <p className="text-xs text-dark-muted mt-0.5">Pending bids are visible only to you and the InvoPlus platform, not to the seller or other financiers. Enforced cryptographically by Canton.</p>
          </div>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-dark-border">
            <h2 className="text-sm font-semibold text-white">Funded Positions</h2>
            <div className="flex gap-1">
              {(['all', 'active', 'pending'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)} className={cn(
                  'px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all',
                  filter === f ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'text-dark-muted hover:text-white'
                )}>{f}</button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
              <p className="text-sm text-dark-muted">Loading positions from Canton…</p>
            </div>
          ) : !party ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-center px-6">
              <Wallet className="w-6 h-6 text-dark-muted" />
              <p className="text-sm font-medium text-white">Connect your Canton wallet</p>
              <p className="text-xs text-dark-muted max-w-xs">Connect a financier party to see your funded positions and sealed bids.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-center px-6">
              <TrendingUp className="w-6 h-6 text-dark-muted" />
              <p className="text-sm font-medium text-white">No positions yet</p>
              <p className="text-xs text-dark-muted max-w-xs">Win a sealed-bid auction in the marketplace and your funded positions will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-dark-border">
              {filtered.map(pos => (
                <div key={pos.id} className="p-5 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className={cn('shrink-0 text-xs font-bold px-2 py-1 rounded-md border',
                        pos.status === 'active' ? 'bg-amber-500/15 text-amber-300 border-amber-400/40' : 'bg-violet-500/15 text-violet-400 border-violet-500/30')}>
                        {pos.status === 'active' ? 'Funded' : 'Sealed'}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">{pos.invoiceRef}</p>
                        <p className="text-xs text-dark-muted truncate">{pos.debtor}</p>
                        {pos.dueDate && <p className="text-xs text-dark-muted mt-0.5">Due {pos.dueDate}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-6 shrink-0 text-right flex-wrap">
                      <div>
                        <p className="text-xs text-dark-muted">Face Value</p>
                        <p className="text-sm font-semibold text-white">{money(pos.faceAmount, pos.currency)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-dark-muted">Advance Rate</p>
                        <p className="text-sm font-semibold text-white">{(pos.advanceRate * 100).toFixed(0)}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-dark-muted">Annual Rate</p>
                        <p className="text-sm font-semibold text-amber-300 font-data">{(pos.annualRate * 100).toFixed(1)}%</p>
                      </div>
                      {pos.status === 'active' && (
                        <div>
                          <p className="text-xs text-dark-muted">Return at Repayment</p>
                          <p className="text-sm font-semibold text-amber-300 font-data">{money(pos.returnAtRepayment, pos.currency)}</p>
                        </div>
                      )}
                      <span className={cn('text-xs px-2 py-1 rounded-md font-medium',
                        pos.status === 'active' ? 'bg-amber-500/15 text-amber-300' : 'bg-violet-500/15 text-violet-400')}>
                        {pos.status === 'pending' ? '🔒 sealed' : 'active'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5">
                    <span className="text-xs text-dark-muted font-mono truncate max-w-[280px]">{pos.cantonRef}</span>
                    <ExternalLink className="w-3 h-3 text-dark-muted shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
