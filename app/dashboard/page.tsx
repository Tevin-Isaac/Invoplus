'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/dashboard/Header'
import { DollarSign, FileText, Clock, TrendingUp, ArrowUpRight, CheckCircle, AlertCircle, Zap, Shield, Lock, RefreshCw } from 'lucide-react'
import { useCanton } from '@/lib/canton'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface LedgerStats {
  ok: boolean
  offset?: number
  packageCount?: number
  network?: string
  timestamp?: string
}

const recentInvoices = [
  { id: 'INV-2026-0042', buyer: 'GlobalTech Solutions Ltd', amount: 125000, status: 'funded',   grade: 'A', score: 87, offers: 4 },
  { id: 'INV-2026-0041', buyer: 'Apex Manufacturing Ltd',   amount: 89500,  status: 'bidding',  grade: 'A', score: 91, offers: 2 },
  { id: 'INV-2026-0040', buyer: 'Summit Retail Group',      amount: 234000, status: 'verified', grade: 'B', score: 74, offers: 0 },
  { id: 'INV-2026-0039', buyer: 'NovaBuild Corp',           amount: 67200,  status: 'funded',   grade: 'B', score: 79, offers: 3 },
  { id: 'INV-2026-0038', buyer: 'Nexus Partners Ltd',       amount: 55000,  status: 'pending',  grade: '—', score: 0,  offers: 0 },
]

const statusStyles: Record<string, string> = {
  funded:   'bg-green-500/15 text-green-400 border-green-500/20',
  bidding:  'bg-violet-500/15 text-violet-400 border-violet-500/20',
  verified: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  pending:  'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
}

export default function DashboardPage() {
  const { ledgerStatus, ledgerLoading, party } = useCanton()
  const [refreshing, setRefreshing] = useState(false)
  const [localStatus, setLocalStatus] = useState<LedgerStats | null>(null)

  const fetchFresh = async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/canton/ledger-status')
      const data = await res.json()
      setLocalStatus(data)
    } catch { /* ignore */ } finally {
      setRefreshing(false)
    }
  }

  // Use ledgerStatus from context, override with fresh fetch
  const status = localStatus ?? ledgerStatus

  const stats = [
    { label: 'Available Funding',    value: '$284,500',  change: '+12.4%', positive: true,  icon: DollarSign  },
    { label: 'Outstanding Invoices', value: '14',        change: '+3',     positive: true,  icon: FileText    },
    { label: 'Pending Verification', value: '3',         change: '-1',     positive: true,  icon: Clock       },
    { label: 'Total Financed (MTD)', value: '$1.2M',     change: '+8.7%',  positive: true,  icon: TrendingUp  },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Dashboard" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Canton Network status bar */}
        <div className={cn(
          'flex items-center justify-between rounded-2xl px-5 py-3 border',
          status?.ok
            ? 'bg-green-500/5 border-green-500/20'
            : ledgerLoading
              ? 'bg-yellow-500/5 border-yellow-500/20'
              : 'bg-red-500/5 border-red-500/20'
        )}>
          <div className="flex items-center gap-3">
            <span className={cn(
              'w-2.5 h-2.5 rounded-full',
              status?.ok ? 'bg-green-400 animate-pulse' : ledgerLoading ? 'bg-yellow-400 animate-pulse' : 'bg-red-400'
            )} />
            <div>
              <p className="text-sm font-semibold text-white">
                Canton DevNet {status?.ok ? '· Connected' : ledgerLoading ? '· Connecting…' : '· Offline'}
              </p>
              <p className="text-xs text-dark-muted">
                {status?.ok
                  ? `Block ${status.offset?.toLocaleString()} · ${status.packageCount} packages · ${status.network ?? 'Canton Network'}`
                  : ledgerLoading ? 'Establishing connection…'
                  : 'ledger-api.validator.devnet.sandbox.fivenorth.io · unreachable'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {status?.timestamp && (
              <p className="text-xs text-dark-muted hidden md:block">
                Updated {new Date(status.timestamp).toLocaleTimeString()}
              </p>
            )}
            <button
              onClick={fetchFresh}
              disabled={refreshing}
              className="p-1.5 rounded-lg hover:bg-white/5 text-dark-muted hover:text-white transition-colors"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(s => {
            const Icon = s.icon
            return (
              <div key={s.label} className="bg-dark-card border border-dark-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-dark-muted">{s.label}</p>
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-violet-400" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-white mb-1">{s.value}</p>
                <div className="flex items-center gap-1">
                  <ArrowUpRight className={cn('w-3 h-3', s.positive ? 'text-green-400' : 'text-red-400')} />
                  <span className={cn('text-xs font-medium', s.positive ? 'text-green-400' : 'text-red-400')}>{s.change}</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Canton privacy features */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[
            {
              icon: Lock,
              title: 'Sealed-Bid Privacy',
              desc: 'Bids are Canton contracts — seller cannot see competing offers while auction is live.',
              color: 'text-violet-400',
              bg: 'bg-violet-500/10 border-violet-500/20',
            },
            {
              icon: Shield,
              title: 'Anti-Fraud Registry',
              desc: 'RegistryEntry contract created at listing prevents double-financing of the same invoice.',
              color: 'text-green-400',
              bg: 'bg-green-500/10 border-green-500/20',
            },
            {
              icon: Zap,
              title: 'Atomic Settlement',
              desc: 'All state changes (win/lose/fund) happen in a single Canton transaction — no partial fills.',
              color: 'text-blue-400',
              bg: 'bg-blue-500/10 border-blue-500/20',
            },
          ].map(f => {
            const Icon = f.icon
            return (
              <div key={f.title} className={cn('border rounded-2xl p-5', f.bg)}>
                <div className="flex items-center gap-3 mb-2">
                  <Icon className={cn('w-5 h-5', f.color)} />
                  <p className="text-sm font-semibold text-white">{f.title}</p>
                </div>
                <p className="text-xs text-dark-muted leading-relaxed">{f.desc}</p>
              </div>
            )
          })}
        </div>

        {/* Recent invoices */}
        <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-dark-border">
            <h2 className="text-sm font-semibold text-white">Recent Invoices</h2>
            <Link href="/dashboard/invoices" className="text-xs text-violet-400 hover:text-white transition-colors">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-dark-border">
            {recentInvoices.map(inv => (
              <div key={inv.id} className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-dark-border flex items-center justify-center text-xs font-bold text-dark-muted shrink-0">
                    {inv.buyer[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{inv.buyer}</p>
                    <p className="text-xs text-dark-muted font-mono">{inv.id}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6 shrink-0">
                  <div className="text-right hidden md:block">
                    <p className="text-sm font-semibold text-white">${inv.amount.toLocaleString()}</p>
                    {inv.score > 0 && (
                      <p className="text-xs text-dark-muted">Score {inv.score}</p>
                    )}
                  </div>

                  {inv.offers > 0 && (
                    <div className="hidden lg:flex items-center gap-1 text-xs text-dark-muted">
                      <Lock className="w-3 h-3 text-violet-400" />
                      {inv.offers} bids
                    </div>
                  )}

                  <span className={cn(
                    'text-xs font-medium px-2.5 py-1 rounded-lg capitalize border',
                    statusStyles[inv.status] ?? 'text-dark-muted'
                  )}>
                    {inv.status === 'bidding' ? 'Bidding' : inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                  </span>

                  <div className="flex items-center gap-1">
                    {inv.status === 'funded' && <CheckCircle className="w-4 h-4 text-green-400" />}
                    {inv.status === 'bidding' && <Zap className="w-4 h-4 text-violet-400" />}
                    {inv.status === 'verified' && <AlertCircle className="w-4 h-4 text-blue-400" />}
                    {inv.status === 'pending' && <Clock className="w-4 h-4 text-yellow-400" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Submit Invoice',     href: '/dashboard/invoices',    icon: FileText,   color: 'violet' },
            { label: 'Browse Auctions',    href: '/dashboard/marketplace', icon: Lock,       color: 'violet' },
            { label: 'My Offers',          href: '/dashboard/offers',      icon: TrendingUp, color: 'green'  },
            { label: 'View Portfolio',     href: '/dashboard/portfolio',   icon: DollarSign, color: 'green'  },
          ].map(a => {
            const Icon = a.icon
            return (
              <Link
                key={a.label}
                href={a.href}
                className="flex items-center gap-3 bg-dark-card border border-dark-border hover:border-violet-500/30 rounded-2xl p-4 transition-all hover:bg-violet-500/[0.03] group"
              >
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center',
                  a.color === 'violet' ? 'bg-violet-500/10' : 'bg-green-500/10'
                )}>
                  <Icon className={cn('w-4 h-4', a.color === 'violet' ? 'text-violet-400' : 'text-green-400')} />
                </div>
                <span className="text-sm font-medium text-white group-hover:text-violet-300 transition-colors">{a.label}</span>
              </Link>
            )
          })}
        </div>

      </div>
    </div>
  )
}
