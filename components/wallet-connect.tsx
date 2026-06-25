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
      // Import the CIP-103 provider dynamically
      const { Cip103Provider } = await import('@/lib/cip103-provider')
      
      const wallet = wallets.find(w => w.id === walletId)
      if (!wallet) {
        throw new Error('Wallet not found')
      }

      // Create provider instance
      const provider = new Cip103Provider(wallet.url)

      // Attempt connection
      const result = await provider.connect()
      
      // Check if this is an async flow with userUrl
      if ('userUrl' in result) {
        // Redirect to wallet for authentication
        window.location.href = result.userUrl
        return
      }

      // If sync connection succeeded
      if (result.isConnected) {
        // Set up network configuration from environment
        const networkId = process.env.NEXT_PUBLIC_CANTON_NETWORK_ID || 'canton:da-devnet'
        const ledgerApi = process.env.NEXT_PUBLIC_CANTON_LEDGER_URL
        
        provider.setNetwork({
          networkId,
          ledgerApi,
        })

        // Set up a demo account (in production, this would come from the wallet)
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

        // Set up session
        provider.setSession({
          accessToken: 'demo_access_token',
          userId: `user_${Date.now()}`,
        })

        // Call the onConnect callback
        onConnect?.(provider)
        
        setIsOpen(false)
      }
    } catch (error) {
      console.error('Wallet connection failed:', error)
      // Show error to user (could add toast notification here)
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
        <Button variant={isConnected ? "outline" : "default"}>
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
          <div className="grid gap-4 py-4">
            {wallets.map((wallet) => (
              <button
                key={wallet.id}
                onClick={() => handleConnect(wallet.id)}
                disabled={isConnecting}
                className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-2xl">{wallet.icon}</span>
                <div className="text-left flex-1">
                  <div className="font-medium">{wallet.name}</div>
                  <div className="text-sm text-muted-foreground">{wallet.description}</div>
                </div>
                {isConnecting && selectedWallet === wallet.id && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="py-4">
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
