'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import type { Wallet as CantonAccount } from '@canton-network/core-wallet-dapp-rpc-client'

export interface CantonParty {
  id: string
  displayName: string
  type: 'business' | 'financier'
  source: 'provisioned' | 'seaport' | 'wallet'  // how the party was connected
}

export interface LedgerStatus {
  ok: boolean
  offset?: number
  packageCount?: number
  network?: string
  timestamp?: string
}

interface CantonContextType {
  isConnected: boolean
  party: CantonParty | null
  /** Provision a new Canton party via the platform M2M credentials */
  connect: (role?: 'business' | 'financier') => Promise<void>
  /** Use an existing Seaport party ID directly */
  connectWithPartyId: (partyId: string, displayName: string, role: 'business' | 'financier') => Promise<void>
  /** Connect via the Canton DevNet Wallet (CIP-103, see components/wallet-connect.tsx) */
  connectWithWallet: (account: CantonAccount) => Promise<void>
  disconnect: () => void
  isConnecting: boolean
  ledgerStatus: LedgerStatus | null
  ledgerLoading: boolean
}

const CantonContext = createContext<CantonContextType | null>(null)

export function CantonProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const [party, setParty] = useState<CantonParty | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [ledgerStatus, setLedgerStatus] = useState<LedgerStatus | null>(null)
  const [ledgerLoading, setLedgerLoading] = useState(true)

  // Poll real Canton ledger status every 30s
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/canton/ledger-status')
        const data = await res.json()
        setLedgerStatus(data)
      } catch {
        setLedgerStatus({ ok: false })
      } finally {
        setLedgerLoading(false)
      }
    }
    fetchStatus()
    const interval = setInterval(fetchStatus, 30_000)
    return () => clearInterval(interval)
  }, [])

  /**
   * Provision a brand-new Canton party via platform M2M credentials.
   * Used when the user doesn't have an existing Seaport party.
   */
  const connect = useCallback(async (role: 'business' | 'financier' = 'business') => {
    setIsConnecting(true)
    try {
      const res = await fetch('/api/canton/provision-party', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: role === 'business' ? 'InvoPlus Business' : 'InvoPlus Financier',
          role,
        }),
      })
      const data = await res.json()

      if (data.ok) {
        setParty({ id: data.partyId, displayName: data.displayName, type: role, source: 'provisioned' })
        setIsConnected(true)
      } else {
        // Fallback to offline demo party so the UI still works
        setParty({
          id: `demo_${role}::${Date.now()}`,
          displayName: role === 'business' ? 'Demo Business' : 'Demo Financier',
          type: role,
          source: 'provisioned',
        })
        setIsConnected(true)
      }
    } catch {
      setParty({
        id: `demo_${role}::offline`,
        displayName: 'Demo Party (offline)',
        type: role,
        source: 'provisioned',
      })
      setIsConnected(true)
    } finally {
      setIsConnecting(false)
    }
  }, [])

  /**
   * Connect using an existing Seaport party ID that the user pasted.
   * The party has already been validated against the ledger before this is called.
   * We store it exactly as-is so all contract submissions use the user's real identity.
   */
  const connectWithPartyId = useCallback(async (
    partyId: string,
    displayName: string,
    role: 'business' | 'financier',
  ) => {
    setIsConnecting(true)
    try {
      setParty({ id: partyId, displayName, type: role, source: 'seaport' })
      setIsConnected(true)
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    setParty(null)
    setIsConnected(false)
  }, [])

  /**
   * Connect via the Canton DevNet Wallet. The account object (with a real,
   * wallet-allocated partyId) is resolved by WalletConnect before this is
   * called — see components/wallet-connect.tsx.
   */
  const connectWithWallet = useCallback(async (account: CantonAccount) => {
    setIsConnecting(true)
    try {
      setParty({
        id: account.partyId,
        displayName: account.hint || 'Wallet User',
        type: 'business',
        source: 'wallet',
      })
      setIsConnected(true)
    } finally {
      setIsConnecting(false)
    }
  }, [])

  return (
    <CantonContext.Provider value={{
      isConnected, party, connect, connectWithPartyId, connectWithWallet, disconnect,
      isConnecting, ledgerStatus, ledgerLoading,
    }}>
      {children}
    </CantonContext.Provider>
  )
}

export function useCanton() {
  const ctx = useContext(CantonContext)
  if (!ctx) throw new Error('useCanton must be used inside CantonProvider')
  return ctx
}
