'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/dashboard/Header'
import { useCanton } from '@/lib/canton'
import { Copy, Check, RefreshCw, Shield, Wallet, Bell, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

const panel = 'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900'
const cell = 'rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-white/5 dark:hover:text-white">
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

export default function SettingsPage() {
  const { isConnected, party, ledgerStatus, ledgerLoading } = useCanton()
  const [notifyBid, setNotifyBid] = useState(true)
  const [notifySettle, setNotifySettle] = useState(true)
  const [notifyVerify, setNotifyVerify] = useState(true)
  const [users, setUsers] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [balance, setBalance] = useState<number | null>(null)

  const fetchUsers = async () => {
    setLoadingUsers(true)
    try {
      const res = await fetch('/api/canton/users')
      const data = await res.json()
      setUsers(data.users?.slice(0, 5) ?? [])
    } catch { /* ignore */ }
    setLoadingUsers(false)
  }

  useEffect(() => { fetchUsers() }, [])

  useEffect(() => {
    if (!party?.id) { setBalance(null); return }
    let cancelled = false
    const load = async () => {
      try {
        // Read-only — see the matching comment in Header.tsx. Creation only
        // happens at the deliberate role-confirmation moment (chooseRole /
        // reconnectRecent in lib/canton.tsx), never from a passive poll.
        const res = await fetch('/api/canton/contracts/balance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ partyId: party.id }),
        })
        const data = await res.json()
        if (!cancelled && data.ok) setBalance(data.amount)
      } catch { /* keep last known value */ }
    }
    load()
  }, [party?.id, party?.type])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Header title="Settings" />
      {/* 2-col on wide screens so the page uses the width instead of a
          single narrow stacked column leaving half the screen empty */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-5 lg:grid-cols-2">

        {/* Canton Party */}
        <div className={cn(panel, 'overflow-hidden')}>
          <div className="flex items-center gap-3 border-b border-slate-200 p-5 dark:border-slate-800">
            <Wallet className="h-4 w-4 text-violet-600 dark:text-violet-300" />
            <h2 className="text-sm font-semibold text-slate-950 dark:text-white">Canton Party</h2>
          </div>
          <div className="space-y-4 p-5">
            {isConnected && party ? (
              <>
                <div>
                  <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">Display Name</p>
                  <div className={cn(cell, 'flex items-center gap-2 px-3 py-2.5')}>
                    <span className="flex-1 text-sm text-slate-950 dark:text-white">{party.displayName}</span>
                    {(party as any).source === 'seaport' && (
                      <span className="shrink-0 rounded-md border border-violet-500/25 bg-violet-500/10 px-2 py-0.5 text-xs text-violet-600 dark:text-violet-300">Seaport</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">Party ID (Canton)</p>
                  <div className={cn(cell, 'flex items-center gap-2 px-3 py-2.5')}>
                    <span className="font-data flex-1 truncate text-xs text-slate-500 dark:text-slate-400">{party.id}</span>
                    <CopyButton text={party.id} />
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">Connection Source</p>
                  <p className={cn(cell, 'px-3 py-2 text-xs text-slate-950 dark:text-white')}>
                    {(party as any).source === 'seaport'
                      ? 'Seaport IDE — your existing Canton wallet party'
                      : (party as any).source === 'wallet'
                        ? 'Connected via Canton wallet'
                        : (party as any).source === 'account'
                          ? 'Your InvoPlus account — created when you registered'
                          : 'Provisioned by InvoPlus platform on Canton DevNet'}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">Role</p>
                  <span className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-medium',
                    party.type === 'business'
                      ? 'bg-violet-500/10 text-violet-700 dark:text-violet-300'
                      : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  )}>
                    {party.type === 'business' ? 'Business / Invoice Seller' : 'Financier / Bid Submitter'}
                  </span>
                </div>
                <div>
                  <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">Balance</p>
                  <div className={cn(cell, 'flex items-center gap-2 px-3 py-2.5')}>
                    <Wallet className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    <span className="font-data flex-1 text-sm font-semibold text-slate-950 dark:text-white">
                      {balance === null ? '—' : `$${balance.toLocaleString()} USD`}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">Connect your Canton wallet from the header to see party details.</p>
            )}
          </div>
        </div>

        {/* Canton Network */}
        <div className={cn(panel, 'overflow-hidden')}>
          <div className="flex items-center gap-3 border-b border-slate-200 p-5 dark:border-slate-800">
            <Globe className="h-4 w-4 text-violet-600 dark:text-violet-300" />
            <h2 className="text-sm font-semibold text-slate-950 dark:text-white">Canton Network</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className={cn(cell, 'p-3')}>
                <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">Ledger Endpoint</p>
                <p className="font-data truncate text-xs text-slate-950 dark:text-white">ledger-api.validator.devnet.sandbox.fivenorth.io</p>
              </div>
              <div className={cn(cell, 'p-3')}>
                <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">Network</p>
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    'h-2 w-2 rounded-full',
                    ledgerLoading ? 'bg-amber-400 animate-pulse' :
                    ledgerStatus?.ok ? 'bg-emerald-500 animate-pulse' : 'bg-red-400'
                  )} />
                  <span className="text-xs text-slate-950 dark:text-white">Canton DevNet Sandbox</span>
                </div>
              </div>
              <div className={cn(cell, 'p-3')}>
                <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">Current Block</p>
                <p className="font-data text-sm font-bold text-slate-950 dark:text-white">{ledgerStatus?.offset?.toLocaleString() ?? '…'}</p>
              </div>
              <div className={cn(cell, 'p-3')}>
                <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">Packages on Chain</p>
                <p className="font-data text-sm font-bold text-slate-950 dark:text-white">{ledgerStatus?.packageCount ?? '…'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className={cn(panel, 'overflow-hidden')}>
          <div className="flex items-center gap-3 border-b border-slate-200 p-5 dark:border-slate-800">
            <Bell className="h-4 w-4 text-violet-600 dark:text-violet-300" />
            <h2 className="text-sm font-semibold text-slate-950 dark:text-white">Notifications</h2>
          </div>
          <div className="space-y-4 p-5">
            {[
              { label: 'Bid received on my auction', sub: 'Notify when a sealed bid arrives', val: notifyBid, set: setNotifyBid },
              { label: 'Auction settled', sub: 'Notify on win/loss and funding', val: notifySettle, set: setNotifySettle },
              { label: 'Invoice verified', sub: 'Notify when risk scoring completes', val: notifyVerify, set: setNotifyVerify },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-950 dark:text-white">{item.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{item.sub}</p>
                </div>
                <button
                  onClick={() => item.set(!item.val)}
                  className={cn(
                    'relative h-6 w-10 rounded-full transition-all',
                    item.val ? 'bg-violet-500' : 'bg-slate-300 dark:bg-slate-700'
                  )}
                >
                  <span className={cn(
                    'absolute top-1 h-4 w-4 rounded-full bg-white transition-all',
                    item.val ? 'left-5' : 'left-1'
                  )} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Security */}
        <div className={cn(panel, 'overflow-hidden')}>
          <div className="flex items-center gap-3 border-b border-slate-200 p-5 dark:border-slate-800">
            <Shield className="h-4 w-4 text-violet-600 dark:text-violet-300" />
            <h2 className="text-sm font-semibold text-slate-950 dark:text-white">Security & Privacy</h2>
          </div>
          <div className="space-y-3 p-5">
            {[
              { label: 'Sealed bid privacy', desc: 'Your bids are private Canton contracts — only you and the platform can see them' },
              { label: 'Anti-fraud registry', desc: 'Every invoice is checked against the Canton registry to prevent double-financing' },
              { label: 'Atomic settlement', desc: 'All parties settle simultaneously — no partial fills or failed transfers' },
            ].map(item => (
              <div key={item.label} className={cn(cell, 'flex items-start gap-3 p-3')}>
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                <div>
                  <p className="text-sm font-medium text-slate-950 dark:text-white">{item.label}</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live ledger users — spans both columns; a list of rows makes
            better use of full width than the stacked 2-col panels above */}
        <div className={cn(panel, 'overflow-hidden lg:col-span-2')}>
          <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-950 dark:text-white">InvoPlus Ledger Users</h2>
            <button onClick={fetchUsers} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-white/5 dark:hover:text-white">
              <RefreshCw className={cn('h-3.5 w-3.5', loadingUsers && 'animate-spin')} />
            </button>
          </div>
          <div className="p-5">
            {loadingUsers ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">Loading from Canton DevNet…</p>
            ) : users.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">No InvoPlus users provisioned yet — connect to create one.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {users.map((u: any) => (
                  <div key={u.id} className={cn(cell, 'flex items-center gap-3 p-3')}>
                    <span className="h-2 w-2 shrink-0 rounded-full bg-violet-500" />
                    <div className="min-w-0">
                      <p className="font-data truncate text-xs text-slate-950 dark:text-white">{u.metadata?.annotations?.username ?? u.id}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{u.primaryParty}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">InvoPlus-provisioned users on the shared Canton DevNet sandbox — filtered from the validator's full user list, which includes other teams' accounts.</p>
          </div>
        </div>

        </div>
      </div>
    </div>
  )
}
