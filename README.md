<div align="center">

# Invoplus

**Private invoice financing on Canton.**

Live at **[www.invoplus.xyz](https://www.invoplus.xyz)** — connected to the real Canton DevNet ledger, not a demo/mocked backend.

Businesses turn unpaid invoices into cash today instead of waiting 30, 60, or 90 days, while financiers compete to fund them in sealed bid auctions where no one can see anyone else's offer. The winning bid pays the seller early at an advance rate, and when the invoice is later paid, the financier earns the spread. Privacy, atomic settlement, and protection against financing the same invoice twice are all enforced by the ledger itself — and real value moves for both legs, not just contract state.

[Overview](#overview) · [How it works](#how-it-works) · [Business model](#business-model) · [Why Canton](#why-canton) · [Architecture](#architecture) · [Getting started](#getting-started) · [Deploy](#deploy-the-daml-package) · [Status](#project-status)

</div>

---

## Overview

Invoice financing is a real need: a business is owed money on an invoice but cannot wait months to be paid, so it sells the right to that payment to a financier in exchange for cash now, at a discount. The hard parts are trust and privacy. Financiers do not want to reveal what they would pay, sellers do not want their bids leaked, and nobody wants the same invoice quietly financed twice.

Invoplus puts that whole flow on Canton, where the ledger enforces the rules instead of a middleman. Bids stay sealed because the contract model physically prevents the seller and rival financiers from seeing them. Funding and transfer settle in a single atomic transaction, so there is no moment where one side is exposed. And an onchain registry records each financed invoice so it cannot be listed again.

## How it works

1. **A business lists an invoice.** It uploads an unpaid invoice, which is risk scored and graded A through D by a deterministic scoring engine. Hovering any grade badge in the marketplace shows the score threshold and typical advance range behind it.
2. **Financiers bid privately.** Each financier submits a sealed bid, an advance rate and an annual rate. Bids are visible only to the bidder and the platform, never to the seller or other financiers. Once a financier has bid, the card flips to "Bid placed" — no double bids.
3. **The best bid funds the seller.** When the auction settles, the platform automatically accepts the best bid (highest advance rate, ties broken by lowest annual rate — the seller structurally *can't* pick a winner, since they can't see bid terms). The winning bid pays the seller early in one atomic Canton transaction, and a real balance transfer moves the funded amount from the financier to the seller as its own separate, verifiable Canton transaction.
4. **The debtor repays, the financier earns.** When the seller marks the invoice repaid, the financier is paid principal plus yield the same way: an atomic, on-ledger balance transfer, not just a status change. The completed position survives as a permanent `RepaymentConfirmation` record, so history never disappears from either party's view.

Every financier starts with a $350,000 USD demo balance, funded automatically when they confirm their role (instant identity or a pasted Seaport party). It's a platform-issued balance (`InvoPlus.Token:Balance`), not real Canton Coin/Amulet or USDC — deliberate, so funding never depends on an external DevNet faucet — but it's a real Daml contract that moves atomically like any other asset on the ledger. All invoices and balances are USD-only.

## Business model

InvoPlus earns real, on-ledger fee revenue on both sides of every transaction:

- **0.5% origination fee** on the seller's advance, taken at settlement
- **10% servicing fee** on the financier's yield, taken at repayment

Both come out of the money *after* the auction is won — the advance rate and yield rate agreed in the sealed-bid auction are never altered, so fees can't distort bidding. Total platform take is roughly **1.3% of face value**, versus 3–5% for traditional factoring. The servicing fee only exists when repayment happens, aligning the platform's incentive with the financiers'. Collected fees land in the platform's own `Balance` contract, and the Analytics page shows real revenue collected on-ledger alongside estimated lifetime revenue.

On mainnet, the demo token would be replaced by a regulated stablecoin and repayment would flow through a platform-controlled collection account (notification factoring), with a bank-confirmation oracle triggering the same platform-controlled `ApproveRepayment` Daml choice that exists today — the contract structure already supports it; only the trigger changes.

## Why Canton

The privacy and settlement guarantees are not application logic that could be bypassed, they are properties of the ledger:

- **Sealed bids stay sealed.** Each bid is a contract whose observers are the bidding financier and the platform only. The seller is not an observer, so the ledger does not let them see bid amounts.
- **Settlement is atomic.** Choosing the winner, funding the seller, and transferring the obligation happen in a single transaction. There is no in-between state to exploit.
- **No double financing.** A registry entry is created when an invoice is listed, which blocks the same invoice from being financed twice.

## Architecture

```
Next.js 14 (App Router)  ──►  Route handlers  ──►  Canton JSON Ledger API (DevNet)
   React + TypeScript          /api/canton/*        submitAndWait · queryACS
   Tailwind · Recharts         /api/auth/*          Daml contracts enforce the rules
```

### Daml (the source of truth)

Smart contracts spanning nine modules, 27 templates and 50 choices, covering the full lifecycle:

| Module | Responsibility |
| --- | --- |
| `Types` | Shared records, enums, and helpers |
| `Invoice` | Invoice contract, the sealed-bid `Auction`, `SealedBid`, and `FundedInvoice` |
| `Registry` | Anti double-finance registry entries |
| `Platform` | Platform party, verification, and settlement orchestration |
| `Financier` | Financier-side actions and bid handling |
| `Repayment` | Repayment and yield at maturity |
| `Token` | `Balance` — the platform-issued asset moved on settlement and repayment |
| `Setup` | Demo scenarios for end-to-end walkthroughs |
| `Auth` | Canton-native account auth: `UserCredential`, `SessionToken`, plus MFA/OAuth/API-token/audit-log templates scaffolded for later — only `UserCredential` and `SessionToken` are wired into the app today |

### Frontend

A dark, branded dashboard built with Next.js 14.2.5, React, TypeScript, and Tailwind. Pages: Overview (personal stats, cumulative funding chart, financier positions, live activity feed with copyable contract IDs), Invoices, Marketplace, My Offers, Analytics, and Settings — all reading live contract data from the ledger and polling every 15–30 seconds, so counterparty actions (a bid landing, an invoice getting funded or repaid) appear without a manual reload.

- **Marketplace and Analytics are public**: the auction floor, a "Recently Settled" showcase, and all traction numbers are platform-wide and visible without connecting — connecting is only required at the moment you actually transact. Sealed bids remain strictly private regardless.
- **Role-aware views**: My Offers shows a financier's bid book (sealed / won / lost / repaid) and a business's funding history from the same ledger records; Invoices is business-only, bidding is financier-only, each gated with a clear explanation rather than a silent failure.
- **Notifications** (per-identity, ledger-driven): new listings for financiers, bids received for sellers, balance changes with exact deltas, overdue repayments for both sides, and a repayment-received breakdown for financiers showing principal, net yield, and the exact platform fee taken.
- **AI assistant** (Claude-powered) in both the landing navbar and the dashboard header — answers product, privacy-model, and fee questions from a system prompt kept in sync with what's actually shipped, with markdown-rendered replies and per-identity conversation memory.
- Branded loading/page-transition animations, confirm dialogs (no native browser popups), a one-time cookie consent banner on the landing page, and full untruncated transaction/contract IDs with copy buttons everywhere results are shown — so judges can independently verify any transaction against the ledger API.

### Backend and auth

Route handlers wrap the Canton JSON Ledger API through a small server module (`lib/canton-server.ts`: `submitAndWait`, `queryACS`, `findBalanceContractId`, `ensurePlatformBalance`, `allocateParty`, token handling). Authentication is Canton-native: registration allocates the user a party and writes a `UserCredential` contract, login verifies a bcrypt hash and issues a JWT in an httpOnly cookie while recording a `SessionToken` on the ledger. A deterministic risk engine (`lib/risk-engine.ts`) scores invoices with no external calls.

The infrastructure is **self-healing** against the two recurring failure modes of a shared DevNet validator: a submission rejected for missing M2M `CanActAs` rights automatically re-grants and retries, and hitting the validator's shared 1000-user-rights cap automatically evicts the platform's own oldest grants to make room (safe, because any evicted party's rights are re-granted the moment they next transact). No manual intervention, no user-visible failure. Long-running routes (settle, repay — measured at 11–20s under real Canton latency) declare extended serverless timeouts, and both re-read balances from the ledger after transfers so responses report ground truth rather than trusting a submission result. A `platform-stats` route aggregates platform-wide traction (volume, repayments, revenue, parties) through the platform party's view for the public Analytics page.

## Tech stack

- **Ledger:** Canton (DevNet), Daml smart contracts, built and deployed via Seaport
- **Web:** Next.js 14, React, TypeScript, Tailwind CSS
- **Charts and UI:** Recharts, lucide-react, framer-motion, shadcn-style primitives
- **Auth:** bcrypt, JWT, httpOnly cookies, Canton-backed sessions
- **Identity:** instant party provisioning (M2M) and pasted Seaport party IDs. CIP-103 wallet-connect building blocks exist in the codebase (`lib/cip103-provider.ts`, `components/wallet-connect.tsx`) but the option is removed from the connect picker: the hosted DevNet wallet's gateway doesn't answer CORS preflights, so every browser-side attempt fails — an external issue, ready to re-enable when fixed
- **AI:** Claude (Anthropic) powers both invoice document extraction (reads an uploaded PDF/image and pre-fills the form — a real vision call; fields it can't confidently read come back null rather than guessed) and the in-app assistant chatbot

## Project structure

```
app/
  dashboard/        Overview, invoices, marketplace, offers, analytics, settings
  login, register/  Auth pages
  api/
    canton/         Contract routes (create, verify, list-auction, bid, settle,
                    repay, cancel, withdraw, balance, list), platform-stats,
                    provisioning, ledger status
    auth/           register, login, logout, refresh, me
    assistant/      Claude-powered assistant chat (streaming)
    extract-invoice/  Claude vision extraction of uploaded invoice documents
components/
  brand/            Logo, boot splash, LoadingScreen
  dashboard/        Sidebar, Header, AssistantChat, ConfirmDialog, CopyBtn,
                    PageTransition
  landing/          Hero (with nav), CookieConsent, Features, ...
lib/
  canton-server.ts  Server-side Canton ledger access (self-healing rights)
  canton.tsx        Client connection context (party, recents, reconnect)
  notifications.tsx Per-identity, ledger-driven notification watchers
  auth.ts           Canton-backed auth (UserCredential, SessionToken)
  risk-engine.ts    Deterministic invoice scoring
  utils.ts          Shared helpers incl. humanized Canton error messages
daml/
  InvoPlus/         Daml modules (Invoice, Registry, Platform, Token, Auth, ...)
  daml.yaml
```

## Getting started

### Prerequisites

- Node.js 18+
- A Canton DevNet validator and its M2M credentials (from the hackathon organizers)
- A [Seaport](https://app.devnet.seaport.to) account to build and deploy the Daml package

### 1. Install

```bash
npm install
```

### 2. Configure

Copy `.env.example` to `.env.local` and fill it in:

```bash
# Canton DevNet
CANTON_LEDGER_URL=...
CANTON_AUTH_URL=...
CANTON_CLIENT_ID=validator-devnet-m2m
CANTON_CLIENT_SECRET=...
CANTON_WS_URL=...

# Set after the Seaport deploy (see below)
INVOPLUS_PACKAGE_ID=
CANTON_PLATFORM_PARTY=

# Auth
JWT_SECRET=            # generate: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
AUTH_REQUIRED=false    # flip to true once the package is deployed and login works

# Optional — invoice document extraction (Claude reads an uploaded PDF/image
# and pre-fills the invoice form). Without this set, upload still works for
# hashing/attaching a document, it just doesn't pre-fill the form.
ANTHROPIC_API_KEY=
```

### 3. Run

```bash
npm run dev
```

The app starts at `http://localhost:3000`. The dashboard and connection flow work immediately. Reading and writing contracts goes live once the Daml package is deployed and `INVOPLUS_PACKAGE_ID` is set.

## Deploy the Daml package

The primary path is [Seaport](https://app.devnet.seaport.to):

1. Upload the `daml/` folder and `daml.yaml` to your Seaport project.
2. Click **Build** to compile the package.
3. **Deploy**, then copy the resulting package id into `INVOPLUS_PACKAGE_ID`.
4. Identify or allocate the platform party and set `CANTON_PLATFORM_PARTY`.
5. Set `AUTH_REQUIRED=true` to turn on the session gate and route protection.

There's also a direct path if you have the M2M credentials handy and a local Daml SDK matching `daml.yaml`'s `sdk-version`: `daml build`, then `POST {CANTON_LEDGER_URL}/v2/packages?vetAllPackages=true` with the built `.dar` as the raw request body (`Content-Type: application/octet-stream`) uploads and vets it directly — no Seaport UI needed. One gotcha either way: Canton rejects two different package hashes sharing the same `name`+`version` in `daml.yaml` (`KNOWN_PACKAGE_VERSION`), so bump `version` before rebuilding anything that touches a `.daml` file.

Once `INVOPLUS_PACKAGE_ID` is set, the contract routes, live dashboard data, and authentication all activate against DevNet.

## Project status

Deployed and live at [www.invoplus.xyz](https://www.invoplus.xyz), connected to the real Canton DevNet ledger. Built for the Canton Hackathon. Honest snapshot:

**Working, verified end-to-end against live DevNet (not mocked)**
- Full lifecycle: upload, risk-score, list for sealed-bid auction, bid, settle, fund, repay — every step is a real Daml choice, no demo data. Final pre-demo verification ran the whole flow with fresh parties and confirmed every number exact, including money conservation to the cent across all four balances (seller, two rival financiers, platform)
- Sealed-bid privacy verified live: each of two rival financiers sees only their own bid; the seller sees zero bid contents (but the correct bid count); the losing bid is rejected in its own transaction and its owner's balance is untouched
- Best-bid auto-selection verified: with competing 88% and 92% bids, the 92% bid won and funded the seller
- Anti-double-financing verified: relisting the same invoice is rejected by the on-ledger registry with a clear error
- Real value movement: settlement and repayment each move an actual `Balance` transfer on Canton as its own transaction; both fee hops (origination, servicing) land in the platform's own on-ledger balance; all transaction IDs shown full-length in the UI with copy buttons
- Platform revenue is real: the Analytics page's "Platform Balance" is the platform party's actual on-ledger `Balance`, accumulated purely from fees
- Analytics and Marketplace are public and real-time: platform-wide traction (lifetime volume financed, repayments, revenue, parties) and the live auction floor are visible to unconnected visitors and refresh automatically; verified live that a completely unrelated party sees another user's listing
- Invoice document upload: real SHA-256 hash of the actual file becomes the on-chain `docHash`, and Claude extracts and pre-fills invoice fields from the document (verified against real test invoices, including correctly telling the debtor apart from the seller and returning null rather than guessing when a field isn't present)
- Financiers are funded automatically ($350,000 USD demo balance) when they confirm their role, and every provisioned party ID is unique (verified by provisioning batches and diffing — the shared suffix on every party is the validator's fingerprint, by Canton design)
- Repaid history persists on both sides via `RepaymentConfirmation` (Daml archives the `FundedInvoice` at repayment — the app reads the surviving record so completed deals never vanish from Invoices, Offers, Dashboard, or Analytics)
- Ledger-driven notifications for both roles, including exact fee-deduction breakdowns for the financier — scoped so neither party ever sees the counterparty's financial details
- Canton-native authentication: register, login, sessions all work end-to-end — route protection exists behind the `AUTH_REQUIRED` flag but is currently **off** in production, so the dashboard is reachable without logging in (the separate "Connect a Canton party" step is still required to actually transact)
- The in-app Claude assistant answers product, fee, and privacy-model questions accurately (its knowledge is a maintained system prompt describing what's actually shipped)

**Known, disclosed limitations**
- The balance moved on settlement/repayment is a platform-issued demo asset (`InvoPlus.Token:Balance`), not real Canton Coin/Amulet or a regulated stablecoin — chosen deliberately so funding doesn't depend on an external DevNet faucet. The mainnet path (stablecoin + platform collection account + bank-confirmation oracle triggering the existing platform-controlled `ApproveRepayment` choice) is described under [Business model](#business-model)
- Repayment is currently self-attested by the seller ("Mark as Repaid" mints the debtor's payment) — the honest limit of any invoice platform whose debtors aren't on-chain; closed on mainnet by the collection-account flow above
- CIP-103 wallet connect is built but removed from the UI: the hosted DevNet wallet's gateway rejects browser CORS preflights (external issue, confirmed live) — re-enabled when their gateway is fixed
- Several `Auth` module templates (MFA, OAuth, API tokens, audit log) exist in Daml but aren't wired into any route yet — only `UserCredential`/`SessionToken` are live
- This is a permissioned DevNet sandbox with no public block explorer; transaction IDs shown in the UI are verifiable via the same Canton JSON Ledger API the app itself uses, not a third-party explorer

## Acknowledgements

Built on [Canton](https://www.canton.network/) and deployed via [Seaport](https://app.devnet.seaport.to). Built at the Canton Hackathon by Encode Club.

---

<div align="center">
<sub>Invoplus · private invoice financing on Canton</sub>
</div>