'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Wallet, Loader2, ExternalLink } from 'lucide-react'
import type { Wallet as CantonAccount } from '@canton-network/core-wallet-dapp-rpc-client'

// FiveNorth's DevNet validator ships a Splice Wallet UI with every node — the
// same reference wallet documented at docs.canton.network/overview/reference/
// splice-wallet-reference. Connecting to it directly means testers install
// nothing: no browser extension, no separate account, just the wallet that's
// already running as part of the Canton DevNet infrastructure InvoPlus itself
// talks to. This is the one wallet InvoPlus supports — see CIP103_INTEGRATION.md
// for why the alternatives (Splice Wallet Kernel extension, DFNS, third-party
// wallets) were ruled out.
const WALLET_GATEWAY_URL = 'https://wallet.validator.devnet.sandbox.fivenorth.io/api/v0/dapp'
const WALLET_UI_URL = 'https://wallet.validator.devnet.sandbox.fivenorth.io'

interface WalletConnectProps {
  onConnect?: (account: CantonAccount) => void
  onDisconnect?: () => void
  isConnected?: boolean
  triggerClassName?: string
  triggerLabel?: string
}

// Lazily loaded: the SDK touches browser storage at module-init time, which
// errors during Next.js's server-side prerendering if imported at the top level.
//
// Two adapters are registered:
// - RemoteAdapter: FiveNorth's hosted Splice Wallet (works with zero install)
// - ExtensionAdapter: discovers any CIP-103 Canton wallet browser extension
//   the user has installed (announced via postMessage, same pattern as
//   EIP-6963 on Ethereum)
// When more than one is detected, the SDK's built-in picker opens on
// connect() and lets the user choose; otherwise it connects to the one
// available wallet directly.
let initialized = false
async function getDappSdk() {
  const mod = await import('@canton-network/dapp-sdk')
  if (!initialized) {
    await mod.init({
      defaultAdapters: [
        new mod.RemoteAdapter({
          rpcUrl: WALLET_GATEWAY_URL,
          providerId: 'fivenorth-splice-wallet',
          name: 'Canton DevNet Wallet',
        }),
        new mod.ExtensionAdapter({
          name: 'Browser Extension Wallet',
          description: 'A CIP-103 Canton wallet extension installed in this browser',
        }),
      ],
    })
    initialized = true
  }
  return mod
}

export function WalletConnect({ onConnect, onDisconnect, isConnected = false, triggerClassName, triggerLabel }: WalletConnectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConnect = async () => {
    setIsConnecting(true)
    setError(null)
    try {
      const { connect, listAccounts } = await getDappSdk()
      const result = await connect()
      if (!result.isConnected) {
        throw new Error(result.reason ?? 'Connection was declined in the wallet')
      }
      const accounts = await listAccounts()
      const account = accounts[0]
      if (!account) {
        throw new Error('No account found — create a party in the wallet first')
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
      const { disconnect } = await getDappSdk()
      await disconnect()
    } catch { /* ignore */ }
    onDisconnect?.()
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={isConnected ? 'outline' : 'default'} className={triggerClassName}>
          <Wallet className="mr-2 h-4 w-4" />
          {triggerLabel ?? (isConnected ? 'Connected' : 'Connect')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Canton DevNet Wallet</DialogTitle>
          <DialogDescription>
            {isConnected
              ? 'Your wallet is connected. You can disconnect below.'
              : 'Connects to the hosted DevNet wallet (no install), or any Canton wallet extension in your browser.'}
          </DialogDescription>
        </DialogHeader>

        {!isConnected ? (
          <div className="py-2 space-y-4">
            {error && <p className="text-sm text-red-400">{error}</p>}

            <Button onClick={handleConnect} disabled={isConnecting} className="w-full">
              {isConnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
              {isConnecting ? 'Waiting for approval…' : 'Connect'}
            </Button>

            <a
              href={WALLET_UI_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              Open the wallet directly
              <ExternalLink className="h-3 w-3" />
            </a>
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
