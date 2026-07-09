'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, ChevronDown, Wallet, Building2, Landmark, X, Copy, Check, ExternalLink, Loader2, AlertTriangle, CheckCircle, Zap, Moon, Sun, LogOut } from 'lucide-react'
import { useCanton } from '@/lib/canton'
import { useAuth } from '@/lib/auth-context'
import { useNotifications } from '@/lib/notifications'
import { cn } from '@/lib/utils'
import { WalletConnect } from '@/components/wallet-connect'
import { HeaderSearch } from '@/components/dashboard/HeaderSearch'
import { AssistantChat } from '@/components/dashboard/AssistantChat'

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-950 transition-colors dark:hover:bg-white/10 dark:hover:text-white"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

// Wallet-first wizard, like any web3 app:
//   connect (pick HOW to connect) -> role (pick how you'll USE the app) -> done
// The role is app-level only — it never lives on the ledger — so it's picked
// after the party is connected, whatever the connection method was.
type ModalStep = 'closed' | 'connect' | 'paste' | 'role' | 'done'

export function Header({ title }: { title: string }) {
  const { isConnected, party, connect, connectWithPartyId, connectWithWallet, updateRole, recentParties, reconnectRecent, disconnect, isConnecting, ledgerStatus } = useCanton()
  const { user, logout } = useAuth()
  const { notifications, unreadCount, notify, markAllRead, clearAll } = useNotifications()
  const router = useRouter()
  const [modal, setModal] = useState<ModalStep>('closed')
  const [provisioning, setProvisioning] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [orgName, setOrgName] = useState('')
  const [balance, setBalance] = useState<number | null>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  // Real ledger balance — the InvoPlus.Token:Balance moved by settle-auction
  // and complete-repayment. Polled rather than event-driven since it can
  // change from actions taken by other parties (e.g. a financier funding
  // your invoice), not just this browser's own submissions.
  useEffect(() => {
    if (!party?.id) { setBalance(null); return }
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/canton/contracts/balance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ partyId: party.id, role: party.type }),
        })
        const data = await res.json()
        if (!cancelled && data.ok) setBalance(data.amount)
      } catch { /* keep last known value */ }
    }
    load()
    const interval = setInterval(load, 15000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [party?.id])

  // Close dropdowns on outside click. A `fixed inset-0` backdrop can't do
  // this here: the header's backdrop-blur creates a containing block, so
  // "fixed" children only span the header strip, not the viewport.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  // "paste party ID" form state
  const [pasteId, setPasteId] = useState('')
  const [validating, setValidating] = useState(false)
  const [validateResult, setValidateResult] = useState<{ ok: boolean; displayName?: string; error?: string } | null>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')

  useEffect(() => {
    const storedTheme = window.localStorage.getItem('invoplus-theme') as 'light' | 'dark' | null
    const preferredTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    const initialTheme = storedTheme || preferredTheme
    setTheme(initialTheme)
    document.documentElement.classList.toggle('dark', initialTheme === 'dark')
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    window.localStorage.setItem('invoplus-theme', theme)
  }, [theme])

  const openModal = () => {
    setModal('connect')
    setConnectError(null)
    setValidateResult(null)
    setPasteId('')
  }

  /** Method 1: instant identity — provision a fresh party on DevNet. */
  const handleInstant = async () => {
    setProvisioning(true)
    setConnectError(null)
    const result = await connect()
    setProvisioning(false)
    if (result.ok) {
      setModal('role')
    } else {
      setConnectError(result.error ?? 'Could not create your identity. Try again.')
    }
  }

  /** Method 2: CIP-103 wallet (hosted or browser extension) connected. */
  const handleWalletConnected = async (account: Parameters<typeof connectWithWallet>[0]) => {
    await connectWithWallet(account)
    setModal('role')
  }

  /** Method 3: pasted Seaport party validated + connected. */
  const handlePasteConnect = async () => {
    if (!validateResult?.ok || !pasteId.trim()) return
    await connectWithPartyId(pasteId.trim(), validateResult.displayName ?? pasteId.split('::')[0], 'business')
    setModal('role')
  }

  const handleValidate = async () => {
    if (!pasteId.trim()) return
    setValidating(true)
    setValidateResult(null)
    try {
      const res = await fetch('/api/canton/validate-party', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partyId: pasteId.trim() }),
      })
      const data = await res.json()
      setValidateResult(data)
    } catch (e) {
      setValidateResult({ ok: false, error: e instanceof Error ? e.message : 'Network error' })
    } finally {
      setValidating(false)
    }
  }

  const chooseRole = (role: 'business' | 'financier') => {
    updateRole(role, orgName)
    setModal('done')
    notify('connect', 'Connected to Canton', `You're set up as a ${role}${orgName.trim() ? ` — ${orgName.trim()}` : ''}. Every action you take is signed by your party on DevNet.`)
  }

  const handleAccountLogout = async () => {
    setProfileOpen(false)
    await logout()
    router.push('/login')
  }

  return (
    <>
      {/* pl-16 on mobile clears the fixed hamburger button */}
      {/* relative z-40: without an explicit z-index the header's dropdowns
          (notifications, profile) paint UNDER page cards that create their
          own stacking contexts (hover transforms, shadows). */}
      <header className="relative z-40 h-16 shrink-0 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 pl-16 pr-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95 lg:px-6">
        <h1 className="truncate text-lg font-semibold text-slate-950 dark:text-white">{title}</h1>

        <div className="flex items-center gap-3">
          <HeaderSearch />

          <AssistantChat />

          {/* A red dot only appears when the ledger is actually unreachable —
              otherwise this stays silent. Full connection detail lives in
              Settings; the navbar doesn't need to narrate "we're connected"
              when everything is working. */}
          {ledgerStatus && !ledgerStatus.ok && (
            <div
              className="hidden items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 md:flex"
              title="Canton DevNet unreachable"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
              <span className="font-data text-[11px] tracking-wider text-red-600 uppercase dark:text-red-300">Canton offline</span>
            </div>
          )}

          {isConnected && balance !== null && (
            <div
              className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.08] px-3.5 py-2"
              title="Your InvoPlus demo balance — not real currency or USDC, but a real Canton contract: it moves atomically on settlement and repayment"
            >
              <Wallet className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
              <span className="flex flex-col leading-none">
                <span className="font-data text-sm font-bold text-emerald-700 dark:text-emerald-300">
                  ${balance.toLocaleString()}
                </span>
                <span className="hidden text-[9px] uppercase tracking-wider text-emerald-600/70 dark:text-emerald-400/70 sm:block">
                  {party?.type === 'financier' ? 'Available capital' : 'Balance'}
                </span>
              </span>
            </div>
          )}

          <div className="relative" ref={notifRef}>
            <button
              onClick={() => { setNotifOpen(o => !o); if (!notifOpen) markAllRead() }}
              className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 transition-colors hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
              aria-label="Notifications"
              aria-expanded={notifOpen}
            >
              <Bell className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 font-data text-[9px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <>
                <div className="absolute right-0 top-full z-40 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-center justify-between border-b border-slate-100 px-3.5 py-2 dark:border-slate-800">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Notifications</p>
                    {notifications.length > 0 && (
                      <button onClick={clearAll} className="text-[11px] text-slate-400 transition-colors hover:text-red-500">Clear all</button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center gap-1.5 px-4 py-5 text-center">
                        <Bell className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                        <p className="text-xs text-slate-500 dark:text-slate-400">Invoices, listings, and bids land here.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {notifications.map(n => (
                          <div key={n.id} className={cn('flex gap-2.5 px-3.5 py-2.5', !n.read && 'bg-violet-500/[0.05]')}>
                            <span className={cn('mt-1 h-2 w-2 shrink-0 rounded-full',
                              n.type === 'bid' ? 'bg-violet-500'
                              : n.type === 'invoice' ? 'bg-sky-500'
                              : n.type === 'auction' ? 'bg-emerald-500'
                              : n.type === 'withdraw' ? 'bg-amber-500'
                              : 'bg-slate-400')} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-baseline justify-between gap-2">
                                <p className="truncate text-xs font-semibold text-slate-950 dark:text-white">{n.title}</p>
                                <span className="shrink-0 text-[10px] text-slate-400 dark:text-slate-500">{timeAgo(n.ts)}</span>
                              </div>
                              <p className="text-[11px] leading-snug text-slate-500 dark:text-slate-400">{n.body}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 transition-colors hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-slate-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {isConnected && party ? (
            /* Profile chip opens a dropdown — never disconnects on click.
               Copy the party ID, jump to Settings, or explicitly disconnect. */
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(o => !o)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950 transition-all hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
                aria-expanded={profileOpen}
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="max-w-[140px] truncate">{party.displayName}</span>
                <ChevronDown className={cn('w-3 h-3 shrink-0 transition-transform', profileOpen && 'rotate-180')} />
              </button>

              {profileOpen && (
                <>
                  <div className="absolute right-0 top-full z-40 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                    <div className="mb-3">
                      <p className="text-sm font-semibold text-slate-950 dark:text-white">{party.displayName}</p>
                      <p className="text-xs capitalize text-violet-600 dark:text-violet-300">{party.type}
                        <span className="ml-1.5 text-slate-400 dark:text-slate-500">
                          · {party.source === 'account' ? 'account identity' : party.source === 'wallet' ? 'wallet' : party.source === 'seaport' ? 'Seaport party' : 'instant identity'}
                        </span>
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
                      <p className="mb-1 text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">Canton Party ID</p>
                      <div className="flex items-center gap-1.5">
                        <p className="font-data flex-1 break-all text-xs text-slate-600 dark:text-slate-300">{party.id}</p>
                        <CopyBtn text={party.id} />
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <a
                        href="/dashboard/settings"
                        className="flex-1 rounded-xl border border-slate-200 py-2 text-center text-xs font-medium text-slate-600 transition-colors hover:text-slate-950 dark:border-slate-700 dark:text-slate-400 dark:hover:text-white"
                      >
                        View in Settings
                      </a>
                      {party.source !== 'account' && (
                        <button
                          onClick={() => { setProfileOpen(false); disconnect() }}
                          className="flex-1 rounded-xl border border-red-500/30 py-2 text-xs font-medium text-red-500 transition-colors hover:bg-red-500/10"
                        >
                          Disconnect
                        </button>
                      )}
                    </div>
                    {user && (
                      <button
                        onClick={handleAccountLogout}
                        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2 text-xs font-medium text-slate-500 transition-colors hover:text-red-500 dark:border-slate-700 dark:text-slate-400"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Log out of {user.email}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={openModal}
              disabled={isConnecting}
              className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border border-slate-950 bg-slate-950 px-3 py-2 text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-60 dark:border-white dark:bg-white dark:text-slate-950 md:px-4"
            >
              <Wallet className="w-4 h-4" />
              {isConnecting ? 'Connecting…' : 'Connect'}
            </button>
          )}
        </div>
      </header>

      {/* ── Step 1: pick a connection method (web3 wallet-picker style) ───────── */}
      {modal === 'connect' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-950 dark:text-white">Connect to InvoPlus</h3>
              <button onClick={() => setModal('closed')} className="text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="mb-4 text-xs text-slate-600 dark:text-slate-400">
              Your identity on Canton signs every invoice, bid, and settlement you make.
            </p>

            {/* Welcome back: identities used before in this browser — one tap
                to log back in as your business or financier account. */}
            {recentParties.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Welcome back — your accounts</p>
                <div className="space-y-1.5">
                  {recentParties.slice(0, 4).map(rp => (
                    <button
                      key={rp.id}
                      onClick={() => { reconnectRecent(rp); setModal('done') }}
                      className="w-full flex items-center gap-2.5 rounded-xl border border-slate-200 px-3 py-2.5 text-left transition-all hover:border-violet-500 hover:bg-violet-500/[0.04] dark:border-slate-700 dark:hover:border-violet-500"
                    >
                      <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white', rp.type === 'business' ? 'bg-violet-500' : 'bg-emerald-500')}>
                        {rp.displayName[0]?.toUpperCase() ?? '?'}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-slate-950 dark:text-white">{rp.displayName}</span>
                        <span className="block text-[10px] capitalize text-slate-400 dark:text-slate-500">{rp.type} · {rp.id.slice(0, 18)}…</span>
                      </span>
                      <span className="text-[10px] font-medium text-violet-600 dark:text-violet-300">Log in →</span>
                    </button>
                  ))}
                </div>
                <div className="my-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">or connect new</span>
                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                </div>
              </div>
            )}

            {connectError && (
              <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <div>
                  <p className="text-xs font-medium text-red-600 dark:text-red-300">Connection failed</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{connectError}</p>
                </div>
              </div>
            )}

            <div className="space-y-2.5">
              {/* Instant identity — the zero-friction default */}
              <button
                onClick={handleInstant}
                disabled={provisioning}
                className="group w-full flex items-center gap-3 rounded-xl border-2 border-violet-500/60 bg-violet-500/[0.04] p-4 text-left transition-all hover:border-violet-500 hover:bg-violet-500/[0.08] disabled:opacity-60"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15">
                  {provisioning
                    ? <Loader2 className="w-5 h-5 animate-spin text-violet-600 dark:text-violet-300" />
                    : <Zap className="w-5 h-5 text-violet-600 dark:text-violet-300" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-white">
                    Instant identity
                    <span className="rounded-full bg-violet-500 px-2 py-0.5 text-[10px] font-semibold text-white">Recommended</span>
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5 dark:text-slate-400">
                    {provisioning ? 'Creating your Canton identity on DevNet…' : 'New here? We create your Canton identity in seconds — nothing to install.'}
                  </p>
                </div>
              </button>

              {/* Hosted wallet / browser extensions */}
              <div className="w-full rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                    <Wallet className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-950 dark:text-white">Canton wallet</p>
                    <p className="text-xs text-slate-600 mt-0.5 dark:text-slate-400">Requires an existing wallet account — you approve the connection in the wallet</p>
                  </div>
                  <WalletConnect
                    onConnect={handleWalletConnected}
                    onDisconnect={disconnect}
                    isConnected={false}
                    triggerClassName="shrink-0"
                  />
                </div>
                <p className="mt-2.5 border-t border-slate-100 pt-2.5 text-[11px] leading-relaxed text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  Don't have one? Create a free account on the{' '}
                  <a href="https://wallet.validator.devnet.sandbox.fivenorth.io" target="_blank" rel="noreferrer" className="font-medium text-violet-600 hover:underline dark:text-violet-300">
                    hosted Canton DevNet wallet
                  </a>{' '}
                  first, then connect here. CIP-103 browser extensions are detected automatically if installed — none are widely released yet, so most users should use <span className="font-medium text-slate-700 dark:text-slate-300">Instant identity</span> above.
                </p>
              </div>

              {/* Seaport party (developers) */}
              <button
                onClick={() => setModal('paste')}
                className="w-full flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-left transition-all hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                  <ExternalLink className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-950 dark:text-white">I have a party ID</p>
                  <p className="text-xs text-slate-600 mt-0.5 dark:text-slate-400">Reconnect an identity you created before — here or on Seaport</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2: how will you use the app? ─────────────────────────────────── */}
      {modal === 'role' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-1 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <h3 className="text-base font-semibold text-slate-950 dark:text-white">Connected — one more thing</h3>
            </div>
            <p className="mb-4 text-xs text-slate-600 dark:text-slate-400">
              How will you use InvoPlus? This picks which dashboard you see — you can switch anytime.
            </p>

            <div className="mb-4">
              <label className="mb-1.5 block text-xs text-slate-600 dark:text-slate-400">Company / display name</label>
              <input
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                placeholder="e.g. Acme Traders Ltd"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-violet-500/60 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
              />
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">Labels your account across InvoPlus's own dashboard and notifications. Listings on the ledger itself still identify you by Canton party ID — that's not editable, it's your on-chain identity.</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => chooseRole('business')}
                disabled={!orgName.trim()}
                className="group w-full flex items-start gap-3 rounded-xl border-2 border-slate-200 p-4 text-left transition-all hover:border-violet-500 hover:bg-violet-500/[0.04] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-transparent dark:border-slate-700 dark:hover:border-violet-500"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10">
                  <Building2 className="w-5 h-5 text-violet-600 dark:text-violet-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-950 dark:text-white">I'm a business</p>
                  <p className="text-xs text-slate-600 mt-0.5 dark:text-slate-400">I have unpaid invoices and want to turn them into cash now</p>
                </div>
              </button>

              <button
                onClick={() => chooseRole('financier')}
                disabled={!orgName.trim()}
                className="group w-full flex items-start gap-3 rounded-xl border-2 border-slate-200 p-4 text-left transition-all hover:border-violet-500 hover:bg-violet-500/[0.04] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-transparent dark:border-slate-700 dark:hover:border-violet-500"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10">
                  <Landmark className="w-5 h-5 text-violet-600 dark:text-violet-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-950 dark:text-white">I'm a financier</p>
                  <p className="text-xs text-slate-600 mt-0.5 dark:text-slate-400">I want to fund invoices by bidding in sealed auctions and earn yield</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 3: done — show exactly what you're connected as ──────────────── */}
      {modal === 'done' && party && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl text-center dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15">
              <CheckCircle className="h-7 w-7 text-emerald-500" />
            </div>
            <h3 className="text-base font-semibold text-slate-950 dark:text-white">You're all set</h3>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              {party.type === 'business'
                ? 'Submit an invoice from the Invoices page and list it for financiers to bid on.'
                : 'Browse live auctions in the Marketplace and place your first sealed bid.'}
            </p>
            {party.type === 'financier' && (
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.08] p-4 text-left">
                <Wallet className="h-8 w-8 shrink-0 text-emerald-600 dark:text-emerald-300" />
                <p className="text-xs text-slate-700 dark:text-slate-300">
                  <span className="block font-data text-lg font-bold text-emerald-700 dark:text-emerald-300">$350,000 USD</span>
                  We've funded your account with a demo balance so you can start bidding right away — it moves for real on Canton when you win an auction.
                </p>
              </div>
            )}
            <div className="mt-4 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left dark:border-slate-700 dark:bg-slate-950">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">Connected as</p>
                <p className="text-sm font-medium text-slate-950 dark:text-white">{party.displayName} · <span className="capitalize text-violet-600 dark:text-violet-300">{party.type}</span></p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">Canton Party ID</p>
                <div className="flex items-center gap-1.5">
                  <p className="font-data flex-1 truncate text-xs text-slate-500 dark:text-slate-400">{party.id}</p>
                  <CopyBtn text={party.id} />
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Save this ID</span> — it's your account.
              You stay signed in on this browser; on another device, paste it under Connect → "I have a party ID" to pick up right where you left off.
            </p>
            <button
              onClick={() => {
                setModal('closed')
                // The label promises navigation — deliver it.
                router.push(party.type === 'business' ? '/dashboard/invoices' : '/dashboard/marketplace')
              }}
              className="mt-4 w-full rounded-xl bg-violet-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-600"
            >
              {party.type === 'business' ? 'Submit my first invoice' : 'Browse the marketplace'}
            </button>
          </div>
        </div>
      )}

      {/* ── Seaport party ID (developer path) ─────────────────────────────────── */}
      {modal === 'paste' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-semibold text-slate-950 dark:text-white">Reconnect with a party ID</h3>
                <p className="text-xs text-slate-600 mt-0.5 dark:text-slate-400">We'll verify it on the DevNet ledger before connecting</p>
              </div>
              <button onClick={() => setModal('connect')} className="text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 mb-5 text-xs text-slate-600 space-y-1.5 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
              <p className="font-semibold text-slate-950 mb-2 dark:text-white">Where's my party ID?</p>
              <p>· <span className="text-slate-950 dark:text-white">Created it here?</span> It was shown when you connected — also in your profile menu (top right) and Settings. Same ID reconnects you with all your invoices and bids intact.</p>
              <p>· <span className="text-slate-950 dark:text-white">Using Seaport?</span> Copy it from the party panel at app.devnet.seaport.to</p>
              <p className="mt-1 rounded bg-white px-2 py-1 font-mono text-slate-950 dark:bg-slate-900 dark:text-white">
                YourName::122057f3a8b2c4d1e6f9...
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-600 mb-1.5 block dark:text-slate-400">Canton Party ID</label>
                <div className="flex gap-2">
                  <input
                    value={pasteId}
                    onChange={e => { setPasteId(e.target.value); setValidateResult(null) }}
                    placeholder="YourName::122057f3a8b2c4..."
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950 placeholder:text-slate-400 outline-none focus:border-slate-400 font-mono dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
                  />
                  <button
                    onClick={handleValidate}
                    disabled={validating || !pasteId.trim()}
                    className="flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50 dark:bg-white dark:text-slate-950"
                  >
                    {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
                  </button>
                </div>
              </div>

              {validateResult && (
                <div className={cn(
                  'rounded-xl p-3 flex items-start gap-2.5 text-sm border',
                  validateResult.ok
                    ? 'border-emerald-500/30 bg-emerald-500/10'
                    : 'border-red-500/30 bg-red-500/10'
                )}>
                  {validateResult.ok
                    ? <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    : <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  }
                  <div>
                    {validateResult.ok ? (
                      <>
                        <p className="font-semibold text-slate-950 dark:text-white">Party verified on Canton DevNet</p>
                        <p className="text-xs text-slate-600 mt-0.5 dark:text-slate-400">Display name: <span className="text-slate-950 dark:text-white">{validateResult.displayName}</span></p>
                      </>
                    ) : (
                      <>
                        <p className="font-semibold text-slate-950 dark:text-white">Party not found</p>
                        <p className="text-xs text-slate-600 mt-0.5 dark:text-slate-400">{validateResult.error}</p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setModal('connect')}
                className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-600 transition-colors hover:text-slate-950 dark:border-slate-700 dark:text-slate-400 dark:hover:text-white"
              >
                Back
              </button>
              <button
                onClick={handlePasteConnect}
                disabled={!validateResult?.ok}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-950 py-3 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-40 dark:bg-white dark:text-slate-950"
              >
                <Wallet className="w-4 h-4" />
                Connect Party
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
