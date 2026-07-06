/**
 * POST /api/canton/contracts/create-invoice
 *
 * Creates a real InvoiceContract on Canton ledger via submitAndWait.
 * Requires: seller party ID, invoice details
 * Returns: Canton contract ID
 *
 * Daml template: InvoPlus.Invoice:InvoiceContract
 */
import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { submitAndWait, getCantonToken } from '@/lib/canton-server'
import { verifyAuthCookie, authRequired } from '@/lib/auth'
import { scoreInvoice } from '@/lib/risk-engine'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    if (authRequired() && !verifyAuthCookie()) {
      return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 })
    }
    const {
      sellerPartyId,
      platformPartyId,
      invoiceId,
      debtorName,
      debtorTaxId,
      faceAmount,
      currency,
      issueDate,
      dueDate,
      docHash,
    } = await req.json()

    if (!sellerPartyId || !invoiceId || !debtorName || !faceAmount || !dueDate) {
      return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 })
    }

    const packageId = process.env.INVOPLUS_PACKAGE_ID
    if (!packageId) {
      return NextResponse.json({
        ok: false,
        error: 'INVOPLUS_PACKAGE_ID not set. Deploy the Daml DAR via Seaport first.',
      }, { status: 503 })
    }

    // Run risk scoring (deterministic, no external API)
    const today = new Date().toISOString().split('T')[0]
    const risk = scoreInvoice({
      invoiceNumber: invoiceId,
      debtorName,
      amount: faceAmount,
      currency: currency ?? 'USD',
      issueDate: issueDate ?? today,
      dueDate,
    })

    // Compute invoice hash for anti-fraud registry
    const invoiceHash = `hash:${invoiceId}:${debtorTaxId ?? debtorName}:${faceAmount}`

    // The Daml VerifyInvoice choice asserts validateHash on docHash (10–128
    // chars), so an empty default fails at verification time. With no file
    // upload in the flow, the "document" is the structured invoice record —
    // fingerprint it deterministically.
    const effectiveDocHash = docHash && String(docHash).length >= 10
      ? docHash
      : 'sha256:' + createHash('sha256')
          .update(`${invoiceId}|${debtorName}|${debtorTaxId ?? ''}|${faceAmount}|${dueDate}`)
          .digest('hex')

    const templateId = `${packageId}:InvoPlus.Invoice:InvoiceContract`

    const result = await submitAndWait(
      [sellerPartyId],
      [process.env.CANTON_PLATFORM_PARTY ?? platformPartyId ?? sellerPartyId],
      [{
        CreateCommand: {
          templateId,
          createArguments: {
            seller: sellerPartyId,
            platform: process.env.CANTON_PLATFORM_PARTY ?? platformPartyId ?? sellerPartyId,
            invoiceId,
            debtorName,
            debtorTaxId: debtorTaxId ?? '',
            faceAmount: faceAmount.toString(),
            currency: currency ?? 'USD',
            issueDate: issueDate ?? today,
            dueDate,
            docHash: effectiveDocHash,
            invoiceHash,
            aiScore: risk.score.toString(),
            riskGrade: `Grade_${risk.grade}`,
            status: 'Pending',
            uploadedAt: new Date().toISOString(),
          },
        },
      }],
    )

    const contractId = result?.contractId ?? 'unknown'

    return NextResponse.json({
      ok: true,
      contractId,
      invoiceId,
      // Returned so the client can pass it straight to list-auction's
      // anti-double-financing check without recomputing it.
      invoiceHash,
      riskScore: risk.score,
      riskGrade: risk.grade,
      advanceRateRange: `${(risk.advanceRateMin * 100).toFixed(0)}–${(risk.advanceRateMax * 100).toFixed(0)}%`,
      tenorDays: risk.tenorDays,
      summary: risk.summary,
      riskFactors: risk.riskFactors,
      positiveFactors: risk.positiveFactors,
      cantonTemplateId: templateId,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
