'use client'

import { useEffect, useState } from 'react'
import { Bell, Search, ChevronDown, Wallet, Building2, Landmark, X, Copy, Check, ExternalLink, Loader2, AlertTriangle, CheckCircle, Shield, Moon, Sun } from 'lucide-react'
import { useCanton } from '@/lib/canton'
import { cn } from '@/lib/utils'
import { WalletConnect } from '@/components/wallet-connect'

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="p-1 rounded hover:bg-white/10 text-dark-muted hover:text-white transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

export function Header({ title }: { title: string }) {
  const { isConnected, party, connect, connectWithPartyId, connectWithWallet, disconnect, isConnecting, ledgerStatus } = useCanton()
  const [modal, setModal] = useState<'closed' | 'choose' | 'paste'>('closed')

  // "paste party ID" form state
  const [pasteId, setPasteId] = useState('')
  const [role, setRole] = useState<'business' | 'financier'>('business')
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

  const openModal = () => { setModal('choose'); setValidateResult(null); setPasteId('') }

  const handleProvision = async (r: 'business' | 'financier') => {
    setModal('closed')
    await connect(r)
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

  const handleConnect = async () => {
    if (!validateResult?.ok || !pasteId.trim()) return
    setModal('closed')
    await connectWithPartyId(pasteId.trim(), validateResult.displayName ?? pasteId.split('::')[0], role)
  }

  return (
    <>
      <header className="h-16 shrink-0 flex items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95">
        <h1 className="text-lg font-semibold text-slate-950 dark:text-white">{title}</h1>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex w-52 items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            <Search className="w-4 h-4 shrink-0" />
            <span>Search invoices...</span>
          </div>

          {ledgerStatus?.ok ? (
            <div className="hidden md:flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-900">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-pulse" />
                <span className="font-data text-[11px] tracking-wider text-slate-600 uppercase dark:text-slate-400">DevNet</span>
              </span>
              <span className="w-px h-3 bg-slate-200 dark:bg-slate-700" />
              <span className="font-data text-[11px] text-slate-600 dark:text-slate-400">block <span className="text-slate-950 dark:text-white">{ledgerStatus.offset?.toLocaleString()}</span></span>
              {ledgerStatus.packageCount != null && (
                <span className="font-data text-[11px] text-slate-600 dark:text-slate-400">pkgs <span className="text-slate-950 dark:text-white">{ledgerStatus.packageCount}</span></span>
              )}
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-900">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
              <span className="font-data text-[11px] text-slate-600 dark:text-slate-400">DevNet offline</span>
            </div>
          )}

          <button className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 transition-colors hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800">
            <Bell className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-slate-500" />
          </button>

          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 transition-colors hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-slate-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {isConnected && party ? (
            <button
              onClick={disconnect}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950 transition-all hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
              title="Click to disconnect"
            >
              <Wallet className="w-4 h-4" />
              <span className="flex items-center gap-1.5 max-w-[140px] truncate">
                {party.displayName}
                <ChevronDown className="w-3 h-3 shrink-0" />
              </span>
            </button>
          ) : (
            <button
              onClick={openModal}
              disabled={isConnecting}
              className="flex items-center gap-2 rounded-xl border border-slate-950 bg-slate-950 px-4 py-2 text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-60 dark:border-white dark:bg-white dark:text-slate-950"
            >
              <Wallet className="w-4 h-4" />
              {isConnecting ? 'Connecting…' : 'Connect Canton Wallet'}
            </button>
          )}
        </div>
      </header>

      {/* ── Choose connection method ──────────────────────────────────────────── */}
      {modal === 'choose' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-semibold text-slate-950 dark:text-white">Connect to Canton DevNet</h3>
                <p className="text-xs text-slate-600 mt-0.5 dark:text-slate-400">Use your Seaport party or let us provision one</p>
              </div>
              <button onClick={() => setModal('closed')} className="text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-center mb-2">
                <WalletConnect 
                  onConnect={connectWithWallet}
                  onDisconnect={disconnect}
                  isConnected={isConnected}
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                <span className="text-xs text-slate-500 dark:text-slate-400">or use traditional methods</span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
              </div>

              <button
                onClick={() => setModal('paste')}
                className="w-full flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition-all hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:bg-slate-800"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                  <ExternalLink className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-950 dark:text-white">Use my Seaport Party ID</p>
                  <p className="text-xs text-slate-600 mt-0.5 dark:text-slate-400">Paste the party ID from your existing Canton wallet on Seaport IDE</p>
                </div>
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                <span className="text-xs text-slate-500 dark:text-slate-400">or</span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
              </div>

              <button
                onClick={() => handleProvision('business')}
                className="w-full flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-left transition-all hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                  <Building2 className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-950 dark:text-white">Business / Seller</p>
                  <p className="text-xs text-slate-600 mt-0.5 dark:text-slate-400">Provision a new party — upload invoices and receive financing</p>
                </div>
              </button>

              <button
                onClick={() => handleProvision('financier')}
                className="w-full flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-left transition-all hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                  <Landmark className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-950 dark:text-white">Financier / Buyer</p>
                  <p className="text-xs text-slate-600 mt-0.5 dark:text-slate-400">Provision a new party — browse auctions and submit sealed bids</p>
                </div>
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-4 text-center dark:text-slate-400">
              All parties live on Canton DevNet sandbox (fivenorth.io)
            </p>
          </div>
        </div>
      )}

      {/* ── Paste Seaport party ID ────────────────────────────────────────────── */}
      {modal === 'paste' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-semibold text-slate-950 dark:text-white">Connect Seaport Party</h3>
                <p className="text-xs text-slate-600 mt-0.5 dark:text-slate-400">Validate your Canton party on the DevNet ledger</p>
              </div>
              <button onClick={() => setModal('choose')} className="text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 mb-5 text-xs text-slate-600 space-y-1.5 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
              <p className="font-semibold text-slate-950 mb-2 dark:text-white">How to find your party ID on Seaport:</p>
              <p>1. Go to <span className="text-slate-950 dark:text-white">app.devnet.seaport.to</span> and sign in</p>
              <p>2. Open any Daml script or the party panel</p>
              <p>3. Copy the full party ID — looks like:</p>
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
                    ? 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50'
                    : 'border-slate-300 bg-slate-100 dark:border-slate-600 dark:bg-slate-800'
                )}>
                  {validateResult.ok
                    ? <CheckCircle className="w-4 h-4 text-slate-700 shrink-0 mt-0.5 dark:text-slate-300" />
                    : <AlertTriangle className="w-4 h-4 text-slate-700 shrink-0 mt-0.5 dark:text-slate-300" />
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

              {validateResult?.ok && (
                <div>
                  <label className="text-xs text-slate-600 mb-2 block dark:text-slate-400">Connect as</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['business', 'financier'] as const).map(r => (
                      <button
                        key={r}
                        onClick={() => setRole(r)}
                        className={cn(
                          'flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all',
                          role === r
                            ? 'border-slate-950 bg-slate-100 text-slate-950 dark:border-white dark:bg-slate-800 dark:text-white'
                            : 'border-slate-200 text-slate-600 hover:text-slate-950 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400 dark:hover:text-white'
                        )}
                      >
                        {r === 'business' ? <Building2 className="w-4 h-4" /> : <Landmark className="w-4 h-4" />}
                        {r === 'business' ? 'Business' : 'Financier'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setModal('choose')}
                className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-600 transition-colors hover:text-slate-950 dark:border-slate-700 dark:text-slate-400 dark:hover:text-white"
              >
                Back
              </button>
              <button
                onClick={handleConnect}
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
