'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, FileText, Lock, RefreshCw, ShieldCheck, Zap } from 'lucide-react'
import { useCanton } from '@/lib/canton'
import { cn, formatCurrency, formatDate, truncate } from '@/lib/utils'

function getPayloadValue(payload: any, key: string) {
  if (!payload) return ''
  const item = payload[key]
  if (item === undefined || item === null) return ''
  if (typeof item === 'object' && 'value' in item) return item.value
  return item
}

function formatAmount(value: any) {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value === 'object' && 'value' in value) {
    value = value.value
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const amount = Number(value)
    return Number.isNaN(amount) ? String(value) : formatCurrency(amount)
  }
  return String(value)
}

function getRowsFromContracts(contracts: any[]) {
  return contracts.map((contract) => {
    const payload = contract.payload || {}
    return {
      id: contract.contractId,
      invoiceId: getPayloadValue(payload, 'invoiceId') || getPayloadValue(payload, 'invoiceId'),
      buyer: getPayloadValue(payload, 'debtorName') || getPayloadValue(payload, 'debtorName'),
      amount: formatAmount(getPayloadValue(payload, 'faceAmount')),
      currency: getPayloadValue(payload, 'currency'),
      dueDate: getPayloadValue(payload, 'dueDate') ? formatDate(getPayloadValue(payload, 'dueDate')) : '',
      grade: getPayloadValue(payload, 'riskGrade') || getPayloadValue(payload, 'status') || 'n/a',
      score: getPayloadValue(payload, 'aiScore') || 0,
      status: payload.settled ? 'settled' : payload.bidCount !== undefined ? 'bidding' : 'open',
    }
  })
}

async function fetchContracts(partyId: string, template: string) {
  const res = await fetch('/api/canton/contracts/list', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parties: [partyId], template }),
  })
  if (!res.ok) {
    throw new Error(`Request failed ${res.status}`)
  }
  const data = await res.json()
  return data.ok ? data.contracts : []
}

export default function HomePage() {
  const { connect, isConnected, party, ledgerStatus, ledgerLoading, disconnect, isConnecting } = useCanton()
  const [counts, setCounts] = useState({ invoices: 0, auctions: 0, bids: 0, funded: 0 })
  const [contracts, setContracts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const roleLabel = useMemo(() => {
    if (!party) return 'Not connected'
    return party.type === 'business' ? 'Seller / Business' : 'Financier'
  }, [party])

  const connectAs = useCallback(async (role: 'business' | 'financier') => {
    setError(null)
    await connect(role)
  }, [connect])

  useEffect(() => {
    if (!isConnected || !party?.id) {
      setContracts([])
      setCounts({ invoices: 0, auctions: 0, bids: 0, funded: 0 })
      return
    }

    const loadDashboard = async () => {
      setLoading(true)
      setError(null)

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

        const displayContracts = party.type === 'financier'
          ? [...bidContracts.slice(0, 4), ...fundedContracts.slice(0, 2)]
          : [...invoiceContracts.slice(0, 5), ...auctionContracts.slice(0, 3)]

        setContracts(getRowsFromContracts(displayContracts))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load backend data')
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [isConnected, party])

  const stats = useMemo(() => {
    if (!isConnected) {
      return [
        { label: 'Backend status', value: ledgerLoading ? 'Connecting…' : ledgerStatus?.ok ? 'Live' : 'Offline', icon: CheckCircle2, color: 'violet' },
        { label: 'Party type', value: 'Not connected', icon: FileText, color: 'gray' },
        { label: 'Contracts visible', value: '—', icon: ShieldCheck, color: 'gray' },
        { label: 'Ledger packages', value: ledgerStatus?.packageCount ?? '—', icon: Zap, color: 'gray' },
      ]
    }

    return [
      { label: party.type === 'financier' ? 'Your bids' : 'Verified invoices', value: counts[party.type === 'financier' ? 'bids' : 'invoices'], icon: FileText, color: 'violet' },
      { label: 'Funded positions', value: counts.funded, icon: CheckCircle2, color: 'green' },
      { label: party.type === 'financier' ? 'Visible auctions' : 'Active auctions', value: counts.auctions, icon: Lock, color: 'blue' },
      { label: 'Ledger packages', value: ledgerStatus?.packageCount ?? '—', icon: ShieldCheck, color: 'gray' },
    ]
  }, [isConnected, party, counts, ledgerLoading, ledgerStatus])

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="rounded-4xl border border-white/10 bg-slate-900/90 p-10 shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-violet-300">Real Canton backend</p>
              <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                InvoPlus is now connected to the real invoice financing backend.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300">
                Stop using the placeholder landing website. Connect to Canton, query your invoices, review live bids, and manage funded positions directly through the InvoPlus backend.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  onClick={() => connectAs('business')}
                  disabled={isConnecting}
                  className="inline-flex items-center justify-center rounded-2xl bg-violet-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Connect as Seller
                </button>
                <button
                  onClick={() => connectAs('financier')}
                  disabled={isConnecting}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:border-violet-300 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Connect as Financier
                </button>
                <Link href="/dashboard" className="inline-flex items-center justify-center rounded-2xl bg-slate-800 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-700">
                  Open dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="rounded-4xl border border-white/10 bg-slate-950/90 p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Connection</p>
                  <p className="mt-2 text-lg font-semibold text-white">{isConnected ? 'Connected' : 'Not connected'}</p>
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-slate-200 transition hover:bg-white/10"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-6 space-y-4 text-sm text-slate-300">
                <div className="flex items-center justify-between gap-2">
                  <span>Party</span>
                  <span className="font-medium text-white">{party?.displayName ?? '—'}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>Role</span>
                  <span className="font-medium text-white">{roleLabel}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>Status</span>
                  <span className="font-medium text-white">{ledgerLoading ? 'Loading ledger…' : ledgerStatus?.ok ? 'Ledger live' : 'Ledger offline'}</span>
                </div>
                {isConnected && (
                  <button
                    onClick={disconnect}
                    className="mt-3 inline-flex w-full items-center justify-center rounded-2xl bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20"
                  >
                    Disconnect
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((item) => (
              <div key={item.label} className="rounded-3xl border border-white/10 bg-slate-950/80 p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className={cn('inline-flex h-10 w-10 items-center justify-center rounded-2xl', item.color === 'violet' ? 'bg-violet-500/10 text-violet-300' : item.color === 'green' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-slate-700/10 text-slate-300')}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs uppercase tracking-[0.24em] text-slate-500">{item.label}</span>
                </div>
                <p className="mt-6 text-3xl font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 rounded-4xl border border-white/10 bg-slate-950/80 p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-violet-300">Live ledger data</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Real contracts from the Canton backend</h2>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <ShieldCheck className="h-4 w-4 text-violet-300" />
                Data is sourced from the configured Canton DevNet backend.
              </div>
            </div>

            {error && (
              <div className="mt-6 rounded-3xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-200">
                {error}
              </div>
            )}

            <div className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-slate-950">
              <table className="min-w-full divide-y divide-white/5 text-left text-sm">
                <thead className="bg-slate-900/80 text-slate-400">
                  <tr>
                    <th className="px-5 py-4">Invoice</th>
                    <th className="px-5 py-4">Buyer</th>
                    <th className="px-5 py-4">Amount</th>
                    <th className="px-5 py-4">Due</th>
                    <th className="px-5 py-4">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-slate-950">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-slate-400">Loading contracts…</td>
                    </tr>
                  ) : contracts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                        {isConnected ? 'No contract data visible for your connected party.' : 'Connect to a seller or financier party to load real contract data.'}
                      </td>
                    </tr>
                  ) : (
                    contracts.map((contract) => (
                      <tr key={contract.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-5 py-4 font-medium text-white">{truncate(contract.invoiceId || contract.id, 18)}</td>
                        <td className="px-5 py-4 text-slate-300">{truncate(contract.buyer || '—', 24)}</td>
                        <td className="px-5 py-4 text-slate-300">{contract.amount || '—'}</td>
                        <td className="px-5 py-4 text-slate-300">{contract.dueDate || '—'}</td>
                        <td className="px-5 py-4 text-slate-300">{contract.grade}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-400">
                The homepage now connects to your Canton backend instead of showing placeholder marketing content.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/dashboard" className="rounded-2xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-400">
                  Open dashboard
                </Link>
                <Link href="/dashboard/marketplace" className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:border-violet-300 hover:bg-white/10">
                  Browse marketplace
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
