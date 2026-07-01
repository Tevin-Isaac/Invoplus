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
import { Wallet, Loader2 } from 'lucide-react'

interface WalletConnectProps {
  onConnect?: (provider: any) => void
  onDisconnect?: () => void
  isConnected?: boolean
}

export function WalletConnect({ onConnect, onDisconnect, isConnected = false }: WalletConnectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null)

  const wallets = [
    {
      id: 'splice',
      name: 'Splice Wallet',
      description: 'Official Canton Network wallet',
      icon: '🔗',
      url: process.env.NEXT_PUBLIC_WALLET_SPLICE_URL,
    },
    {
      id: 'dfns',
      name: 'DFNS Wallet Gateway',
      description: 'Institutional-grade custody',
      icon: '🏦',
      url: process.env.NEXT_PUBLIC_WALLET_DFNS_URL,
    },
    {
      id: 'custom',
      name: 'Custom Wallet',
      description: 'Connect to any CIP-103 compliant wallet',
      icon: '⚙️',
      url: process.env.NEXT_PUBLIC_WALLET_CUSTOM_URL,
    },
  ]

  const handleConnect = async (walletId: string) => {
    setIsConnecting(true)
    setSelectedWallet(walletId)

    try {
      const { Cip103Provider } = await import('@/lib/cip103-provider')

      const wallet = wallets.find(w => w.id === walletId)
      if (!wallet) {
        throw new Error('Wallet not found')
      }

      const provider = new Cip103Provider(wallet.url)
      const result = await provider.connect()

      if ('userUrl' in result) {
        window.location.href = result.userUrl
        return
      }

      if (result.isConnected) {
        const networkId = process.env.NEXT_PUBLIC_CANTON_NETWORK_ID || 'canton:da-devnet'
        const ledgerApi = process.env.NEXT_PUBLIC_CANTON_LEDGER_URL

        provider.setNetwork({
          networkId,
          ledgerApi,
        })

        provider.setAccounts([
          {
            primary: true,
            partyId: `wallet_${walletId}_${Date.now()}`,
            status: 'allocated',
            hint: wallet.name,
            publicKey: 'demo_public_key',
            namespace: 'default',
            networkId,
            signingProviderId: walletId,
          },
        ])

        provider.setSession({
          accessToken: 'demo_access_token',
          userId: `user_${Date.now()}`,
        })

        onConnect?.(provider)
        setIsOpen(false)
      }
    } catch (error) {
      console.error('Wallet connection failed:', error)
    } finally {
      setIsConnecting(false)
      setSelectedWallet(null)
    }
  }

  const handleDisconnect = () => {
    onDisconnect?.()
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={isConnected ? 'outline' : 'default'}>
          <Wallet className="mr-2 h-4 w-4" />
          {isConnected ? 'Wallet Connected' : 'Connect Wallet'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Canton Wallet</DialogTitle>
          <DialogDescription>
            {isConnected
              ? 'Your wallet is connected. You can disconnect or switch to a different wallet.'
              : 'Select a CIP-103 compliant wallet to connect to the Canton Network.'
            }
          </DialogDescription>
        </DialogHeader>

        {!isConnected ? (
          <div className="grid gap-3 py-2">
            {wallets.map((wallet) => (
              <button
                key={wallet.id}
                onClick={() => handleConnect(wallet.id)}
                disabled={isConnecting}
                className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
              >
                <span className="text-2xl">{wallet.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-950 dark:text-white">{wallet.name}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">{wallet.description}</div>
                </div>
                {isConnecting && selectedWallet === wallet.id && (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-600 dark:text-slate-300" />
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="py-2">
            <Button
              onClick={handleDisconnect}
              variant="destructive"
              className="w-full"
            >
              Disconnect Wallet
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
