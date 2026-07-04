# Wallet Integration

InvoPlus connects to Canton Network through **one** wallet: the Splice Wallet UI
built into the FiveNorth DevNet validator, via the official
`@canton-network/dapp-sdk` (CIP-103).

## Why only one wallet, and why this one

Three CIP-103-capable options exist in the ecosystem. We evaluated all three:

| Option | Verdict |
|---|---|
| **Splice Wallet Kernel** (reference implementation, `hyperledger-labs/splice-wallet-kernel`) | Its browser extension is explicitly marked "NOT IMPLEMENTED YET" in the repo. Nothing installable today. |
| **DFNS Wallet Gateway** | Institutional custody infrastructure — requires a DFNS business account. Too much friction for a hackathon demo or judge testing the app. |
| **FiveNorth's built-in Splice Wallet UI** (chosen) | Every Canton validator node ships a Splice Wallet UI (`docs.canton.network/overview/reference/splice-wallet-reference`). FiveNorth's is already live at `wallet.validator.devnet.sandbox.fivenorth.io` — the same validator InvoPlus already talks to for everything else. **No install, no separate account, nothing for a tester or judge to set up.** |

An earlier version of this integration offered three fake options (Splice/DFNS/Custom)
backed by a hand-rolled mock provider that fabricated a random party ID on every
"connect" — it never talked to a real wallet. That's been removed entirely.

## How it works

`components/wallet-connect.tsx` lazily imports `@canton-network/dapp-sdk` (kept
out of the top-level module graph — the SDK touches browser storage at
import time, which errors during Next.js's server-side prerendering
otherwise) and configures a single `RemoteAdapter` pointing at FiveNorth's
wallet gateway:

```typescript
const WALLET_GATEWAY_URL = 'https://wallet.validator.devnet.sandbox.fivenorth.io/api/v0/dapp'

await init({
  defaultAdapters: [
    new RemoteAdapter({
      rpcUrl: WALLET_GATEWAY_URL,
      providerId: 'fivenorth-splice-wallet',
      name: 'Canton DevNet Wallet',
    }),
  ],
})

const result = await connect()          // opens the wallet UI for approval
const accounts = await listAccounts()   // real, wallet-allocated partyId
```

`lib/canton.tsx`'s `connectWithWallet(account)` takes the resolved account
(`{ partyId, hint, ... }` — the real `Wallet` type from
`@canton-network/core-wallet-dapp-rpc-client`) and stores it as the active
Canton party for the session. From that point on, every contract-exercising
API route (`/api/canton/contracts/*`) uses that real `partyId` in `actAs`.

## Alternative connection path

`components/dashboard/Header.tsx` also offers "paste my Seaport Party ID" —
for anyone who already provisioned a party through the Seaport IDE and wants
to reuse it without going through wallet approval each time. Both paths
converge on the same `CantonParty` shape.

## References

- [Splice Wallet Reference (wallet UI)](https://docs.canton.network/overview/reference/splice-wallet-reference)
- [Wallet SDK Download](https://docs.canton.network/integrations/wallet/sdk-download)
- [Wallet SDK Configuration](https://docs.canton.network/integrations/wallet/configuration)
- [CIP-103 Specification](https://github.com/canton-foundation/cips/blob/main/cip-0103/cip-0103.md)
