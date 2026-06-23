# InvoPlus — Private Invoice Financing on Canton Network

**Build on Canton Hackathon** · Private DeFi & Capital Markets Track

InvoPlus is a two-sided marketplace where businesses sell outstanding invoices to financiers at a discount — entirely on Canton Network. Canton's sub-transaction privacy means financiers bid against each other without seeing competing offers. The anti-fraud registry prevents any invoice from being financed twice. Settlement is atomic.

---

## The Problem

Businesses with B2B invoices (e.g. a $125,000 invoice due in 90 days) often need cash now. Traditional invoice factoring goes through slow, opaque middlemen who charge 15–25%. Existing crypto DeFi protocols expose bid information publicly, enabling front-running and collusion.

## What InvoPlus Does

1. **Seller uploads an invoice** → InvoiceContract created on Canton ledger
2. **Platform verifies** → risk score computed (tenor, amount, currency, debtor profile) → score written permanently on-chain
3. **Seller lists for auction** → Auction + RegistryEntry created atomically (anti-double-finance)
4. **Financiers submit sealed bids** → SealedBid contract, seller cannot see it (Canton privacy)
5. **Platform settles** → single atomic Canton transaction: all losing bids archived, FundedInvoice created, registry deregistered
6. **Debtor pays → seller repays financier** → RepaymentRequest → RepaymentConfirmation (signed by both)

---

## Why Canton Specifically

| Feature | How InvoPlus uses it |
|---|---|
| Sub-transaction privacy | SealedBid has `observer platform` only — seller is NOT an observer — enforced by the ledger, not by application logic |
| Atomic multi-party transactions | SettleAuction archives all losing bids + creates FundedInvoice in ONE transaction — no partial state |
| Daml smart contracts | All lifecycle logic lives in Daml — platform cannot alter outcomes, only exercise choices Daml allows |
| Anti-fraud registry | RegistryEntry created at listing prevents double-financing — same invoice hash cannot exist twice |
| Real-time ledger | WebSocket connection to Canton DevNet shows live block numbers in the UI |

---

## Risk Scoring Engine (No External API)

InvoPlus uses a deterministic scoring engine (`lib/risk-engine.ts`) — no external dependencies:

- **Tenor** (days until due): shorter = lower risk
- **Invoice amount**: very large concentrations penalised
- **Currency**: major reserve currencies (USD/EUR/GBP) score higher
- **Debtor name**: registered legal entities (Ltd, Corp, GmbH) score higher
- **Invoice number format**: structured numbering indicates professionalism
- **Days until due**: invoices already past due are heavily penalised

Returns: score 0–100, grade A/B/C/D, recommended advance rate range, risk/positive factors.
The score is written on-chain when the platform calls `VerifyInvoice` — immutable after that.

---

## Daml Contract Architecture

### 7 Modules, 14 Templates, 20+ Choices

| Module | Templates |
|---|---|
| `InvoPlus.Types` | RiskGrade, InvoiceStatus, Money, AuctionTerms, BidResult |
| `InvoPlus.Registry` | RegistryEntry, RegistryLookupRequest |
| `InvoPlus.Invoice` | InvoiceContract, Auction, SealedBid, FundedInvoice |
| `InvoPlus.Platform` | PlatformConfig, SellerOnboarding, FeeReceipt, SettlementSummary |
| `InvoPlus.Financier` | FinancierProfile, BidHistory, CapitalAccount |
| `InvoPlus.Repayment` | RepaymentRequest, RepaymentConfirmation, DisputeCase, DefaultNotice, ExtensionRequest |
| `InvoPlus.Setup` | Daml Scripts: setupDemo, setupDisputeDemo |

### InvoiceContract — core lifecycle

```daml
template InvoiceContract
  with
    seller, platform : Party
    invoiceId, debtorName, debtorTaxId : Text
    faceAmount : Decimal; currency : Text
    issueDate, dueDate : Date
    docHash, invoiceHash : Text   -- SHA-256 for anti-fraud
    aiScore : Int; riskGrade : RiskGrade
    status : InvoiceStatus
  where
    signatory seller
    observer platform

    choice VerifyInvoice : ContractId InvoiceContract   -- controller platform
    choice RejectInvoice : ContractId InvoiceContract   -- controller platform
    choice ListForAuction : (ContractId Auction, ContractId RegistryEntry)  -- controller seller
```

### SealedBid — Canton privacy primitive

```daml
template SealedBid
  with
    financier, seller, platform : Party
    advanceRate, annualRate, fundedAmount : Decimal
    isRevealed : Bool
  where
    signatory financier
    observer platform
    -- seller intentionally NOT an observer — cannot see bid amounts

    choice RevealBid : ContractId SealedBid    -- controller platform
    choice WithdrawBid : ()                    -- controller financier
```

### Auction.SettleAuction — atomic settlement

```daml
    choice SettleAuction : ContractId FundedInvoice
      -- archives ALL losing bids (contents sealed forever)
      -- creates FundedInvoice signed by seller + financier
      -- removes RegistryEntry atomically
      -- all in ONE Canton transaction
```

### Repayment flow

```daml
-- Seller creates after collecting from debtor
template RepaymentRequest  (signatory seller; observer financier, platform)

-- Platform approves → completes → immutable confirmation
template RepaymentConfirmation  (signatory seller, financier)

-- Dispute arbitration by platform
template DisputeCase       (signatory platform; observer seller, financier)
  choice ReviewDispute, ResolveForSeller, ResolveForFinancier, EscalateDispute

-- When debtor misses payment
template DefaultNotice     (signatory platform; observer seller, financier)

-- Seller requests extra time; financier must approve
template ExtensionRequest  (signatory seller; observer financier)
  choice ApproveExtension, RejectExtension
```

---

## API Routes — 10 Canton Contract Endpoints

### Ledger Info

| Route | Description |
|---|---|
| `GET /api/canton/ledger-status` | Live block number, package count, network name |
| `POST /api/canton/provision-party` | Allocate a real Canton party on DevNet |
| `GET /api/canton/users` | List ledger participants |
| `POST /api/canton/acs` | Query Active Contract Set for any party |
| `GET /api/canton/ws-config` | WebSocket auth config for client-side connection |

### Contract Operations

| Route | Daml Choice |
|---|---|
| `POST /api/canton/contracts/create-invoice` | submitAndWait → create InvoiceContract |
| `POST /api/canton/contracts/verify-invoice` | InvoiceContract.VerifyInvoice |
| `POST /api/canton/contracts/list-auction` | InvoiceContract.ListForAuction |
| `POST /api/canton/contracts/submit-bid` | Auction.SubmitBid |
| `POST /api/canton/contracts/settle-auction` | Auction.SettleAuction |
| `POST /api/canton/contracts/cancel-auction` | Auction.CancelAuction |
| `POST /api/canton/contracts/repay` | Create RepaymentRequest |
| `POST /api/canton/contracts/withdraw-bid` | SealedBid.WithdrawBid |
| `POST /api/canton/contracts/list` | ACS query filtered by template type |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 App Router, TypeScript, Tailwind CSS |
| Charts | Recharts |
| Canton SDK | @c7-digital/ledger (TypedHttpClient for ledger end; raw fetch for contract ops) |
| Canton Auth | OIDC client_credentials flow, token cached 8h |
| Daml | SDK 2.9.4, target 2.1 |
| Risk Engine | Deterministic rule-based scoring (no external API) |

---

## Project Structure

```
invoplus/
├── app/
│   ├── api/canton/
│   │   ├── ledger-status/      ← live Canton connection check
│   │   ├── provision-party/    ← allocate real Canton party
│   │   ├── acs/                ← Active Contract Set query
│   │   ├── users/              ← ledger participant list
│   │   ├── ws-config/          ← WebSocket auth config
│   │   └── contracts/
│   │       ├── create-invoice/ ← submit InvoiceContract to Canton
│   │       ├── verify-invoice/ ← platform scores + writes to ledger
│   │       ├── list-auction/   ← list for sealed-bid auction (atomic)
│   │       ├── submit-bid/     ← financier places sealed bid
│   │       ├── settle-auction/ ← platform settles atomically
│   │       ├── cancel-auction/ ← seller cancels auction
│   │       ├── repay/          ← seller repays financier
│   │       ├── withdraw-bid/   ← financier withdraws bid
│   │       └── list/           ← ACS query by template type
│   └── dashboard/
│       ├── page.tsx            ← overview with live Canton block
│       ├── invoices/           ← submit invoices, risk score, list for auction
│       ├── marketplace/        ← browse auctions, place sealed bids
│       ├── offers/             ← my bids history, withdraw pending bids
│       ├── portfolio/          ← funded positions, FundedInvoice contracts
│       ├── analytics/          ← charts, Canton network stats
│       └── settings/           ← party ID, live ledger data, security info
├── daml/InvoPlus/
│   ├── Types.daml
│   ├── Registry.daml
│   ├── Invoice.daml
│   ├── Platform.daml
│   ├── Financier.daml
│   ├── Repayment.daml
│   └── Setup.daml
├── lib/
│   ├── canton-server.ts        ← all server-side Canton API calls
│   ├── canton.tsx              ← client-side Canton context
│   ├── risk-engine.ts          ← deterministic invoice risk scoring
│   └── utils.ts
└── daml.yaml
```

---

## Local Setup

```bash
npm install

# Create .env.local:
CANTON_LEDGER_URL=https://ledger-api.validator.devnet.sandbox.fivenorth.io
CANTON_AUTH_URL=https://auth.sandbox.fivenorth.io/application/o/token/
CANTON_CLIENT_ID=validator-devnet-m2m
CANTON_CLIENT_SECRET=<secret from hackathon>
CANTON_WS_URL=wss://ledger-api.validator.devnet.sandbox.fivenorth.io
INVOPLUS_PACKAGE_ID=   # set after Seaport deployment

npm run dev
# → http://localhost:3000
```

---

## Seaport Deployment (Daml → Canton)

1. Go to **https://app.devnet.seaport.to** and sign in
2. Create a new project called `invoplus`
3. Upload all files from the `daml/` folder + `daml.yaml`
4. Click **Build** → wait for compilation
5. Click **Deploy** → select **"5n sandbox"** validator
6. Copy the **Package ID** → paste into `.env.local` as `INVOPLUS_PACKAGE_ID=...`
7. Restart dev server — all contract routes are now live on Canton DevNet

### Run demo Daml script (optional)

```
daml script --dar invoplus-1.0.0.dar --script-name InvoPlus.Setup:setupDemo
```

Allocates 5 parties, runs full lifecycle: onboarding → invoice → auction → 2 sealed bids → settlement → repayment.

---

## Demo Walkthrough

### As a Business (Seller)

1. Dashboard → **Connect Canton Wallet** → Business / Seller
2. **Invoices** → New Invoice → fill debtor company, amount, due date
3. Risk score computed and written on-chain
4. Once verified → **List for Sealed-Bid Auction**

### As a Financier

1. Dashboard → **Connect Canton Wallet** → Financier / Buyer
2. **Marketplace** → see open auctions with risk grades and yield ranges
3. **Place Sealed Bid** → set advance rate and annual rate with sliders
4. Your bid is a private Canton contract — seller cannot see it
5. **My Offers** → view bid status, withdraw if needed
6. After settlement → **Portfolio** to see FundedInvoice position

---

## Why This Wins

| Criterion | InvoPlus |
|---|---|
| Canton-native | 6 Daml modules, 14 templates, 20+ choices — every action is a Canton contract |
| Privacy | SealedBid uses Canton sub-tx privacy to cryptographically prevent bid leakage — not a UI trick |
| Real use case | Invoice financing is a $3T market; Canton's atomic settlement solves a real trust problem |
| Complete product | Full lifecycle: onboarding → upload → score → auction → bid → settle → repay → dispute |
| Live on DevNet | All API routes connect to real Canton DevNet; block number shown live in every page header |

---

## Canton DevNet Credentials

```
Ledger REST:  https://ledger-api.validator.devnet.sandbox.fivenorth.io
WebSocket:    wss://ledger-api.validator.devnet.sandbox.fivenorth.io
Auth:         https://auth.sandbox.fivenorth.io/application/o/token/
Client ID:    validator-devnet-m2m
Seaport IDE:  https://app.devnet.seaport.to
```

Client secret is in `.env.local` (gitignored — never committed to git).
