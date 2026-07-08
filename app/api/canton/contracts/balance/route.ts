/**
 * POST /api/canton/contracts/balance
 *
 * Reads a party's current InvoPlus.Token:Balance from the live ledger —
 * the same demo asset moved by settle-auction and complete-repayment.
 */
import { NextResponse } from 'next/server'
import { queryACS } from '@/lib/canton-server'
import { verifyAuthCookie, authRequired } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const pv = (x: any) => (x && typeof x === 'object' && 'value' in x ? x.value : x)

export async function POST(req: Request) {
  try {
    if (authRequired() && !verifyAuthCookie()) {
      return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 })
    }
    const { partyId } = await req.json()
    if (!partyId) {
      return NextResponse.json({ ok: false, error: 'partyId required' }, { status: 400 })
    }
    const packageId = process.env.INVOPLUS_PACKAGE_ID
    if (!packageId) {
      return NextResponse.json({ ok: false, error: 'INVOPLUS_PACKAGE_ID not set' }, { status: 503 })
    }

    const lines = await queryACS([partyId], [`${packageId}:InvoPlus.Token:Balance`])
    const entry = lines
      .filter((l: any) => l?.contractEntry?.JsActiveContract?.createdEvent)
      .map((l: any) => l.contractEntry.JsActiveContract.createdEvent)
      .find((e: any) => pv(e.createArgument?.owner) === partyId)

    return NextResponse.json({
      ok: true,
      amount: entry ? Number(pv(entry.createArgument.amount)) : 0,
      currency: entry ? pv(entry.createArgument.currency) : 'USD',
      provisioned: Boolean(entry),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
