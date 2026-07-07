/**
 * POST /api/canton/grant-rights
 *
 * Grants the platform's M2M user CanActAs/CanReadAs on an externally
 * connected party (CIP-103 wallet or pasted Seaport party). Parties we
 * provision get these rights at allocation time, but wallet-created
 * parties were made by the wallet's own user — without this grant, every
 * contract submission for them fails with a permission error.
 *
 * Safe on DevNet where all parties live on the same FiveNorth validator;
 * the rights only let our backend submit commands the user asks for.
 */
import { NextResponse } from 'next/server'
import { grantM2MRights } from '@/lib/canton-server'
import { verifyAuthCookie, authRequired } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    if (authRequired() && !verifyAuthCookie()) {
      return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 })
    }
    const { partyId } = await req.json()
    if (!partyId || typeof partyId !== 'string' || !partyId.includes('::')) {
      return NextResponse.json({ ok: false, error: 'A full Canton party ID is required' }, { status: 400 })
    }
    await grantM2MRights(partyId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    // "already granted" style failures are fine — treat explicit duplicates as success
    if (/already/i.test(msg)) return NextResponse.json({ ok: true, note: 'rights already present' })
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
