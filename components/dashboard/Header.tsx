'use client'

import { useState } from 'react'
import { Bell, Search, ChevronDown, Wallet, Building2, Landmark, X } from 'lucide-react'
import { useCanton } from '@/lib/canton'
import { cn } from '@/lib/utils'

export function Header({ title }: { title: string }) {
  const { isConnected, party, connect, disconnect, isConnecting, ledgerStatus } = useCanton()
  const [showRolePicker, setShowRolePicker] = useState(false)

  const handleConnect = () => setShowRolePicker(true)

  const handleRoleSelect = async (role: 'business' | 'financier') => {
    setShowRolePicker(false)
    await connect(role)
  }

  return (
    <>
      <header className="h-16 border-b border-dark-border bg-dark-bg/80 backdrop-blur-md flex items-center justify-between px-6 shrink-0">
        <h1 className="text-lg font-semibold text-white">{title}</h1>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="hidden md:flex items-center gap-2 bg-dark-card border border-dark-border rounded-xl px-3 py-2 text-sm text-dark-muted w-52">
            <Search className="w-4 h-4 shrink-0" />
            <span>Search invoices...</span>
          </div>

          {/* Ledger block indicator */}
          {ledgerStatus?.ok && (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-xs text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Block {ledgerStatus.offset?.toLocaleString()}
            </div>
          )}

          {/* Notifications */}
          <button className="relative w-9 h-9 rounded-xl bg-dark-card border border-dark-border flex items-center justify-center hover:border-violet-500/30 transition-colors">
            <Bell className="w-4 h-4 text-dark-muted" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-violet-500" />
          </button>

          {/* Canton wallet */}
          {isConnected ? (
            <button
              onClick={disconnect}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-violet-500/10 border border-violet-500/30 text-violet-300 hover:bg-violet-500/20 transition-all"
              title="Click to disconnect"
            >
              <Wallet className="w-4 h-4" />
              <span className="flex items-center gap-1.5">
                {party?.displayName}
                <ChevronDown className="w-3 h-3" />
              </span>
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-violet-500 border border-violet-500 text-white hover:bg-violet-600 transition-all disabled:opacity-60"
            >
              <Wallet className="w-4 h-4" />
              {isConnecting ? 'Provisioning party…' : 'Connect Canton Wallet'}
            </button>
          )}
        </div>
      </header>

      {/* Role picker modal */}
      {showRolePicker && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-card border border-dark-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-semibold text-white">Connect to Canton DevNet</h3>
                <p className="text-xs text-dark-muted mt-0.5">A real Canton party will be provisioned for you</p>
              </div>
              <button onClick={() => setShowRolePicker(false)} className="text-dark-muted hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleRoleSelect('business')}
                className="w-full flex items-start gap-3 p-4 rounded-xl border border-dark-border hover:border-violet-500/40 hover:bg-violet-500/5 transition-all text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Business / Seller</p>
                  <p className="text-xs text-dark-muted mt-0.5">Upload invoices and receive financing offers</p>
                </div>
              </button>

              <button
                onClick={() => handleRoleSelect('financier')}
                className="w-full flex items-start gap-3 p-4 rounded-xl border border-dark-border hover:border-violet-500/40 hover:bg-violet-500/5 transition-all text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <Landmark className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Financier / Buyer</p>
                  <p className="text-xs text-dark-muted mt-0.5">Browse auctions and submit sealed bids</p>
                </div>
              </button>
            </div>

            <p className="text-xs text-dark-muted mt-4 text-center">
              Party ID is provisioned on Canton DevNet sandbox
            </p>
          </div>
        </div>
      )}
    </>
  )
}
