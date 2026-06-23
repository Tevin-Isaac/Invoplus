import { NextResponse } from 'next/server'
import { createParty, createUser } from '@/lib/canton-server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { displayName, role } = await req.json()
    if (!displayName || !role) {
      return NextResponse.json({ ok: false, error: 'displayName and role required' }, { status: 400 })
    }

    const hint = `invoplus_${role}_${Date.now()}`
    const partyResult = await createParty(displayName, hint)
    const partyId = partyResult.partyDetails?.party ?? partyResult.party

    if (!partyId) {
      return NextResponse.json({ ok: false, error: 'Party creation failed', raw: partyResult }, { status: 500 })
    }

    const userId = `${hint}@invoplus`
    try {
      await createUser(userId, partyId)
    } catch {
      // user creation may fail if party already has one — continue
    }

    return NextResponse.json({ ok: true, partyId, displayName, role })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
