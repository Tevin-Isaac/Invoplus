/**
 * InvoPlus AI Invoice Scoring — powered by Claude (Anthropic)
 *
 * This is the AI brain of InvoPlus. When a business uploads an invoice,
 * this route sends it to Claude for:
 *   1. Document verification (is this a real, complete invoice?)
 *   2. Data extraction (amount, debtor, due date, invoice number)
 *   3. Risk scoring (0-100 score + A/B/C/D grade)
 *   4. Fraud flags (suspicious patterns, inconsistencies)
 *
 * The resulting score is then recorded permanently on the Canton ledger
 * via the InvoiceContract.VerifyInvoice choice, making it tamper-proof.
 */

import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const dynamic = 'force-dynamic'

export interface InvoiceScoreResult {
  score: number           // 0–100 AI risk score
  grade: 'A' | 'B' | 'C' | 'D'
  isVerified: boolean
  extractedData: {
    invoiceNumber: string
    debtorName: string
    amount: number
    currency: string
    dueDate: string
    issueDate: string
    description: string
  }
  riskFactors: string[]     // things that lower the score
  positiveFactors: string[] // things that raise the score
  fraudFlags: string[]      // any suspicious patterns
  reasoning: string         // Claude's explanation
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { invoiceText, invoiceNumber, debtorName, amount, currency, dueDate } = body

    // Build the context — either from raw text (OCR'd PDF) or from form fields
    const invoiceContext = invoiceText
      ? `Invoice document text:\n${invoiceText}`
      : `Invoice details submitted by seller:
- Invoice Number: ${invoiceNumber}
- Debtor (company that owes): ${debtorName}
- Amount: ${currency} ${amount}
- Due Date: ${dueDate}`

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are an expert invoice risk analyst for InvoPlus, a private invoice financing marketplace on Canton Network.

Analyze this invoice and provide a structured risk assessment for potential financiers.

${invoiceContext}

Respond with ONLY valid JSON in this exact format:
{
  "score": <integer 0-100>,
  "grade": "<A|B|C|D>",
  "isVerified": <true|false>,
  "extractedData": {
    "invoiceNumber": "<string>",
    "debtorName": "<string>",
    "amount": <number>,
    "currency": "<string>",
    "dueDate": "<YYYY-MM-DD>",
    "issueDate": "<YYYY-MM-DD>",
    "description": "<brief description of goods/services>"
  },
  "riskFactors": ["<factor1>", "<factor2>"],
  "positiveFactors": ["<factor1>", "<factor2>"],
  "fraudFlags": [],
  "reasoning": "<2-3 sentence explanation of the score>"
}

Grading scale:
- A (85-100): Low risk, established debtor, clear payment terms, short duration
- B (65-84): Moderate risk, reasonable debtor profile, standard terms
- C (40-64): Higher risk, limited debtor info or longer duration
- D (0-39): High risk, missing info, suspicious patterns, or fraud flags

If information is insufficient to verify, set isVerified to false and score below 50.`,
        },
      ],
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : ''

    // Parse Claude's JSON response
    let result: InvoiceScoreResult
    try {
      result = JSON.parse(rawText)
    } catch {
      // If JSON parsing fails, return a conservative score
      return NextResponse.json({
        ok: false,
        error: 'AI scoring returned invalid response',
        rawResponse: rawText,
      }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      ...result,
      scoredAt: new Date().toISOString(),
      model: 'claude-haiku-4-5-20251001',
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
