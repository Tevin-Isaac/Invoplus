'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'

export interface CantonParty {
  id: string
  displayName: string
  type: 'business' | 'financier'
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
  connect: (role?: 'business' | 'financier') => Promise<void>
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

  const connect = useCallback(async (role: 'business' | 'financier' = 'business') => {
    setIsConnecting(true)
    try {
      // Provision a real Canton party on the DevNet
      const res = await fetch('/api/canton/provision-party', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: role === 'business' ? 'InvoPlus Business Demo' : 'InvoPlus Financier Demo',
          role,
        }),
      })
      const data = await res.json()

      if (data.ok) {
        setParty({ id: data.partyId, displayName: data.displayName, type: role })
        setIsConnected(true)
      } else {
        // Fallback to demo party if provisioning fails
        setParty({
          id: `demo_${role}::fallback`,
          displayName: role === 'business' ? 'Demo Business' : 'Demo Financier',
          type: role,
        })
        setIsConnected(true)
      }
    } catch {
      setParty({ id: `demo_${role}::offline`, displayName: 'Demo Party (offline)', type: role })
      setIsConnected(true)
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    setParty(null)
    setIsConnected(false)
  }, [])

  return (
    <CantonContext.Provider value={{
      isConnected, party, connect, disconnect, isConnecting, ledgerStatus, ledgerLoading,
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
