# InvoPlus — Private Invoice Financing Marketplace on Canton Network

> Built for the **Build on Canton Hackathon** · Track: Private DeFi & Capital Markets

---

## What Is InvoPlus?

InvoPlus is a two-sided marketplace where businesses turn unpaid invoices into instant cash — and financiers earn yield by funding those invoices through a **sealed-bid auction**.

**The problem it solves:**
A business delivers $125,000 worth of goods to a client. The client has 90 days to pay. The business needs that cash now. Traditional invoice financing takes weeks, charges 12–18% APR, and exposes bids to all parties. InvoPlus does it in seconds, at 8–11% APR, with complete bid privacy — all enforced by Canton Network's blockchain.

---

## How It Actually Works (Step by Step)

```
Business uploads invoice PDF
        ↓
Claude AI (Anthropic) reads the invoice, verifies it's real,
scores the credit risk 0-100, assigns grade A/B/C/D
        ↓
AI score is written permanently into a Daml InvoiceContract
on Canton Network (tamper-proof, on-chain)
        ↓
Business lists the invoice for a sealed-bid auction
(sets minimum advance rate e.g. 80%, auction runs 24-72 hours)
        ↓
Multiple financiers submit SealedBid contracts on Canton
— Canton's privacy model means financiers CANNOT see each other's bids
— the seller also cannot see bid amounts while the auction is live
        ↓
Auction closes → InvoPlus platform reveals all bids
→ highest advance rate wins
→ FundedInvoice contract created: both parties sign atomically
→ Cash transferred in 3.2 seconds
        ↓
When debtor pays the business 90 days later,
business repays financier: principal + agreed yield
```

---

## Why Canton Network?

Canton is the only blockchain that makes this privacy model work. Two specific features:

**1. Sub-transaction privacy (sealed bids)**
In a `SealedBid` Daml contract, only the bidding financier and InvoPlus platform are signatories/observers. The seller is deliberately NOT an observer. This means the seller's wallet literally cannot see bid amounts — enforced at the cryptographic ledger level, not just by UI logic. Competing financiers also cannot see each other's bids.

**2. Atomic settlement**
When InvoPlus exercises `SettleAuction`, all state changes happen in a single atomic transaction: the winning bid is archived, losing bids are archived (their contents stay private forever), and the `FundedInvoice` contract is created with both parties as signatories. Either everything succeeds or nothing does. No partial fills, no failed transfers.

**3. Anti-fraud registry**
A `RegistryEntry` contract is created on-chain when an invoice is listed. As long as this entry exists, the same invoice cannot be listed again by the same or different seller. This prevents double-financing fraud — a major problem in traditional invoice financing.

---

## Where AI (Claude) Fits In

AI is the **trust engine** that makes the auction valuable. Without AI scoring:
- Financiers don't know if an invoice is real or forged
- Financiers don't know if the debtor is likely to pay
- No rational financier would bid on an unverified invoice

**What Claude does when an invoice is uploaded:**
1. Reads the invoice text/data
2. Extracts structured fields (invoice number, debtor, amount, due date)
3. Assesses credit risk based on debtor profile and invoice terms
4. Returns a **risk score (0–100)** and **grade (A/B/C/D)**
5. Lists positive factors, risk factors, and any fraud flags
6. Explains its reasoning in plain English

This score is then passed to the Daml `InvoiceContract.VerifyInvoice` choice and recorded permanently on the Canton ledger. Financiers can trust the score because it came from a neutral AI and is on-chain — no one can tamper with it after the fact.

**Model used:** `claude-haiku-4-5-20251001` (fast, cheap, accurate for document analysis)

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Smart contracts | **Daml** on Canton Network | Invoice lifecycle, sealed bids, settlement, anti-fraud |
| Blockchain | **Canton DevNet** (FiveNorth validator) | Privacy, atomicity, immutable ledger |
| AI scoring | **Claude API** (Anthropic) | Invoice verification and risk grading |
| Frontend | **Next.js 14** (App Router) | Seller + financier dashboard |
| Canton SDK | **@c7-digital/ledger** | TypeScript client for Canton JSON Ledger API v2 |
| Styling | **Tailwind CSS** + shadcn/ui | UI components |
| Charts | **Recharts** | Analytics dashboard |
| IDE/Deploy | **Seaport** (app.devnet.seaport.to) | Write, build, and deploy Daml to Canton |

---

## Project Structure

```
InvoPlus/
├── app/
│   ├── api/
│   │   ├── ai/
│   │   │   └── score-invoice/     ← Claude AI scoring endpoint
│   │   └── canton/
│   │       ├── ledger-status/     ← Live Canton block + package count
│   │       ├── provision-party/   ← Allocate real Canton party on DevNet
│   │       ├── acs/               ← Query Active Contract Set
│   │       ├── ws-config/         ← WebSocket auth for real-time streaming
│   │       └── users/             ← List ledger participants
│   └── dashboard/
│       ├── page.tsx               ← Overview (stats, recent invoices, live feed)
│       ├── invoices/              ← Upload + AI scoring + invoice management
│       ├── marketplace/           ← Browse auctions, submit sealed bids
│       ├── offers/                ← Financier's bid history
│       ├── portfolio/             ← Funded positions + yield tracking
│       ├── analytics/             ← Charts: volume, rates, grade distribution
│       └── settings/              ← Party ID, Canton status, notifications
├── daml/
│   └── InvoPlus/
│       ├── Types.daml             ← Shared types: RiskGrade, InvoiceStatus, etc.
│       ├── Registry.daml          ← Anti-fraud double-financing registry
│       ├── Invoice.daml           ← Full lifecycle: Invoice → Auction → SealedBid → FundedInvoice
│       └── Setup.daml             ← Daml Script to bootstrap demo on Canton DevNet
├── lib/
│   ├── canton-server.ts           ← Server-side Canton API client (@c7-digital/ledger)
│   ├── canton.tsx                 ← Client-side Canton context (party, wallet, ledger status)
│   └── utils.ts                   ← Helpers
├── public/
│   ├── landing.html               ← Landing page (Framer export, served via middleware)
│   ├── invoplus.png               ← Logo
│   └── *.svg                      ← All landing page illustrations
├── daml.yaml                      ← Daml project config (SDK 2.9.4)
└── .env.local                     ← Credentials (gitignored)
```

---

## Daml Smart Contracts

The backend is entirely Daml contracts on Canton. Here is the full lifecycle:

### InvoiceContract
```
signatory: seller
observer: platform

Choices:
  VerifyInvoice (platform) → sets AI score + grade, marks Verified
  RejectInvoice (platform) → marks Rejected
  ListForAuction (seller)  → creates Auction + RegistryEntry atomically
```

### Auction
```
signatory: seller
observer: platform

Choices:
  SubmitBid (any financier) → creates SealedBid (seller cannot see it)
  SettleAuction (platform)  → picks winner, creates FundedInvoice, archives all bids
  CancelAuction (seller)    → returns invoice to Verified state
```

### SealedBid ← THE KEY PRIVACY CONTRACT
```
signatory: financier
observer: platform
(seller is NOT an observer — cannot see bid amounts)

Choices:
  RevealBid (platform)   → adds seller as observer (called during settlement only)
  WithdrawBid (financier) → financier pulls out before auction ends
```

### FundedInvoice
```
signatory: seller AND financier (both must agree — atomic)
observer: platform

Choices:
  RepayFinancier (seller) → triggered when debtor pays
  MarkDefault (platform)  → for dispute resolution
```

### RegistryEntry (anti-fraud)
```
signatory: platform
observer: seller

Created when invoice is listed.
Archived only when FundedInvoice is repaid.
Prevents any duplicate listing of same invoice.
```

---

## Canton DevNet Credentials

These are the shared hackathon validator credentials (sandbox only):

```
Ledger REST:  https://ledger-api.validator.devnet.sandbox.fivenorth.io/
Ledger WS:    wss://ledger-api.validator.devnet.sandbox.fivenorth.io
Auth URL:     https://auth.sandbox.fivenorth.io/application/o/token/
Client ID:    validator-devnet-m2m
Client Secret: r69FQmevLRwEgMB8NnKaSDHPewTOSx7Yy5jucsqAlmsAaJc3DlggedCz4tyyonl4W2WoOVzkUIjy8dHTlc16AOJQzx02QzJylAUG56oLTCoVCJUUK40vRv9CqQEY3fjn
```

Token expires every 8 hours. The app auto-refreshes it in `lib/canton-server.ts`.

---

## Setup & Running Locally

### 1. Install dependencies
```bash
npm install
```

### 2. Set environment variables
Create `.env.local` (already in `.gitignore`):
```env
CANTON_LEDGER_URL=https://ledger-api.validator.devnet.sandbox.fivenorth.io
CANTON_AUTH_URL=https://auth.sandbox.fivenorth.io/application/o/token/
CANTON_CLIENT_ID=validator-devnet-m2m
CANTON_CLIENT_SECRET=r69FQmevLRwEgMB8NnKaSDHPewTOSx7Yy5jucsqAlmsAaJc3DlggedCz4tyyonl4W2WoOVzkUIjy8dHTlc16AOJQzx02QzJylAUG56oLTCoVCJUUK40vRv9CqQEY3fjn
CANTON_WS_URL=wss://ledger-api.validator.devnet.sandbox.fivenorth.io
ANTHROPIC_API_KEY=your-anthropic-api-key-here
INVOPLUS_PACKAGE_ID=                          # filled after Seaport DAR deployment
```

### 3. Run the app
```bash
npm run dev
# → http://localhost:3000
```

Landing page is at `/`, dashboard is at `/dashboard`.

---

## Deploying the Daml Contracts via Seaport

The Daml code lives in `daml/InvoPlus/`. To deploy it to Canton DevNet:

1. Go to **https://app.devnet.seaport.to** and sign in
2. Create a **New Project**
3. Copy these files into the Seaport editor:
   - `daml/InvoPlus/Types.daml`
   - `daml/InvoPlus/Registry.daml`
   - `daml/InvoPlus/Invoice.daml`
   - `daml/InvoPlus/Setup.daml`
4. Update `daml.yaml` in the project
5. Click **Build** in the toolbar
6. Click **Deploy** → select **"5n sandbox"** validator (pre-configured for hackathon)
7. After deployment, right-click the `.dar` → **Copy Package ID**
8. Add it to `.env.local` as `INVOPLUS_PACKAGE_ID=<the-id>`

Once deployed, run the `Setup.daml` script from Seaport to create demo parties and run a full end-to-end auction.

---

## How to Demo

**As a Business (Seller):**
1. Open `/dashboard` → click **Connect Canton Wallet** → choose **Business / Seller**
2. A real Canton party is provisioned on DevNet (you'll see a real party ID)
3. Go to **Invoices** → click upload zone → enter invoice details → click **Score with Claude AI**
4. Claude analyzes the invoice and returns a risk score, grade, positive/risk factors
5. Click **List for Auction** to create an Auction contract on Canton

**As a Financier:**
1. Connect wallet as **Financier / Buyer**
2. Go to **Marketplace** → browse live auctions with AI scores and grades
3. Click **Place Bid** → set advance rate + annual rate → submit sealed bid
4. Your bid is a private `SealedBid` contract on Canton — the seller cannot see it
5. After auction ends, check **My Offers** to see if you won

---

## Why This Wins the Hackathon

| Judging Criterion | Our Answer |
|---|---|
| **Uses Canton's unique capabilities** | Sub-transaction privacy for sealed bids — impossible on Ethereum or Solana |
| **Real-world use case** | Invoice financing is a $3T global market. Businesses genuinely need this. |
| **AI integration** | Claude verifies every invoice and scores risk — the trust layer for financiers |
| **Working demo** | Live on Canton DevNet with real party provisioning and block tracking |
| **Technical depth** | Full Daml contract lifecycle (5 templates, 10+ choices), @c7-digital/ledger SDK, ACS queries |
| **Business model** | Platform takes 1% fee on funded invoices — aligns with Canton Coin rewards |

---

## Team

- **Tevin Isaac** — Frontend, Canton integration, architecture
- **[Partner name]** — [Partner role]

Built at the **Build on Canton Hackathon** · Prize pool: $7,000
