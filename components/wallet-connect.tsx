'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Wallet, Loader2, ExternalLink, CheckCircle } from 'lucide-react'
import type { Wallet as ConsoleAccount } from '@console-wallet/dapp-sdk'

const INSTALL_URL = 'https://consolewallet.io'

// Lazy-loaded: the SDK touches browser storage (IndexedDB/localStorage) at
// module-init time, which errors noisily during Next.js's server-side
// prerendering. Importing it only inside client event handlers/effects
// keeps it out of the server module graph entirely.
const loadConsoleWallet = () => import('@console-wallet/dapp-sdk').then((m) => m.consoleWallet)

interface WalletConnectProps {
  onConnect?: (account: ConsoleAccount) => void
  onDisconnect?: () => void
  isConnected?: boolean
  triggerClassName?: string
  triggerLabel?: string
}

/**
 * Connects to Console Wallet — the only wallet InvoPlus integrates with.
 *
 * Why Console Wallet and not the other CIP-103 wallets in the ecosystem:
 *   - Splice Wallet Kernel (the "official" reference wallet) has no browser
 *     extension yet — it's explicitly unimplemented in its own repo, so there's
 *     nothing a tester could install today.
 *   - DFNS Wallet Gateway is institutional custody infrastructure — it requires
 *     a DFNS business account, not something a hackathon judge can set up in
 *     two minutes.
 *   - Console Wallet ships real Chrome/Firefox extensions, is self-custodial
 *     with passkey auth (no seed phrases), and its @console-wallet/dapp-sdk
 *     is a genuine CIP-103 implementation with explicit DevNet support
 *     (including a test-token faucet).
 */
export function WalletConnect({ onConnect, onDisconnect, isConnected = false, triggerClassName, triggerLabel }: WalletConnectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [installed, setInstalled] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setError(null)
    loadConsoleWallet()
      .then((consoleWallet) => consoleWallet.checkExtensionAvailability())
      .then((res) => setInstalled(res.status === 'installed'))
      .catch(() => setInstalled(false))
  }, [isOpen])

  const handleConnect = async () => {
    setIsConnecting(true)
    setError(null)
    try {
      const consoleWallet = await loadConsoleWallet()
      const result = await consoleWallet.connect({ name: 'InvoPlus' })
      if (!result.isConnected) {
        throw new Error(result.reason ?? 'Connection was declined in Console Wallet')
      }
      const account = await consoleWallet.getPrimaryAccount()
      if (!account) {
        throw new Error('No account found — create one in Console Wallet first')
      }
      onConnect?.(account)
      setIsOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connection failed')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      const consoleWallet = await loadConsoleWallet()
      await consoleWallet.disconnect()
    } catch { /* ignore */ }
    onDisconnect?.()
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={isConnected ? 'outline' : 'default'} className={triggerClassName}>
          <Wallet className="mr-2 h-4 w-4" />
          {triggerLabel ?? (isConnected ? 'Wallet Connected' : 'Connect Wallet')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Console Wallet</DialogTitle>
          <DialogDescription>
            {isConnected
              ? 'Your wallet is connected. You can disconnect below.'
              : 'InvoPlus connects to Canton DevNet through Console Wallet.'}
          </DialogDescription>
        </DialogHeader>

        {!isConnected ? (
          <div className="py-2 space-y-4">
            {installed === false && (
              <a
                href={INSTALL_URL}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-4 p-4 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] text-white hover:border-amber-500/50 transition-colors"
              >
                <ExternalLink className="h-5 w-5 shrink-0 text-amber-400" />
                <div className="text-left flex-1">
                  <div className="font-medium">Console Wallet not detected</div>
                  <div className="text-sm text-slate-400">Install the browser extension, then come back and connect</div>
                </div>
              </a>
            )}

            {installed === true && (
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <CheckCircle className="h-4 w-4" />
                Console Wallet detected
              </div>
            )}

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <Button
              onClick={handleConnect}
              disabled={isConnecting || installed === false}
              className="w-full"
            >
              {isConnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
              {isConnecting ? 'Waiting for approval…' : 'Connect Console Wallet'}
            </Button>
          </div>
        ) : (
          <div className="py-2">
            <Button onClick={handleDisconnect} variant="destructive" className="w-full">
              Disconnect Wallet
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
