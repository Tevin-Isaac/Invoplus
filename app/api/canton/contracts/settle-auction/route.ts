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
 * Daml choices: InvoPlus.Invoice:SealedBid:RejectBid, InvoPlus.Invoice:Auction:SettleAuction
 */
import { NextResponse } from 'next/server'
import { submitAndWait } from '@/lib/canton-server'
import { verifyAuthCookie, authRequired } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    if (authRequired() && !verifyAuthCookie()) {
      return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 })
    }
    const {
      platformPartyId,
      sellerPartyId,
      auctionContractId,
      winnerBidContractId,
      loserBidContractIds,   // array of losing SealedBid contract IDs
    } = await req.json()

    if (!platformPartyId || !auctionContractId || !winnerBidContractId) {
      return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 })
    }

    const packageId = process.env.INVOPLUS_PACKAGE_ID
    if (!packageId) {
      return NextResponse.json({
        ok: false,
        error: 'INVOPLUS_PACKAGE_ID not set.',
      }, { status: 503 })
    }

    // Phase 1: reject each losing bid in its own transaction — platform only,
    // seller never reads these, so bid contents stay sealed forever.
    for (const loserCid of (loserBidContractIds ?? [])) {
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

    const fundedInvoiceContractId = (result?.created ?? [])
      .find((c: any) => c.templateId.endsWith(':FundedInvoice'))?.contractId

    return NextResponse.json({
      ok: true,
      transactionId: result?.transactionId,
      fundedInvoiceContractId,
      message: 'Auction settled on Canton Network. Losing bids rejected privately; winner funded atomically.',
      details: {
        losingBidsRejected: (loserBidContractIds ?? []).length,
        winnerBidSettled: true,
        fundedInvoiceCreated: true,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
