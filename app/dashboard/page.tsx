'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/dashboard/Header'
import { CopyBtn } from '@/components/dashboard/CopyBtn'
import { FileText, TrendingUp, ArrowUpRight, Store, Tag, EyeOff, DollarSign, Clock, BarChart3 } from 'lucide-react'
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
const money = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${Math.round(n).toLocaleString()}`

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
  const [data, setData] = useState<{ invoices: any[]; auctions: any[]; bids: any[]; funded: any[]; repaid: any[] }>({ invoices: [], auctions: [], bids: [], funded: [], repaid: [] })
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    if (!party?.id) { setData({ invoices: [], auctions: [], bids: [], funded: [], repaid: [] }); return }
    let firstLoad = true
    const load = async () => {
      // Only the first load shows the loading skeleton — a background
      // refresh replacing live numbers with "—" every 30s would flicker.
      if (firstLoad) setLoading(true)
      setFetchError(null)
      try {
        const [invoices, auctions, bids, funded, repaid] = await Promise.all([
          fetchContracts(party.id, 'invoice'),
          fetchContracts(party.id, 'auction'),
          fetchContracts(party.id, 'bid'),
          fetchContracts(party.id, 'funded'),
          // FundedInvoice is archived the moment repayment completes —
          // without this, every settled-and-repaid position drops out of
          // the funded volume, chart, and activity feed the instant it's
          // paid back, which reads as if the data just disappeared.
          fetchContracts(party.id, 'repayment'),
        ])
        setData({ invoices, auctions, bids, funded, repaid })
      } catch (e) {
        setFetchError(e instanceof Error ? e.message : 'Unable to load contract data')
      } finally {
        if (firstLoad) { setLoading(false); firstLoad = false }
      }
    }
    load()
    // Real-time-ish: activity from the counterparty (a financier funding
    // your invoice, a seller repaying you) lands here without a manual
    // reload, same pattern as the marketplace/offers/analytics polls.
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [party])

  const { invoices, auctions, bids, funded, repaid } = data

  // Cumulative running total per funded position, not a monthly bucket — a
  // hackathon demo's whole history can happen in one sitting, so waiting
  // for a second calendar month to draw a "trend" meant the chart just
  // never had anything to show. This draws a real rising line from the
  // very first settlement, and reads well whether that history spans
  // months or minutes.
  const monthly = (() => {
    const events: { t: number; amount: number }[] = []
    const collect = (list: any[], dateField: string) => {
      for (const c of list) {
        const raw = pv(c.payload, dateField)
        const t = raw ? new Date(raw).getTime() : NaN
        if (!isNaN(t)) events.push({ t, amount: num(pv(c.payload, 'fundedAmount')) })
      }
    }
    collect(funded, 'settledAt')
    collect(repaid, 'completedAt')
    events.sort((a, b) => a.t - b.t)

    let running = 0
    const points = events.map(e => {
      running += e.amount
      const d = new Date(e.t)
      const hours = d.getHours()
      const label = `${MONTHS[d.getMonth()]} ${d.getDate()}, ${hours % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}${hours >= 12 ? 'pm' : 'am'}`
      return { label, amount: running }
    })
    // A single real point still draws as a lone dot — prepend a zero
    // baseline so even the very first settlement shows a rising line.
    return points.length === 1 ? [{ label: 'Start', amount: 0 }, ...points] : points
  })()

  const totalFunded = funded.reduce((s: number, c: any) => s + num(pv(c.payload, 'fundedAmount')), 0)
    + repaid.reduce((s: number, c: any) => s + num(pv(c.payload, 'fundedAmount')), 0)
  const isFin = party?.type === 'financier'

  // An empty metric never renders a placeholder number ("0", "—") — the
  // card flips into a call-to-action instead (icon + "Create your first
  // invoice →", the whole card clickable). Dead space becomes onboarding,
  // which reads as intentional design rather than missing data.
  const openBidsCount = isFin ? bids.length : invoices.length
  const activeAuctionsCount = auctions.filter((c: any) => !pv(c.payload, 'settled')).length
  const stats = [
    {
      label: 'Funded volume', big: totalFunded >= 1000 ? `$${(totalFunded / 1000).toFixed(1)}K` : `$${Math.round(totalFunded)}`,
      sub: `${funded.length + repaid.length} position${funded.length + repaid.length === 1 ? '' : 's'}`,
      bars: monthly.map(m => m.amount),
      empty: totalFunded === 0,
      emptyIcon: TrendingUp,
      emptyText: isFin ? 'Win an auction to start earning yield' : 'Get an invoice funded to see volume here',
      emptyHref: isFin ? '/dashboard/marketplace' : '/dashboard/invoices',
    },
    {
      label: isFin ? 'Open bids' : 'Invoices',
      big: String(openBidsCount),
      // "created" covers both ways an invoice gets on the ledger — typed
      // into the form or extracted from an uploaded PDF — so this isn't
      // read as "only counts PDF uploads."
      sub: isFin ? 'sealed on ledger' : 'created',
      bars: (isFin ? bids : invoices).slice(0, 8).map((c: any) => num(pv(c.payload, 'faceAmount'))),
      empty: openBidsCount === 0,
      emptyIcon: isFin ? Store : FileText,
      emptyText: isFin ? 'Place your first sealed bid' : 'Create your first invoice',
      emptyHref: isFin ? '/dashboard/marketplace' : '/dashboard/invoices',
    },
    {
      label: 'Active auctions',
      big: String(activeAuctionsCount),
      sub: 'sealed-bid live',
      bars: auctions.slice(0, 8).map((c: any) => num(pv(c.payload, 'bidCount')) + 1),
      empty: activeAuctionsCount === 0,
      emptyIcon: Store,
      emptyText: isFin ? 'Watch the marketplace for new listings' : 'List an invoice to open an auction',
      emptyHref: isFin ? '/dashboard/marketplace' : '/dashboard/invoices',
    },
  ]

  const activity = [...repaid.map((c: any) => ({
    id: c.contractId, name: pv(c.payload, 'invoiceId') || 'Repaid', note: 'repaid in full',
    amount: num(pv(c.payload, 'totalDue')), chip: 'R',
  })), ...funded.map((c: any) => ({
    id: c.contractId, name: pv(c.payload, 'invoiceId') || 'Funded', note: pv(c.payload, 'debtorName') || 'settled',
    amount: num(pv(c.payload, 'fundedAmount')), chip: 'F',
  })), ...invoices.map((c: any) => ({
    id: c.contractId, name: pv(c.payload, 'invoiceId') || 'Invoice', note: pv(c.payload, 'debtorName') || 'uploaded',
    amount: num(pv(c.payload, 'faceAmount')), chip: 'I',
  }))].slice(0, 7)

  // Financier's own positions — the same data Portfolio used to show on its
  // own page, folded in here instead so there's one less page in the app.
  const openBids = bids.filter((c: any) => !pv(c.payload, 'isRevealed'))
  const positions = [
    ...funded.map((c: any) => {
      const face = num(pv(c.payload, 'faceAmount')); const fund = num(pv(c.payload, 'fundedAmount'))
      return { id: c.contractId, invoiceId: pv(c.payload, 'invoiceId') || '—', status: 'active' as const, fundedAmount: fund, returnAmount: Math.max(face - fund, 0) }
    }),
    ...repaid.map((c: any) => {
      const fund = num(pv(c.payload, 'fundedAmount')); const total = num(pv(c.payload, 'totalDue'))
      return { id: c.contractId, invoiceId: pv(c.payload, 'invoiceId') || '—', status: 'repaid' as const, fundedAmount: fund, returnAmount: Math.max(total - fund, 0) }
    }),
  ]
  const activePositions = positions.filter(p => p.status === 'active')
  const capitalDeployed = activePositions.reduce((s, p) => s + p.fundedAmount, 0)
  const returnOwed = activePositions.reduce((s, p) => s + p.returnAmount, 0)
  const yieldRealized = positions.filter(p => p.status === 'repaid').reduce((s, p) => s + p.returnAmount, 0)

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Header title="Overview" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_320px]">

          {/* ══ Main column ══ */}
          <div className="min-w-0 space-y-5">

            {/* Stat cards — an empty metric renders as a clickable CTA
                card (icon + "Create your first invoice →") instead of a
                placeholder number, so a fresh account's overview reads as
                a set of next steps, not a wall of zeros/dashes. */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {stats.map(s => {
                const EmptyIcon = s.emptyIcon
                return !loading && s.empty ? (
                  <Link
                    key={s.label}
                    href={s.emptyHref}
                    className={cn(panel, 'group flex flex-col justify-between p-5 transition-all hover:-translate-y-0.5 hover:border-violet-500/40')}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
                        <EmptyIcon className="h-5 w-5 text-violet-600 dark:text-violet-300" />
                      </span>
                      <span className="rounded-lg bg-violet-500/10 px-2 py-1 font-data text-[10px] uppercase tracking-[0.14em] text-violet-600 dark:text-violet-300">{s.label}</span>
                    </div>
                    <p className="mt-4 flex items-center gap-1.5 text-sm font-medium text-slate-600 group-hover:text-violet-600 dark:text-slate-300 dark:group-hover:text-violet-300">
                      {s.emptyText}
                      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </p>
                  </Link>
                ) : (
                  <div key={s.label} className={cn(panel, 'p-5')}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-data text-3xl font-bold text-slate-950 dark:text-white">{loading ? '…' : s.big}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{s.sub}</p>
                      </div>
                      <span className="rounded-lg bg-violet-500/10 px-2 py-1 font-data text-[10px] uppercase tracking-[0.14em] text-violet-600 dark:text-violet-300">{s.label}</span>
                    </div>
                    <div className="mt-4 h-9">
                      {s.bars.length > 0 && <MiniBars values={s.bars} />}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Big funding chart */}
            <div className={cn(panel, 'p-5 md:p-6')}>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Funding volume</h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">cumulative total disbursed to sellers, per settlement</p>
                </div>
                <span className="font-data rounded-lg bg-violet-500/10 px-2.5 py-1 text-[11px] text-violet-600 dark:text-violet-300">USD</span>
              </div>
              {monthly.length >= 2 ? (
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

            {/* Positions — financier-only, folded in from what used to be a
                separate Portfolio page. Businesses already have their own
                invoice lifecycle front and center on Invoices. */}
            {isFin && (
              <div className={cn(panel, 'p-5 md:p-6')}>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Your Positions</h2>
                  <Link href="/dashboard/marketplace" className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-500 dark:text-violet-300 dark:hover:text-violet-200">
                    marketplace <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: 'Deployed', value: money(capitalDeployed), icon: DollarSign },
                    { label: 'Owed (Active)', value: money(returnOwed), icon: Clock },
                    { label: 'Realized (Repaid)', value: money(yieldRealized), icon: TrendingUp },
                    { label: 'Open Bids', value: String(openBids.length), icon: EyeOff },
                  ].map(s => {
                    const Icon = s.icon
                    return (
                      <div key={s.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
                        <div className="mb-1 flex items-center gap-1.5 text-slate-400 dark:text-slate-500"><Icon className="h-3 w-3" /><span className="text-[10px] uppercase tracking-wider">{s.label}</span></div>
                        <p className="font-data text-sm font-bold text-slate-950 dark:text-white">{loading ? '—' : s.value}</p>
                      </div>
                    )
                  })}
                </div>

                {positions.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">No positions yet — place a sealed bid in the marketplace and win an auction to see it here.</p>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {positions.slice(0, 5).map(p => (
                      <div key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={cn('shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold',
                            p.status === 'active'
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                              : 'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300')}>
                            {p.status === 'active' ? 'Funded' : 'Repaid'}
                          </span>
                          <p className="truncate text-sm font-medium text-slate-950 dark:text-white">{p.invoiceId}</p>
                        </div>
                        <span className="font-data shrink-0 text-sm font-semibold text-violet-600 dark:text-violet-300">{money(p.fundedAmount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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
                    <div key={a.id} className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/10 font-data text-xs text-violet-600 dark:text-violet-300">{a.chip}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-950 dark:text-white">{a.name}</p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{a.note}</p>
                        </div>
                        <p className="font-data text-sm font-bold text-violet-600 dark:text-violet-300">{a.amount ? `$${a.amount >= 1000 ? (a.amount / 1000).toFixed(1) + 'K' : Math.round(a.amount)}` : ''}</p>
                      </div>
                      {/* Real Canton contract ID, not a placeholder — proof
                          this row is a genuine ledger record, one click to
                          copy for independent verification. */}
                      <div className="mt-1.5 flex items-center gap-1 pl-11">
                        <span className="font-data truncate text-[10px] text-slate-400 dark:text-slate-600">{a.id}</span>
                        <CopyBtn text={a.id} />
                      </div>
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
                { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
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
