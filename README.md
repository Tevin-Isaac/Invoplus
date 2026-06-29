<div align="center">

# Invoplus

**Private invoice financing on Canton.**

Businesses turn unpaid invoices into cash today instead of waiting 30, 60, or 90 days, while financiers compete to fund them in sealed bid auctions where no one can see anyone else's offer. The winning bid pays the seller early at an advance rate, and when the invoice is later paid, the financier earns the spread. Privacy, atomic settlement, and protection against financing the same invoice twice are all enforced by the ledger itself.

[Overview](#overview) · [How it works](#how-it-works) · [Why Canton](#why-canton) · [Architecture](#architecture) · [Getting started](#getting-started) · [Deploy](#deploy-the-daml-package-seaport) · [Status](#project-status)

</div>

---

## Overview

Invoice financing is a real need: a business is owed money on an invoice but cannot wait months to be paid, so it sells the right to that payment to a financier in exchange for cash now, at a discount. The hard parts are trust and privacy. Financiers do not want to reveal what they would pay, sellers do not want their bids leaked, and nobody wants the same invoice quietly financed twice.

Invoplus puts that whole flow on Canton, where the ledger enforces the rules instead of a middleman. Bids stay sealed because the contract model physically prevents the seller and rival financiers from seeing them. Funding and transfer settle in a single atomic transaction, so there is no moment where one side is exposed. And an onchain registry records each financed invoice so it cannot be listed again.

## How it works

1. **A business lists an invoice.** It uploads an unpaid invoice, which is risk scored and graded A through D by a deterministic scoring engine.
2. **Financiers bid privately.** Each financier submits a sealed bid, an advance rate and an annual rate. Bids are visible only to the bidder and the platform, never to the seller or other financiers.
3. **The best bid funds the seller.** When the auction settles, the winning bid pays the seller early at the agreed advance rate, in one atomic Canton transaction.
4. **The debtor repays, the financier earns.** When the invoice is paid at maturity, the financier collects the principal plus the spread.

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

Smart contracts spanning eight modules, roughly 18 templates and 36 choices, covering the full lifecycle:

| Module | Responsibility |
| --- | --- |
| `Types` | Shared records, enums, and helpers |
| `Invoice` | Invoice contract, the sealed-bid `Auction`, `SealedBid`, and `FundedInvoice` |
| `Registry` | Anti double-finance registry entries |
| `Platform` | Platform party, verification, and settlement orchestration |
| `Financier` | Financier-side actions and bid handling |
| `Repayment` | Repayment and yield at maturity |
| `Setup` | Demo scenarios for end-to-end walkthroughs |
| `Auth` | `UserCredential` and `SessionToken` for account auth |

### Frontend

A dark, branded dashboard built with Next.js 14.2.5, React, TypeScript, and Tailwind. Recharts for analytics, a monospace ledger readout in the header showing the live Canton block height, and pages for invoices, the auction marketplace, offers, portfolio, and analytics that read live contract data from the ledger.

### Backend and auth

Route handlers wrap the Canton JSON Ledger API through a small server module (`lib/canton-server.ts`: `submitAndWait`, `queryACS`, `allocateParty`, token handling). Authentication is Canton-native: registration allocates the user a party and writes a `UserCredential` contract, login verifies a bcrypt hash and issues a JWT in an httpOnly cookie while recording a `SessionToken` on the ledger. A deterministic risk engine (`lib/risk-engine.ts`) scores invoices with no external calls.

## Tech stack

- **Ledger:** Canton (DevNet), Daml smart contracts, built and deployed via Seaport
- **Web:** Next.js 14, React, TypeScript, Tailwind CSS
- **Charts and UI:** Recharts, lucide-react, shadcn-style primitives
- **Auth:** bcrypt, JWT, httpOnly cookies, Canton-backed sessions
- **Wallet:** CIP-103 wallet connect, plus Seaport party id and M2M party provisioning

## Project structure

```
app/
  dashboard/        Overview, invoices, marketplace, offers, portfolio, analytics
  login, register/  Auth pages
  api/
    canton/         Ledger status + contract routes (create, bid, settle, list, ...)
    auth/           register, login, logout, refresh, me
components/
  brand/Logo.tsx    Shared Invoplus mark
  dashboard/        Sidebar, Header (live ledger strip)
lib/
  canton-server.ts  Server-side Canton ledger access
  canton.tsx        Client connection context (wallet / party)
  auth.ts           Canton-backed auth (UserCredential, SessionToken)
  risk-engine.ts    Deterministic invoice scoring
daml/
  InvoPlus/         Daml modules (Invoice, Registry, Platform, Auth, ...)
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
```

### 3. Run

```bash
npm run dev
```

The app starts at `http://localhost:3000`. The dashboard and connection flow work immediately. Reading and writing contracts goes live once the Daml package is deployed and `INVOPLUS_PACKAGE_ID` is set.

## Deploy the Daml package (Seaport)

The Daml package builds on Seaport rather than locally:

1. Upload the `daml/` folder and `daml.yaml` to your Seaport project.
2. Click **Build** to compile the package.
3. **Deploy**, then copy the resulting package id into `INVOPLUS_PACKAGE_ID`.
4. Identify or allocate the platform party and set `CANTON_PLATFORM_PARTY`.
5. Set `AUTH_REQUIRED=true` to turn on the session gate and route protection.

Once these are set, the contract routes, live dashboard data, and authentication all activate against DevNet.

## Project status

This is an active hackathon build. Honest snapshot:

**Working**
- Daml contracts for the full lifecycle: list, sealed-bid auction, settle, fund, repay, registry
- Dashboard reading live data (invoices, portfolio, analytics) with connect and empty states
- Canton-native authentication: register, login, sessions, route protection (behind `AUTH_REQUIRED`)
- Connection via CIP-103 wallet, Seaport party id, or provisioned party

**In progress**
- Seaport build and deploy, after which auth and live contract reads go live on DevNet
- Wiring the marketplace and offers pages from demo data to live contracts
- End-to-end testing across the contract and auth routes once the package is deployed

## Acknowledgements

Built on [Canton](https://www.canton.network/) and deployed via [Seaport](https://app.devnet.seaport.to). Created for `[hackathon name]` by the Invoplus team.

---

<div align="center">
<sub>Invoplus · private invoice financing on Canton</sub>
</div>