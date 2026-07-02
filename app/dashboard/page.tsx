'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/dashboard/Header'
import { FileText, TrendingUp, Lock, Shield, RefreshCw, ArrowUpRight } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useCanton } from '@/lib/canton'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface LedgerStats { ok: boolean; offset?: number; packageCount?: number; network?: string; timestamp?: string }

const pv = (payload: any, key: string) => {
  if (!payload) return ''
  const v = payload[key]
  if (v === undefined || v === null) return ''
  return typeof v === 'object' && 'value' in v ? v.value : v
}
const num = (x: any) => Number(x ?? 0) || 0
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

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

function MiniBars({ values, from, to }: { values: number[]; from: string; to: string }) {
  if (!values.length) return null
  const max = Math.max(...values, 1)
  return (
    <div className="flex h-9 items-end gap-1">
      {values.map((v, i) => (
        <span key={i} className="w-1.5 rounded-sm" style={{
          height: `${Math.max((v / max) * 100, 8)}%`,
          background: `linear-gradient(180deg, ${from}, ${to})`,
          opacity: 0.55 + (i / values.length) * 0.45,
        }} />
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const { ledgerStatus, ledgerLoading, party } = useCanton()
  const [refreshing, setRefreshing] = useState(false)
  const [localStatus, setLocalStatus] = useState<LedgerStats | null>(null)
  const [data, setData] = useState<{ invoices: any[]; auctions: any[]; bids: any[]; funded: any[] }>({ invoices: [], auctions: [], bids: [], funded: [] })
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const status = localStatus ?? ledgerStatus

  const refresh = async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/canton/ledger-status')
      setLocalStatus(await res.json())
    } catch { /* ignore */ } finally { setRefreshing(false) }
  }

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

  // Monthly funded series for the big chart + mini bars, from real settledAt
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
<<<<<<< HEAD
    { label: party?.type === 'financier' ? 'Open bids' : 'Outstanding invoices', value: party ? String(party.type === 'financier' ? counts.bids : counts.invoices) : '—', icon: FileText },
    { label: 'Funded positions', value: party ? String(counts.funded) : '—', icon: TrendingUp },
    { label: party?.type === 'financier' ? 'Visible auctions' : 'Active auctions', value: party ? String(counts.auctions) : '—', icon: Lock },
    { label: 'Ledger packages', value: status?.packageCount != null ? String(status.packageCount) : '—', icon: Shield },
=======
    {
      label: 'Funded volume', big: totalFunded >= 1000 ? `$${(totalFunded / 1000).toFixed(1)}K` : `$${Math.round(totalFunded)}`,
      sub: `${funded.length} positions`, from: '#FCD34D', to: '#B45309', accent: 'text-amber-300',
      bars: monthly.map(m => m.amount),
    },
    {
      label: isFin ? 'Open bids' : 'Invoices', big: String(isFin ? bids.length : invoices.length),
      sub: isFin ? 'sealed on ledger' : 'uploaded', from: '#A78BFA', to: '#5B21B6', accent: 'text-violet-300',
      bars: (isFin ? bids : invoices).slice(0, 8).map((c: any) => num(pv(c.payload, 'faceAmount'))),
    },
    {
      label: 'Active auctions', big: String(auctions.filter((c: any) => !pv(c.payload, 'settled')).length),
      sub: 'sealed-bid live', from: '#6EE7B7', to: '#047857', accent: 'text-emerald-300',
      bars: auctions.slice(0, 8).map((c: any) => num(pv(c.payload, 'bidCount')) + 1),
    },
>>>>>>> 781c84a (feat(dashboard): redesign overview, invoices, and marketplace with panel aesthetic, wire marketplace to live data, fix wallet modal styling)
  ]

  const activity = [...funded.map((c: any) => ({
    id: c.contractId, name: pv(c.payload, 'invoiceId') || 'Funded', note: pv(c.payload, 'debtorName') || 'settled',
    amount: num(pv(c.payload, 'fundedAmount')), tone: 'text-amber-300', chip: 'F',
  })), ...invoices.map((c: any) => ({
    id: c.contractId, name: pv(c.payload, 'invoiceId') || 'Invoice', note: pv(c.payload, 'debtorName') || 'uploaded',
    amount: num(pv(c.payload, 'faceAmount')), tone: 'text-slate-200', chip: 'I',
  }))].slice(0, 7)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Dashboard" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">

<<<<<<< HEAD
        <div className="flex items-center justify-between rounded-3xl border border-dark-border bg-dark-card p-5">
          <div className="flex items-center gap-3">
            <span className={cn('w-2.5 h-2.5 rounded-full', status?.ok ? 'bg-slate-500 animate-pulse' : ledgerLoading ? 'bg-slate-400 animate-pulse' : 'bg-slate-600')} />
            <div>
              <p className="text-sm font-semibold text-white">Canton DevNet {status?.ok ? '· Connected' : ledgerLoading ? '· Connecting…' : '· Offline'}</p>
              <p className="text-xs text-dark-muted">
                {status?.ok ? `Block ${status.offset?.toLocaleString()} · ${status.packageCount} packages · ${status.network ?? 'Canton Network'}` : ledgerLoading ? 'Establishing connection…' : 'Unable to reach Canton backend'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {status?.timestamp && <p className="text-xs text-dark-muted hidden md:block">Updated {new Date(status.timestamp).toLocaleTimeString()}</p>}
            <button onClick={fetchFresh} disabled={refreshing} className="p-1.5 rounded-lg bg-white/5 text-dark-muted transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60">
              <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="rounded-3xl border border-dark-border bg-dark-card p-5">
                <div className="flex items-center gap-2 text-dark-muted">
                  <Icon className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-[0.24em]">{stat.label}</span>
                </div>
                <p className="mt-5 text-3xl font-semibold font-data text-white">{stat.value}</p>
              </div>
            )
          })}
        </div>

        {fetchError && (
          <div className="rounded-3xl border border-dark-border bg-dark-card p-4 text-sm text-white">{fetchError}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[
            { icon: Lock, title: 'Sealed bid privacy', desc: 'Seller and financier privacy is enforced by Canton contract observers and signatories.' },
            { icon: Shield, title: 'Anti-fraud registry', desc: 'Every listed invoice is registered for one-time financing protection.' },
            { icon: Zap, title: 'Atomic settlement', desc: 'Auction settlement and funding happen in a single Canton transaction.' },
          ].map((card) => {
            const Icon = card.icon
            return (
              <div key={card.title} className="rounded-3xl border border-dark-border bg-dark-card p-5">
                <div className="flex items-center gap-3 mb-3">
                  <Icon className="h-5 w-5 text-white" />
                  <p className="font-semibold text-white">{card.title}</p>
                </div>
                <p className="text-sm text-dark-muted">{card.desc}</p>
              </div>
            )
          })}
        </div>

        <div className="bg-dark-card rounded-3xl border border-dark-border overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-dark-border p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-dark-muted">Live contract feed</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Real contract data from Canton</h2>
            </div>
            <Link href="/dashboard/invoices" className="rounded-2xl bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">Explore all invoices</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-dark-border text-left text-sm">
              <thead className="bg-dark-bg text-dark-muted">
                <tr>
                  <th className="px-5 py-4">Invoice</th>
                  <th className="px-5 py-4">Buyer</th>
                  <th className="px-5 py-4">Amount</th>
                  <th className="px-5 py-4">Due Date</th>
                  <th className="px-5 py-4">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border bg-dark-bg">
                {loadingContracts ? (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-dark-muted">Loading backend contracts…</td></tr>
                ) : recentContracts.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-dark-muted">{party ? 'No contract rows are visible for your connected party yet.' : 'Connect a party to load contract data from Canton.'}</td></tr>
                ) : (
                  recentContracts.map((contract) => (
                    <tr key={contract.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-5 py-4 font-medium text-white">{contract.invoiceId || contract.id.slice(0, 12)}</td>
                      <td className="px-5 py-4 text-dark-muted">{contract.buyer}</td>
                      <td className="px-5 py-4 font-semibold font-data text-white">{contract.amount}</td>
                      <td className="px-5 py-4 text-dark-muted">{contract.dueDate}</td>
                      <td className="px-5 py-4 text-dark-muted">{contract.grade}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Submit Invoice', href: '/dashboard/invoices', icon: FileText },
            { label: 'Browse Auctions', href: '/dashboard/marketplace', icon: Lock },
            { label: 'My Offers', href: '/dashboard/offers', icon: TrendingUp },
            { label: 'View Portfolio', href: '/dashboard/portfolio', icon: DollarSign },
          ].map((action) => {
            const Icon = action.icon
            return (
              <Link key={action.label} href={action.href} className="flex items-center gap-3 rounded-3xl border border-dark-border bg-dark-card p-4 transition hover:bg-white/5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-white">
                  <Icon className="h-4 w-4" />
=======
          {/* ══ Main column ══ */}
          <div className="space-y-5 min-w-0">

            {/* Stat cards with mini bars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {stats.map(s => (
                <div key={s.label} className="rounded-3xl border border-white/[0.07] bg-[#120E1F] p-5 shadow-[0_10px_35px_rgba(0,0,0,0.45)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={cn('font-data text-3xl font-bold', s.accent)}>{loading ? '—' : s.big}</p>
                      <p className="mt-1 text-xs text-slate-500">{s.sub}</p>
                    </div>
                    <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 font-data text-[10px] uppercase tracking-[0.16em] text-slate-400">{s.label}</span>
                  </div>
                  <div className="mt-4">
                    {s.bars.length ? <MiniBars values={s.bars} from={s.from} to={s.to} /> : (
                      <p className="font-data text-[10px] text-slate-600">no ledger data yet</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Big funding chart */}
            <div className="rounded-3xl border border-white/[0.07] bg-[#120E1F] p-6 shadow-[0_10px_35px_rgba(0,0,0,0.45)]">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-lg font-semibold text-white">Funding volume</h2>
                  <p className="mt-0.5 text-xs text-slate-500">disbursed to sellers, by settlement month</p>
>>>>>>> 781c84a (feat(dashboard): redesign overview, invoices, and marketplace with panel aesthetic, wire marketplace to live data, fix wallet modal styling)
                </div>
                <span className="font-data rounded-lg border border-amber-400/25 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-300">USD</span>
              </div>
              {monthly.length ? (
                <ResponsiveContainer width="100%" height={230}>
                  <AreaChart data={monthly}>
                    <defs>
                      <linearGradient id="fundGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#221B38" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: '#6B6486', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6B6486', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v / 1000}K`} />
                    <Tooltip contentStyle={{ background: '#181226', border: '1px solid #2C2344', borderRadius: 12, fontSize: 12 }} labelStyle={{ color: '#9c93bd' }} />
                    <Area type="monotone" dataKey="amount" stroke="#FBBF24" strokeWidth={2.5} fill="url(#fundGrad)" dot={{ fill: '#FBBF24', r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[230px] flex-col items-center justify-center gap-2 text-center">
                  <TrendingUp className="h-5 w-5 text-slate-600" />
                  <p className="max-w-[260px] text-xs text-slate-500">{party ? 'Settle an auction on Canton and the funding curve draws itself here.' : 'Connect a party to chart live funding volume.'}</p>
                </div>
              )}
            </div>

            {/* Guarantees */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {[
                { icon: Lock, title: 'Sealed bids', desc: 'Only the bidder and platform can see a bid — Canton observers, not app code.', chip: 'bg-violet-500/15 text-violet-300' },
                { icon: Shield, title: 'No double financing', desc: 'A ledger key makes financing the same invoice twice fail at the protocol.', chip: 'bg-amber-500/15 text-amber-300' },
                { icon: FileText, title: 'Atomic settlement', desc: 'Winner, funding, and transfer commit in one transaction.', chip: 'bg-emerald-500/15 text-emerald-300' },
              ].map(c => {
                const Icon = c.icon
                return (
                  <div key={c.title} className="rounded-3xl border border-white/[0.07] bg-[#120E1F] p-5">
                    <div className="flex items-center gap-3">
                      <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', c.chip)}><Icon className="h-4 w-4" /></span>
                      <p className="font-display font-semibold text-white">{c.title}</p>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-slate-400">{c.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ══ Right column ══ */}
          <div className="space-y-5">

            {/* Ledger card */}
            <div className="rounded-3xl border border-white/[0.07] bg-[#120E1F] p-5 shadow-[0_10px_35px_rgba(0,0,0,0.45)]">
              <div className="flex items-center justify-between">
                <p className="font-data text-[11px] uppercase tracking-[0.24em] text-violet-300">Canton DevNet</p>
                <button onClick={refresh} disabled={refreshing} className="rounded-lg border border-white/10 bg-white/[0.04] p-1.5 text-slate-300 hover:bg-white/10 disabled:opacity-60">
                  <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
                </button>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <span className={cn('h-2.5 w-2.5 rounded-full', status?.ok ? 'bg-emerald-400 animate-pulse' : ledgerLoading ? 'bg-amber-400 animate-pulse' : 'bg-red-400')} />
                <p className="font-data text-xl text-white">
                  {status?.ok ? <>#{status.offset?.toLocaleString()}</> : ledgerLoading ? 'connecting…' : 'offline'}
                </p>
              </div>
              {status?.ok && (
                <p className="mt-2 font-data text-[11px] text-slate-500">{status.packageCount} packages · live</p>
              )}
            </div>

            {/* Activity list */}
            <div className="rounded-3xl border border-white/[0.07] bg-[#120E1F] shadow-[0_10px_35px_rgba(0,0,0,0.45)]">
              <div className="flex items-center justify-between border-b border-white/[0.06] p-5">
                <h3 className="font-display font-semibold text-white">Activity</h3>
                <Link href="/dashboard/invoices" className="flex items-center gap-1 text-xs text-violet-300 hover:text-violet-200">
                  all <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
              {loading ? (
                <p className="p-5 text-sm text-slate-500">Loading…</p>
              ) : activity.length === 0 ? (
                <p className="p-5 text-sm text-slate-500">{party ? 'No contracts yet — activity lands here as you list and fund.' : 'Connect a party to see ledger activity.'}</p>
              ) : (
                <div className="divide-y divide-white/[0.05]">
                  {activity.map(a => (
                    <div key={a.id} className="flex items-center gap-3 px-5 py-3.5">
                      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-data text-xs',
                        a.chip === 'F' ? 'bg-amber-500/15 text-amber-300' : 'bg-violet-500/15 text-violet-300')}>{a.chip}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">{a.name}</p>
                        <p className="truncate text-xs text-slate-500">{a.note}</p>
                      </div>
                      <p className={cn('font-data text-sm font-bold', a.tone)}>{a.amount ? `$${a.amount >= 1000 ? (a.amount / 1000).toFixed(1) + 'K' : Math.round(a.amount)}` : ''}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Submit', href: '/dashboard/invoices', icon: FileText },
                { label: 'Auctions', href: '/dashboard/marketplace', icon: Lock },
                { label: 'Offers', href: '/dashboard/offers', icon: TrendingUp },
                { label: 'Portfolio', href: '/dashboard/portfolio', icon: Shield },
              ].map(a => {
                const Icon = a.icon
                return (
                  <Link key={a.label} href={a.href} className="group flex flex-col items-center gap-2 rounded-2xl border border-white/[0.07] bg-[#120E1F] py-4 transition-all hover:-translate-y-0.5 hover:border-violet-500/40">
                    <Icon className="h-4 w-4 text-violet-300 transition-colors group-hover:text-amber-300" />
                    <span className="text-xs font-medium text-slate-300">{a.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {fetchError && (
        <div className="mx-6 mb-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 p-3 text-sm text-rose-100">{fetchError}</div>
      )}
    </div>
  )
}
