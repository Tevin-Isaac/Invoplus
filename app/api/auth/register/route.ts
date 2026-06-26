import { NextResponse } from 'next/server'
import { registerUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { email, password, displayName, role } = await req.json()
    const result = await registerUser(email, password, displayName, role === 'financier' ? 'financier' : 'seller')
    if (!result.success) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 })
    }
    return NextResponse.json({ ok: true, userId: result.userId, party: result.party })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Registration failed'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
