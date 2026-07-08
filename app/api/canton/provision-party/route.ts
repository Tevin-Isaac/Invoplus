import { NextResponse } from 'next/server'
import { allocateParty, createUser, grantM2MRights, submitAndWait } from '@/lib/canton-server'

export const dynamic = 'force-dynamic'

// Financiers need working capital to fund invoices; sellers don't need a
// starting balance since they receive funding, not spend it. Both get a
// Balance contract created up front so settle-auction/complete-repayment
// can always exerciseByKey against it without a conditional "does one exist"
// check on the hot path.
const STARTING_BALANCE: Record<string, number> = {
  financier: 250000,
  business: 0,
}

export async function POST(req: Request) {
  try {
    const { displayName, role } = await req.json()
    if (!displayName || !role) {
      return NextResponse.json({ ok: false, error: 'displayName and role required' }, { status: 400 })
    }

    const hint = `invoplus_${role}_${Date.now()}`
    const partyResult = await allocateParty(displayName, hint)
    const partyId = (partyResult as any).partyDetails?.party ?? (partyResult as any).party

    if (!partyId) {
      return NextResponse.json({ ok: false, error: 'Party allocation failed', raw: partyResult }, { status: 500 })
    }

    // REQUIRED, not best-effort: all contract submissions run as the M2M
    // user, which can only act for parties it has explicit rights on.
    // Skipping this leaves a party that can connect but not transact.
    await grantM2MRights(partyId)

    // Try to create a dedicated ledger user for this party (best-effort)
    try {
      await createUser(`${hint}@invoplus`, partyId)
    } catch { /* may already exist */ }

    // Best-effort: give the new party a real, ledger-backed Balance so
    // bidding/settlement/repayment can move actual value for it. If the
    // package isn't deployed yet (older Seaport builds) this silently no-ops
    // rather than failing provisioning.
    const packageId = process.env.INVOPLUS_PACKAGE_ID
    const platformPartyId = process.env.CANTON_PLATFORM_PARTY
    if (packageId && platformPartyId) {
      try {
        await submitAndWait(
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
      } catch { /* Token module not yet deployed, or balance already exists */ }
    }

    return NextResponse.json({ ok: true, partyId, displayName, role })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
