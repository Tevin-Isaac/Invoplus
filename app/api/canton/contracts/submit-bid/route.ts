/**
 * POST /api/canton/contracts/submit-bid
 *
 * Exercises Auction.SubmitBid on Canton.
 * Creates a SealedBid contract where:
 *   - signatory: financier (they commit to the bid)
 *   - observer:  platform only
 *   - seller is NOT an observer — cannot see bid amounts
 *
 * This is Canton's privacy guarantee in action:
 * the ledger physically prevents the seller from seeing this contract.
 *
 * Daml choice: InvoPlus.Invoice:Auction:SubmitBid
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
      financierPartyId,
      sellerPartyId,
      platformPartyId,
      auctionContractId,   // Canton contract ID of the Auction
      advanceRate,         // e.g. 0.88 (88%)
      annualRate,          // e.g. 0.115 (11.5% APR)
    } = await req.json()

    if (!financierPartyId || !auctionContractId || !advanceRate || !annualRate) {
      return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 })
    }

    const packageId = process.env.INVOPLUS_PACKAGE_ID
    if (!packageId) {
      return NextResponse.json({
        ok: false,
        error: 'INVOPLUS_PACKAGE_ID not set. Deploy DAR via Seaport first.',
      }, { status: 503 })
    }

    // Financier acts + reads; seller read-only (they can't see bid contents)
    const result = await submitAndWait(
      [financierPartyId],
      [process.env.CANTON_PLATFORM_PARTY ?? platformPartyId ?? sellerPartyId],
      [{
        ExerciseCommand: {
          templateId: `${packageId}:InvoPlus.Invoice:Auction`,
          contractId: auctionContractId,
          choice: 'SubmitBid',
          choiceArgument: {
            financier: financierPartyId,
            advanceRate: advanceRate.toString(),
            annualRate: annualRate.toString(),
          },
        },
      }],
    )

    const created: Array<{ contractId: string; templateId: string }> = result?.created ?? []
    const newAuctionContractId = created.find((c) => c.templateId.endsWith(':Auction'))?.contractId
    const bidContractId = created.find((c) => c.templateId.endsWith(':SealedBid'))?.contractId

    return NextResponse.json({
      ok: true,
      advanceRate,
      annualRate,
      transactionId: result?.transactionId,
      newAuctionContractId,
      bidContractId,
      // Never return bid details to seller — only confirm to the bidder
      message: `Sealed bid submitted on Canton. Advance rate: ${(advanceRate * 100).toFixed(1)}%. Annual rate: ${(annualRate * 100).toFixed(2)}%. Your bid is private — seller cannot see it.`,
      privacyNote: 'SealedBid contract created with financier + platform as observers only. Seller excluded per Canton sub-transaction privacy.',
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
