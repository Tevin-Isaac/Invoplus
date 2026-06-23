'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/dashboard/Header'
import { useCanton } from '@/lib/canton'
import { Copy, Check, RefreshCw, Shield, Wallet, Bell, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="p-1.5 rounded-lg hover:bg-white/5 text-dark-muted hover:text-white transition-colors">
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
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

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Settings" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-2xl">

        {/* Canton Party */}
        <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-dark-border flex items-center gap-3">
            <Wallet className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-white">Canton Party</h2>
          </div>
          <div className="p-5 space-y-4">
            {isConnected && party ? (
              <>
                <div>
                  <p className="text-xs text-dark-muted mb-1">Display Name</p>
                  <div className="flex items-center gap-2 bg-dark-bg border border-dark-border rounded-xl px-3 py-2.5">
                    <span className="text-sm text-white flex-1">{party.displayName}</span>
                    {(party as any).source === 'seaport' && (
                      <span className="text-xs px-2 py-0.5 rounded-md bg-violet-500/15 text-violet-400 border border-violet-500/20 shrink-0">Seaport</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-dark-muted mb-1">Party ID (Canton)</p>
                  <div className="flex items-center gap-2 bg-dark-bg border border-dark-border rounded-xl px-3 py-2.5">
                    <span className="text-xs text-dark-muted font-mono flex-1 truncate">{party.id}</span>
                    <CopyButton text={party.id} />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-dark-muted mb-1">Connection Source</p>
                  <p className="text-xs text-white px-3 py-2 bg-dark-bg border border-dark-border rounded-xl">
                    {(party as any).source === 'seaport'
                      ? 'Seaport IDE — your existing Canton wallet party'
                      : 'Provisioned by InvoPlus platform on Canton DevNet'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-dark-muted mb-1">Role</p>
                  <span className={cn(
                    'text-xs px-3 py-1.5 rounded-lg font-medium',
                    party.type === 'business' ? 'bg-violet-500/15 text-violet-400' : 'bg-green-500/15 text-green-400'
                  )}>
                    {party.type === 'business' ? 'Business / Invoice Seller' : 'Financier / Bid Submitter'}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-sm text-dark-muted">Connect your Canton wallet from the header to see party details.</p>
            )}
          </div>
        </div>

        {/* Canton Network */}
        <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-dark-border flex items-center gap-3">
            <Globe className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-white">Canton Network</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-dark-bg border border-dark-border rounded-xl p-3">
                <p className="text-xs text-dark-muted mb-1">Ledger Endpoint</p>
                <p className="text-xs text-white font-mono truncate">ledger-api.validator.devnet.sandbox.fivenorth.io</p>
              </div>
              <div className="bg-dark-bg border border-dark-border rounded-xl p-3">
                <p className="text-xs text-dark-muted mb-1">Network</p>
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    'w-2 h-2 rounded-full',
                    ledgerLoading ? 'bg-yellow-400 animate-pulse' :
                    ledgerStatus?.ok ? 'bg-green-400 animate-pulse' : 'bg-red-400'
                  )} />
                  <span className="text-xs text-white">Canton DevNet Sandbox</span>
                </div>
              </div>
              <div className="bg-dark-bg border border-dark-border rounded-xl p-3">
                <p className="text-xs text-dark-muted mb-1">Current Block</p>
                <p className="text-sm font-bold text-white">{ledgerStatus?.offset?.toLocaleString() ?? '…'}</p>
              </div>
              <div className="bg-dark-bg border border-dark-border rounded-xl p-3">
                <p className="text-xs text-dark-muted mb-1">Packages on Chain</p>
                <p className="text-sm font-bold text-white">{ledgerStatus?.packageCount ?? '…'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-dark-border flex items-center gap-3">
            <Bell className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-white">Notifications</h2>
          </div>
          <div className="p-5 space-y-4">
            {[
              { label: 'Bid received on my auction', sub: 'Notify when a sealed bid arrives', val: notifyBid, set: setNotifyBid },
              { label: 'Auction settled', sub: 'Notify on win/loss and funding', val: notifySettle, set: setNotifySettle },
              { label: 'Invoice verified', sub: 'Notify when AI scoring completes', val: notifyVerify, set: setNotifyVerify },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white">{item.label}</p>
                  <p className="text-xs text-dark-muted">{item.sub}</p>
                </div>
                <button
                  onClick={() => item.set(!item.val)}
                  className={cn(
                    'w-10 h-6 rounded-full transition-all relative',
                    item.val ? 'bg-violet-500' : 'bg-dark-border'
                  )}
                >
                  <span className={cn(
                    'absolute top-1 w-4 h-4 rounded-full bg-white transition-all',
                    item.val ? 'left-5' : 'left-1'
                  )} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Security */}
        <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-dark-border flex items-center gap-3">
            <Shield className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-white">Security & Privacy</h2>
          </div>
          <div className="p-5 space-y-3">
            {[
              { label: 'Sealed bid privacy', desc: 'Your bids are private Canton contracts — only you and the platform can see them', on: true },
              { label: 'Anti-fraud registry', desc: 'Every invoice is checked against the Canton registry to prevent double-financing', on: true },
              { label: 'Atomic settlement', desc: 'All parties settle simultaneously — no partial fills or failed transfers', on: true },
            ].map(item => (
              <div key={item.label} className="flex items-start gap-3 p-3 rounded-xl bg-dark-bg border border-dark-border">
                <span className="w-2 h-2 rounded-full bg-green-400 mt-1.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-white">{item.label}</p>
                  <p className="text-xs text-dark-muted mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live ledger users (debug/admin) */}
        <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-dark-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Live Ledger Participants</h2>
            <button onClick={fetchUsers} className="p-1.5 rounded-lg hover:bg-white/5 text-dark-muted hover:text-white transition-colors">
              <RefreshCw className={cn('w-3.5 h-3.5', loadingUsers && 'animate-spin')} />
            </button>
          </div>
          <div className="p-5 space-y-2">
            {loadingUsers ? (
              <p className="text-xs text-dark-muted">Loading from Canton DevNet…</p>
            ) : users.length === 0 ? (
              <p className="text-xs text-dark-muted">No participants found</p>
            ) : (
              users.map((u: any) => (
                <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl bg-dark-bg border border-dark-border">
                  <span className="w-2 h-2 rounded-full bg-violet-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-white font-mono truncate">{u.metadata?.annotations?.username ?? u.id}</p>
                    <p className="text-xs text-dark-muted truncate">{u.primaryParty}</p>
                  </div>
                </div>
              ))
            )}
            <p className="text-xs text-dark-muted pt-1">Showing 5 of {users.length}+ participants on Canton DevNet sandbox</p>
          </div>
        </div>

      </div>
    </div>
  )
}
