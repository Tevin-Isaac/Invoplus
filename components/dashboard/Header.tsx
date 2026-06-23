'use client'

import { useState } from 'react'
import { Bell, Search, ChevronDown, Wallet, Building2, Landmark, X, Copy, Check, ExternalLink, Loader2, AlertTriangle, CheckCircle } from 'lucide-react'
import { useCanton } from '@/lib/canton'
import { cn } from '@/lib/utils'

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
  const { isConnected, party, connect, connectWithPartyId, disconnect, isConnecting, ledgerStatus } = useCanton()
  const [modal, setModal] = useState<'closed' | 'choose' | 'paste'>('closed')

  // "paste party ID" form state
  const [pasteId, setPasteId] = useState('')
  const [role, setRole] = useState<'business' | 'financier'>('business')
  const [validating, setValidating] = useState(false)
  const [validateResult, setValidateResult] = useState<{ ok: boolean; displayName?: string; error?: string } | null>(null)

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
      <header className="h-16 border-b border-dark-border bg-dark-bg/80 backdrop-blur-md flex items-center justify-between px-6 shrink-0">
        <h1 className="text-lg font-semibold text-white">{title}</h1>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 bg-dark-card border border-dark-border rounded-xl px-3 py-2 text-sm text-dark-muted w-52">
            <Search className="w-4 h-4 shrink-0" />
            <span>Search invoices...</span>
          </div>

          {ledgerStatus?.ok && (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-xs text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Block {ledgerStatus.offset?.toLocaleString()}
            </div>
          )}

          <button className="relative w-9 h-9 rounded-xl bg-dark-card border border-dark-border flex items-center justify-center hover:border-violet-500/30 transition-colors">
            <Bell className="w-4 h-4 text-dark-muted" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-violet-500" />
          </button>

          {isConnected && party ? (
            <div className="flex items-center gap-2">
              <button
                onClick={disconnect}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-violet-500/10 border border-violet-500/30 text-violet-300 hover:bg-violet-500/20 transition-all"
                title="Click to disconnect"
              >
                <Wallet className="w-4 h-4" />
                <span className="flex items-center gap-1.5 max-w-[140px] truncate">
                  {party.displayName}
                  <ChevronDown className="w-3 h-3 shrink-0" />
                </span>
              </button>
            </div>
          ) : (
            <button
              onClick={openModal}
              disabled={isConnecting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-violet-500 border border-violet-500 text-white hover:bg-violet-600 transition-all disabled:opacity-60"
            >
              <Wallet className="w-4 h-4" />
              {isConnecting ? 'Connecting…' : 'Connect Canton Wallet'}
            </button>
          )}
        </div>
      </header>

      {/* ── Choose connection method ──────────────────────────────────────────── */}
      {modal === 'choose' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-card border border-dark-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-semibold text-white">Connect to Canton DevNet</h3>
                <p className="text-xs text-dark-muted mt-0.5">Use your Seaport party or let us provision one</p>
              </div>
              <button onClick={() => setModal('closed')} className="text-dark-muted hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Use existing Seaport party */}
              <button
                onClick={() => setModal('paste')}
                className="w-full flex items-start gap-3 p-4 rounded-xl border border-violet-500/40 bg-violet-500/5 hover:bg-violet-500/10 transition-all text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0">
                  <ExternalLink className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Use my Seaport Party ID</p>
                  <p className="text-xs text-dark-muted mt-0.5">Paste the party ID from your existing Canton wallet on Seaport IDE</p>
                </div>
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-dark-border" />
                <span className="text-xs text-dark-muted">or</span>
                <div className="flex-1 h-px bg-dark-border" />
              </div>

              {/* Provision new party (business) */}
              <button
                onClick={() => handleProvision('business')}
                className="w-full flex items-start gap-3 p-4 rounded-xl border border-dark-border hover:border-violet-500/30 hover:bg-violet-500/[0.03] transition-all text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Business / Seller</p>
                  <p className="text-xs text-dark-muted mt-0.5">Provision a new party — upload invoices and receive financing</p>
                </div>
              </button>

              <button
                onClick={() => handleProvision('financier')}
                className="w-full flex items-start gap-3 p-4 rounded-xl border border-dark-border hover:border-emerald-500/30 hover:bg-emerald-500/[0.03] transition-all text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <Landmark className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Financier / Buyer</p>
                  <p className="text-xs text-dark-muted mt-0.5">Provision a new party — browse auctions and submit sealed bids</p>
                </div>
              </button>
            </div>

            <p className="text-xs text-dark-muted mt-4 text-center">
              All parties live on Canton DevNet sandbox (fivenorth.io)
            </p>
          </div>
        </div>
      )}

      {/* ── Paste Seaport party ID ────────────────────────────────────────────── */}
      {modal === 'paste' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-card border border-dark-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-semibold text-white">Connect Seaport Party</h3>
                <p className="text-xs text-dark-muted mt-0.5">Validate your Canton party on the DevNet ledger</p>
              </div>
              <button onClick={() => setModal('choose')} className="text-dark-muted hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* How to find party ID */}
            <div className="bg-dark-bg border border-dark-border rounded-xl p-4 mb-5 text-xs text-dark-muted space-y-1.5">
              <p className="font-semibold text-white mb-2">How to find your party ID on Seaport:</p>
              <p>1. Go to <span className="text-violet-400">app.devnet.seaport.to</span> and sign in</p>
              <p>2. Open any Daml script or the party panel</p>
              <p>3. Copy the full party ID — looks like:</p>
              <p className="font-mono text-violet-400 bg-dark-card px-2 py-1 rounded mt-1">
                YourName::122057f3a8b2c4d1e6f9...
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-dark-muted mb-1.5 block">Canton Party ID</label>
                <div className="flex gap-2">
                  <input
                    value={pasteId}
                    onChange={e => { setPasteId(e.target.value); setValidateResult(null) }}
                    placeholder="YourName::122057f3a8b2c4..."
                    className="flex-1 bg-dark-bg border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-dark-muted outline-none focus:border-violet-500/50 font-mono"
                  />
                  <button
                    onClick={handleValidate}
                    disabled={validating || !pasteId.trim()}
                    className="px-4 py-2.5 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2"
                  >
                    {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
                  </button>
                </div>
              </div>

              {/* Validation result */}
              {validateResult && (
                <div className={cn(
                  'rounded-xl p-3 flex items-start gap-2.5 text-sm',
                  validateResult.ok
                    ? 'bg-green-500/10 border border-green-500/30'
                    : 'bg-red-500/10 border border-red-500/30'
                )}>
                  {validateResult.ok
                    ? <CheckCircle className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                    : <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  }
                  <div>
                    {validateResult.ok ? (
                      <>
                        <p className="font-semibold text-green-400">Party verified on Canton DevNet</p>
                        <p className="text-xs text-dark-muted mt-0.5">Display name: <span className="text-white">{validateResult.displayName}</span></p>
                      </>
                    ) : (
                      <>
                        <p className="font-semibold text-red-400">Party not found</p>
                        <p className="text-xs text-dark-muted mt-0.5">{validateResult.error}</p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Role selection (shown after valid party) */}
              {validateResult?.ok && (
                <div>
                  <label className="text-xs text-dark-muted mb-2 block">Connect as</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['business', 'financier'] as const).map(r => (
                      <button
                        key={r}
                        onClick={() => setRole(r)}
                        className={cn(
                          'flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all',
                          role === r
                            ? 'bg-violet-500/15 border-violet-500/40 text-violet-300'
                            : 'border-dark-border text-dark-muted hover:text-white hover:border-violet-500/20'
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
                className="flex-1 border border-dark-border text-dark-muted hover:text-white py-3 rounded-xl text-sm font-medium transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleConnect}
                disabled={!validateResult?.ok}
                className="flex-1 bg-violet-500 hover:bg-violet-600 disabled:opacity-40 text-white py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
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
