import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { refreshUserToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const refresh = cookies().get('invoplus_refresh')?.value
    if (!refresh) {
      return NextResponse.json({ ok: false, error: 'No refresh token' }, { status: 401 })
    }
    const result = await refreshUserToken(refresh)
    if (!result.success || !result.token) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 401 })
    }
    const res = NextResponse.json({ ok: true })
    res.cookies.set('invoplus_token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60,
    })
    return res
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Refresh failed'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
