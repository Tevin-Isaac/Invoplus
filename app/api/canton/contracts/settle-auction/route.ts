/**
 * POST /api/canton/contracts/settle-auction
 *
 * Settles an auction — platform-only action. Two-phase to preserve privacy:
 *   1. Reject each losing SealedBid in its OWN transaction (choice: RejectBid,
 *      actAs platform only) — the seller is never a reader on these calls, so
 *      losing bid contents are witnessed only by financier + platform, never
 *      folded into the seller-visible settlement transaction.
 *   2. Exercise Auction.SettleAuction with just the winning bid — this
 *      internally calls SealedBid.SettleWin (controller seller+platform,
 *      authority satisfied via the Auction's own seller+platform signatories)
 *      to create the dual-signed FundedInvoice.
 *
 * If `winnerBidContractId` is omitted, the winner is picked automatically
 * (best advance rate for the seller, tie-broken by lowest annual rate) from
 * every open SealedBid matching `invoiceHash`. This is the real product
 * design: the seller can never see bid terms to "choose" a winner manually
 * — sealed-bid privacy means only the platform (as an impartial party) and
 * each bidding financier can read a bid's contents, so best-execution has
 * to happen here, not in a human's judgment call.
 *
 * Daml choices: InvoPlus.Invoice:SealedBid:RejectBid, InvoPlus.Invoice:Auction:SettleAuction
 */
import { NextResponse } from 'next/server'
import { submitAndWait, queryACS, findBalanceContractId, ensurePlatformBalance } from '@/lib/canton-server'
import { verifyAuthCookie, authRequired } from '@/lib/auth'

// InvoPlus's cut from the business side: a small origination fee on the
// seller's advance, taken at settlement — separate from the 10% servicing
// fee financiers pay on yield at repayment (complete-repayment/route.ts).
// Deliberately much smaller than the financier's fee: the seller already
// took a haircut via the advance rate itself, this just keeps the platform
// running rather than being a meaningful cost to either side.
const ORIGINATION_FEE_RATE = 0.005

async function currentBalanceAmount(platform: string, owner: string, packageId: string): Promise<number | null> {
  const lines = await queryACS([platform], [`${packageId}:InvoPlus.Token:Balance`])
  const pv = (x: any) => (x && typeof x === 'object' && 'value' in x ? x.value : x)
  const matches = lines
    .filter((l: any) => l?.contractEntry?.JsActiveContract?.createdEvent)
    .map((l: any) => l.contractEntry.JsActiveContract.createdEvent)
    .filter((e: any) => pv(e.createArgument?.owner) === owner)
  if (matches.length === 0) return null
  return Math.max(...matches.map((e: any) => Number(pv(e.createArgument?.amount) ?? 0)))
}

export const dynamic = 'force-dynamic'
// Default serverless timeout (10s) is genuinely too tight for this route:
// reject-losers (one call per losing bid) + settle + the balance transfer +
// origination-fee hop (each with its own retry) + the ground-truth balance
// recheck (up to ~1.4s of retry delay) can add up past 10s under real
// Canton latency. Suspected root cause of a live report where the client
// saw a failure/timeout while the ledger operation had actually completed
// moments later in the background — this gives real headroom instead of
// tightening every retry to fit an artificially short window.
export const maxDuration = 60

const pv = (x: any) => (x && typeof x === 'object' && 'value' in x ? x.value : x)

export async function POST(req: Request) {
  try {
    if (authRequired() && !verifyAuthCookie()) {
      return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 })
    }
    const {
      sellerPartyId,
      auctionContractId,
      invoiceHash,               // required when winnerBidContractId is omitted
      winnerBidContractId: providedWinnerId,
      loserBidContractIds: providedLoserIds,
    } = await req.json()

    if (!auctionContractId) {
      return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 })
    }

    const packageId = process.env.INVOPLUS_PACKAGE_ID
    if (!packageId) {
      return NextResponse.json({ ok: false, error: 'INVOPLUS_PACKAGE_ID not set.' }, { status: 503 })
    }

    // SettleAuction's controller is literally the Auction's own `platform`
    // field, which is always process.env.CANTON_PLATFORM_PARTY (see
    // list-auction) — never a value the client can supply, or authorization
    // fails because the acting party doesn't match the required controller.
    const platformPartyId = process.env.CANTON_PLATFORM_PARTY
    if (!platformPartyId) {
      return NextResponse.json({ ok: false, error: 'CANTON_PLATFORM_PARTY not set.' }, { status: 503 })
    }

    let winnerBidContractId = providedWinnerId as string | undefined
    let loserBidContractIds: string[] = providedLoserIds ?? []

    // Auto-select mode: no winner given, figure it out ourselves.
    if (!winnerBidContractId) {
      if (!invoiceHash) {
        return NextResponse.json({ ok: false, error: 'invoiceHash required for automatic settlement' }, { status: 400 })
      }
      const bidLines = await queryACS([platformPartyId], [`${packageId}:InvoPlus.Invoice:SealedBid`])
      const bids = bidLines
        .filter((l: any) => l?.contractEntry?.JsActiveContract?.createdEvent)
        .map((l: any) => l.contractEntry.JsActiveContract.createdEvent)
        .filter((e: any) => pv(e.createArgument?.invoiceHash) === invoiceHash)

      if (bids.length === 0) {
        return NextResponse.json({ ok: false, error: 'No open sealed bids found for this auction' }, { status: 404 })
      }

      const best = bids.reduce((a: any, b: any) => {
        const aAdv = Number(pv(a.createArgument.advanceRate)), bAdv = Number(pv(b.createArgument.advanceRate))
        if (aAdv !== bAdv) return bAdv > aAdv ? b : a
        const aRate = Number(pv(a.createArgument.annualRate)), bRate = Number(pv(b.createArgument.annualRate))
        return bRate < aRate ? b : a
      })

      winnerBidContractId = best.contractId
      loserBidContractIds = bids.filter((b: any) => b.contractId !== best.contractId).map((b: any) => b.contractId)
    }

    // Phase 1: reject each losing bid in its own transaction — platform only,
    // seller never reads these, so bid contents stay sealed forever.
    for (const loserCid of loserBidContractIds) {
      await submitAndWait(
        [platformPartyId],
        [platformPartyId],
        [{
          ExerciseCommand: {
            templateId: `${packageId}:InvoPlus.Invoice:SealedBid`,
            contractId: loserCid,
            choice: 'RejectBid',
            choiceArgument: {},
          },
        }],
      )
    }

    // Phase 2: settle with the winner. Platform is the explicit controller;
    // seller's authority comes along because seller is a signatory on the
    // Auction contract being exercised.
    const result = await submitAndWait(
      [platformPartyId],
      [sellerPartyId ?? platformPartyId],
      [{
        ExerciseCommand: {
          templateId: `${packageId}:InvoPlus.Invoice:Auction`,
          contractId: auctionContractId,
          choice: 'SettleAuction',
          choiceArgument: {
            winnerBidCid: winnerBidContractId,
          },
        },
      }],
    )

    const fundedInvoiceEvent = (result?.created ?? [])
      .find((c: any) => c.templateId.endsWith(':FundedInvoice'))
    const fundedInvoiceContractId = fundedInvoiceEvent?.contractId
    const financierPartyId = pv(fundedInvoiceEvent?.createArgument?.financier)
    const fundedAmount = pv(fundedInvoiceEvent?.createArgument?.fundedAmount)

    // Phase 3: move real value — debit the winning financier's Balance,
    // credit the seller's, for the funded amount. Transfer's controller is
    // `owner, platform`, so the financier's own authority (via the M2M
    // rights granted at provisioning) is required alongside platform's.
    let balanceTransferred = false
    let balanceTransferTransactionId: string | undefined
    let balanceTransferError: string | undefined
    const originationFee = fundedAmount ? Math.round(Number(fundedAmount) * ORIGINATION_FEE_RATE * 100) / 100 : 0
    let originationFeeTransactionId: string | undefined

    const sellerBalanceBefore = sellerPartyId ? await currentBalanceAmount(platformPartyId, sellerPartyId, packageId).catch(() => null) : null

    if (financierPartyId && fundedAmount && sellerPartyId) {
      try {
        const [financierBalanceCid, sellerBalanceCid] = await Promise.all([
          findBalanceContractId(platformPartyId, financierPartyId, packageId),
          findBalanceContractId(platformPartyId, sellerPartyId, packageId),
        ])
        if (financierBalanceCid && sellerBalanceCid) {
          const transferResult = await submitAndWait(
            [financierPartyId, platformPartyId],
            [sellerPartyId],
            [{
              ExerciseCommand: {
                templateId: `${packageId}:InvoPlus.Token:Balance`,
                contractId: financierBalanceCid,
                choice: 'Transfer',
                choiceArgument: { toBalanceCid: sellerBalanceCid, transferAmount: String(fundedAmount) },
              },
            }],
          )
          balanceTransferred = true
          balanceTransferTransactionId = transferResult?.transactionId

          // Origination fee: a second, small hop from the seller's newly
          // credited balance to platform's own. Doesn't block reporting
          // settlement as complete if it ultimately fails (the seller was
          // still paid in full for the main transfer), but retried once —
          // the equivalent single-attempt hop in complete-repayment silently
          // left a real fee uncollected in production on a transient error,
          // which is exactly the failure mode retrying guards against.
          if (originationFee > 0) {
            const newSellerBalanceCid = (transferResult?.created ?? []).find((c: any) => pv(c.createArgument?.owner) === sellerPartyId)?.contractId
            if (newSellerBalanceCid) {
              for (let attempt = 0; attempt < 2 && !originationFeeTransactionId; attempt++) {
                try {
                  const platformBalanceCid = await ensurePlatformBalance(platformPartyId, packageId)
                  const feeResult = await submitAndWait(
                    [sellerPartyId, platformPartyId],
                    [platformPartyId],
                    [{
                      ExerciseCommand: {
                        templateId: `${packageId}:InvoPlus.Token:Balance`,
                        contractId: newSellerBalanceCid,
                        choice: 'Transfer',
                        choiceArgument: { toBalanceCid: platformBalanceCid, transferAmount: String(originationFee) },
                      },
                    }],
                  )
                  originationFeeTransactionId = feeResult?.transactionId
                } catch { /* retried once; genuinely best-effort past that */ }
              }
            }
          }
        } else {
          balanceTransferError = 'Balance contract not found for financier or seller — neither party has connected/provisioned a balance yet.'
        }
      } catch (err) {
        // Genuinely surfaced now, not swallowed — an "Insufficient balance"
        // assertion here means real money failed to move even though
        // settlement itself succeeded, which is exactly the kind of
        // failure that must never fail silently.
        balanceTransferError = err instanceof Error ? err.message : 'Balance transfer failed'
      }
    }

    // Ground truth for the UI — a fresh read beats trusting the submission
    // outcome alone, so the result modal can always show the seller's real
    // current balance instead of just a pending/error flag.
    let sellerBalanceAfter = sellerPartyId ? await currentBalanceAmount(platformPartyId, sellerPartyId, packageId).catch(() => null) : null

    // Self-correct a genuinely misleading case: submitAndWait can throw on a
    // network-level ambiguity (e.g. a timeout) even though the transaction
    // actually committed on the ledger — the response is lost, not the
    // transfer. If the fresh balance read shows the expected increase
    // despite balanceTransferred being false, trust the read over the
    // submission outcome instead of telling the seller "no cash moved" while
    // their balance visibly went up.
    //
    // Retried with a short delay, not just once: the ACS read side can lag
    // a beat behind a write that already committed, so a single immediate
    // read can still show the pre-transfer balance even though the transfer
    // truly succeeded — this was caught live, where the balance was visibly
    // correct moments later even though this check had already given up.
    if (!balanceTransferred && sellerBalanceBefore != null && fundedAmount) {
      const expectedMinimum = sellerBalanceBefore + Number(fundedAmount) - originationFee - 0.01
      for (let attempt = 0; attempt < 3 && !(sellerBalanceAfter != null && sellerBalanceAfter >= expectedMinimum); attempt++) {
        if (attempt > 0) {
          await new Promise(r => setTimeout(r, 700))
          sellerBalanceAfter = await currentBalanceAmount(platformPartyId, sellerPartyId, packageId).catch(() => null)
        }
      }
      if (sellerBalanceAfter != null && sellerBalanceAfter >= expectedMinimum) {
        balanceTransferred = true
        balanceTransferError = undefined
      }
    }

    return NextResponse.json({
      ok: true,
      transactionId: result?.transactionId,
      fundedInvoiceContractId,
      balanceTransferTransactionId,
      balanceTransferError,
      fundedAmount,
      sellerBalanceAfter,
      originationFee,
      originationFeeTransactionId,
      message: balanceTransferred
        ? `Auction settled on InvoPlus. $${fundedAmount} moved from the financier's balance to the seller's, on-ledger${originationFee > 0 ? ` (InvoPlus origination fee: $${originationFee.toFixed(2)})` : ''}.`
        : `Auction settled on InvoPlus, but the balance transfer did not complete: ${balanceTransferError ?? 'unknown reason'}. Losing bids rejected privately; winner funded atomically on the invoice contract, but no cash moved yet — contact support.`,
      details: {
        losingBidsRejected: loserBidContractIds.length,
        winnerBidSettled: true,
        fundedInvoiceCreated: true,
        balanceTransferred,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
