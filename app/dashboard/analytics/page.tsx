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
const gradeColor: Record<string, string> = { A: '#14B892', B: '#2FCDA0', C: '#F59E0B', D: '#EF4444' }
const fmtUSD = (n: number) => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : `$${Math.round(n)}`

const panel = 'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-800">
      <p className="mb-1 text-slate-500 dark:text-slate-400">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-data font-semibold">
          {p.name}: {typeof p.value === 'number' && p.value > 1000 ? `$${(p.value / 1000).toFixed(0)}K` : p.value}
        </p>
      ))}
    </div>
  )
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[180px] flex-col items-center justify-center gap-2 text-center">
      <BarChart3 className="h-5 w-5 text-slate-400 dark:text-slate-500" />
      <p className="max-w-[240px] text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  )
}

export default function AnalyticsPage() {
  const { party } = useCanton()
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
  const gradeBreakdown = Object.entries(gradeCounts).map(([g, n]) => ({ name: `Grade ${g}`, value: n, pct: totalGraded ? Math.round((n / totalGraded) * 100) : 0, color: gradeColor[g] || '#94a3b8' }))

  const kpis = [
    { label: 'Total Volume Financed', value: fmtUSD(totalVolume), sub: `${funded.length} funded position${funded.length === 1 ? '' : 's'}`, accent: true },
    { label: 'Active Auctions', value: String(activeAuctions), sub: 'Live sealed-bid auctions' },
    { label: 'Registry Checks', value: String(registry), sub: 'Anti double-finance entries' },
  ]

  // Your on-ledger footprint — app statistics only. Network internals like
  // block height belong in Settings, not analytics.
  const performance = [
    { label: 'Total Contracts', value: String(totalContracts), note: 'Invoice + Auction + Funded' },
    { label: 'Registry Entries', value: String(registry), note: 'Anti-fraud records on Canton' },
    { label: 'Funded Positions', value: String(funded.length), note: 'Settled atomically on ledger', accent: true },
    { label: 'Invoices Scored', value: String(invoices.length), note: 'Risk-graded by the engine' },
  ]

  if (loading) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <Header title="Analytics" />
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading analytics from Canton…</p>
        </div>
      </div>
    )
  }
  if (!party) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <Header title="Analytics" />
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <Wallet className="h-6 w-6 text-slate-400 dark:text-slate-500" />
          <p className="text-sm font-medium text-slate-950 dark:text-white">Connect your Canton wallet</p>
          <p className="max-w-xs text-xs text-slate-500 dark:text-slate-400">Analytics are computed from your live contracts on the Canton ledger. Connect a party to populate them.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Header title="Analytics" />
      <div className="flex-1 space-y-5 overflow-y-auto p-4 md:p-6">

        {/* KPIs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {kpis.map(k => (
            <div key={k.label} className={cn(panel, 'p-5')}>
              <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">{k.label}</p>
              <p className={cn('font-data text-3xl font-bold', k.accent ? 'text-violet-600 dark:text-violet-300' : 'text-slate-950 dark:text-white')}>{k.value}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{k.sub}</p>
            </div>
          ))}
        </div>

        {/* Volume chart */}
        <div className={cn(panel, 'p-5 md:p-6')}>
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-950 dark:text-white">Monthly Funding Volume</h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Disbursed to invoice sellers, by settlement month</p>
          </div>
          {volumeData.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={volumeData} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v / 1000}K`} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(20,184,146,0.06)' }} />
                <Bar dataKey="funded" name="Funded" fill="#14B892" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="No funded positions yet. Settle an auction on Canton to populate funding volume." />
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Advance rate trend */}
          <div className={cn(panel, 'p-5 md:p-6')}>
            <h3 className="mb-1 text-sm font-semibold text-slate-950 dark:text-white">Avg Advance Rate Trend</h3>
            <p className="mb-6 text-xs text-slate-500 dark:text-slate-400">Average advance rate across funded positions, by month</p>
            {rateData.length ? (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={rateData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[70, 100]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="avgAdvance" name="Advance %" stroke="#14B892" strokeWidth={2} dot={{ fill: '#14B892', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart label="Rate trend appears once you have funded positions on the ledger." />
            )}
          </div>

          {/* Grade distribution */}
          <div className={cn(panel, 'p-5 md:p-6')}>
            <h3 className="mb-1 text-sm font-semibold text-slate-950 dark:text-white">Invoice Grade Distribution</h3>
            <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">Your invoices by risk grade from the scoring engine</p>
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
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: g.color }} />
                      <div>
                        <p className="text-xs font-medium text-slate-950 dark:text-white">{g.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{g.value} invoice{g.value === 1 ? '' : 's'} · {g.pct}%</p>
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

        {/* Network performance */}
        <div className={cn(panel, 'p-5 md:p-6')}>
          <h3 className="mb-4 text-sm font-semibold text-slate-950 dark:text-white">Your On-Ledger Footprint</h3>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {performance.map(s => (
              <div key={s.label} className={cn('rounded-xl border p-4', s.accent ? 'border-violet-500/30 bg-violet-500/[0.04]' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950')}>
                <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
                <p className={cn('font-data text-lg font-bold', s.accent ? 'text-violet-600 dark:text-violet-300' : 'text-slate-950 dark:text-white')}>{s.value}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{s.note}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
