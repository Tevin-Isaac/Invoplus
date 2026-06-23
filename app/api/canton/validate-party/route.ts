/**
 * POST /api/canton/validate-party
 *
 * Validates that a party ID actually exists on the Canton DevNet ledger.
 * Called when a user pastes their Seaport party ID into InvoPlus.
 *
 * Canton party IDs look like:
 *   InvoPlus-Platform::122057f3a...  (display-name::fingerprint)
 *
 * We verify by calling GET /v2/parties?partyIds=<id> on the ledger.
 * If the party exists, it returns the party object with displayName.
 */
import { NextResponse } from 'next/server'
import { getCantonToken } from '@/lib/canton-server'

export const dynamic = 'force-dynamic'

const LEDGER_URL = process.env.CANTON_LEDGER_URL!

export async function POST(req: Request) {
  try {
    const { partyId } = await req.json()

    if (!partyId || typeof partyId !== 'string' || partyId.trim().length < 5) {
      return NextResponse.json({ ok: false, error: 'partyId is required' }, { status: 400 })
    }

    const id = partyId.trim()
    const token = await getCantonToken()

    // Query the Canton ledger for this specific party
    const res = await fetch(
      `${LEDGER_URL}/v2/parties?partyIds=${encodeURIComponent(id)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      }
    )

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ ok: false, error: `Ledger error: ${res.status} — ${text}` }, { status: 502 })
    }

    const data = await res.json()

    // Response: { partyDetails: [{ party, displayName, localMetadata, isLocal }] }
    const details = data?.partyDetails ?? []
    const found = details.find((p: any) => p.party === id)

    if (!found) {
      return NextResponse.json({
        ok: false,
        error: `Party "${id}" not found on Canton DevNet. Make sure you copied the full party ID from Seaport.`,
      }, { status: 404 })
    }

    return NextResponse.json({
      ok: true,
      partyId: found.party,
      displayName: found.displayName ?? id.split('::')[0],
      isLocal: found.isLocal ?? false,
      ledger: 'Canton DevNet (fivenorth.io)',
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
