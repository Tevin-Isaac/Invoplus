import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const token = cookies().get('invoplus_token')?.value
  if (!token) {
    return NextResponse.json({ ok: false, authenticated: false }, { status: 401 })
  }
  const decoded = verifyJWT(token)
  if (!decoded || !decoded.userId) {
    return NextResponse.json({ ok: false, authenticated: false }, { status: 401 })
  }
  return NextResponse.json({
    ok: true,
    authenticated: true,
    user: { id: decoded.userId, email: decoded.email, role: decoded.role, party: decoded.party },
  })
}
