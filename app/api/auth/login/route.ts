import { NextResponse } from 'next/server'
import { loginUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()
    const ip = req.headers.get('x-forwarded-for') ?? undefined
    const ua = req.headers.get('user-agent') ?? undefined

    const result = await loginUser(email, password, ip, ua)
    if (!result.success || !result.token) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 401 })
    }

    const res = NextResponse.json({ ok: true, user: result.user })
    res.cookies.set('invoplus_token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60,
    })
    if (result.refreshToken) {
      res.cookies.set('invoplus_refresh', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      })
    }
    return res
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Login failed'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
