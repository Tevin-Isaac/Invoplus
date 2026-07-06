/**
 * POST /api/contact
 *
 * Sends the landing page contact form to a real inbox via Resend.
 *
 * Env vars required (set in .env.local and in Vercel's project env vars —
 * never commit the API key):
 *   RESEND_API_KEY    — from resend.com/api-keys
 *   CONTACT_FROM_EMAIL — an address on a domain verified in Resend
 *                        (e.g. hello@invoplus.xyz). Falls back to Resend's
 *                        shared onboarding@resend.dev sender if unset —
 *                        that works immediately but looks less trustworthy
 *                        and has stricter sending limits.
 *   CONTACT_TO_EMAIL   — where submissions actually land (e.g. a personal
 *                        Gmail address). Resend delivers there regardless
 *                        of which "from" domain is used.
 */
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { name, email, message } = await req.json()

    if (!name || !email || !message) {
      return NextResponse.json({ ok: false, error: 'name, email, and message are required' }, { status: 400 })
    }

    const apiKey = process.env.RESEND_API_KEY
    const toEmail = process.env.CONTACT_TO_EMAIL
    if (!apiKey || !toEmail) {
      return NextResponse.json({
        ok: false,
        error: 'Contact form is not configured yet (RESEND_API_KEY / CONTACT_TO_EMAIL missing).',
      }, { status: 503 })
    }

    const fromEmail = process.env.CONTACT_FROM_EMAIL ?? 'onboarding@resend.dev'
    const resend = new Resend(apiKey)

    const { error } = await resend.emails.send({
      from: `InvoPlus <${fromEmail}>`,
      to: toEmail,
      replyTo: email,
      subject: `New contact form message from ${name}`,
      text: `From: ${name} <${email}>\n\n${message}`,
    })

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 502 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
