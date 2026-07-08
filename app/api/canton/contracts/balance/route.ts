/**
 * POST /api/canton/contracts/balance
 *
 * Reads a party's current InvoPlus.Token:Balance from the live ledger —
 * the same demo asset moved by settle-auction and complete-repayment.
 *
 * Lazily creates one if missing (pass `role`). `provision-party` mints on
 * first connect for parties WE allocate, but reconnected accounts, pasted
 * Seaport party IDs, and real CIP-103 wallet connections never go through
 * that route — this is the single place all four connection paths land on
 * (the dashboard Header calls this on every party change), so it's the
 * right spot to guarantee every financier ends up funded regardless of how
 * they connected. Creating only needs platform's own authority (Balance's
 * only signatory), so no M2M rights on the owner are required here.
 */
import { NextResponse } from 'next/server'
import { queryACS, submitAndWait } from '@/lib/canton-server'
import { verifyAuthCookie, authRequired } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const pv = (x: any) => (x && typeof x === 'object' && 'value' in x ? x.value : x)

const STARTING_BALANCE: Record<string, number> = {
  financier: 250000,
  business: 0,
}

export async function POST(req: Request) {
  try {
    if (authRequired() && !verifyAuthCookie()) {
      return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 })
    }
    const { partyId, role } = await req.json()
    if (!partyId) {
      return NextResponse.json({ ok: false, error: 'partyId required' }, { status: 400 })
    }
    const packageId = process.env.INVOPLUS_PACKAGE_ID
    if (!packageId) {
      return NextResponse.json({ ok: false, error: 'INVOPLUS_PACKAGE_ID not set' }, { status: 503 })
    }
    const platformPartyId = process.env.CANTON_PLATFORM_PARTY
    if (!platformPartyId) {
      return NextResponse.json({ ok: false, error: 'CANTON_PLATFORM_PARTY not set' }, { status: 503 })
    }

    const lines = await queryACS([partyId], [`${packageId}:InvoPlus.Token:Balance`])
    let entry = lines
      .filter((l: any) => l?.contractEntry?.JsActiveContract?.createdEvent)
      .map((l: any) => l.contractEntry.JsActiveContract.createdEvent)
      .find((e: any) => pv(e.createArgument?.owner) === partyId)

    if (!entry && role) {
      const created = await submitAndWait(
        [platformPartyId],
        [partyId],
        [{
          CreateCommand: {
            templateId: `${packageId}:InvoPlus.Token:Balance`,
            createArguments: {
              platform: platformPartyId,
              owner: partyId,
              amount: String(STARTING_BALANCE[role] ?? 0),
              currency: 'USD',
            },
          },
        }],
      )
      entry = created?.created?.[0]
    }

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
