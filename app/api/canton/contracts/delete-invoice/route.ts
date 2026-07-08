/**
 * POST /api/canton/contracts/delete-invoice
 *
 * Archives an InvoiceContract (Daml's built-in Archive choice). Only
 * possible before listing — once listed the invoice is already archived
 * and lives on as an Auction (cancel the auction instead).
 *
 * Authority: Pending invoices are signed by the seller alone; Verified
 * ones by seller + platform. We act as both — extra actAs is harmless
 * for the Pending case and required for Verified.
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
    const { sellerPartyId, invoiceContractId } = await req.json()
    if (!sellerPartyId || !invoiceContractId) {
      return NextResponse.json({ ok: false, error: 'sellerPartyId and invoiceContractId required' }, { status: 400 })
    }
    const packageId = process.env.INVOPLUS_PACKAGE_ID
    if (!packageId) {
      return NextResponse.json({ ok: false, error: 'INVOPLUS_PACKAGE_ID not set' }, { status: 503 })
    }

    const platform = process.env.CANTON_PLATFORM_PARTY ?? sellerPartyId
    const result = await submitAndWait(
      [sellerPartyId, platform],
      [sellerPartyId, platform],
      [{
        ExerciseCommand: {
          templateId: `${packageId}:InvoPlus.Invoice:InvoiceContract`,
          contractId: invoiceContractId,
          choice: 'Archive',
          choiceArgument: {},
        },
      }],
    )

    return NextResponse.json({ ok: true, transactionId: result?.transactionId, message: 'Invoice deleted from the ledger (archived).' })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
