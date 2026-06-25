# CIP-103 Integration Guide

This document describes the CIP-103 (Canton dApp Standard) integration in InvoPlus.

## Overview

CIP-103 is a vendor-neutral standard that defines how decentralized applications (dApps) interact with the Canton Network via wallets. It decouples network connectivity and key management from applications, enabling users to connect with any CIP-103 compliant wallet.

## What's Been Implemented

### 1. CIP-103 Provider (`lib/cip103-provider.ts`)

A complete implementation of the CIP-103 specification including:

- **Provider API (EIP-1193 compatible)**: `request`, `on`, `emit`, `removeListener`
- **dApp API Methods**:
  - `connect` - Establish wallet connection
  - `disconnect` - Close wallet session
  - `isConnected` - Check connection status
  - `status` - Get provider/network status
  - `getActiveNetwork` - Get current network details
  - `listAccounts` - List available accounts
  - `getPrimaryAccount` - Get primary account
  - `signMessage` - Sign arbitrary messages
  - `prepareExecute` - Prepare, sign, and execute ledger commands
  - `ledgerApi` - Proxy requests to Ledger API

- **Events**:
  - `accountsChanged` - Account list changed
  - `statusChanged` - Connection status changed
  - `txChanged` - Transaction lifecycle events

- **Error Handling**: Full EIP-1474 error code support

### 2. Wallet Connection UI (`components/wallet-connect.tsx`)

A React component that provides:
- Wallet selection dialog (Splice, DFNS, Custom)
- Connection flow handling
- Loading states and error handling
- Integration with CIP-103 provider

### 3. Canton Context Integration (`lib/canton.tsx`)

Extended the existing Canton context to support:
- New `connectWithWallet` method for CIP-103 connections
- `walletProvider` state to track the active wallet
- Backward compatibility with existing connection methods

### 4. Dashboard Integration (`components/dashboard/Header.tsx`)

Added the WalletConnect component to the dashboard header, allowing users to:
- Connect via CIP-103 compliant wallets
- Use traditional methods (Seaport party ID, provisioned party)
- Switch between connection methods

### 5. Environment Configuration (`.env.local`)

Added environment variables for wallet configuration:
```bash
# CIP-103 Wallet Configuration
NEXT_PUBLIC_CANTON_NETWORK_ID=canton:da-devnet
NEXT_PUBLIC_WALLET_SPLICE_URL=https://wallet.splice.example.com
NEXT_PUBLIC_WALLET_DFNS_URL=https://gateway.canton.network
NEXT_PUBLIC_WALLET_CUSTOM_URL=https://your-wallet.example.com
```

## How to Use

### For Users

1. **Connect via CIP-103 Wallet**:
   - Click "Connect Canton Wallet" in the dashboard header
   - Select your preferred wallet (Splice, DFNS, or Custom)
   - Follow the wallet's authentication flow
   - Your wallet account will be connected to InvoPlus

2. **Traditional Methods Still Available**:
   - Use existing Seaport Party ID
   - Provision a new party via platform credentials

### For Developers

#### Using the CIP-103 Provider Directly

```typescript
import { Cip103Provider } from '@/lib/cip103-provider'

// Create provider instance
const provider = new Cip103Provider('https://your-wallet-url.com')

// Connect to wallet
const result = await provider.connect()

// Check if async flow (userUrl for login)
if ('userUrl' in result) {
  // Redirect user to wallet
  window.location.href = result.userUrl
}

// Use the provider
const account = await provider.request({ method: 'getPrimaryAccount' })
const network = await provider.request({ method: 'getActiveNetwork' })

// Sign a message
const signature = await provider.request({ 
  method: 'signMessage', 
  params: { message: 'Hello Canton' } 
})

// Execute a command
await provider.request({ 
  method: 'prepareExecute', 
  params: { /* command data */ } 
})
```

#### Listening to Events

```typescript
// Listen for account changes
provider.on('accountsChanged', (accounts) => {
  console.log('Accounts changed:', accounts)
})

// Listen for status changes
provider.on('statusChanged', (status) => {
  console.log('Status changed:', status)
})

// Listen for transaction events
provider.on('txChanged', (txEvent) => {
  console.log('Transaction event:', txEvent)
})

// Clean up listeners
provider.removeListener('accountsChanged', handler)
```

#### Using with Canton Context

```typescript
import { useCanton } from '@/lib/canton'

function MyComponent() {
  const { connectWithWallet, walletProvider } = useCanton()
  
  const handleWalletConnect = async (provider: Cip103Provider) => {
    await connectWithWallet(provider)
    // Now walletProvider is available in context
  }
  
  return <WalletConnect onConnect={handleWalletConnect} />
}
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    InvoPlus dApp                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │              Canton Context                       │  │
│  │  - connectWithWallet()                             │  │
│  │  - walletProvider state                           │  │
│  └───────────────────────────────────────────────────┘  │
│                          │                                │
│                          ▼                                │
│  ┌───────────────────────────────────────────────────┐  │
│  │           CIP-103 Provider                          │  │
│  │  - request() method routing                        │  │
│  │  - Event emission                                  │  │
│  │  - Error handling                                  │  │
│  └───────────────────────────────────────────────────┘  │
│                          │                                │
│                          ▼                                │
│  ┌───────────────────────────────────────────────────┐  │
│  │         CIP-103 Compliant Wallets                   │  │
│  │  - Splice Wallet                                   │  │
│  │  - DFNS Wallet Gateway                             │  │
│  │  - Custom Wallets                                  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Supported Wallets

### Splice Wallet
- Official Canton Network wallet
- URL: Configured via `NEXT_PUBLIC_WALLET_SPLICE_URL`
- Supports both sync and async dApp API

### DFNS Wallet Gateway
- Institutional-grade custody solution
- URL: Configured via `NEXT_PUBLIC_WALLET_DFNS_URL`
- Supports async dApp API with userUrl flows

### Custom Wallets
- Any CIP-103 compliant wallet
- URL: Configured via `NEXT_PUBLIC_WALLET_CUSTOM_URL`
- Must implement the full dApp API specification

## Testing

### Manual Testing

1. Start the dev server:
```bash
npm run dev
```

2. Navigate to the dashboard
3. Click "Connect Canton Wallet"
4. Select a wallet option
5. Verify the connection flow

### Testing with Real Wallets

To test with actual CIP-103 wallets:

1. **Splice Wallet**: Set up a Splice wallet instance and configure the URL
2. **DFNS Gateway**: Configure DFNS credentials and gateway URL
3. **Custom Wallet**: Implement or use an existing CIP-103 wallet

## Security Considerations

- All wallet connections use the CIP-103 standard for secure communication
- Private keys never leave the wallet
- User authorization is enforced by the wallet
- Session tokens are managed securely
- Ledger API requests are authenticated with wallet-provided tokens

## Future Enhancements

- Add support for more CIP-103 wallets as they become available
- Implement transaction signing for specific InvoPlus operations
- Add wallet-specific features (e.g., DFNS policy configuration)
- Improve error messaging and user feedback
- Add unit tests for the provider implementation

## References

- [CIP-103 Specification](https://github.com/canton-foundation/cips/blob/main/cip-0103/cip-0103.md)
- [Canton Wallet Interoperability Blog](https://www.canton.network/blog/scaling-canton-apps-with-a-standard-for-wallet-and-app-interoperability)
- [DFNS Canton Wallet Gateway](https://dfns.co/article/canton-wallet-gateway-support/)
- [Canton Developer Resources](https://www.canton.network/developer-resources)

## Troubleshooting

### Wallet Connection Fails

1. Check that the wallet URL is correctly configured in `.env.local`
2. Verify the wallet is CIP-103 compliant
3. Check browser console for error messages
4. Ensure the wallet is running and accessible

### Account Not Found

1. Verify the wallet has at least one account configured
2. Check that the account is allocated on the network
3. Ensure the network ID matches the wallet's network

### Transaction Signing Fails

1. Check that the user has approved the transaction in the wallet
2. Verify the command format is correct
3. Check wallet logs for signing errors

## Support

For issues or questions about CIP-103 integration:
- Check the [Canton Network documentation](https://www.canton.network/developer-resources)
- Review the [CIP-103 specification](https://github.com/canton-foundation/cips/blob/main/cip-0103/cip-0103.md)
- Contact wallet providers for wallet-specific issues
