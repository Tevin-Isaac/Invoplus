/**
 * POST /api/extract-invoice
 *
 * Reads an uploaded invoice document (PDF or image) with Claude's vision
 * API and returns structured fields to pre-fill the invoice form with.
 * The document never touches Canton or any storage — it's sent straight
 * to Anthropic for one extraction call and discarded.
 *
 * This is a real extraction call, not a canned response: fields the model
 * can't find come back null, and the client only pre-fills what's present
 * — the seller still reviews and can correct everything before submitting.
 */
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { verifyAuthCookie, authRequired } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const MAX_BYTES = 10 * 1024 * 1024 // 10MB — Claude's own document limit

export async function POST(req: Request) {
  try {
    if (authRequired() && !verifyAuthCookie()) {
      return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 })
    }
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: 'ANTHROPIC_API_KEY not set' }, { status: 503 })
    }

    const { fileBase64, mimeType } = await req.json()
    if (!fileBase64 || !mimeType) {
      return NextResponse.json({ ok: false, error: 'fileBase64 and mimeType required' }, { status: 400 })
    }
    if (Buffer.byteLength(fileBase64, 'base64') > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: 'File too large (10MB max)' }, { status: 413 })
    }

    const isPdf = mimeType === 'application/pdf'
    if (!isPdf && !mimeType.startsWith('image/')) {
      return NextResponse.json({ ok: false, error: 'Only PDF or image files are supported' }, { status: 400 })
    }

    const anthropic = new Anthropic({ apiKey })

    const documentBlock = isPdf
      ? { type: 'document' as const, source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: fileBase64 } }
      : { type: 'image' as const, source: { type: 'base64' as const, media_type: mimeType as 'image/png' | 'image/jpeg', data: fileBase64 } }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          documentBlock,
          {
            type: 'text',
            text: `This is an invoice document. Extract these fields and return ONLY a JSON object, no other text:
{
  "invoiceId": string or null (the invoice number),
  "debtorName": string or null (the company/person who OWES money — the buyer/customer being billed, not the seller issuing the invoice),
  "debtorTaxId": string or null (the debtor's tax ID / VAT number / EIN, if present),
  "faceAmount": number or null (the total amount due, as a plain number with no currency symbol or commas),
  "currency": string or null (3-letter code like USD, EUR, GBP — infer from symbols if not explicit),
  "issueDate": string or null (the invoice date, in YYYY-MM-DD format),
  "dueDate": string or null (the payment due date, in YYYY-MM-DD format)
}
If a field genuinely isn't present or you can't determine it confidently, use null for that field rather than guessing. Return ONLY the JSON object.`,
          },
        ],
      }],
    })

    const textBlock = message.content.find((b): b is Anthropic.TextBlock => b.type === 'text')
    if (!textBlock) {
      return NextResponse.json({ ok: false, error: 'No response from extraction model' }, { status: 502 })
    }

    // Model is instructed to return bare JSON but strip any accidental
    // code-fence wrapping defensively.
    const jsonText = textBlock.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '')
    let fields: Record<string, unknown>
    try {
      fields = JSON.parse(jsonText)
    } catch {
      return NextResponse.json({ ok: false, error: 'Could not parse extraction result' }, { status: 502 })
    }

    return NextResponse.json({ ok: true, fields })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
