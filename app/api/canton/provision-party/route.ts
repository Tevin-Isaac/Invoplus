import { NextResponse } from 'next/server'
import { allocateParty, createUser } from '@/lib/canton-server'

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

    // Try to create a user for this party (best-effort)
    try {
      await createUser(`${hint}@invoplus`, partyId)
    } catch { /* may already exist */ }

    return NextResponse.json({ ok: true, partyId, displayName, role })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
