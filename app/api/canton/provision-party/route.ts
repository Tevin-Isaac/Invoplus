import { NextResponse } from 'next/server'
import { allocateParty, createUser, grantM2MRights } from '@/lib/canton-server'

export const dynamic = 'force-dynamic'

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

    // Deliberately NOT creating a Balance here. Every connection path
    // (instant identity, wallet, pasted party) provisions the party with a
    // placeholder role BEFORE the user actually picks business/financier in
    // the role modal — deciding the starting balance at this point locked
    // in the wrong amount (a real financier's Balance was being created as
    // if they were a business, i.e. $0, permanently, since it's never
    // recreated once it exists). The Balance is now only ever created once
    // — by /api/canton/contracts/balance, called with the CONFIRMED role
    // right when chooseRole() fires client-side.
    return NextResponse.json({ ok: true, partyId, displayName, role })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
