import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST() {
  // The access token is a stateless JWT; clearing the cookies ends the client session.
  // The ledger SessionToken is left to expire, or can be revoked separately by an admin tool.
  const jar = cookies()
  jar.delete('invoplus_token')
  jar.delete('invoplus_refresh')
  return NextResponse.json({ ok: true })
}
