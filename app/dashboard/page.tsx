'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/dashboard/Header'
import { FileText, TrendingUp, Lock, Shield, ArrowUpRight, Store, Tag } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useCanton } from '@/lib/canton'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const pv = (payload: any, key: string) => {
  if (!payload) return ''
  const v = payload[key]
  if (v === undefined || v === null) return ''
  return typeof v === 'object' && 'value' in v ? v.value : v
}
const num = (x: any) => Number(x ?? 0) || 0
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const panel = 'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900'

async function fetchContracts(partyId: string, template: string) {
  const res = await fetch('/api/canton/contracts/list', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parties: [partyId], template }),
  })
  if (!res.ok) throw new Error(`Failed to fetch ${template}: ${res.status}`)
  const data = await res.json()
  return data.ok ? data.contracts : []
}

function MiniBars({ values }: { values: number[] }) {
  if (!values.length) return null
  const max = Math.max(...values, 1)
  return (
    <div className="flex h-9 items-end gap-1">
      {values.map((v, i) => (
        <span key={i} className="w-1.5 rounded-sm bg-gradient-to-t from-violet-600 to-violet-400" style={{
          height: `${Math.max((v / max) * 100, 8)}%`,
          opacity: 0.5 + (i / values.length) * 0.5,
        }} />
      ))}
    </div>
  )
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-800">
      <p className="mb-1 text-slate-500 dark:text-slate-400">{label}</p>
      <p className="font-data font-semibold text-violet-600 dark:text-violet-300">
        ${Number(payload[0].value).toLocaleString()}
      </p>
    </div>
  )
}

export default function DashboardPage() {
  const { party } = useCanton()
  const [data, setData] = useState<{ invoices: any[]; auctions: any[]; bids: any[]; funded: any[] }>({ invoices: [], auctions: [], bids: [], funded: [] })
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    if (!party?.id) { setData({ invoices: [], auctions: [], bids: [], funded: [] }); return }
    const load = async () => {
      setLoading(true); setFetchError(null)
      try {
        const [invoices, auctions, bids, funded] = await Promise.all([
          fetchContracts(party.id, 'invoice'),
          fetchContracts(party.id, 'auction'),
          fetchContracts(party.id, 'bid'),
          fetchContracts(party.id, 'funded'),
        ])
        setData({ invoices, auctions, bids, funded })
      } catch (e) {
        setFetchError(e instanceof Error ? e.message : 'Unable to load contract data')
      } finally { setLoading(false) }
    }
    load()
  }, [party])

  const { invoices, auctions, bids, funded } = data

  const monthly = (() => {
    const m = new Map<number, { label: string; amount: number }>()
    funded.forEach((c: any) => {
      const t = pv(c.payload, 'settledAt'); if (!t) return
      const d = new Date(t); if (isNaN(d.getTime())) return
      const k = d.getFullYear() * 12 + d.getMonth()
      const e = m.get(k) || { label: `${MONTHS[d.getMonth()]}`, amount: 0 }
      e.amount += num(pv(c.payload, 'fundedAmount'))
      m.set(k, e)
    })
    return Array.from(m.entries()).sort((a, b) => a[0] - b[0]).map(([, v]) => v)
  })()

  const totalFunded = funded.reduce((s: number, c: any) => s + num(pv(c.payload, 'fundedAmount')), 0)
  const isFin = party?.type === 'financier'

  const stats = [
    {
      label: 'Funded volume', big: totalFunded >= 1000 ? `$${(totalFunded / 1000).toFixed(1)}K` : `$${Math.round(totalFunded)}`,
      sub: `${funded.length} position${funded.length === 1 ? '' : 's'}`,
      bars: monthly.map(m => m.amount),
    },
    {
      label: isFin ? 'Open bids' : 'Invoices', big: String(isFin ? bids.length : invoices.length),
      sub: isFin ? 'sealed on ledger' : 'uploaded',
      bars: (isFin ? bids : invoices).slice(0, 8).map((c: any) => num(pv(c.payload, 'faceAmount'))),
    },
    {
      label: 'Active auctions', big: String(auctions.filter((c: any) => !pv(c.payload, 'settled')).length),
      sub: 'sealed-bid live',
      bars: auctions.slice(0, 8).map((c: any) => num(pv(c.payload, 'bidCount')) + 1),
    },
  ]

  const activity = [...funded.map((c: any) => ({
    id: c.contractId, name: pv(c.payload, 'invoiceId') || 'Funded', note: pv(c.payload, 'debtorName') || 'settled',
    amount: num(pv(c.payload, 'fundedAmount')), chip: 'F',
  })), ...invoices.map((c: any) => ({
    id: c.contractId, name: pv(c.payload, 'invoiceId') || 'Invoice', note: pv(c.payload, 'debtorName') || 'uploaded',
    amount: num(pv(c.payload, 'faceAmount')), chip: 'I',
  }))].slice(0, 7)

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Header title="Overview" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_320px]">

          {/* ══ Main column ══ */}
          <div className="min-w-0 space-y-5">

            {/* Stat cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {stats.map(s => (
                <div key={s.label} className={cn(panel, 'p-5')}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-data text-3xl font-bold text-slate-950 dark:text-white">{loading ? '—' : s.big}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{s.sub}</p>
                    </div>
                    <span className="rounded-lg bg-violet-500/10 px-2 py-1 font-data text-[10px] uppercase tracking-[0.14em] text-violet-600 dark:text-violet-300">{s.label}</span>
                  </div>
                  <div className="mt-4">
                    {s.bars.length ? <MiniBars values={s.bars} /> : (
                      <p className="font-data text-[10px] text-slate-400 dark:text-slate-500">no ledger data yet</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Big funding chart */}
            <div className={cn(panel, 'p-5 md:p-6')}>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Funding volume</h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">disbursed to sellers, by settlement month</p>
                </div>
                <span className="font-data rounded-lg bg-violet-500/10 px-2.5 py-1 text-[11px] text-violet-600 dark:text-violet-300">USD</span>
              </div>
              {monthly.length ? (
                <ResponsiveContainer width="100%" height={230}>
                  <AreaChart data={monthly}>
                    <defs>
                      <linearGradient id="fundGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#14B892" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#14B892" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v / 1000}K`} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="amount" stroke="#14B892" strokeWidth={2.5} fill="url(#fundGrad)" dot={{ fill: '#14B892', r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[230px] flex-col items-center justify-center gap-2 text-center">
                  <TrendingUp className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                  <p className="max-w-[260px] text-xs text-slate-500 dark:text-slate-400">{party ? 'Settle an auction on Canton and the funding curve draws itself here.' : 'Connect a party to chart live funding volume.'}</p>
                </div>
              )}
            </div>

            {/* Guarantees */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {[
                { icon: Lock, title: 'Sealed bids', desc: 'Only the bidder and platform can see a bid — Canton observers, not app code.' },
                { icon: Shield, title: 'No double financing', desc: 'The anti-fraud registry makes financing the same invoice twice fail at the ledger.' },
                { icon: FileText, title: 'Atomic settlement', desc: 'Winner, funding, and transfer commit in one transaction.' },
              ].map(c => {
                const Icon = c.icon
                return (
                  <div key={c.title} className={cn(panel, 'p-5')}>
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-300"><Icon className="h-4 w-4" /></span>
                      <p className="font-semibold text-slate-950 dark:text-white">{c.title}</p>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{c.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ══ Right column ══ */}
          {/* Network internals (block height, packages) deliberately absent —
              they're Canton trivia, not InvoPlus stats. Connection status
              lives in the header; full network details in Settings. */}
          <div className="space-y-5">

            {/* Activity list */}
            <div className={cn(panel, 'overflow-hidden')}>
              <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800">
                <h3 className="font-semibold text-slate-950 dark:text-white">Activity</h3>
                <Link href="/dashboard/invoices" className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-500 dark:text-violet-300 dark:hover:text-violet-200">
                  all <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
              {loading ? (
                <p className="p-5 text-sm text-slate-500 dark:text-slate-400">Loading…</p>
              ) : activity.length === 0 ? (
                <p className="p-5 text-sm text-slate-500 dark:text-slate-400">{party ? 'No contracts yet — activity lands here as you list and fund.' : 'Connect a party to see ledger activity.'}</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {activity.map(a => (
                    <div key={a.id} className="flex items-center gap-3 px-5 py-3.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/10 font-data text-xs text-violet-600 dark:text-violet-300">{a.chip}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-950 dark:text-white">{a.name}</p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{a.note}</p>
                      </div>
                      <p className="font-data text-sm font-bold text-violet-600 dark:text-violet-300">{a.amount ? `$${a.amount >= 1000 ? (a.amount / 1000).toFixed(1) + 'K' : Math.round(a.amount)}` : ''}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Submit', href: '/dashboard/invoices', icon: FileText },
                { label: 'Auctions', href: '/dashboard/marketplace', icon: Store },
                { label: 'Offers', href: '/dashboard/offers', icon: Tag },
                { label: 'Portfolio', href: '/dashboard/portfolio', icon: TrendingUp },
              ].map(a => {
                const Icon = a.icon
                return (
                  <Link key={a.label} href={a.href} className={cn(panel, 'group flex flex-col items-center gap-2 py-4 transition-all hover:-translate-y-0.5 hover:border-violet-500/40')}>
                    <Icon className="h-4 w-4 text-violet-600 dark:text-violet-300" />
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{a.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {fetchError && (
        <div className="mx-6 mb-4 rounded-2xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300">{fetchError}</div>
      )}
    </div>
  )
}
