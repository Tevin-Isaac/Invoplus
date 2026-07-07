'use client'

import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react'
import { useCanton } from '@/lib/canton'

export interface AppNotification {
  id: string
  type: 'connect' | 'invoice' | 'auction' | 'bid' | 'withdraw' | 'info'
  title: string
  body: string
  ts: number
  read: boolean
}

interface NotificationsContextType {
  notifications: AppNotification[]
  unreadCount: number
  notify: (type: AppNotification['type'], title: string, body: string) => void
  markAllRead: () => void
  clearAll: () => void
}

const NotificationsContext = createContext<NotificationsContextType | null>(null)

const MAX_KEPT = 50
// Notifications are scoped per identity so switching parties (or
// disconnecting) never leaks another identity's activity feed.
const storageKey = (partyId: string | null) => `invoplus-notifs:${partyId ?? 'anon'}`
const seenBidsKey = (partyId: string) => `invoplus-bidcounts:${partyId}`

const pv = (x: any) => (x && typeof x === 'object' && 'value' in x ? x.value : x)

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { party } = useCanton()
  const partyId = party?.id ?? null
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const loadedFor = useRef<string | null>('__unloaded__')

  // Load the feed for the current identity (and swap feeds when it changes).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey(partyId))
      setNotifications(raw ? JSON.parse(raw) : [])
    } catch { setNotifications([]) }
    loadedFor.current = partyId
  }, [partyId])

  const persist = useCallback((items: AppNotification[], forParty: string | null) => {
    try { window.localStorage.setItem(storageKey(forParty), JSON.stringify(items.slice(0, MAX_KEPT))) } catch { /* full/unavailable */ }
  }, [])

  const notify = useCallback((type: AppNotification['type'], title: string, body: string) => {
    setNotifications(prev => {
      const next = [{
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type, title, body, ts: Date.now(), read: false,
      }, ...prev].slice(0, MAX_KEPT)
      persist(next, loadedFor.current === '__unloaded__' ? null : loadedFor.current)
      return next
    })
  }, [persist])

  const markAllRead = useCallback(() => {
    setNotifications(prev => {
      const next = prev.map(n => ({ ...n, read: true }))
      persist(next, loadedFor.current === '__unloaded__' ? null : loadedFor.current)
      return next
    })
  }, [persist])

  const clearAll = useCallback(() => {
    setNotifications([])
    persist([], loadedFor.current === '__unloaded__' ? null : loadedFor.current)
  }, [persist])

  // Seller-side ledger watcher: sealed bid CONTENTS are invisible to the
  // seller by design, but the auction's bidCount is not — poll it and raise
  // a notification when it grows. This is the one event that originates
  // from another user, so it can't be pushed at an action site.
  useEffect(() => {
    if (!partyId) return
    let cancelled = false

    const check = async () => {
      try {
        const res = await fetch('/api/canton/contracts/list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parties: [partyId], template: 'auction' }),
        })
        const data = await res.json()
        if (cancelled || !data.ok) return
        const mine = (data.contracts || []).filter((c: any) => pv(c.payload?.seller) === partyId)
        // Only the literal first poll for this identity baselines silently
        // (so reconnecting doesn't replay old bids as "new"). After that, an
        // auction appearing with bids we haven't recorded IS news — auctions
        // are archived+recreated per bid, so a listing can first show up
        // already carrying its first bid.
        const raw = window.localStorage.getItem(seenBidsKey(partyId))
        const isFirstPoll = raw === null
        let seen: Record<string, number> = {}
        try { seen = raw ? JSON.parse(raw) : {} } catch { /* fresh */ }
        const nextSeen: Record<string, number> = {}
        for (const c of mine) {
          const invoiceId = String(pv(c.payload?.invoiceId) ?? 'auction')
          const count = Number(pv(c.payload?.bidCount) ?? 0)
          nextSeen[invoiceId] = count
          if (!isFirstPoll && count > (seen[invoiceId] ?? 0)) {
            notify('bid', 'New sealed bid received', `${invoiceId} now has ${count} sealed bid${count === 1 ? '' : 's'}. Contents stay private until settlement.`)
          }
        }
        window.localStorage.setItem(seenBidsKey(partyId), JSON.stringify(nextSeen))
      } catch { /* transient */ }
    }

    check()
    const interval = setInterval(check, 45_000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [partyId, notify])

  return (
    <NotificationsContext.Provider value={{
      notifications,
      unreadCount: notifications.filter(n => !n.read).length,
      notify, markAllRead, clearAll,
    }}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications must be used inside NotificationsProvider')
  return ctx
}
