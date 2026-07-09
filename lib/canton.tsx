'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import type { Wallet as CantonAccount } from '@canton-network/core-wallet-dapp-rpc-client'
import { useAuth } from '@/lib/auth-context'

export interface CantonParty {
  id: string
  displayName: string
  type: 'business' | 'financier'
  // account     = the party allocated when the user registered (auto-connected)
  // provisioned = created on demand from the connect modal's role picker
  // seaport     = existing party ID pasted from Seaport IDE
  // wallet      = connected through a CIP-103 wallet
  source: 'account' | 'provisioned' | 'seaport' | 'wallet'
}

export interface LedgerStatus {
  ok: boolean
  offset?: number
  packageCount?: number
  network?: string
  timestamp?: string
}

export interface ConnectOutcome {
  ok: boolean
  party?: CantonParty
  error?: string
}

export interface RecentParty extends CantonParty {
  lastUsed: number
}

interface CantonContextType {
  isConnected: boolean
  party: CantonParty | null
  /** Provision a new Canton party via the platform M2M credentials */
  connect: (role?: 'business' | 'financier') => Promise<ConnectOutcome>
  /** Use an existing Seaport party ID directly */
  connectWithPartyId: (partyId: string, displayName: string, role: 'business' | 'financier') => Promise<void>
  /** Connect via the Canton DevNet Wallet (CIP-103, see components/wallet-connect.tsx) */
  connectWithWallet: (account: CantonAccount) => Promise<void>
  /** Set the app-level role (and optionally a display name) after connecting */
  updateRole: (role: 'business' | 'financier', displayName?: string) => void
  /** Identities used before in this browser — enables one-click re-login */
  recentParties: RecentParty[]
  /** Reconnect a previously used identity (rights already granted on-ledger) */
  reconnectRecent: (party: RecentParty) => void
  /** Clear this browser's saved-identity list (local only, doesn't touch the ledger) */
  clearRecents: () => void
  disconnect: () => void
  isConnecting: boolean
  ledgerStatus: LedgerStatus | null
  ledgerLoading: boolean
}

const CantonContext = createContext<CantonContextType | null>(null)

// Manual connections (role-provisioned, Seaport, wallet) survive page
// reloads via localStorage. Account parties are re-derived from the session
// instead, so they always track the logged-in user.
const STORAGE_KEY = 'invoplus-party'
// Every identity ever connected in this browser, newest first — lets users
// hop between their business and financier accounts with one click.
const RECENTS_KEY = 'invoplus-recent-parties'
const MAX_RECENTS = 6

function loadRecents(): RecentParty[] {
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch { return [] }
}

function saveRecent(p: CantonParty) {
  try {
    const list = loadRecents().filter(r => r.id !== p.id)
    list.unshift({ ...p, lastUsed: Date.now() })
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(list.slice(0, MAX_RECENTS)))
  } catch { /* storage unavailable */ }
}

function loadStoredParty(): CantonParty | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw)
    if (p && typeof p.id === 'string' && p.source !== 'account') return p as CantonParty
  } catch { /* corrupted -> ignore */ }
  return null
}

export function CantonProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [party, setPartyState] = useState<CantonParty | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [ledgerStatus, setLedgerStatus] = useState<LedgerStatus | null>(null)
  const [ledgerLoading, setLedgerLoading] = useState(true)

  const [recentParties, setRecentParties] = useState<RecentParty[]>([])

  useEffect(() => { setRecentParties(loadRecents()) }, [])

  const setParty = useCallback((p: CantonParty | null) => {
    setPartyState(p)
    try {
      if (p && p.source !== 'account') window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
      else window.localStorage.removeItem(STORAGE_KEY)
    } catch { /* storage unavailable */ }
    if (p) {
      saveRecent(p)
      setRecentParties(loadRecents())
    }
  }, [])

  // Restore a manual connection from a previous visit.
  useEffect(() => {
    setPartyState(prev => prev ?? loadStoredParty())
  }, [])

  // The party allocated at registration IS the user's ledger identity —
  // auto-connect it so a logged-in user never has to "connect" manually.
  // A manual connection (provisioned/seaport/wallet) deliberately overrides it.
  useEffect(() => {
    if (authLoading) return
    if (user?.party) {
      setPartyState(prev => {
        if (prev && prev.source !== 'account') return prev // manual override wins
        if (prev?.id === user.party) return prev
        return {
          id: user.party!,
          displayName: user.displayName || user.email.split('@')[0],
          type: user.role === 'financier' ? 'financier' : 'business',
          source: 'account',
        }
      })
    } else {
      // Logged out (or no party on the account): drop only account-sourced parties.
      setPartyState(prev => (prev?.source === 'account' ? null : prev))
    }
  }, [user, authLoading])

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
   * Used when the user doesn't have an existing party. Fails loudly —
   * no fake "demo party" fallback that pretends to be connected.
   */
  const connect = useCallback(async (role: 'business' | 'financier' = 'business'): Promise<ConnectOutcome> => {
    setIsConnecting(true)
    try {
      const res = await fetch('/api/canton/provision-party', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Neutral name: in the wallet-first flow the role is picked AFTER
          // connecting, so the on-ledger hint shouldn't bake a role in.
          displayName: 'InvoPlus User',
          role,
        }),
      })
      const data = await res.json()

      if (data.ok) {
        const p: CantonParty = { id: data.partyId, displayName: data.displayName, type: role, source: 'provisioned' }
        setParty(p)
        return { ok: true, party: p }
      }
      return { ok: false, error: data.error ?? 'The Canton validator rejected the request. Try again in a moment.' }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Could not reach Canton DevNet. Check your connection and try again.' }
    } finally {
      setIsConnecting(false)
    }
  }, [setParty])

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
      // External party: our backend needs actAs/readAs rights on it before
      // any contract submission can succeed (provisioned parties get these
      // at allocation; external ones don't).
      await fetch('/api/canton/grant-rights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partyId }),
      }).catch(() => { /* surfaced on first submission if it mattered */ })
      setParty({ id: partyId, displayName, type: role, source: 'seaport' })
    } finally {
      setIsConnecting(false)
    }
  }, [setParty])

  const disconnect = useCallback(() => {
    setParty(null)
  }, [setParty])

  /**
   * One-click re-login with a previously used identity. The on-ledger
   * rights granted at first connect persist on the party, so transactions
   * work immediately; the grant call re-runs as a no-op safety net.
   */
  const reconnectRecent = useCallback((p: RecentParty) => {
    const { lastUsed: _drop, ...core } = p
    fetch('/api/canton/grant-rights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partyId: core.id }),
    }).catch(() => { /* already granted */ })
    // The role is already known and trustworthy here (it's how this party
    // was stored), so this is safe to pass — covers the edge case of an
    // older saved identity that never got a Balance created in the first
    // place. Balance's lazy-create is a no-op if one already exists.
    fetch('/api/canton/contracts/balance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partyId: core.id, role: core.type }),
    }).catch(() => { /* Header's own poll will retry */ })
    setParty(core.source === 'account' ? { ...core, source: 'provisioned' } : core)
  }, [setParty])

  /**
   * Wipe this browser's saved-identity list. Doesn't touch anything on the
   * ledger — the parties themselves, their balances, and their contracts
   * are untouched, this only clears the local "Welcome back" shortcuts.
   * Exists for exactly the confusion of having accumulated many test
   * accounts in one browser during development/testing.
   */
  const clearRecents = useCallback(() => {
    try { window.localStorage.removeItem(RECENTS_KEY) } catch { /* unavailable */ }
    setRecentParties([])
  }, [])

  /**
   * Set the app-level role after connecting. The role never lives on the
   * ledger — it only decides which UI the user sees (seller vs financier),
   * so it's safe to pick it after the party is already connected.
   */
  const updateRole = useCallback((role: 'business' | 'financier', displayName?: string) => {
    setPartyState(prev => {
      if (!prev) return prev
      const name = displayName?.trim()
        ? displayName.trim()
        : prev.displayName === 'InvoPlus User'
          ? (role === 'business' ? 'InvoPlus Business' : 'InvoPlus Financier')
          : prev.displayName
      const next = { ...prev, type: role, displayName: name }
      try {
        if (next.source !== 'account') window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch { /* storage unavailable */ }
      // Keep the recents entry in sync with the final role + company name —
      // otherwise "Welcome back" lists the pre-rename placeholder identity.
      saveRecent(next)
      setTimeout(() => setRecentParties(loadRecents()), 0)
      return next
    })
  }, [])

  /**
   * Connect via the Canton DevNet Wallet. The account object (with a real,
   * wallet-allocated partyId) is resolved by WalletConnect before this is
   * called — see components/wallet-connect.tsx.
   */
  const connectWithWallet = useCallback(async (account: CantonAccount) => {
    setIsConnecting(true)
    try {
      // Wallet-created party — grant our backend submission rights on it
      // (see connectWithPartyId for why).
      await fetch('/api/canton/grant-rights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partyId: account.partyId }),
      }).catch(() => { /* surfaced on first submission if it mattered */ })
      setParty({
        id: account.partyId,
        displayName: account.hint || 'Wallet User',
        type: 'business',
        source: 'wallet',
      })
    } finally {
      setIsConnecting(false)
    }
  }, [setParty])

  return (
    <CantonContext.Provider value={{
      isConnected: party !== null, party, connect, connectWithPartyId, connectWithWallet, updateRole,
      recentParties, reconnectRecent, clearRecents, disconnect,
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
