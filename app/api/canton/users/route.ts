import { NextResponse } from 'next/server'
import { getUsers } from '@/lib/canton-server'

export const dynamic = 'force-dynamic'

// The FiveNorth DevNet validator is a SHARED participant — every team
// building on this hackathon sandbox shows up in the same /v2/users list.
// An unfiltered response here leaked other teams' real ledger users (their
// actual account ids and party names) into InvoPlus's own Settings page.
// InvoPlus only ever creates users as `${partyIdHint}@invoplus`
// (see allocateParty/createUser in canton-server.ts), so filter to that —
// never forward third-party data through our own API.
export async function GET() {
  try {
    const data = await getUsers()
    const users = (data.users ?? []).filter((u: any) =>
      typeof u.id === 'string' && (u.id.startsWith('invoplus_') || u.id.endsWith('@invoplus'))
    )
    return NextResponse.json({ ok: true, users })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
