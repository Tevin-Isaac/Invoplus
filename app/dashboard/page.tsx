'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/dashboard/Header'
import { DollarSign, FileText, TrendingUp, ArrowUpRight, CheckCircle, AlertCircle, Zap, Shield, Lock, RefreshCw } from 'lucide-react'
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

interface ContractRow {
  id: string
  invoiceId: string
  buyer: string
  amount: string
  dueDate: string
  grade: string
  status: string
}

const statusStyles: Record<string, string> = {
  funded:   'bg-green-500/15 text-green-400 border-green-500/20',
  bidding:  'bg-violet-500/15 text-violet-400 border-violet-500/20',
  verified: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  pending:  'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
}

function getPayloadValue(payload: any, key: string) {
  if (!payload) return ''
  const value = payload[key]
  if (value === undefined || value === null) return ''
  if (typeof value === 'object' && 'value' in value) return value.value
  return value
}

function formatInvoiceContract(contract: any): ContractRow {
  const payload = contract.payload || {}
  return {
    id: contract.contractId,
    invoiceId: getPayloadValue(payload, 'invoiceId') || '',
    buyer: getPayloadValue(payload, 'debtorName') || getPayloadValue(payload, 'debtor') || 'Unknown',
    amount: getPayloadValue(payload, 'faceAmount') ? String(getPayloadValue(payload, 'faceAmount')) : 'N/A',
    dueDate: getPayloadValue(payload, 'dueDate') || 'N/A',
    grade: getPayloadValue(payload, 'riskGrade') || getPayloadValue(payload, 'status') || 'N/A',
    status: payload.settled ? 'funded' : payload.bidCount !== undefined ? 'bidding' : 'pending',
  }
}

async function fetchContracts(partyId: string, template: string) {
  const res = await fetch('/api/canton/contracts/list', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parties: [partyId], template }),
  })
  if (!res.ok) {
    throw new Error(`Failed to fetch ${template}: ${res.status}`)
  }
  const data = await res.json()
  return data.ok ? data.contracts : []
}

export default function DashboardPage() {
  const { ledgerStatus, ledgerLoading, party } = useCanton()
  const [refreshing, setRefreshing] = useState(false)
  const [localStatus, setLocalStatus] = useState<LedgerStats | null>(null)
  const [counts, setCounts] = useState({ invoices: 0, auctions: 0, bids: 0, funded: 0 })
  const [recentContracts, setRecentContracts] = useState<ContractRow[]>([])
  const [loadingContracts, setLoadingContracts] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

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

  const status = localStatus ?? ledgerStatus

  useEffect(() => {
    if (!party?.id) {
      setCounts({ invoices: 0, auctions: 0, bids: 0, funded: 0 })
      setRecentContracts([])
      return
    }

    const loadContracts = async () => {
      setLoadingContracts(true)
      setFetchError(null)

      try {
        const [invoiceContracts, auctionContracts, bidContracts, fundedContracts] = await Promise.all([
          fetchContracts(party.id, 'invoice'),
          fetchContracts(party.id, 'auction'),
          fetchContracts(party.id, 'bid'),
          fetchContracts(party.id, 'funded'),
        ])

        setCounts({
          invoices: invoiceContracts.length,
          auctions: auctionContracts.length,
          bids: bidContracts.length,
          funded: fundedContracts.length,
        })

        const rows = party.type === 'financier'
          ? [...bidContracts, ...fundedContracts].slice(0, 6)
          : [...invoiceContracts, ...auctionContracts].slice(0, 6)

        setRecentContracts(rows.map(formatInvoiceContract))
      } catch (error) {
        setFetchError(error instanceof Error ? error.message : 'Unable to load contract data')
      } finally {
        setLoadingContracts(false)
      }
    }

    loadContracts()
  }, [party])

  const stats = [
    {
      label: party?.type === 'financier' ? 'Open bids' : 'Outstanding invoices',
      value: party ? String(party.type === 'financier' ? counts.bids : counts.invoices) : '—',
      change: '+4',
      positive: true,
      icon: FileText,
    },
    {
      label: 'Funded positions',
      value: party ? String(counts.funded) : '—',
      change: '+1',
      positive: true,
      icon: TrendingUp,
    },
    {
      label: party?.type === 'financier' ? 'Visible auctions' : 'Active auctions',
      value: party ? String(counts.auctions) : '—',
      change: '+2',
      positive: true,
      icon: Lock,
    },
    {
      label: 'Ledger packages',
      value: status?.packageCount != null ? String(status.packageCount) : '—',
      change: 'Live',
      positive: true,
      icon: Shield,
    },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-950 text-white">
      <Header title="Dashboard" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        <div className={cn(
          'flex items-center justify-between rounded-3xl border p-5',
          status?.ok ? 'border-emerald-500/20 bg-emerald-500/5' : ledgerLoading ? 'border-amber-500/20 bg-amber-500/5' : 'border-rose-500/20 bg-rose-500/5'
        )}>
          <div className="flex items-center gap-3">
            <span className={cn(
              'w-2.5 h-2.5 rounded-full',
              status?.ok ? 'bg-emerald-400 animate-pulse' : ledgerLoading ? 'bg-amber-400 animate-pulse' : 'bg-rose-400'
            )} />
            <div>
              <p className="text-sm font-semibold text-white">
                Canton DevNet {status?.ok ? '· Connected' : ledgerLoading ? '· Connecting…' : '· Offline'}
              </p>
              <p className="text-xs text-slate-300">
                {status?.ok
                  ? `Block ${status.offset?.toLocaleString()} · ${status.packageCount} packages · ${status.network ?? 'Canton Network'}`
                  : ledgerLoading ? 'Establishing connection…'
                  : 'Unable to reach Canton backend'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {status?.timestamp && (
              <p className="text-xs text-slate-300 hidden md:block">
                Updated {new Date(status.timestamp).toLocaleTimeString()}
              </p>
            )}
            <button
              onClick={fetchFresh}
              disabled={refreshing}
              className="p-1.5 rounded-lg bg-white/5 text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Icon className="h-4 w-4" />
                    <span className="text-xs uppercase tracking-[0.24em]">{stat.label}</span>
                  </div>
                  <span className="text-xs text-slate-400">{stat.change}</span>
                </div>
                <p className="mt-5 text-3xl font-semibold text-white">{stat.value}</p>
              </div>
            )
          })}
        </div>

        {fetchError && (
          <div className="rounded-3xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-100">
            {fetchError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[
            {
              icon: Lock,
              title: 'Sealed bid privacy',
              desc: 'Seller and financier privacy is enforced by Canton contract observers and signatories.',
              bg: 'bg-violet-500/10 border-violet-500/20',
            },
            {
              icon: Shield,
              title: 'Anti-fraud registry',
              desc: 'Every listed invoice is registered for one-time financing protection.',
              bg: 'bg-emerald-500/10 border-emerald-500/20',
            },
            {
              icon: Zap,
              title: 'Atomic settlement',
              desc: 'Auction settlement and funding happen in a single Canton transaction.',
              bg: 'bg-sky-500/10 border-sky-500/20',
            },
          ].map((card) => {
            const Icon = card.icon
            return (
              <div key={card.title} className={cn('rounded-3xl border p-5', card.bg)}>
                <div className="flex items-center gap-3 mb-3">
                  <Icon className="h-5 w-5 text-white" />
                  <p className="font-semibold text-white">{card.title}</p>
                </div>
                <p className="text-sm text-slate-300">{card.desc}</p>
              </div>
            )
          })}
        </div>

        <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-800 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-violet-300">Live contract feed</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Real contract data from Canton</h2>
            </div>
            <Link href="/dashboard/invoices" className="rounded-2xl bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-400">
              Explore all invoices
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
              <thead className="bg-slate-950 text-slate-400">
                <tr>
                  <th className="px-5 py-4">Invoice</th>
                  <th className="px-5 py-4">Buyer</th>
                  <th className="px-5 py-4">Amount</th>
                  <th className="px-5 py-4">Due Date</th>
                  <th className="px-5 py-4">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950">
                {loadingContracts ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-slate-400">Loading backend contracts…</td>
                  </tr>
                ) : recentContracts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                      {party ? 'No contract rows are visible for your connected party yet.' : 'Connect a party to load contract data from Canton.'}
                    </td>
                  </tr>
                ) : (
                  recentContracts.map((contract) => (
                    <tr key={contract.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-5 py-4 font-medium text-white">{contract.invoiceId || contract.id.slice(0, 12)}</td>
                      <td className="px-5 py-4 text-slate-300">{contract.buyer}</td>
                      <td className="px-5 py-4 text-slate-300">{contract.amount}</td>
                      <td className="px-5 py-4 text-slate-300">{contract.dueDate}</td>
                      <td className="px-5 py-4 text-slate-300">{contract.grade}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Submit Invoice',     href: '/dashboard/invoices' , icon: FileText,   color: 'violet' },
            { label: 'Browse Auctions',    href: '/dashboard/marketplace', icon: Lock,       color: 'violet' },
            { label: 'My Offers',          href: '/dashboard/offers',      icon: TrendingUp, color: 'green'  },
            { label: 'View Portfolio',     href: '/dashboard/portfolio',   icon: DollarSign, color: 'green'  },
          ].map((action) => {
            const Icon = action.icon
            return (
              <Link key={action.label} href={action.href} className="flex items-center gap-3 rounded-3xl border border-slate-800 bg-slate-900 p-4 transition hover:border-violet-500/30 hover:bg-violet-500/5">
                <div className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-2xl',
                  action.color === 'violet' ? 'bg-violet-500/10 text-violet-300' : 'bg-emerald-500/10 text-emerald-300'
                )}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="font-medium text-white">{action.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
