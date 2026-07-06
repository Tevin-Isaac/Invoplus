'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/dashboard/Header'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts'
import { Loader2, BarChart3, Wallet } from 'lucide-react'
import { useCanton } from '@/lib/canton'
import { cn } from '@/lib/utils'

const val = (x: any) => (x && typeof x === 'object' && 'value' in x ? x.value : x)
const num = (x: any) => Number(val(x) ?? 0) || 0
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const gradeColor: Record<string, string> = { A: '#64748b', B: '#475569', C: '#94a3b8', D: '#cbd5e1' }
const fmtUSD = (n: number) => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : `$${Math.round(n)}`

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-dark-card border border-dark-border rounded-xl p-3 text-xs shadow-xl">
      <p className="text-dark-muted mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name}: {typeof p.value === 'number' && p.value > 1000 ? `$${(p.value / 1000).toFixed(0)}K` : p.value}
        </p>
      ))}
    </div>
  )
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[180px] gap-2 text-center">
      <BarChart3 className="w-5 h-5 text-dark-muted" />
      <p className="text-xs text-dark-muted max-w-[240px]">{label}</p>
    </div>
  )
}

export default function AnalyticsPage() {
  const { party, ledgerStatus } = useCanton()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{ invoices: any[]; auctions: any[]; funded: any[]; registry: number }>({ invoices: [], auctions: [], funded: [], registry: 0 })

  useEffect(() => {
    if (!party?.id) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    const post = async (template: string) => {
      try {
        const res = await fetch('/api/canton/contracts/list', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parties: [party.id], template }),
        })
        const d = await res.json()
        return d.ok ? (d.contracts || []) : []
      } catch { return [] }
    }
    Promise.all([post('invoice'), post('auction'), post('funded'), post('registry')]).then(([invoices, auctions, funded, registry]) => {
      if (cancelled) return
      setData({ invoices, auctions, funded, registry: registry.length })
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [party])

  const { invoices, auctions, funded, registry } = data
  const totalVolume = funded.reduce((s, c) => s + num(c.payload?.fundedAmount), 0)
  const activeAuctions = auctions.filter(c => !val(c.payload?.settled)).length
  const totalContracts = invoices.length + auctions.length + funded.length

  const volMap = new Map<string, { month: string; funded: number; order: number }>()
  const rateMap = new Map<string, { month: string; sum: number; n: number; order: number }>()
  funded.forEach(c => {
    const t = val(c.payload?.settledAt)
    if (!t) return
    const d = new Date(t)
    if (isNaN(d.getTime())) return
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const label = `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`
    const order = d.getFullYear() * 12 + d.getMonth()
    const v = volMap.get(key) || { month: label, funded: 0, order }
    v.funded += num(c.payload?.fundedAmount); volMap.set(key, v)
    const r = rateMap.get(key) || { month: label, sum: 0, n: 0, order }
    r.sum += num(c.payload?.advanceRate) * 100; r.n += 1; rateMap.set(key, r)
  })
  const volumeData = Array.from(volMap.values()).sort((a, b) => a.order - b.order)
  const rateData = Array.from(rateMap.values()).sort((a, b) => a.order - b.order).map(r => ({ month: r.month, avgAdvance: +(r.sum / r.n).toFixed(1) }))

  const gradeCounts: Record<string, number> = {}
  invoices.forEach(c => {
    let g: any = val(c.payload?.riskGrade)
    if (g && typeof g === 'object' && 'tag' in g) g = g.tag
    const grade = String(g || '').replace('Grade_', '') || '—'
    gradeCounts[grade] = (gradeCounts[grade] || 0) + 1
  })
  const totalGraded = Object.values(gradeCounts).reduce((s, n) => s + n, 0)
  const gradeBreakdown = Object.entries(gradeCounts).map(([g, n]) => ({ name: `Grade ${g}`, value: n, pct: totalGraded ? Math.round((n / totalGraded) * 100) : 0, color: gradeColor[g] || '#9898A6' }))

  const kpis = [
    { label: 'Total Volume Financed', value: fmtUSD(totalVolume), sub: `${funded.length} funded position${funded.length === 1 ? '' : 's'}`, gold: true },
    { label: 'Active Auctions', value: String(activeAuctions), sub: 'Live sealed-bid auctions', gold: false },
    { label: 'Registry Checks', value: String(registry), sub: 'Anti double-finance entries', gold: false },
  ]

  const performance = [
    { label: 'Total Contracts', value: String(totalContracts), note: 'Invoice + Auction + Funded', gold: false },
    { label: 'Registry Entries', value: String(registry), note: 'Anti-fraud records on Canton', gold: false },
    { label: 'Funded Positions', value: String(funded.length), note: 'Settled atomically on ledger', gold: true },
    { label: 'Ledger Block', value: ledgerStatus?.offset != null ? ledgerStatus.offset.toLocaleString() : '—', note: ledgerStatus?.ok ? 'DevNet · live' : 'DevNet · offline', gold: false },
  ]

  if (loading) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <Header title="Analytics" />
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
          <p className="text-sm text-dark-muted">Loading analytics from Canton…</p>
        </div>
      </div>
    )
  }
  if (!party) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <Header title="Analytics" />
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-6">
          <Wallet className="w-6 h-6 text-dark-muted" />
          <p className="text-sm font-medium text-white">Connect your Canton wallet</p>
          <p className="text-xs text-dark-muted max-w-xs">Analytics are computed from your live contracts on the Canton ledger. Connect a party to populate them.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Analytics" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        <div className="grid grid-cols-3 gap-4">
          {kpis.map(k => (
            <div key={k.label} className={cn('bg-dark-card border border-dark-border rounded-2xl p-5 border-t-2', k.gold ? 'border-t-violet-400/70' : 'border-t-violet-500/50')}>
              <p className="text-xs text-dark-muted mb-1">{k.label}</p>
              <p className={cn('text-3xl font-bold font-data', k.gold ? 'text-violet-300' : 'text-white')}>{k.value}</p>
              <p className="text-xs text-dark-muted mt-1">{k.sub}</p>
            </div>
          ))}
        </div>

        <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-semibold text-white">Monthly Funding Volume</h3>
              <p className="text-xs text-dark-muted mt-0.5">Disbursed to invoice sellers, by settlement month</p>
            </div>
          </div>
          {volumeData.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={volumeData} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#252530" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#9898A6', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9898A6', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v / 1000}K`} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(245,158,11,0.06)' }} />
                <Bar dataKey="funded" name="Funded" fill="#14B892" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="No funded positions yet. Settle an auction on Canton to populate funding volume." />
          )}
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-white mb-1">Avg Advance Rate Trend</h3>
            <p className="text-xs text-dark-muted mb-6">Average advance rate across funded positions, by month</p>
            {rateData.length ? (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={rateData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#252530" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: '#9898A6', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[70, 100]} tick={{ fill: '#9898A6', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="avgAdvance" name="Advance %" stroke="#14B892" strokeWidth={2} dot={{ fill: '#14B892', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart label="Rate trend appears once you have funded positions on the ledger." />
            )}
          </div>

          <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-white mb-1">Invoice Grade Distribution</h3>
            <p className="text-xs text-dark-muted mb-4">Your invoices by risk grade from the scoring engine</p>
            {gradeBreakdown.length ? (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={gradeBreakdown} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                      {gradeBreakdown.map((entry, index) => (<Cell key={index} fill={entry.color} />))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3">
                  {gradeBreakdown.map(g => (
                    <div key={g.name} className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                      <div>
                        <p className="text-xs font-medium text-white">{g.name}</p>
                        <p className="text-xs text-dark-muted">{g.value} invoice{g.value === 1 ? '' : 's'} · {g.pct}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyChart label="Create and verify invoices to see the grade distribution." />
            )}
          </div>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Canton Network Performance</h3>
          <div className="grid grid-cols-4 gap-4">
            {performance.map(s => (
              <div key={s.label} className={cn('p-4 rounded-xl bg-dark-bg border', s.gold ? 'border-violet-400/30' : 'border-dark-border')}>
                <p className="text-xs text-dark-muted mb-1">{s.label}</p>
                <p className={cn('text-lg font-bold font-data', s.gold ? 'text-violet-300' : 'text-white')}>{s.value}</p>
                <p className="text-xs text-dark-muted mt-1">{s.note}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
