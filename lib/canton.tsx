'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import type { Cip103Provider, Account } from './cip103-provider'

export interface CantonParty {
  id: string
  displayName: string
  type: 'business' | 'financier'
  source: 'provisioned' | 'seaport' | 'cip103'  // how the party was connected
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
  /** Connect via CIP-103 compliant wallet */
  connectWithWallet: (provider: Cip103Provider) => Promise<void>
  disconnect: () => void
  isConnecting: boolean
  ledgerStatus: LedgerStatus | null
  ledgerLoading: boolean
  walletProvider: Cip103Provider | null
}

const CantonContext = createContext<CantonContextType | null>(null)

export function CantonProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const [party, setParty] = useState<CantonParty | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [ledgerStatus, setLedgerStatus] = useState<LedgerStatus | null>(null)
  const [ledgerLoading, setLedgerLoading] = useState(true)
  const [walletProvider, setWalletProvider] = useState<Cip103Provider | null>(null)

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
    setWalletProvider(null)
  }, [])

  /**
   * Connect via CIP-103 compliant wallet
   * This allows users to connect with any wallet that implements the CIP-103 standard
   */
  const connectWithWallet = useCallback(async (provider: Cip103Provider) => {
    setIsConnecting(true)
    try {
      // Get the primary account from the wallet
      const account = await provider.request<Account>({ method: 'getPrimaryAccount' })
      
      // Get network information
      const network = await provider.request({ method: 'getActiveNetwork' })
      
      // Set up the party from the wallet account
      setParty({
        id: account.partyId,
        displayName: account.hint || 'Wallet User',
        type: 'business', // Default to business, could be determined from account metadata
        source: 'cip103',
      })
      
      setWalletProvider(provider)
      setIsConnected(true)
    } catch (error) {
      console.error('Wallet connection failed:', error)
      throw error
    } finally {
      setIsConnecting(false)
    }
  }, [])

  return (
    <CantonContext.Provider value={{
      isConnected, party, connect, connectWithPartyId, connectWithWallet, disconnect,
      isConnecting, ledgerStatus, ledgerLoading, walletProvider,
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
