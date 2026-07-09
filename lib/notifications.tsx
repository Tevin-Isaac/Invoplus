'use client'

import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react'
import { useCanton } from '@/lib/canton'

export interface AppNotification {
  id: string
  type: 'connect' | 'invoice' | 'auction' | 'bid' | 'withdraw' | 'info' | 'balance'
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
const overdueSeenKey = (partyId: string) => `invoplus-overdue-seen:${partyId}`
const seenListingsKey = (partyId: string) => `invoplus-seen-listings:${partyId}`
const seenRepaymentsKey = (partyId: string) => `invoplus-seen-repayments:${partyId}`
const lastBalanceKey = (partyId: string) => `invoplus-last-balance:${partyId}`

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
      let items: AppNotification[] = raw ? JSON.parse(raw) : []
      // Defensive cleanup: a since-fixed race could land a "Welcome back"
      // toast in the anonymous bucket (party was still null at the moment
      // notify() fired) — it would then resurface after a later logout as
      // if it just happened, with no logged-in identity to explain it. That
      // toast never legitimately belongs here regardless of how it arrived.
      if (partyId === null && items.some(n => n.type === 'connect')) {
        items = items.filter(n => n.type !== 'connect')
        persist(items, null)
      }
      setNotifications(items)
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
        const now = Date.now()
        for (const c of mine) {
          const invoiceId = String(pv(c.payload?.invoiceId) ?? 'auction')
          const count = Number(pv(c.payload?.bidCount) ?? 0)
          nextSeen[invoiceId] = count
          if (!isFirstPoll && count > (seen[invoiceId] ?? 0)) {
            notify('bid', 'New sealed bid received', `${invoiceId} now has ${count} sealed bid${count === 1 ? '' : 's'}. Contents stay private until settlement.`)
          }

          // Auction ended with zero bids: return it to the seller automatically
          // rather than leaving a dead listing on the marketplace forever. The
          // backend holds M2M CanActAs on every party it provisions, so this
          // client-triggered call can act as the seller the same way settle
          // and repay already do.
          const auctionEnd = pv(c.payload?.auctionEnd)
          if (count === 0 && auctionEnd && new Date(auctionEnd).getTime() < now) {
            expireAuction(partyId, c.contractId, invoiceId)
          }
        }
        window.localStorage.setItem(seenBidsKey(partyId), JSON.stringify(nextSeen))
      } catch { /* transient */ }
    }

    const expireAuction = async (sellerPartyId: string, auctionContractId: string, invoiceId: string) => {
      try {
        const regRes = await fetch('/api/canton/contracts/list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parties: [sellerPartyId], template: 'registry' }),
        })
        const regData = await regRes.json()
        const reg = (regData.contracts || []).find((c: any) => String(pv(c.payload?.invoiceHash) ?? '').includes(invoiceId))
        if (!reg) return
        const res = await fetch('/api/canton/contracts/cancel-auction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sellerPartyId, auctionContractId, registryEntryContractId: reg.contractId }),
        })
        const data = await res.json()
        if (data.ok) {
          notify('auction', 'Listing expired — no bids received', `${invoiceId} closed with no sealed bids and was returned to your Invoices. Consider adjusting the advance rate or annual rate before relisting.`)
        }
      } catch { /* try again next poll */ }
    }

    check()
    const interval = setInterval(check, 45_000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [partyId, notify])

  // Overdue-repayment watcher: repayment is self-attested off-ledger (the
  // debtor isn't a Canton party, so nothing forces the seller to click
  // Mark as Repaid). This is the visible pressure point for both sides —
  // the seller gets nagged, the financier gets told their money is
  // outstanding — once a FundedInvoice's due date passes unpaid. Both are
  // signatories on FundedInvoice, so both can query it directly.
  useEffect(() => {
    if (!partyId) return
    let cancelled = false

    const check = async () => {
      try {
        const res = await fetch('/api/canton/contracts/list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parties: [partyId], template: 'funded' }),
        })
        const data = await res.json()
        if (cancelled || !data.ok) return

        const raw = window.localStorage.getItem(overdueSeenKey(partyId))
        let seen: string[] = []
        try { seen = raw ? JSON.parse(raw) : [] } catch { /* fresh */ }
        const nextSeen = new Set(seen)
        const now = Date.now()

        for (const c of data.contracts || []) {
          const p = c.payload || {}
          const dueDate = pv(p.dueDate)
          if (!dueDate || new Date(dueDate).getTime() >= now) continue
          if (seen.includes(c.contractId)) continue
          nextSeen.add(c.contractId)

          const invoiceId = String(pv(p.invoiceId) ?? 'Invoice')
          const isSeller = pv(p.seller) === partyId
          if (isSeller) {
            notify('info', 'Repayment overdue', `${invoiceId} passed its due date without being marked repaid. The financier is still owed — mark it repaid as soon as your debtor pays.`)
          } else {
            notify('info', 'Waiting on an overdue repayment', `${invoiceId} passed its due date and the seller hasn't marked it repaid yet.`)
          }
        }
        window.localStorage.setItem(overdueSeenKey(partyId), JSON.stringify(Array.from(nextSeen)))
      } catch { /* transient */ }
    }

    check()
    const interval = setInterval(check, 45_000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [partyId, notify])

  // New-listing watcher, financiers only: poll the marketplace (through the
  // platform party, same as the marketplace page itself — that's how
  // auctions become visible to every financier per the shared-party
  // pattern) and notify on any auction not seen before. Dedup'd by contract
  // ID rather than invoice ID, since re-listing after a cancel produces a
  // new contract for the same invoice and that's genuinely new news too.
  const partyType = party?.type ?? null
  useEffect(() => {
    if (!partyId || partyType !== 'financier') return
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
        const open = (data.contracts || []).filter((c: any) => !pv(c.payload?.settled))

        const raw = window.localStorage.getItem(seenListingsKey(partyId))
        const isFirstPoll = raw === null
        let seen: string[] = []
        try { seen = raw ? JSON.parse(raw) : [] } catch { /* fresh */ }
        const seenSet = new Set(seen)

        for (const c of open) {
          if (seenSet.has(c.contractId)) continue
          seenSet.add(c.contractId)
          if (isFirstPoll) continue // baseline silently, same reasoning as the bid watcher
          const p = c.payload || {}
          const invoiceId = String(pv(p.invoiceId) ?? 'Invoice')
          const grade = String(pv(p.riskGrade) ?? '').replace('Grade_', '')
          const amount = Number(pv(p.faceAmount) ?? 0)
          notify('invoice', 'New invoice up for financing', `${invoiceId} · $${amount.toLocaleString()}${grade ? ` · Grade ${grade}` : ''} just listed — sealed bidding is open.`)
        }
        window.localStorage.setItem(seenListingsKey(partyId), JSON.stringify(Array.from(seenSet)))
      } catch { /* transient */ }
    }

    check()
    const interval = setInterval(check, 30_000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [partyId, partyType, notify])

  // Repayment-received watcher, financiers only: the generic balance-delta
  // watcher below already tells a financier their balance went up, but not
  // that a fee was taken out of it — this reads their own
  // RepaymentConfirmation records (they're a signatory, so this is their
  // own data, not the seller's) and reports the exact breakdown: principal,
  // gross yield, InvoPlus's cut, and net received. 10% mirrors
  // PLATFORM_FEE_RATE in complete-repayment/route.ts — informational only,
  // the real deduction already happened server-side by the time this fires.
  useEffect(() => {
    if (!partyId || partyType !== 'financier') return
    let cancelled = false

    const check = async () => {
      try {
        const res = await fetch('/api/canton/contracts/list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parties: [partyId], template: 'repayment' }),
        })
        const data = await res.json()
        if (cancelled || !data.ok) return

        const raw = window.localStorage.getItem(seenRepaymentsKey(partyId))
        const isFirstPoll = raw === null
        let seen: string[] = []
        try { seen = raw ? JSON.parse(raw) : [] } catch { /* fresh */ }
        const seenSet = new Set(seen)

        for (const c of data.contracts || []) {
          const p = c.payload || {}
          if (pv(p.financier) !== partyId) continue
          if (seenSet.has(c.contractId)) continue
          seenSet.add(c.contractId)
          if (isFirstPoll) continue // baseline silently, same reasoning as the other watchers
          const invoiceId = String(pv(p.invoiceId) ?? 'Invoice')
          const fundedAmount = Number(pv(p.fundedAmount) ?? 0)
          const yieldAmount = Number(pv(p.yieldAmount) ?? 0)
          const fee = Math.round(yieldAmount * 0.10 * 100) / 100
          const netYield = Math.round((yieldAmount - fee) * 100) / 100
          notify('balance', 'Repayment received', `${invoiceId} — $${fundedAmount.toLocaleString()} principal + $${netYield.toLocaleString()} net yield. InvoPlus fee: $${fee.toFixed(2)} (10% of $${yieldAmount.toLocaleString()} yield).`)
        }
        window.localStorage.setItem(seenRepaymentsKey(partyId), JSON.stringify(Array.from(seenSet)))
      } catch { /* transient */ }
    }

    check()
    const interval = setInterval(check, 20_000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [partyId, partyType, notify])

  // Balance-change watcher — the only place that reliably covers "money
  // moved" for BOTH parties. The person who clicks Settle or Mark as
  // Repaid already gets a notification from that action directly, but the
  // party on the OTHER end of the transfer (the financier who just got
  // funded away from, or just got repaid) isn't the one clicking anything
  // — they'd otherwise only find out by manually checking. This detects
  // the delta instead of trying to know every reason a balance could
  // change, so it covers settle, repay, and anything added later for free.
  useEffect(() => {
    if (!partyId) return
    let cancelled = false

    const check = async () => {
      try {
        const res = await fetch('/api/canton/contracts/balance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ partyId }),
        })
        const data = await res.json()
        if (cancelled || !data.ok || !data.provisioned) return

        const raw = window.localStorage.getItem(lastBalanceKey(partyId))
        const isFirstPoll = raw === null
        const last = raw !== null ? Number(raw) : data.amount
        const current = Number(data.amount)

        if (!isFirstPoll && current !== last) {
          const delta = current - last
          const rounded = Math.abs(Math.round(delta * 100) / 100)
          if (delta > 0) {
            notify('balance', 'Balance increased', `+$${rounded.toLocaleString()} landed in your account — now $${current.toLocaleString()}.`)
          } else {
            notify('balance', 'Balance decreased', `-$${rounded.toLocaleString()} moved out of your account — now $${current.toLocaleString()}.`)
          }
        }
        window.localStorage.setItem(lastBalanceKey(partyId), String(current))
      } catch { /* transient */ }
    }

    check()
    const interval = setInterval(check, 15_000)
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
