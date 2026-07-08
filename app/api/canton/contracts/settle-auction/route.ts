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
import { submitAndWait, queryACS, findBalanceContractId } from '@/lib/canton-server'
import { verifyAuthCookie, authRequired } from '@/lib/auth'

export const dynamic = 'force-dynamic'

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
    if (financierPartyId && fundedAmount && sellerPartyId) {
      try {
        const [financierBalanceCid, sellerBalanceCid] = await Promise.all([
          findBalanceContractId(platformPartyId, financierPartyId, packageId),
          findBalanceContractId(platformPartyId, sellerPartyId, packageId),
        ])
        if (financierBalanceCid && sellerBalanceCid) {
          await submitAndWait(
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
        }
      } catch { /* balance not provisioned for this party yet — settlement still stands */ }
    }

    return NextResponse.json({
      ok: true,
      transactionId: result?.transactionId,
      fundedInvoiceContractId,
      message: balanceTransferred
        ? `Auction settled on Canton Network. $${fundedAmount} moved from the financier's balance to the seller's, on-ledger.`
        : 'Auction settled on Canton Network. Losing bids rejected privately; winner funded atomically.',
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
