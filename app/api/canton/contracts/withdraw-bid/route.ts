/**
 * POST /api/canton/contracts/withdraw-bid
 *
 * Exercises SealedBid.WithdrawBid on Canton — financier-only action.
 * Archives the SealedBid before the auction is settled.
 *
 * The financier must act before SettleAuction is called by the platform.
 * Once settled, this choice is no longer available (contract archived).
 *
 * Daml choice: InvoPlus.Invoice:SealedBid:WithdrawBid
 */
import { NextResponse } from 'next/server'
import { submitAndWait } from '@/lib/canton-server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const {
      financierPartyId,
      bidContractId,
    } = await req.json()

    if (!financierPartyId || !bidContractId) {
      return NextResponse.json({ ok: false, error: 'financierPartyId and bidContractId required' }, { status: 400 })
    }

    const packageId = process.env.INVOPLUS_PACKAGE_ID
    if (!packageId) {
      return NextResponse.json({ ok: false, error: 'INVOPLUS_PACKAGE_ID not set' }, { status: 503 })
    }

    const result = await submitAndWait(
      [financierPartyId],
      [financierPartyId],
      [{
        ExerciseCommand: {
          templateId: `${packageId}:InvoPlus.Invoice:SealedBid`,
          contractId: bidContractId,
          choice: 'WithdrawBid',
          choiceArgument: {},
        },
      }],
    )

    return NextResponse.json({
      ok: true,
      transactionId: result?.transactionId,
      message: 'Sealed bid withdrawn and archived on Canton. Your bid details remain private.',
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
