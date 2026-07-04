/**
 * POST /api/canton/contracts/cancel-auction
 *
 * Exercises Auction.CancelAuction on Canton — seller-only action.
 * Archives the Auction + RegistryEntry atomically and recreates the
 * InvoiceContract in "Verified" state, ready to re-list.
 *
 * Daml choice: InvoPlus.Invoice:Auction:CancelAuction
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
      sellerPartyId,
      auctionContractId,
      registryEntryContractId,
    } = await req.json()

    if (!sellerPartyId || !auctionContractId || !registryEntryContractId) {
      return NextResponse.json({ ok: false, error: 'sellerPartyId, auctionContractId, registryEntryContractId required' }, { status: 400 })
    }

    const packageId = process.env.INVOPLUS_PACKAGE_ID
    if (!packageId) {
      return NextResponse.json({ ok: false, error: 'INVOPLUS_PACKAGE_ID not set' }, { status: 503 })
    }

    const result = await submitAndWait(
      [sellerPartyId],
      [sellerPartyId],
      [{
        ExerciseCommand: {
          templateId: `${packageId}:InvoPlus.Invoice:Auction`,
          contractId: auctionContractId,
          choice: 'CancelAuction',
          choiceArgument: {
            regEntryCid: registryEntryContractId,
          },
        },
      }],
    )

    const newInvoiceContractId = (result?.created ?? [])
      .find((c: any) => c.templateId.endsWith(':InvoiceContract'))?.contractId

    return NextResponse.json({
      ok: true,
      transactionId: result?.transactionId,
      newInvoiceContractId,
      message: 'Auction cancelled. Invoice returned to Verified state. Registry entry deregistered. Invoice can be re-listed.',
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
