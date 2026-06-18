'use client'

import { Bell, Search, ChevronDown, Wallet } from 'lucide-react'
import { useCanton } from '@/lib/canton'
import { cn } from '@/lib/utils'

export function Header({ title }: { title: string }) {
  const { isConnected, party, connect, isConnecting } = useCanton()

  return (
    <header className="h-16 border-b border-dark-border bg-dark-bg/80 backdrop-blur-md flex items-center justify-between px-6 shrink-0">
      <h1 className="text-lg font-semibold text-white">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 bg-dark-card border border-dark-border rounded-xl px-3 py-2 text-sm text-dark-muted w-52">
          <Search className="w-4 h-4 shrink-0" />
          <span>Search invoices...</span>
        </div>

        {/* Notifications */}
        <button className="relative w-9 h-9 rounded-xl bg-dark-card border border-dark-border flex items-center justify-center hover:border-violet-500/30 transition-colors">
          <Bell className="w-4 h-4 text-dark-muted" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-violet-500" />
        </button>

        {/* Canton wallet */}
        <button
          onClick={isConnected ? undefined : connect}
          disabled={isConnecting}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border',
            isConnected
              ? 'bg-violet-500/10 border-violet-500/30 text-violet-300 cursor-default'
              : 'bg-violet-500 border-violet-500 text-white hover:bg-violet-600'
          )}
        >
          <Wallet className="w-4 h-4" />
          {isConnecting ? (
            <span>Connecting…</span>
          ) : isConnected ? (
            <span className="flex items-center gap-1.5">
              {party?.displayName}
              <ChevronDown className="w-3 h-3" />
            </span>
          ) : (
            <span>Connect Canton Wallet</span>
          )}
        </button>
      </div>
    </header>
  )
}
