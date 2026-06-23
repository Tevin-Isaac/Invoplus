/**
 * POST /api/canton/contracts/list-auction
 *
 * Exercises InvoiceContract.ListForAuction on Canton.
 * This archives the InvoiceContract and atomically creates:
 *   - Auction contract (visible to all financiers)
 *   - RegistryEntry contract (anti-fraud, visible to platform + seller)
 *
 * Daml choice: InvoPlus.Invoice:InvoiceContract:ListForAuction
 */
import { NextResponse } from 'next/server'
import { submitAndWait } from '@/lib/canton-server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const {
      sellerPartyId,
      platformPartyId,
      invoiceContractId,   // Canton contract ID of the InvoiceContract to exercise
      minAdvanceRate,      // e.g. 0.82
      maxAnnualRate,       // e.g. 0.18
      durationHours,       // e.g. 72
    } = await req.json()

    if (!sellerPartyId || !invoiceContractId || !minAdvanceRate) {
      return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 })
    }

    const packageId = process.env.INVOPLUS_PACKAGE_ID
    if (!packageId) {
      return NextResponse.json({
        ok: false,
        error: 'INVOPLUS_PACKAGE_ID not set. Deploy the Daml DAR via Seaport first.',
      }, { status: 503 })
    }

    const auctionEnd = new Date(
      Date.now() + (durationHours ?? 72) * 60 * 60 * 1000
    ).toISOString()

    const result = await submitAndWait(
      [sellerPartyId],
      [platformPartyId ?? sellerPartyId],
      [{
        ExerciseCommand: {
          templateId: `${packageId}:InvoPlus.Invoice:InvoiceContract`,
          contractId: invoiceContractId,
          choice: 'ListForAuction',
          choiceArgument: {
            terms: {
              minAdvanceRate: minAdvanceRate.toString(),
              maxAnnualRate: (maxAnnualRate ?? 0.18).toString(),
              durationHours: (durationHours ?? 72).toString(),
            },
            auctionEnd,
          },
        },
      }],
    )

    return NextResponse.json({
      ok: true,
      auctionEnd,
      durationHours: durationHours ?? 72,
      transactionId: result?.transactionId,
      message: 'Invoice listed for auction. Auction and RegistryEntry created atomically on Canton.',
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
