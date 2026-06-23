import { NextResponse } from 'next/server'
import { getUsers } from '@/lib/canton-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const data = await getUsers()
    return NextResponse.json({ ok: true, users: data.users ?? [] })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
