'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export interface CantonParty {
  id: string
  displayName: string
  type: 'business' | 'financier'
}

interface CantonContextType {
  isConnected: boolean
  party: CantonParty | null
  connect: () => Promise<void>
  disconnect: () => void
  isConnecting: boolean
}

const CantonContext = createContext<CantonContextType | null>(null)

// Mock Canton parties for demo
const DEMO_PARTIES: CantonParty[] = [
  { id: 'business::abc123def456', displayName: 'Acme Corp', type: 'business' },
  { id: 'financier::xyz789uvw012', displayName: 'Capital Partners', type: 'financier' },
]

export function CantonProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const [party, setParty] = useState<CantonParty | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  const connect = useCallback(async () => {
    setIsConnecting(true)
    // Simulate Canton wallet handshake (CIP-103 dApp SDK connect flow)
    await new Promise(r => setTimeout(r, 1200))
    const selected = DEMO_PARTIES[0]
    setParty(selected)
    setIsConnected(true)
    setIsConnecting(false)
  }, [])

  const disconnect = useCallback(() => {
    setParty(null)
    setIsConnected(false)
  }, [])

  return (
    <CantonContext.Provider value={{ isConnected, party, connect, disconnect, isConnecting }}>
      {children}
    </CantonContext.Provider>
  )
}

export function useCanton() {
  const ctx = useContext(CantonContext)
  if (!ctx) throw new Error('useCanton must be used inside CantonProvider')
  return ctx
}
